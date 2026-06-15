"""SmartCampus AI — Face Detection Service.

Uses InsightFace RetinaFace for accurate multi-face detection
in classroom environments with varying angles and occlusions.
"""

import cv2
import numpy as np
from typing import List, Optional, Tuple
from ..config.settings import settings
from ..models.enrollment import DetectedFace, BoundingBox, FaceLandmarks


class FaceDetector:
    """Face detection using InsightFace RetinaFace engine."""

    def __init__(self):
        self.confidence_threshold = settings.detection_confidence_threshold
        self.max_faces = settings.max_faces_per_frame
        self._model = None

    @property
    def model(self):
        """Lazy-load the InsightFace model."""
        if self._model is None:
            import insightface
            self._model = insightface.app.FaceAnalysis(
                name="buffalo_l",
                providers=["CPUExecutionProvider"],
            )
            self._model.prepare(ctx_id=0, det_thresh=self.confidence_threshold)
        return self._model

    def detect(self, frame: np.ndarray) -> List[DetectedFace]:
        """Detect all faces in a frame.

        Args:
            frame: BGR image array

        Returns:
            List of DetectedFace objects with bounding boxes and landmarks
        """
        faces = self.model.get(frame)

        detected = []
        for i, face in enumerate(faces):
            if len(detected) >= self.max_faces:
                break

            bbox = face.bbox.astype(int)
            landmarks = face.landmark if hasattr(face, "landmark") else None

            detected.append(
                DetectedFace(
                    track_id=f"face_{i}",
                    bounding_box=BoundingBox(
                        x1=float(bbox[0]),
                        y1=float(bbox[1]),
                        x2=float(bbox[2]),
                        y2=float(bbox[3]),
                    ),
                    confidence=float(face.det_score),
                    landmarks=(
                        FaceLandmarks(
                            left_eye=tuple(landmarks[0]),
                            right_eye=tuple(landmarks[1]),
                            nose=tuple(landmarks[2]),
                            mouth_left=tuple(landmarks[3]),
                            mouth_right=tuple(landmarks[4]),
                        )
                        if landmarks is not None
                        else None
                    ),
                    frame_index=0,
                    timestamp=0.0,
                )
            )

        return detected

    def detect_batch(
        self, frames: List[np.ndarray]
    ) -> List[List[DetectedFace]]:
        """Detect faces across multiple frames."""
        return [self.detect(frame) for frame in frames]

    def get_face_crops(
        self, frame: np.ndarray, detections: List[DetectedFace]
    ) -> List[Tuple[DetectedFace, np.ndarray]]:
        """Extract face image crops from frame based on detections."""
        crops = []
        for det in detections:
            bb = det.bounding_box
            x1, y1, x2, y2 = (
                max(0, int(bb.x1)),
                max(0, int(bb.y1)),
                min(frame.shape[1], int(bb.x2)),
                min(frame.shape[0], int(bb.y2)),
            )
            if x2 > x1 and y2 > y1:
                crop = frame[y1:y2, x1:x2]
                if crop.size > 0:
                    crops.append((det, crop))
        return crops

    def compute_quality_score(self, face_crop: np.ndarray) -> float:
        """Estimate face image quality based on sharpness and size."""
        if face_crop.size == 0:
            return 0.0

        h, w = face_crop.shape[:2]
        size_score = min(1.0, (h * w) / (120 * 120))

        gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        sharpness_score = min(1.0, laplacian_var / 100.0)

        brightness = np.mean(gray) / 255.0
        brightness_score = 1.0 - abs(brightness - 0.5) * 2

        quality = (size_score * 0.4 + sharpness_score * 0.35 + brightness_score * 0.25)
        return float(round(quality, 3))

    def get_best_faces(
        self, face_crops: List[Tuple[DetectedFace, np.ndarray]], top_k: int = 5
    ) -> List[Tuple[DetectedFace, np.ndarray, float]]:
        """Select the highest quality faces from a set."""
        scored = []
        for det, crop in face_crops:
            quality = self.compute_quality_score(crop)
            scored.append((det, crop, quality))

        scored.sort(key=lambda x: x[2], reverse=True)
        return scored[:top_k]
