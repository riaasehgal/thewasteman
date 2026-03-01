"""
TFLite image classifier using a Google Teachable Machine model.

The model classifies the full frame into one of three food categories:
  0 – Croissant
  1 – Muffin
  2 – Pizza

Input : [1, 224, 224, 3]  float32  (RGB, normalised to [-1, 1])
Output: [1, 3]            float32  (softmax probabilities)
"""

import cv2
import numpy as np
import os

from ai_edge_litert.interpreter import Interpreter


# Class labels in the same order the Teachable Machine model was trained
LABELS = ["nothing", "pizza", "muffin", "croissant"]

# Minimum confidence required to count as a valid detection
CONFIDENCE_THRESHOLD = float(os.environ.get("CONFIDENCE_THRESHOLD", "0.60"))


class FoodClassifier:
    """Drop-in replacement for the old YOLOModel class."""

    def __init__(self):
        self.model = None          # set to non-None when ready
        self.interpreter = None
        self.input_details = None
        self.output_details = None
        self._load_model()

    # ── model loading ───────────────────────────────────────────────
    def _load_model(self):
        model_paths = [
            os.path.join(os.path.dirname(__file__), "..", "..", "..", "model_unquant.tflite"),
            os.path.join(os.path.dirname(__file__), "model_unquant.tflite"),
            "model_unquant.tflite",
        ]
        model_path = None
        for p in model_paths:
            if os.path.exists(p):
                model_path = os.path.realpath(p)
                break

        if model_path is None:
            print("ERROR: model_unquant.tflite not found!")
            return

        try:
            print(f"Loading TFLite model from {model_path} …")
            self.interpreter = Interpreter(model_path=model_path)
            self.interpreter.allocate_tensors()
            self.input_details = self.interpreter.get_input_details()
            self.output_details = self.interpreter.get_output_details()
            self.model = True  # flag used by callers to check readiness
            h, w = self.input_details[0]["shape"][1:3]
            print(f"Model loaded!  Input: {w}×{h}  Classes: {LABELS}")
        except Exception as e:
            print(f"Error loading model: {e}")

    # ── inference ───────────────────────────────────────────────────
    def predict(self, frame):
        """
        Classify a BGR frame (OpenCV format).

        Returns
        -------
        detected_objects : list[dict]
            Either one item (the winning class) or empty if below threshold.
        raw_probs : np.ndarray
            The full softmax output [1, 3] for debugging / logging.
        """
        if self.interpreter is None:
            return None, None

        try:
            print("Predicting…")
            h, w = self.input_details[0]["shape"][1:3]

            # Preprocess: resize, BGR→RGB, normalise to [-1, 1]
            img = cv2.resize(frame, (w, h))
            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            img = (img.astype(np.float32) / 127.5) - 1.0
            img = np.expand_dims(img, axis=0)   # (1, 224, 224, 3)

            self.interpreter.set_tensor(self.input_details[0]["index"], img)
            self.interpreter.invoke()
            probs = self.interpreter.get_tensor(self.output_details[0]["index"])[0]

            best_idx = int(np.argmax(probs))
            best_conf = float(probs[best_idx])
            label = LABELS[best_idx]

            # Log all probabilities
            prob_str = ", ".join(f"{LABELS[i]}: {probs[i]:.2%}" for i in range(len(LABELS)))
            print(f"  [{prob_str}]")

            if best_conf < CONFIDENCE_THRESHOLD:
                print(f"  Below threshold ({best_conf:.2%} < {CONFIDENCE_THRESHOLD:.0%}) — skipping")
                return [], probs

            detected_objects = [{
                "label": best_idx,
                "label_name": label,
                "confidence": best_conf,
                "count": 1,
            }]
            print(f"  → {label} ({best_conf:.1%})")
            return detected_objects, probs

        except Exception as e:
            print(f"Error predicting: {e}")
            return None, None


# Backward-compatible alias so existing imports keep working
YOLOModel = FoodClassifier
