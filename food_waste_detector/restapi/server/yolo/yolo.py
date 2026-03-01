from ultralytics import YOLO
import torch
import os


class YOLOModel:
    def __init__(self):
        self.device = "cpu"  # RPi5 has no CUDA GPU
        self.model = self.load_model()

    def load_model(self):
        try:
            print("Loading YOLO model...")
            # Try multiple possible weight paths
            weight_paths = [
                "server/yolo/weights/yolov11-x-weights-v6.pt",
                os.path.join(os.path.dirname(__file__), "weights", "yolov11-x-weights-v6.pt"),
            ]
            weight_path = None
            for path in weight_paths:
                if os.path.exists(path):
                    weight_path = path
                    break

            if weight_path is None:
                print("ERROR: Model weights not found! Download from:")
                print("https://github.com/joaopferreira19/Food-Waste-Detection-using-YOLOv11/releases/download/0.3.0/yolov11-x-weights-v6.pt")
                print("Place in: server/yolo/weights/yolov11-x-weights-v6.pt")
                return None

            model = YOLO(weight_path)
            model.to(self.device)
            print(f"Model loaded on {self.device}!")
            return model
        except Exception as e:
            print(f"Error loading model: {e}")
            return None

    def predict(self, frame):
        try:
            print("Predicting...")
            with torch.no_grad():
                results = self.model(frame, device=self.device)
            detected_objects = []
            for result in results:
                if result.masks is None:
                    # Fallback if segmentation masks are not available
                    for box in result.boxes:
                        detected_objects.append(
                            {
                                "label": box.cls.item(),
                                "label_name": result.names[box.cls.item()],
                                "confidence": box.conf.item(),
                                "box": box.xyxy.tolist(),
                                "area": 0,
                            }
                        )
                else:
                    for i, (mask, box) in enumerate(zip(result.masks.data, result.boxes)):
                        area = mask.sum().item()
                        detected_objects.append(
                            {
                                "label": box.cls.item(),
                                "label_name": result.names[box.cls.item()],
                                "confidence": box.conf.item(),
                                "box": box.xyxy.tolist(),
                                "area": area,
                            }
                        )

            print("Success!")
            return detected_objects, results
        except Exception as e:
            print(f"Error predicting: {e}")
            return None, None
