"""
Custom HD44780 16×2 LCD driver using PWM on RS and E pins.

On RPi 5, pins 24 and 25 must be configured as PWM for GPIO
to function correctly.  This driver uses GPIO.PWM() for RS (pin 25)
and E (pin 24), and regular GPIO.output() for the 4-bit data pins.

PWM duty cycle 100% = HIGH, 0% = LOW — electrically equivalent
to digital output but goes through the PWM subsystem which is
required on certain RPi 5 pin configurations.
"""

import time
import RPi.GPIO as GPIO

# ── HD44780 command constants ──────────────────────────────────────
LCD_CMD = 0   # RS low  → command register
LCD_DATA = 1  # RS high → data register

LCD_CLEAR = 0x01
LCD_HOME = 0x02
LCD_ENTRY_MODE = 0x06      # increment cursor, no display shift
LCD_DISPLAY_ON = 0x0C      # display on, cursor off, blink off
LCD_FUNCTION_SET = 0x28    # 4-bit mode, 2 lines, 5×8 font
LCD_SET_DDRAM = 0x80       # OR with address

# Row offsets for a 16×2 display
ROW_OFFSETS = [0x00, 0x40]

# PWM frequency — value doesn't matter much since we only use 0% and 100%
PWM_FREQ = 1000


class HD44780_PWM:
    """HD44780 LCD in 4-bit mode with PWM on RS and E pins."""

    def __init__(self, pin_rs=25, pin_e=24, pins_data=None, cols=16, rows=2):
        if pins_data is None:
            pins_data = [23, 17, 18, 22]

        self.pin_rs = pin_rs
        self.pin_e = pin_e
        self.pins_data = pins_data
        self.cols = cols
        self.rows = rows
        self._pwm_rs = None
        self._pwm_e = None

        # ── Set up all pins ────────────────────────────────────────
        # Data pins: regular GPIO output
        for pin in self.pins_data:
            GPIO.setup(pin, GPIO.OUT, initial=GPIO.LOW)

        # RS and E pins: PWM output
        GPIO.setup(self.pin_rs, GPIO.OUT, initial=GPIO.LOW)
        GPIO.setup(self.pin_e, GPIO.OUT, initial=GPIO.LOW)

        self._pwm_rs = GPIO.PWM(self.pin_rs, PWM_FREQ)
        self._pwm_e = GPIO.PWM(self.pin_e, PWM_FREQ)

        # Start both LOW (duty 0%)
        self._pwm_rs.start(0)
        self._pwm_e.start(0)
        time.sleep(0.05)

        # ── HD44780 initialisation sequence (4-bit) ────────────────
        # The datasheet requires sending 0x03 three times, then 0x02
        # to reliably enter 4-bit mode regardless of current state.
        time.sleep(0.05)               # wait >40ms after power-on
        self._write_nibble(0x03)       # function set (8-bit) — attempt 1
        time.sleep(0.005)              # wait >4.1ms
        self._write_nibble(0x03)       # function set (8-bit) — attempt 2
        time.sleep(0.001)              # wait >100µs
        self._write_nibble(0x03)       # function set (8-bit) — attempt 3
        time.sleep(0.001)
        self._write_nibble(0x02)       # switch to 4-bit mode
        time.sleep(0.001)

        # Now in 4-bit mode — send full commands
        self._command(LCD_FUNCTION_SET)  # 4-bit, 2 lines, 5×8
        self._command(LCD_DISPLAY_ON)    # display on, cursor off
        self._command(LCD_ENTRY_MODE)    # increment, no shift
        self.clear()
        time.sleep(0.05)

    # ── Low-level pin helpers ──────────────────────────────────────

    def _rs(self, value: bool):
        """Set RS via PWM: True=HIGH (data), False=LOW (command)."""
        self._pwm_rs.ChangeDutyCycle(100 if value else 0)
        time.sleep(0.0005)  # settle time

    def _pulse_e(self):
        """Pulse the Enable pin via PWM."""
        self._pwm_e.ChangeDutyCycle(0)
        time.sleep(0.0005)
        self._pwm_e.ChangeDutyCycle(100)
        time.sleep(0.0005)   # E pulse width >450ns
        self._pwm_e.ChangeDutyCycle(0)
        time.sleep(0.0005)   # hold time

    def _write_nibble(self, nibble: int):
        """Write the lower 4 bits of `nibble` to the data pins and pulse E."""
        for i, pin in enumerate(self.pins_data):
            GPIO.output(pin, (nibble >> i) & 1)
        self._pulse_e()

    def _send_byte(self, value: int, mode: int):
        """Send a byte to the LCD (high nibble first, then low nibble).

        mode: LCD_CMD (0) or LCD_DATA (1)
        """
        self._rs(bool(mode))
        self._write_nibble(value >> 4)    # high nibble
        self._write_nibble(value & 0x0F)  # low nibble

    def _command(self, cmd: int):
        """Send a command byte."""
        self._send_byte(cmd, LCD_CMD)
        time.sleep(0.002)  # most commands need <1.52ms

    # ── Public API ─────────────────────────────────────────────────

    def clear(self):
        """Clear the display and return cursor home."""
        self._command(LCD_CLEAR)
        time.sleep(0.003)  # clear needs extra time

    def home(self):
        """Return cursor to home position."""
        self._command(LCD_HOME)
        time.sleep(0.003)

    def set_cursor(self, row: int, col: int):
        """Move cursor to (row, col). Rows and cols are 0-indexed."""
        if row < 0 or row >= self.rows:
            row = 0
        if col < 0 or col >= self.cols:
            col = 0
        self._command(LCD_SET_DDRAM | (ROW_OFFSETS[row] + col))

    def write_string(self, text: str):
        """Write a string at the current cursor position."""
        for char in text[:self.cols]:  # clamp to display width
            self._send_byte(ord(char), LCD_DATA)

    def write_char(self, char_code: int):
        """Write a single character code at the current cursor position."""
        self._send_byte(char_code, LCD_DATA)

    def close(self, clear=True):
        """Release PWM and clean up."""
        try:
            if clear:
                self.clear()
        except Exception:
            pass
        try:
            if self._pwm_rs is not None:
                self._pwm_rs.stop()
                self._pwm_rs = None
        except Exception:
            pass
        try:
            if self._pwm_e is not None:
                self._pwm_e.stop()
                self._pwm_e = None
        except Exception:
            pass
