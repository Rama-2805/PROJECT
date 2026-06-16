"""SmartCampus AI — Mock LocateAnything Worker.

Simulates Vision-Language Grounding, Object Detection, GUI Grounding,
and OCR endpoints without loading 3B model weights to run on low-RAM (e.g. 4GB) setups.
"""

import re
import random
from PIL import Image

class LocateAnythingWorker:
    """Mock worker emulating nvidia/LocateAnything-3B model responses."""

    def __init__(self, model_name_or_path: str = "nvidia/LocateAnything-3B", **kwargs):
        self.model_name_or_path = model_name_or_path
        self.use_batch_runtime = kwargs.get("use_batch_runtime", False)
        print(f"[LocateAnything-Mock] Initialized worker for {model_name_or_path} (Simulation Mode)")

    def detect(self, img: Image.Image, classes: list[str]) -> dict:
        """Simulate object detection.

        Returns boxes matching standard coords [0, 1000].
        """
        # Get image dimensions to return valid outputs if parsed
        width, height = img.size

        # Generate some mock bounding boxes for classes
        answers = []
        parsed_boxes = []

        for cls in classes:
            # Let's say we detect 1-2 items per requested class
            num_detections = random.randint(1, 2)
            for _ in range(num_detections):
                # Coordinates in 0-1000 range
                x1 = random.randint(50, 700)
                y1 = random.randint(50, 700)
                x2 = min(1000, x1 + random.randint(100, 250))
                y2 = min(1000, y1 + random.randint(100, 250))

                answers.append(f"<ref>{cls}</ref><box><{x1}><{y1}><{x2}><{y2}></box>")
                parsed_boxes.append({
                    "label": cls,
                    "box_raw": [x1, y1, x2, y2],
                    "box_pixels": {
                        "x1": x1 / 1000 * width,
                        "y1": y1 / 1000 * height,
                        "x2": x2 / 1000 * width,
                        "y2": y2 / 1000 * height,
                    }
                })

        full_answer = "".join(answers) if answers else "<box>none</box>"

        return {
            "answer": full_answer,
            "detections": parsed_boxes,
            "model": self.model_name_or_path,
            "device": "cpu (mock)",
        }

    def ground_multi(self, img: Image.Image, query: str) -> dict:
        """Simulate phrase grounding / referring expression comprehension."""
        width, height = img.size

        # Generate mock boxes for query phrase
        x1, y1 = random.randint(100, 500), random.randint(100, 500)
        x2, y2 = min(1000, x1 + 300), min(1000, y1 + 300)

        answer = f"<ref>{query}</ref><box><{x1}><{y1}><{x2}><{y2}></box>"

        return {
            "answer": answer,
            "boxes": [{
                "x1": x1 / 1000 * width,
                "y1": y1 / 1000 * height,
                "x2": x2 / 1000 * width,
                "y2": y2 / 1000 * height,
            }],
            "model": self.model_name_or_path,
            "device": "cpu (mock)",
        }

    def detect_text(self, img: Image.Image) -> dict:
        """Simulate scene text OCR detection."""
        width, height = img.size

        # Return mock text boxes
        mock_texts = ["Welcome to SmartCampus", "Classroom 101", "Lecture: AI-101"]
        answers = []
        parsed_texts = []

        for i, text in enumerate(mock_texts):
            x1 = 200
            y1 = 100 + i * 150
            x2 = 600
            y2 = y1 + 80
            answers.append(f"<ref>{text}</ref><box><{x1}><{y1}><{x2}><{y2}></box>")
            parsed_texts.append({
                "text": text,
                "box_pixels": {
                    "x1": x1 / 1000 * width,
                    "y1": y1 / 1000 * height,
                    "x2": x2 / 1000 * width,
                    "y2": y2 / 1000 * height,
                }
            })

        return {
            "answer": "".join(answers),
            "texts": parsed_texts,
            "model": self.model_name_or_path,
            "device": "cpu (mock)",
        }

    def ground_gui(self, img: Image.Image, query: str, output_type: str = "point") -> dict:
        """Simulate GUI grounding (buttons, click points)."""
        width, height = img.size

        x = random.randint(100, 900)
        y = random.randint(100, 900)

        if output_type == "point":
            answer = f"<box><{x}><{y}></box>"
            return {
                "answer": answer,
                "point": {
                    "x": x / 1000 * width,
                    "y": y / 1000 * height,
                },
                "model": self.model_name_or_path,
                "device": "cpu (mock)",
            }
        else:
            x2 = min(1000, x + 100)
            y2 = min(1000, y + 50)
            answer = f"<box><{x}><{y}><{x2}><{y2}></box>"
            return {
                "answer": answer,
                "box": {
                    "x1": x / 1000 * width,
                    "y1": y / 1000 * height,
                    "x2": x2 / 1000 * width,
                    "y2": y2 / 1000 * height,
                },
                "model": self.model_name_or_path,
                "device": "cpu (mock)",
            }

    def point(self, img: Image.Image, query: str) -> dict:
        """Simulate standard pointing task."""
        width, height = img.size
        x = random.randint(100, 900)
        y = random.randint(100, 900)

        answer = f"<box><{x}><{y}></box>"
        return {
            "answer": answer,
            "point": {
                "x": x / 1000 * width,
                "y": y / 1000 * height,
            },
            "model": self.model_name_or_path,
            "device": "cpu (mock)",
        }
