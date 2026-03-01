"""
Capture a frame from the RPi camera, run TFLite classification, save the output,
and send detection results to the TrashTrack backend.
"""

import cv2
import json
import subprocess
import sys
import os
import uuid
import urllib.request
import urllib.error
from datetime import datetime, timezone

# Add the restapi directory to path so we can import server modules
sys.path.insert(0, os.path.dirname(__file__))

from server.yolo.yolo import FoodClassifier
from server.yolo.weight_estimator import estimate_weight, is_food, get_weight_kg

# ── Configuration ──────────────────────────────────────────────────
BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:3001")
DEVICE_ID = os.environ.get("DEVICE_ID", "rpi5-001")
DEVICE_SECRET = os.environ.get("DEVICE_SECRET", "device-secret-changeme")


def send_to_backend(session_payload: dict) -> bool:
    """POST the session payload to the backend /api/sessions endpoint."""
    url = f"{BACKEND_URL}/api/sessions"
    data = json.dumps(session_payload).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Content-Type": "application/json",
            "X-Device-Secret": DEVICE_SECRET,
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = json.loads(resp.read().decode())
            print(f"Backend response ({resp.status}): {body}")
            return resp.status in (200, 201)
    except urllib.error.HTTPError as e:
        err_body = e.read().decode() if e.fp else ""
        print(f"ERROR sending to backend: HTTP {e.code} — {err_body}")
        return False
    except Exception as e:
        print(f"ERROR sending to backend: {e}")
        return False


def build_session_payload(detected_objects: list, start_time: str, end_time: str) -> dict:
    """Build a session payload matching the backend's expected schema."""
    # Assign fixed weights
    estimate_weight(detected_objects)

    # Group detections by category and compute summary
    category_counts: dict[str, list] = {}
    for obj in detected_objects:
        cat = obj["label_name"]
        category_counts.setdefault(cat, []).append(obj)

    # Build per-category results
    results = []
    for category, items in category_counts.items():
        avg_confidence = sum(o["confidence"] for o in items) / len(items)
        total_weight = sum(o.get("weight_kg", get_weight_kg(category)) for o in items)
        results.append({
            "category": category,
            "confidence": round(avg_confidence, 4),
            "amount_kg": round(total_weight, 4) if is_food(category) else None,
            "count": len(items),
            "total_area_px": 0,
        })

    # Summary metrics
    summary = {
        "total_items": len(detected_objects),
        "categories_detected": len(category_counts),
        "category_breakdown": {
            cat: len(items) for cat, items in category_counts.items()
        },
    }

    return {
        "session_id": str(uuid.uuid4()),
        "device_id": DEVICE_ID,
        "start_time": start_time,
        "end_time": end_time,
        "summary": summary,
        "results": results,
    }


def main():
    start_time = datetime.now(timezone.utc).isoformat()

    script_dir = os.path.dirname(os.path.abspath(__file__))
    input_path = os.path.join(script_dir, "input_image.jpg")

    # 1. Capture a picture using rpicam-still (RPi5 CSI camera)
    print("Capturing image with rpicam-still...")
    result = subprocess.run(
        ["rpicam-still", "-o", input_path, "--width", "1920", "--height", "1080", "-t", "2000", "--nopreview"],
        capture_output=True, text=True, timeout=15
    )
    if result.returncode != 0:
        print(f"ERROR: rpicam-still failed: {result.stderr}")
        sys.exit(1)

    # Load the captured image
    frame = cv2.imread(input_path)
    if frame is None:
        print("ERROR: Failed to read captured image")
        sys.exit(1)

    print(f"Captured frame: {frame.shape}")
    print(f"Saved input image to {input_path}")

    # 2. Load and run the TFLite classifier
    model = FoodClassifier()
    if model.model is None:
        print("ERROR: Model failed to load")
        sys.exit(1)

    detected_objects, raw_probs = model.predict(frame)

    if raw_probs is None:
        print("ERROR: Prediction failed")
        sys.exit(1)

    end_time = datetime.now(timezone.utc).isoformat()

    # 3. Print detections
    if detected_objects:
        estimate_weight(detected_objects)
        print(f"\nDetected {len(detected_objects)} item(s):")
        for obj in detected_objects:
            w = obj.get('weight_kg', 0)
            weight_str = f", ~{w*1000:.0f}g" if w and w > 0 else ""
            print(f"  - {obj['label_name']} (confidence: {obj['confidence']:.2f}{weight_str})")
    else:
        print("\nNo food detected.")

    # 4. Send results to the backend
    print("\n--- Sending to backend ---")
    payload = build_session_payload(detected_objects or [], start_time, end_time)
    print(f"Session ID: {payload['session_id']}")
    print(f"Results: {len(payload['results'])} categories, {payload['summary']['total_items']} items")

    success = send_to_backend(payload)
    if success:
        print("Data successfully stored in backend!")
    else:
        print("WARNING: Failed to send data to backend. Data saved locally only.")

    # Also save the payload locally for debugging
    payload_path = os.path.join(script_dir, "last_payload.json")
    with open(payload_path, "w") as f:
        json.dump(payload, f, indent=2)
    print(f"Payload saved to {payload_path}")


if __name__ == "__main__":
    main()
