"""
Camera capture + detection endpoint.
Captures an image from the Pi Camera and runs food waste detection.
"""

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
from server.yolo.yolo import YOLOModel
from server.camera.camera import get_camera_service
from PIL import Image
import base64
import io

router = APIRouter()

# Reuse the same YOLO model instance
yolo_model = YOLOModel()


@router.get("/camera/status")
async def camera_status():
    """Check if the Pi Camera is available."""
    camera = get_camera_service()
    return JSONResponse(
        content={
            "available": camera.is_available(),
            "resolution": list(camera.resolution),
        }
    )


@router.post("/camera/capture")
async def capture_image():
    """Capture an image from the Pi Camera and return it as base64."""
    camera = get_camera_service()

    if not camera.is_available():
        return JSONResponse(
            content={"error": "Pi Camera is not available. Check connection."},
            status_code=503,
        )

    image = camera.capture_image()
    if image is None:
        return JSONResponse(
            content={"error": "Failed to capture image from camera."},
            status_code=500,
        )

    # Convert to base64
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=90)
    base64_image = base64.b64encode(buffer.getvalue()).decode("utf-8")

    return JSONResponse(
        content={
            "image_base64": base64_image,
            "width": image.width,
            "height": image.height,
        }
    )


@router.post("/camera/detect")
async def capture_and_detect():
    """
    Capture an image from the Pi Camera and run food waste detection on it.
    This is the main endpoint for the RPi5 + PiCam workflow.
    """
    camera = get_camera_service()

    if not camera.is_available():
        return JSONResponse(
            content={"error": "Pi Camera is not available. Check connection."},
            status_code=503,
        )

    # Capture image
    image = camera.capture_image()
    if image is None:
        return JSONResponse(
            content={"error": "Failed to capture image from camera."},
            status_code=500,
        )

    # Run YOLO detection
    detected_objects, results = yolo_model.predict(image)

    if results is None:
        return JSONResponse(
            content={"error": "Error in object detection"},
            status_code=500,
        )

    # Save annotated image
    output_image_path = "output_image.jpg"
    results[0].save(output_image_path)

    # Generate clustering image
    clustering_image_array = results[0].plot(
        boxes=False, labels=True, color_mode="class"
    )
    clustering_image = Image.fromarray(clustering_image_array)
    clustering_image_path = "clustering_image.jpg"
    clustering_image.save(clustering_image_path)

    # Convert images to base64
    with open(output_image_path, "rb") as f:
        base64_image = base64.b64encode(f.read()).decode("utf-8")

    with open(clustering_image_path, "rb") as f:
        base64_clustering_image = base64.b64encode(f.read()).decode("utf-8")

    # Calculate waste percentage
    garbage_classes = {35.0}
    ignore_classes = {58.0, 31.0, 42.0, 70.0, 83.0, 25.0, 27.0, 22.0, 11.0, 8.0}
    plate_area = 0
    garbage_area = 0
    food_area = 0

    for obj in detected_objects:
        if obj["label"] == 58.0:
            plate_area += obj["area"]
        if obj["label"] in garbage_classes:
            garbage_area += obj["area"]
        if obj["label"] not in garbage_classes and obj["label"] not in ignore_classes:
            food_area += obj["area"]

    if plate_area == 0:
        return JSONResponse(
            content={"error": "No plate detected in the image"},
            status_code=400,
        )

    if plate_area > garbage_area:
        waste_percentage = (food_area / (plate_area - garbage_area)) * 100
    else:
        waste_percentage = 0

    waste_percentage = min(max(waste_percentage, 0), 100)

    return JSONResponse(
        content={
            "objects": detected_objects,
            "image_base64": base64_image,
            "clustering_image_base64": base64_clustering_image,
            "waste_percentage": waste_percentage,
            "food_area": food_area,
            "garbage_area": garbage_area,
            "plate_area": plate_area,
        }
    )
