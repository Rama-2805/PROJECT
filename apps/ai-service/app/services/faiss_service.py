"""SmartCampus AI — FAISS Vector Search Service.

Provides L2-normalized cosine similarity search over enrolled student embeddings.
Saves index and metadata mapping to vectors/face_index.faiss and vectors/metadata.json.
"""

import os
import json
import logging
from pathlib import Path
import numpy as np
from typing import Dict, Optional, Tuple, List
from ..config.settings import settings

logger = logging.getLogger("smartcampus.faiss")

# Import faiss
try:
    import faiss
except ImportError:
    logger.error("FAISS is not installed. Please verify dependencies.")
    raise


class FaissService:
    """Manages the FAISS Index and mapping metadata for student face recognition."""

    def __init__(self):
        self.dimension = 512
        # Resolve project root (5 levels up from faiss_service.py)
        project_root = Path(__file__).resolve().parents[4]
        if (project_root / "vectors").exists():
            self.index_path = (project_root / "vectors" / "face_index.faiss").resolve()
            self.metadata_path = (project_root / "vectors" / "metadata.json").resolve()
        else:
            self.index_path = Path(settings.face_index_path).resolve()
            self.metadata_path = Path(settings.metadata_path).resolve()
        
        # Ensure vectors folder exists
        self.index_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Internal state: FAISS index and metadata
        self.index = None
        # Maps index integer ID -> student_usn
        self.metadata: Dict[str, str] = {}
        
        self.load_index()

    def load_index(self) -> None:
        """Load the FAISS index and metadata map from disk.

        If files do not exist, initializes an empty IndexFlatIP.
        """
        # Load metadata
        if self.metadata_path.exists():
            try:
                with open(self.metadata_path, "r") as f:
                    self.metadata = json.load(f)
                logger.info(f"Loaded FAISS metadata with {len(self.metadata)} records.")
            except Exception as e:
                logger.error(f"Error loading FAISS metadata: {e}. Resetting metadata.")
                self.metadata = {}
        else:
            self.metadata = {}

        # Load FAISS index
        if self.index_path.exists():
            try:
                self.index = faiss.read_index(str(self.index_path))
                logger.info(f"Loaded FAISS index from {self.index_path} with {self.index.ntotal} vectors.")
            except Exception as e:
                logger.error(f"Error reading FAISS index: {e}. Rebuilding empty index.")
                self.index = faiss.IndexFlatIP(self.dimension)
        else:
            # IndexFlatIP uses Inner Product, equivalent to Cosine Similarity for normalized vectors
            self.index = faiss.IndexFlatIP(self.dimension)
            logger.info("Created new empty FAISS IndexFlatIP.")

    def save_index(self) -> None:
        """Save the FAISS index and metadata map to disk."""
        try:
            # Save index
            faiss.write_index(self.index, str(self.index_path))
            
            # Save metadata mapping
            with open(self.metadata_path, "w") as f:
                json.dump(self.metadata, f, indent=2)
                
            logger.info("Successfully persisted FAISS index and metadata map to disk.")
        except Exception as e:
            logger.error(f"Failed to save FAISS index/metadata: {e}")
            raise e

    def add_student(self, student_usn: str, embedding: np.ndarray) -> None:
        """Add a student's average embedding to the FAISS index.

        Args:
            student_usn: Student USN
            embedding: 512-dimensional normalized numpy embedding vector
        """
        # Prepare embedding
        vector = np.array([embedding], dtype=np.float32)
        
        # Add to index
        current_id = self.index.ntotal
        self.index.add(vector)
        
        # Update metadata mapping (index IDs in FAISS are 0-based consecutive integers)
        self.metadata[str(current_id)] = student_usn
        
        # Save changes to disk
        self.save_index()
        logger.info(f"Added embedding for student {student_usn} to FAISS index at ID {current_id}.")

    def add_student_vectors(self, student_usn: str, embeddings: List[np.ndarray], dup_threshold: float = 0.95) -> int:
        """Add multiple diverse embedding vectors for a student into FAISS with near-duplicate filtering."""
        added = 0
        for emb in embeddings:
            if emb is None:
                continue
            vec = np.array(emb, dtype=np.float32)
            norm = np.linalg.norm(vec)
            if norm < 1e-6:
                continue
            vec = vec / norm

            # Check if near duplicate vector already exists in FAISS for this student
            if self.index.ntotal > 0:
                query = np.array([vec], dtype=np.float32)
                distances, indices = self.index.search(query, 1)
                if float(distances[0][0]) >= dup_threshold and self.metadata.get(str(indices[0][0])) == student_usn:
                    continue

            self.add_student(student_usn, vec)
            added += 1
        return added

    def remove_student_vectors(self, student_usn: str) -> int:
        """Remove all existing vectors for the given student USN from the FAISS index.

        Reconstructs the index and metadata without this student's embeddings.
        Ensures that when a student is re-enrolled, previous cluster vectors are purged.

        Args:
            student_usn: Student USN to purge.

        Returns:
            Number of vectors removed.
        """
        if self.index is None or self.index.ntotal == 0:
            return 0

        target_usn = student_usn.strip().upper()
        indices_to_remove = []
        vectors_to_keep = []
        new_metadata: Dict[str, str] = {}

        total = self.index.ntotal
        for i in range(total):
            u = (self.metadata.get(str(i)) or "").strip().upper()
            if u == target_usn or u.replace(" ", "") == target_usn.replace(" ", ""):
                indices_to_remove.append(i)
            else:
                vec = self.index.reconstruct(i)
                new_idx = len(vectors_to_keep)
                vectors_to_keep.append(vec)
                new_metadata[str(new_idx)] = self.metadata.get(str(i), "")

        if not indices_to_remove:
            logger.info(f"No existing vectors found in FAISS for student {student_usn}.")
            return 0

        # Reconstruct clean IndexFlatIP
        new_index = faiss.IndexFlatIP(self.dimension)
        if vectors_to_keep:
            new_index.add(np.array(vectors_to_keep, dtype=np.float32))

        self.index = new_index
        self.metadata = new_metadata
        self.save_index()
        logger.info(
            f"Removed {len(indices_to_remove)} old vectors for student {student_usn} from FAISS. "
            f"Index now contains {self.index.ntotal} vectors."
        )
        return len(indices_to_remove)

    def search_face(self, embedding: np.ndarray, threshold: float = 0.70) -> Optional[Tuple[str, float]]:
        """Search for the closest matching student in FAISS for a given embedding.

        Args:
            embedding: 512-dimensional query embedding (normalized)
            threshold: Cosine similarity threshold (minimum similarity to accept match)

        Returns:
            Tuple of (student_usn, similarity_score) or None if no match meets the threshold
        """
        import time
        start_time = time.perf_counter()

        if self.index is None or self.index.ntotal == 0:
            duration_ms = (time.perf_counter() - start_time) * 1000.0
            logger.info(f"Match: None SearchTime={duration_ms:.1f}ms")
            return None

        # Format input query vector
        query = np.array([embedding], dtype=np.float32)
        
        # Query FAISS index for the single nearest neighbor (k=1)
        # distances represents Inner Product, which is cosine similarity since vectors are normalized
        distances, indices = self.index.search(query, 1)
        
        best_idx = int(indices[0][0])
        best_sim = float(distances[0][0])
        
        # FAISS returns -1 if index is empty or no match
        if best_idx == -1:
            duration_ms = (time.perf_counter() - start_time) * 1000.0
            logger.info(f"Match: None SearchTime={duration_ms:.1f}ms")
            return None

        student_usn = self.metadata.get(str(best_idx))
        duration_ms = (time.perf_counter() - start_time) * 1000.0

        if student_usn and best_sim >= threshold:
            logger.info(f"Match: USN={student_usn} Similarity={best_sim:.3f} SearchTime={duration_ms:.1f}ms")
            return student_usn, best_sim
            
        logger.info(f"Match: None SearchTime={duration_ms:.1f}ms")
        return None

    def rebuild_index(self, enrolled_embeddings: List[Tuple[str, np.ndarray]]) -> None:
        """Reconstruct the FAISS index from scratch using active database records.

        Prevents fragmentation and handles student deletions.

        Args:
            enrolled_embeddings: List of tuples (student_usn, embedding_vector)
        """
        logger.info(f"Rebuilding FAISS index from scratch with {len(enrolled_embeddings)} records...")
        
        # Create a fresh index
        new_index = faiss.IndexFlatIP(self.dimension)
        new_metadata: Dict[str, str] = {}
        
        if enrolled_embeddings:
            vectors = []
            for idx, (usn, emb) in enumerate(enrolled_embeddings):
                vectors.append(emb)
                new_metadata[str(idx)] = usn
                
            vectors_np = np.array(vectors, dtype=np.float32)
            new_index.add(vectors_np)

        self.index = new_index
        self.metadata = new_metadata
        self.save_index()
        logger.info("FAISS index rebuild completed successfully.")


# Singleton instance
faiss_service = FaissService()
