"""SmartCampus AI — Face Embedding Service.

Generates 512-dimensional ArcFace embeddings from detected face crops.
Handles alignment and normalization before embedding extraction.
"""

import cv2
import numpy as np
from typing import List, Tuple, Optional
from ..config.settings import settings
from ..models.enrollment import FaceEmbedding, DetectedFace, BoundingBox


class FaceEmbedder:
    """Generates face embeddings using InsightFace ArcFace model."""

    def __init__(self):
        self.embedding_size = settings.embedding_size
        self.confidence_threshold = settings.recognition_confidence_threshold
        self._model = None

    @property
    def model(self):
        """Lazy-load the InsightFace recognition model."""
        if self._model is None:
            import insightface
            self._model = insightface.app.FaceAnalysis(
                name="buffalo_l",
                providers=["CPUExecutionProvider"],
            )
            self._model.prepare(ctx_id=0)
        return self._model

    def align_face(self, face_crop: np.ndarray) -> np.ndarray:
        """Align face to standard size for consistent embedding."""
        if face_crop.size == 0:
            return face_crop

        h, w = face_crop.shape[:2]
        if h < 20 or w < 20:
            return face_crop

        aligned = cv2.resize(face_crop, (112, 112), interpolation=cv2.INTER_AREA)
        return aligned

    def generate_embedding(self, face_crop: np.ndarray) -> Optional[np.ndarray]:
        """Generate 512D embedding vector from a face crop using InsightFace.

        InsightFace's .get() method returns face objects that each contain
        a .embedding attribute (512-dimensional numpy array).

        Args:
            face_crop: Face image crop (BGR format)

        Returns:
            512-dimensional embedding vector or None if no face detected
        """
        if face_crop.size == 0:
            return None

        aligned = self.align_face(face_crop)

        # InsightFace expects RGB input
        rgb = cv2.cvtColor(aligned, cv2.COLOR_BGR2RGB)

        # Detect and get embedding in a single call
        # InsightFace .get() returns list of Face objects with .embedding attr
        faces = self.model.get(rgb)

        if faces and len(faces) > 0:
            # Take the highest confidence face
            best_face = max(faces, key=lambda f: f.det_score)
            if hasattr(best_face, "embedding") and best_face.embedding is not None:
                return best_face.embedding

        return None

    def generate_embeddings_batch(
        self, face_crops: List[np.ndarray]
    ) -> List[Optional[np.ndarray]]:
        """Generate embeddings for multiple face crops."""
        return [self.generate_embedding(crop) for crop in face_crops]

    def compute_similarity(
        self, embedding1: np.ndarray, embedding2: np.ndarray
    ) -> float:
        """Compute cosine similarity between two embeddings."""
        norm1 = np.linalg.norm(embedding1)
        norm2 = np.linalg.norm(embedding2)

        if norm1 == 0 or norm2 == 0:
            return 0.0

        similarity = float(np.dot(embedding1, embedding2) / (norm1 * norm2))
        # Scale from [-1, 1] to [0, 1]
        return max(0.0, min(1.0, (similarity + 1) / 2))

    def create_face_embedding(
        self,
        face_crop: np.ndarray,
        detection: DetectedFace,
        quality_score: float,
    ) -> Optional[FaceEmbedding]:
        """Create a complete FaceEmbedding object from a face crop."""
        embedding = self.generate_embedding(face_crop)
        if embedding is None:
            return None

        return FaceEmbedding(
            face_id=f"face_{abs(hash(str(detection.bounding_box)))}",
            embedding=embedding.tolist(),
            quality_score=quality_score,
            detection_metadata={
                "confidence": detection.confidence,
                "bbox": detection.bounding_box.model_dump(),
            },
        )
