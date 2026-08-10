"""SmartCampus AI — Face Embedding Service.

Generates 512-dimensional normalized embeddings using ArcFace (from the buffalo_l suite).
Calculates and normalizes average embeddings for students during enrollment.
"""

import logging
import cv2
import numpy as np
from typing import List, Optional, Any
from .face_detector import face_detector

logger = logging.getLogger("smartcampus.embedding")


class EmbeddingService:
    """Extracts, normalizes, and averages ArcFace embeddings from face crops."""

    def __init__(self):
        self.embedding_size = 512

    def generate_embedding(self, face_crop: np.ndarray, landmarks: Optional[Any] = None) -> Optional[np.ndarray]:
        """Extract a 512D ArcFace embedding from a cropped BGR face image with 5-point landmark alignment."""
        if face_crop is None or face_crop.size == 0:
            return None

        try:
            from .face_quality_service import face_quality_service
            aligned = face_quality_service.align_face(face_crop, landmarks)

            # Get recognition model from detector singleton
            rec_model = face_detector.model.models.get("recognition")
            if rec_model is not None:
                feat = rec_model.get_feat(aligned)
                if feat is not None:
                    emb = feat.flatten()
                    norm = np.linalg.norm(emb)
                    if norm > 0:
                        emb = emb / norm
                    return emb

            # Fallback if recognition model is not directly accessible
            faces = face_detector.model.get(rgb_crop)
            if faces:
                best_face = max(faces, key=lambda f: f.det_score)
                if hasattr(best_face, "embedding") and best_face.embedding is not None:
                    emb = best_face.embedding.copy()
                    norm = np.linalg.norm(emb)
                    if norm > 0:
                        emb = emb / norm
                    return emb
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")

        return None

    def generate_embeddings_batch(self, face_crops: List[np.ndarray]) -> List[np.ndarray]:
        """Generate embeddings for a list of face crop images. Skips empty results."""
        embeddings = []
        for crop in face_crops:
            emb = self.generate_embedding(crop)
            if emb is not None:
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
