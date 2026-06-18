"""SmartCampus AI — Face Embedding Service.

Generates 512-dimensional normalized embeddings using ArcFace (from the buffalo_l suite).
Calculates and normalizes average embeddings for students during enrollment.
"""

import logging
import cv2
import numpy as np
from typing import List, Optional
from .face_detector import face_detector

logger = logging.getLogger("smartcampus.embedding")


class EmbeddingService:
    """Extracts, normalizes, and averages ArcFace embeddings from face crops."""

    def __init__(self):
        self.embedding_size = 512

    def generate_embedding(self, face_crop: np.ndarray) -> Optional[np.ndarray]:
        """Extract a 512D ArcFace embedding from a cropped BGR face image.

        Args:
            face_crop: OpenCV BGR cropped face image

        Returns:
            L2-normalized 512D float array embedding, or None if no face is found
        """
        if face_crop is None or face_crop.size == 0:
            return None

        # Convert crop to RGB
        rgb_crop = cv2.cvtColor(face_crop, cv2.COLOR_BGR2RGB)

        try:
            # Reuses the FaceAnalysis model from the detector to prevent double loading
            faces = face_detector.model.get(rgb_crop)
            
            if not faces:
                # If direct crop detection fails, try resizing to 112x112 (ArcFace standard size)
                resized = cv2.resize(rgb_crop, (112, 112), interpolation=cv2.INTER_AREA)
                faces = face_detector.model.get(resized)

            if faces:
                # Select the face with the largest area/confidence in the crop
                best_face = max(faces, key=lambda f: f.det_score)
                if hasattr(best_face, "embedding") and best_face.embedding is not None:
                    emb = best_face.embedding.copy()
                    
                    # L2-normalize the embedding vector
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
