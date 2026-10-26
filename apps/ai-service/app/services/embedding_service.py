"""SmartCampus AI — Face Embedding Service.

Generates 512-dimensional normalized embeddings using ArcFace (from the buffalo_l suite).
Calculates and normalizes average embeddings for students during enrollment.
"""

import logging
import cv2
import numpy as np
from typing import List, Optional, Any
from app.config.settings import settings
from .face_detector import face_detector

logger = logging.getLogger("smartcampus.embedding")


class EmbeddingService:
    """Extracts, normalizes, and averages ArcFace embeddings from face crops."""

    def __init__(self):
        self.embedding_size = 512

    @property
    def rec_model(self):
        """Lazy-load or retrieve the 512D ArcFace recognition model."""
        if not hasattr(self, "_rec_model") or self._rec_model is None:
            self._rec_model = None
            try:
                m = face_detector.model
                if m and hasattr(m, "models") and "recognition" in m.models:
                    self._rec_model = m.models["recognition"]
            except Exception:
                pass
            if self._rec_model is None:
                try:
                    import os
                    import insightface
                    from pathlib import Path
                    custom_arcface = os.getenv("ARCFACE_MODEL_PATH")
                    custom_root = os.getenv("INSIGHTFACE_ROOT")
                    candidate_paths = [
                        Path(custom_arcface) if custom_arcface else None,
                        Path(custom_root) / "models" / "buffalo_l" / "w600k_r50.onnx" if custom_root else None,
                        Path("/root/.insightface/models/buffalo_l/w600k_r50.onnx"),
                        Path.home() / ".insightface" / "models" / "buffalo_l" / "w600k_r50.onnx",
                        Path("/app/models/buffalo_l/w600k_r50.onnx"),
                        Path("models/buffalo_l/w600k_r50.onnx"),
                        Path("apps/ai-service/models/buffalo_l/w600k_r50.onnx"),
                    ]
                    for rec_path in candidate_paths:
                        if rec_path is None:
                            continue
                        try:
                            if rec_path.exists():
                                self._rec_model = insightface.model_zoo.get_model(str(rec_path))
                                self._rec_model.prepare(ctx_id=-1)
                                logger.info(f"Loaded ArcFace model from {rec_path}")
                                break
                        except Exception:
                            continue
                except Exception as e:
                    logger.error(f"Failed to directly load ArcFace recognition model: {e}")
        return self._rec_model

    def generate_embedding(self, face_crop: np.ndarray, landmarks: Optional[Any] = None) -> Optional[np.ndarray]:
        """Extract a 512D ArcFace embedding from a cropped BGR face image with 5-point landmark alignment."""
        if face_crop is None or getattr(face_crop, 'size', 0) == 0:
            return None

        # Reject crops below minimum face detection dimensions (ArcFace requires at least 24x24)
        if len(face_crop.shape) < 3 or face_crop.shape[0] < 24 or face_crop.shape[1] < 24:
            return None

        # Reject blank white, overexposed, or featureless uniform patches
        gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY) if len(face_crop.shape) == 3 else face_crop
        if float(np.std(gray)) < 12.0 or float(np.mean(gray >= 245)) > 0.40:
            return None

        try:
            from .face_quality_service import face_quality_service
            aligned = face_quality_service.align_face(face_crop, landmarks)

            rec_model = self.rec_model
            if rec_model is not None:
                feat = rec_model.get_feat(aligned)
                if feat is not None:
                    emb = feat.flatten()
                    if not np.all(np.isfinite(emb)):
                        return None
                    norm = np.linalg.norm(emb)
                    if norm > 1e-4:
                        return (emb / norm).astype(np.float32)
                    return None

            # Fallback if recognition model is not directly accessible
            input_crop = aligned if (aligned is not None and getattr(aligned, 'size', 0) > 0) else face_crop
            rgb_crop = cv2.cvtColor(input_crop, cv2.COLOR_BGR2RGB)
            if face_detector.model is not None:
                faces = face_detector.model.get(rgb_crop)
                if faces:
                    best_face = max(faces, key=lambda f: f.det_score)
                    if hasattr(best_face, "embedding") and best_face.embedding is not None:
                        emb = best_face.embedding.copy()
                        if not np.all(np.isfinite(emb)):
                            return None
                        norm = np.linalg.norm(emb)
                        if norm > 1e-4:
                            return (emb / norm).astype(np.float32)
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")

        return None

    def generate_embeddings_batch(self, face_crops: List[np.ndarray]) -> List[Optional[np.ndarray]]:
        """Generate embeddings for a list of face crop images in batches."""
        if not face_crops:
            return []
        batch_size = getattr(settings, "arcface_batch_size", 8)
        embeddings: List[Optional[np.ndarray]] = []
        for i in range(0, len(face_crops), batch_size):
            chunk = face_crops[i:i + batch_size]
            for crop in chunk:
                emb = self.generate_embedding(crop)
                embeddings.append(emb)
        return embeddings

    def compute_average_embedding(self, embeddings: List[np.ndarray]) -> Optional[np.ndarray]:
        """Compute the L2-normalized centroid (average) vector of a list of embeddings.

        Args:
            embeddings: List of 512D numpy embeddings

        Returns:
            Normalized 512-dimensional numpy array, or None if the list is empty
        """
        if not embeddings:
            return None

        # Calculate mean across each of the 512 dimensions
        mean_emb = np.mean(embeddings, axis=0)

        # L2-normalize the resulting average vector
        norm = np.linalg.norm(mean_emb)
        if norm > 0:
            mean_emb = mean_emb / norm
            
        return mean_emb

    def compute_similarity(self, embedding1: np.ndarray, embedding2: np.ndarray) -> float:
        """Compute cosine similarity (dot product of L2-normalized vectors) between two embeddings.

        Args:
            embedding1: 512D normalized numpy array
            embedding2: 512D normalized numpy array

        Returns:
            Float similarity score between -1.0 and 1.0 (or 0.0 to 1.0)
        """
        # Since our embeddings are already L2 normalized, cosine similarity is just the dot product
        similarity = float(np.dot(embedding1, embedding2))
        return similarity


# Singleton instance
embedding_service = EmbeddingService()
