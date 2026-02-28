"""
Pi Camera service for Raspberry Pi 5 using picamera2.
Provides capture functionality for the food waste detection pipeline.
"""

import io
import numpy as np
from PIL import Image

try:
    from picamera2 import Picamera2
    PICAMERA_AVAILABLE = True
except ImportError:
    PICAMERA_AVAILABLE = False
    print("WARNING: picamera2 not available. Camera capture will be disabled.")
    print("Install with: sudo apt install python3-picamera2")


class CameraService:
    """Manages the Pi Camera for capturing images."""

    def __init__(self, resolution: tuple[int, int] = (1920, 1080)):
        self.resolution = resolution
        self.camera = None
        self._started = False

        if not PICAMERA_AVAILABLE:
            print("CameraService: picamera2 not available, running in mock mode")
            return

        try:
            self.camera = Picamera2()
            config = self.camera.create_still_configuration(
                main={"size": self.resolution, "format": "RGB888"}
            )
            self.camera.configure(config)
            print(f"CameraService: initialized with resolution {self.resolution}")
        except Exception as e:
            print(f"CameraService: failed to initialize camera: {e}")
            self.camera = None

    def start(self):
        """Start the camera if not already started."""
        if self.camera and not self._started:
            self.camera.start()
            self._started = True
            # Let the camera warm up / auto-expose
            import time
            time.sleep(1)
            print("CameraService: camera started")

    def stop(self):
        """Stop the camera."""
        if self.camera and self._started:
            self.camera.stop()
            self._started = False
            print("CameraService: camera stopped")

    def capture_image(self) -> Image.Image | None:
        """
        Capture a single image from the Pi Camera.
        Returns a PIL Image or None if capture fails.
        """
        if not self.camera:
            print("CameraService: no camera available")
            return None

        try:
            if not self._started:
                self.start()

            # Capture as numpy array (RGB)
            array = self.camera.capture_array()
            image = Image.fromarray(array)
            print(f"CameraService: captured image {image.size}")
            return image

        except Exception as e:
            print(f"CameraService: capture failed: {e}")
            return None

    def capture_bytes(self, format: str = "JPEG", quality: int = 90) -> bytes | None:
        """
        Capture an image and return as bytes.
        """
        image = self.capture_image()
        if image is None:
            return None

        buffer = io.BytesIO()
        image.save(buffer, format=format, quality=quality)
        return buffer.getvalue()

    def is_available(self) -> bool:
        """Check if the camera is available and working."""
        return self.camera is not None

    def __del__(self):
        self.stop()


# Singleton instance
_camera_service: CameraService | None = None


def get_camera_service(resolution: tuple[int, int] = (1920, 1080)) -> CameraService:
    """Get or create the singleton camera service instance."""
    global _camera_service
    if _camera_service is None:
        _camera_service = CameraService(resolution=resolution)
    return _camera_service
