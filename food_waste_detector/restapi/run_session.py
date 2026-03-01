"""
RPi session daemon — polls the backend for an active session.
When a session is active, captures a photo every 10 seconds,
runs TFLite image classification, and POSTs detection results to the session.
"""

import atexit
import cv2
import json
import signal
import subprocess
import sys
import os
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone

import RPi.GPIO as GPIO
from lcd_pwm import HD44780_PWM

# Add the restapi directory to path so we can import server modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from server.yolo.yolo import FoodClassifier
from server.yolo.weight_estimator import estimate_weight, is_food, get_weight_kg

# ── Configuration ──────────────────────────────────────────────────
BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:3001")
DEVICE_ID = os.environ.get("DEVICE_ID", "rpi5-001")
DEVICE_SECRET = os.environ.get("DEVICE_SECRET", "device-secret-changeme")
CAPTURE_INTERVAL = int(os.environ.get("CAPTURE_INTERVAL", "1"))  # seconds
POLL_INTERVAL = int(os.environ.get("POLL_INTERVAL", "3"))  # seconds when idle
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# ── LCD bar counts per food category ───────────────────────────────
LCD_BARS = {"muffin": 4, "croissant": 7, "pizza": 12}

# ── Global LCD reference for cleanup ──────────────────────────────
_lcd_ref = None


def _cleanup_gpio():
    """Clean up GPIO on exit to avoid stale pin state."""
    global _lcd_ref
    try:
        if _lcd_ref is not None:
            _lcd_ref.close(clear=True)
            _lcd_ref = None
    except Exception:
        pass
    try:
        GPIO.cleanup()
    except Exception:
        pass
    # Also force-release pins via pinctrl so they're free for next run
    for pin in [25, 24, 23, 17, 18, 22]:
        try:
            subprocess.run(["pinctrl", "set", str(pin), "ip"],
                           capture_output=True, timeout=2)
        except Exception:
            pass


# Register cleanup so GPIO is always released on exit / kill
atexit.register(_cleanup_gpio)


def _kill_stale_daemon():
    """Kill any other run_session.py process that may be holding GPIO pins."""
    my_pid = os.getpid()
    try:
        result = subprocess.run(
            ["pgrep", "-f", "run_session.py"],
            capture_output=True, text=True, timeout=3,
        )
        for line in result.stdout.strip().splitlines():
            pid = int(line.strip())
            if pid != my_pid:
                print(f"  [lcd] Killing stale daemon PID {pid}")
                os.kill(pid, signal.SIGTERM)
                time.sleep(0.5)
                # Force kill if still alive
                try:
                    os.kill(pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
    except Exception:
        pass


def _force_free_lcd_pins():
    """Force-free LCD GPIO pins so a fresh claim succeeds.

    On RPi 5 with rpi-lgpio, we use RPi.GPIO.cleanup() which
    releases pins properly through the lgpio backend.
    We avoid opening a separate lgpio chip handle as that
    conflicts with rpi-lgpio's internal handle management.
    """
    LCD_PINS = [25, 24, 23, 17, 18, 22]
    try:
        GPIO.setmode(GPIO.BCM)
        GPIO.setwarnings(False)
        for pin in LCD_PINS:
            try:
                GPIO.setup(pin, GPIO.OUT)
            except Exception:
                pass
        GPIO.cleanup(LCD_PINS)
    except Exception:
        pass


def init_lcd():
    """Initialise the 16×2 character LCD using PWM on RS/E pins."""
    global _lcd_ref
    try:
        # Suppress "channel already in use" warnings from previous runs
        GPIO.setwarnings(False)

        # Kill any stale daemon that may be holding the pins
        _kill_stale_daemon()

        # Force-free pins at lgpio level (survives process crashes)
        _force_free_lcd_pins()

        # Clean up any leftover GPIO state in this process
        try:
            GPIO.cleanup()
        except Exception:
            pass

        GPIO.setmode(GPIO.BCM)

        # Use pinctrl to force pins into output mode at the hardware level
        # (required on RPi 5 RP1 chip before PWM/GPIO works reliably)
        for pin in [25, 24, 23, 17, 18, 22]:
            try:
                subprocess.run(["pinctrl", "set", str(pin), "op"],
                               capture_output=True, timeout=2)
            except Exception:
                pass

        lcd = HD44780_PWM(
            pin_rs=25,         # PWM — Register Select
            pin_e=24,          # PWM — Enable
            pins_data=[23, 17, 18, 22],
            cols=16,
            rows=2,
        )
        time.sleep(0.5)        # let the controller finish reset

        # Store for cleanup
        _lcd_ref = lcd

        # Startup test: show a message so the user knows the LCD works
        lcd.clear()
        time.sleep(0.05)
        lcd.set_cursor(0, 0)
        lcd.write_string("TrashTrack")
        lcd.set_cursor(1, 0)
        lcd.write_string("LCD OK!")
        time.sleep(1.5)        # hold the test message briefly

        print("LCD initialised (PWM mode) — test message displayed.")
        return lcd
    except Exception as e:
        print(f"WARNING: LCD init failed ({e}) — running without display.")
        import traceback; traceback.print_exc()
        return None


def lcd_update(lcd, category: str | None):
    """Update the LCD: row 1 = 'Food Wasted', row 2 = bar meter."""
    if lcd is None:
        return
    try:
        lcd.clear()
        time.sleep(0.05)             # give HD44780 time to process clear
        lcd.set_cursor(0, 0)
        lcd.write_string("Food Wasted")
        lcd.set_cursor(1, 0)
        if category and category.lower() in LCD_BARS:
            bars = LCD_BARS[category.lower()]
            # chr(0xFF) is the solid block character on HD44780 controllers
            for _ in range(bars):
                lcd.write_char(0xFF)
        else:
            lcd.write_string("No detection")
    except Exception as e:
        print(f"  [lcd] Update failed: {e}")


def lcd_clear(lcd):
    """Clear the LCD."""
    if lcd is None:
        return
    try:
        lcd.clear()
        time.sleep(0.05)
    except Exception:
        pass


def api_get(path: str):
    """GET a JSON endpoint from the backend."""
    url = f"{BACKEND_URL}{path}"
    req = urllib.request.Request(url, headers={"X-Device-Secret": DEVICE_SECRET})
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            return json.loads(resp.read().decode())
    except Exception as e:
        print(f"  [api] GET {path} failed: {e}")
        return None


def api_post(path: str, payload: dict):
    """POST JSON to a backend endpoint."""
    url = f"{BACKEND_URL}{path}"
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url, data=data,
        headers={"Content-Type": "application/json", "X-Device-Secret": DEVICE_SECRET},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode()), resp.status
    except urllib.error.HTTPError as e:
        err_body = e.read().decode() if e.fp else ""
        print(f"  [api] POST {path} failed: HTTP {e.code} — {err_body}")
        return None, e.code
    except Exception as e:
        print(f"  [api] POST {path} failed: {e}")
        return None, 0


def capture_image(output_path: str) -> bool:
    """Capture an image using rpicam-still."""
    try:
        result = subprocess.run(
            ["rpicam-still", "-o", output_path, "--width", "1920", "--height", "1080",
             "-t", "1500", "--nopreview"],
            capture_output=True, text=True, timeout=10,
        )
        return result.returncode == 0
    except Exception as e:
        print(f"  [camera] Capture failed: {e}")
        return False


def run_detection(model: FoodClassifier, image_path: str) -> list:
    """Run TFLite classification on the captured image and return detected objects."""
    frame = cv2.imread(image_path)
    if frame is None:
        print("  [model] Failed to read image")
        return []

    detected_objects, raw_probs = model.predict(frame)
    if detected_objects is None:
        return []

    return detected_objects or []


def build_results_payload(detected_objects: list) -> list:
    """Build the results array for the /detections endpoint."""
    # Assign fixed weights
    estimate_weight(detected_objects)

    results = []
    for obj in detected_objects:
        cat = obj["label_name"]
        results.append({
            "category": cat,
            "confidence": round(obj["confidence"], 4),
            "amount_kg": round(obj.get("weight_kg", get_weight_kg(cat)), 4),
            "count": 1,
            "total_area_px": 0,
        })

    return results


def main():
    print("=" * 60)
    print("  TrashTrack RPi Session Daemon")
    print(f"  Backend:  {BACKEND_URL}")
    print(f"  Device:   {DEVICE_ID}")
    print(f"  Interval: {CAPTURE_INTERVAL}s captures, {POLL_INTERVAL}s polling")
    print("=" * 60)

    # Pre-load TFLite classifier
    print("\nLoading TFLite model (one-time)...")
    model = FoodClassifier()
    if model.model is None:
        print("ERROR: Model failed to load. Exiting.")
        sys.exit(1)
    print("Model ready!\n")

    # Initialise LCD
    lcd = init_lcd()
    lcd_update(lcd, None)

    # Register signal handlers so GPIO is cleaned up even on kill / Ctrl+C
    def _sig_handler(sig, frame):
        print("\n\nDaemon stopped by signal.")
        lcd_clear(lcd)
        _cleanup_gpio()
        sys.exit(0)

    signal.signal(signal.SIGINT, _sig_handler)
    signal.signal(signal.SIGTERM, _sig_handler)

    image_path = os.path.join(SCRIPT_DIR, "input_image.jpg")
    capture_count = 0

    while True:
        try:
            # 1. Poll for an active session
            data = api_get("/api/sessions/active")
            if data is None or not data.get("active"):
                print(f"[{datetime.now().strftime('%H:%M:%S')}] No active session. Waiting {POLL_INTERVAL}s...")
                time.sleep(POLL_INTERVAL)
                continue

            session_id = data["session"]["session_id"]
            print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Active session: {session_id}")

            # 2. Capture + detect loop while session is active
            while True:
                # Check session is still active before capturing
                check = api_get("/api/sessions/active")
                if check is None or not check.get("active") or check["session"]["session_id"] != session_id:
                    print(f"  Session {session_id} ended — stopping camera.")
                    lcd_clear(lcd)
                    break

                capture_count += 1
                ts = datetime.now().strftime('%H:%M:%S')
                print(f"\n  [{ts}] Capture #{capture_count}")

                # Capture
                if not capture_image(image_path):
                    print("  [camera] Capture failed, retrying next interval")
                    time.sleep(CAPTURE_INTERVAL)
                    continue

                # Detect
                detected_objects = run_detection(model, image_path)
                n = len(detected_objects)
                print(f"  [model] {n} item(s) classified")

                # Build and send results
                results = build_results_payload(detected_objects)
                food_results = [r for r in results if is_food(r["category"])]
                if food_results:
                    total_kg = sum(r.get("amount_kg") or 0 for r in food_results)
                    body, status = api_post(
                        f"/api/sessions/{session_id}/detections",
                        {"results": food_results},
                    )
                    if body:
                        print(f"  [api] Sent {len(food_results)} categories (~{total_kg*1000:.0f}g) → total: {body.get('total_detections', '?')}")
                        lcd_update(lcd, food_results[0]["category"])
                    else:
                        print(f"  [api] Failed to send detections (status {status})")
                        # If session was stopped (400), break out
                        if status == 400:
                            print("  [api] Session stopped, returning to polling mode")
                            break
                else:
                    print("  [model] No food detected — skipping upload")
                    lcd_update(lcd, None)

                # Wait for next capture
                print(f"  Waiting {CAPTURE_INTERVAL}s for next capture...")
                time.sleep(CAPTURE_INTERVAL)

        except KeyboardInterrupt:
            print("\n\nDaemon stopped by user.")
            lcd_clear(lcd)
            _cleanup_gpio()
            sys.exit(0)
        except Exception as e:
            print(f"ERROR: {e}")
            time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
