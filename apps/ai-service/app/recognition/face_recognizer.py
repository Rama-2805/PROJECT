"""SmartCampus AI — Real-Time Face Recognition Engine.

Matches detected faces against enrolled student embeddings
using cosine similarity with multi-frame verification.
"""

import time
import numpy as np
from typing import Optional, List, Tuple
from dataclasses import dataclass, field

from ..config.settings import settings
from ..models.enrollment import DetectedFace, BoundingBox


@dataclass
class RecognitionResult:
    student_id: str
    student_name: str
    confidence: float
    bounding_box: BoundingBox
    timestamp: float
    camera_id: str
    is_verified: bool = False


@dataclass
class CandidateMatch:
    student_id: str
    student_name: str
    similarity: float
    embedding: np.ndarray


@dataclass
class TemporalBuffer:
    """Stores recent recognition results for multi-frame verification."""
    student_id: str
    confidences: List[float] = field(default_factory=list)
    timestamps: List[float] = field(default_factory=list)
    verified: bool = False


class FaceRecognizer:
    """Real-time face recognition engine with temporal verification."""

    def __init__(self):
        self.confidence_threshold = settings.recognition_confidence_threshold
        self.embedding_size = settings.embedding_size

        # In-memory face database (student_id -> embedding)
        # In production, this would load from PostgreSQL/pgvector or FAISS
        self._face_database: dict[str, Tuple[np.ndarray, str]] = {}

        # Temporal buffers for multi-frame verification
        self._temporal_buffers: dict[str, TemporalBuffer] = {}

        # Verification parameters
        self.min_consecutive_matches = 3
        self.verification_window_seconds = 5.0
        self.confidence_average_minimum = 0.85

        # Load face database from the enrollment module
        self._embedder = None

    @property
    def embedder(self):
        """Lazy-load the face embedder service."""
        if self._embedder is None:
            from ..services.face_embedder import FaceEmbedder
            self._embedder = FaceEmbedder()
        return self._embedder

    def load_database(self, embeddings: List[Tuple[str, str, np.ndarray]]) -> int:
        """Load student face embeddings into the recognition database.

        Args:
            embeddings: List of (student_id, student_name, embedding_vector) tuples

        Returns:
            Number of embeddings loaded
        """
        count = 0
        for student_id, student_name, embedding in embeddings:
            self._face_database[student_id] = (embedding, student_name)
            count += 1
        return count

    def clear_database(self) -> None:
        """Clear the face database."""
        self._face_database.clear()

    def find_best_match(
        self, embedding: np.ndarray
    ) -> Optional[CandidateMatch]:
        """Find the best matching student for a face embedding.

        Uses cosine similarity against all enrolled embeddings.
        """
        if len(self._face_database) == 0 or embedding is None:
            return None

        best_match = None
        best_similarity = 0.0

        for student_id, (stored_emb, student_name) in self._face_database.items():
            similarity = self.embedder.compute_similarity(embedding, stored_emb)

            if similarity > best_similarity:
                best_similarity = similarity
                best_match = CandidateMatch(
                    student_id=student_id,
                    student_name=student_name,
                    similarity=similarity,
                    embedding=stored_emb,
                )

        if best_match and best_similarity >= self.confidence_threshold:
            return best_match

        return None

    def verify_temporal(self, student_id: str, confidence: float) -> bool:
        """Multi-frame verification — only confirm identity after N consecutive matches.

        Args:
            student_id: The candidate student ID
            confidence: Current frame confidence score

        Returns:
            True if identity is verified across multiple frames
        """
        now = time.time()

        if student_id not in self._temporal_buffers:
            self._temporal_buffers[student_id] = TemporalBuffer(student_id=student_id)

        buffer = self._temporal_buffers[student_id]

        # Clean old entries outside the verification window
        while buffer.timestamps and (now - buffer.timestamps[0]) > self.verification_window_seconds:
            buffer.confidences.pop(0)
            buffer.timestamps.pop(0)

        # Add current detection
        buffer.confidences.append(confidence)
        buffer.timestamps.append(now)

        # Check verification conditions
        if len(buffer.confidences) >= self.min_consecutive_matches:
            avg_confidence = np.mean(buffer.confidences)
            if avg_confidence >= self.confidence_average_minimum:
                buffer.verified = True
                return True

        return False

    def reset_temporal(self, student_id: Optional[str] = None) -> None:
        """Reset temporal verification buffer for a student or all."""
        if student_id:
            self._temporal_buffers.pop(student_id, None)
        else:
            self._temporal_buffers.clear()

    def recognize_face(
        self,
        embedding: np.ndarray,
        bounding_box: BoundingBox,
        camera_id: str,
        timestamp: float,
    ) -> Optional[RecognitionResult]:
        """Full recognition pipeline for a single face.

        1. Find best match in face database
        2. Apply temporal verification
        3. Return recognition result or None
        """
        match = self.find_best_match(embedding)
        if not match:
            return None

        is_verified = self.verify_temporal(match.student_id, match.similarity)

        return RecognitionResult(
            student_id=match.student_id,
            student_name=match.student_name,
            confidence=match.similarity,
            bounding_box=bounding_box,
            timestamp=timestamp,
            camera_id=camera_id,
            is_verified=is_verified,
        )

    def recognize_batch(
        self,
        embeddings: List[np.ndarray],
        detections: List[DetectedFace],
        camera_id: str,
    ) -> List[Optional[RecognitionResult]]:
        """Recognize multiple faces in a single frame."""
        results = []
        timestamp = time.time()

        for emb, det in zip(embeddings, detections):
            if emb is None:
                results.append(None)
                continue

            result = self.recognize_face(emb, det.bounding_box, camera_id, timestamp)
            results.append(result)

        return results

    def get_database_stats(self) -> dict:
        """Get statistics about the loaded face database."""
        return {
            "total_students": len(self._face_database),
            "embedding_dimension": self.embedding_size,
        }


# Global recognizer instance
face_recognizer = FaceRecognizer()
