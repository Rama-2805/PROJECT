"""SmartCampus AI — Face Detection Service.

Uses InsightFace FaceAnalysis (buffalo_l model) on CPU to locate and crop faces.
Filters detections based on confidence thresholds.
"""

import logging
import cv2
import numpy as np
from typing import List, Dict, Any, Tuple
from ..config.settings import settings

logger = logging.getLogger("smartcampus.detector")


from pathlib import Path

def check_and_download_models():
    """Verify if buffalo_l exists, otherwise download it showing progress logs."""
    model_dir = Path.home() / ".insightface" / "models" / "buffalo_l"
    if not model_dir.exists():
        print("Downloading InsightFace Models...")
        print("Downloading buffalo_l...")
        logger.info("Downloading InsightFace Models...")
        logger.info("Downloading buffalo_l...")
        try:
            import insightface
            # Initialize with default to trigger download
            model = insightface.app.FaceAnalysis(name="buffalo_l")
            model.prepare(ctx_id=-1)
            print("Download Complete.")
            logger.info("Download Complete.")
        except Exception as e:
            logger.error(f"Failed to download models: {e}")
            raise e


class FaceDetector:
    """Detects faces in video frames using InsightFace and generates crops."""

    def __init__(self, providers: List[str] = None):
        self.confidence_threshold = settings.detection_confidence_threshold
        self._model = None
        self.requested_providers = providers

    @property
    def model(self):
        """Lazy-load the InsightFace FaceAnalysis model to save memory during import."""
        if self._model is None:
            try:
                import insightface
                import onnxruntime as ort
                
                # Dynamic provider filtering
                available_providers = ort.get_available_providers()
                requested = self.requested_providers or ["CoreMLExecutionProvider", "CPUExecutionProvider"]
                providers = [p for p in requested if p in available_providers]
                if not providers:
                    providers = ["CPUExecutionProvider"]
                
                provider_options = []
                for p in providers:
                    if p == "CoreMLExecutionProvider":
                        provider_options.append({})
                    elif p == "CPUExecutionProvider":
                        provider_options.append({
                            "intra_op_num_threads": 4,
                            "inter_op_num_threads": 4
                        })
                    else:
                        provider_options.append({})
                
                logger.info(f"Initializing InsightFace FaceAnalysis (buffalo_l) with ONNX execution providers: {providers} with options: {provider_options}")
                
                self._model = insightface.app.FaceAnalysis(
                    name="buffalo_l",
                    providers=providers,
                    provider_options=provider_options
                )
                # Initialize with detection threshold
                self._model.prepare(ctx_id=-1, det_thresh=self.confidence_threshold)
                logger.info("InsightFace FaceAnalysis model loaded successfully.")
            except Exception as e:
                logger.error(f"Failed to load InsightFace FaceAnalysis model: {e}")
                raise e
        return self._model

    def detect_faces(self, frame: np.ndarray) -> List[Dict[str, Any]]:
        """Detect all faces in a BGR image frame.

        Args:
            frame: OpenCV BGR image array

        Returns:
            List of dictionaries, each containing:
                - "bbox": List of [x1, y1, x2, y2] ints
                - "confidence": Float detection score
                - "landmarks": Numpy array of 5 facial points (eyes, nose, mouth corners)
                - "crop": OpenCV BGR image crop of the face
                - "raw_face": The original face object from InsightFace
        """
        if frame is None or frame.size == 0:
            return []

        # Convert frame to RGB since InsightFace expects RGB
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Get face analysis outputs
        try:
            faces = self.model.get(rgb_frame)
        except Exception as e:
            logger.error(f"Error during face detection: {e}")
            return []

        detections = []
        for face in faces:
            confidence = float(face.det_score)
            
            # Filter detections by minimum confidence threshold of 0.8
            if confidence < self.confidence_threshold:
                continue

            bbox = face.bbox.astype(int)
            # Ensure coordinates stay within the frame boundaries
            h, w = frame.shape[:2]
            x1 = max(0, int(bbox[0]))
            y1 = max(0, int(bbox[1]))
            x2 = min(w, int(bbox[2]))
            y2 = min(h, int(bbox[3]))

            # Ignore invalid boxes
            if x2 <= x1 or y2 <= y1:
                continue

            # Crop the face from the original BGR frame
            face_crop = frame[y1:y2, x1:x2].copy()
            if face_crop.size == 0:
                continue

            landmarks = face.landmark if hasattr(face, "landmark") else None

            detections.append({
                "bbox": [x1, y1, x2, y2],
                "confidence": confidence,
                "landmarks": landmarks,
                "crop": face_crop,
                "raw_face": face
            })

        return detections


# Singleton instance
face_detector = FaceDetector()
