"""SmartCampus AI — FAISS Vector Search Service.

Provides L2-normalized cosine similarity search over enrolled student embeddings.
Saves index and metadata mapping to vectors/face_index.faiss and vectors/metadata.json.
"""

import os
import json
import logging
from pathlib import Path
import numpy as np
from typing import Dict, Optional, Tuple, List, Set
from ..config.settings import settings

logger = logging.getLogger("smartcampus.faiss")

os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "TRUE")

# Import torch before faiss to prevent OpenMP runtime symbol collisions on macOS Apple Silicon
try:
    import torch
except ImportError:
    pass

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
        # Resolve project root safely
        parents = Path(__file__).resolve().parents
        if len(parents) > 4 and (parents[4] / "vectors").exists():
            self.index_path = (parents[4] / "vectors" / "face_index.faiss").resolve()
            self.metadata_path = (parents[4] / "vectors" / "metadata.json").resolve()
        elif len(parents) > 2 and (parents[2] / "vectors").exists():
            self.index_path = (parents[2] / "vectors" / "face_index.faiss").resolve()
            self.metadata_path = (parents[2] / "vectors" / "metadata.json").resolve()
        else:
            self.index_path = Path(settings.face_index_path).resolve()
            self.metadata_path = Path(settings.metadata_path).resolve()
        
        # Ensure vectors folder exists
        self.index_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Internal state: FAISS index and metadata
        self.index = None
        # Maps index integer ID -> student_usn
        self.metadata: Dict[str, str] = {}
        
        import threading
        self._lock = threading.RLock()
        
        self.load_index()

    def verify_index(self, index=None, metadata=None) -> bool:
        """Verify structural and functional integrity of a FAISS index before activation."""
        idx = index or self.index
        meta = metadata if metadata is not None else self.metadata
        if idx is None:
            return False
        if idx.ntotal != len(meta):
            logger.warning(f"Index count mismatch: index.ntotal={idx.ntotal} vs len(metadata)={len(meta)}")
            return False
        if idx.ntotal > 0:
            try:
                dummy = np.random.randn(1, self.dimension).astype(np.float32)
                dummy /= np.linalg.norm(dummy)
                dists, indices = idx.search(dummy, 1)
                if indices[0][0] < -1 or indices[0][0] >= idx.ntotal:
                    return False
            except Exception as e:
                logger.error(f"Index verification search failed: {e}")
                return False
        return True

    def load_index(self) -> None:
        """Load the FAISS index and metadata map from disk.

        If files do not exist, initializes an empty IndexFlatIP.
        """
        with self._lock:
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
                self.index = faiss.IndexFlatIP(self.dimension)
                logger.info("Created new empty FAISS IndexFlatIP.")

            if not self.verify_index():
                logger.warning("Loaded index failed verification. Resetting to verified empty state.")
                self.index = faiss.IndexFlatIP(self.dimension)
                self.metadata = {}

    def save_index(self) -> None:
        """Atomically persist FAISS index and metadata mapping to disk."""
        with self._lock:
            if not self.verify_index():
                raise RuntimeError("Cannot save corrupted or unverified FAISS index.")
            try:
                tmp_idx = self.index_path.with_suffix(".tmp")
                tmp_meta = self.metadata_path.with_suffix(".tmp")
                faiss.write_index(self.index, str(tmp_idx))
                with open(tmp_meta, "w") as f:
                    json.dump(self.metadata, f, indent=2)
                os.replace(str(tmp_idx), str(self.index_path))
                os.replace(str(tmp_meta), str(self.metadata_path))
                logger.info(f"Atomically saved FAISS index ({self.index.ntotal} vectors) and metadata.")
            except Exception as e:
                logger.error(f"Failed to atomically save FAISS index: {e}")
                raise e

    def add_student(
        self,
        student_usn: str,
        embedding: np.ndarray,
        check_duplicate: bool = True,
        dup_threshold: float = 0.95
    ) -> bool:
        """Add a student's average embedding to the FAISS index with normalization and duplicate check.

        Args:
            student_usn: Student USN
            embedding: 512-dimensional normalized numpy embedding vector
            check_duplicate: Reject vector if cosine similarity to existing vector exceeds dup_threshold
            dup_threshold: Cosine similarity duplicate rejection threshold

        Returns:
            True if vector was added, False if rejected (duplicate, NaN, or invalid).
        """
        if embedding is None:
            return False

        with self._lock:
            vec = np.array(embedding, dtype=np.float32).flatten()
            if vec.shape[0] != self.dimension or np.isnan(vec).any() or np.isinf(vec).any():
                logger.warning(f"Invalid embedding dimensions ({vec.shape}) or values for {student_usn}")
                return False

            norm = float(np.linalg.norm(vec))
            if norm < 1e-6:
                logger.warning(f"Embedding norm too small ({norm}) for {student_usn}")
                return False
            vec = (vec / norm).astype(np.float32)

            target_usn = student_usn.strip().upper()

            # Prevent duplicate vectors for the same student in FAISS
            if check_duplicate and self.index.ntotal > 0:
                query = np.array([vec], dtype=np.float32)
                distances, indices = self.index.search(query, 1)
                best_sim = float(distances[0][0])
                best_idx = int(indices[0][0])
                if best_idx != -1 and best_sim >= dup_threshold:
                    matched_usn = self.metadata.get(str(best_idx), "")
                    if matched_usn.strip().upper() == target_usn:
                        logger.info(f"Duplicate embedding rejected for {target_usn} (similarity {best_sim:.3f} >= {dup_threshold})")
                        return False

            vector = np.array([vec], dtype=np.float32)
            current_id = self.index.ntotal
            self.index.add(vector)
            self.metadata[str(current_id)] = target_usn
            self.save_index()
            logger.info(f"Added embedding for student {target_usn} to FAISS index at ID {current_id}.")
            return True

    def add_profile_sample(
        self,
        student_usn: str,
        embedding: np.ndarray,
        max_samples: int = 12,
        dup_threshold: float = 0.95
    ) -> bool:
        """Add a new verified sample to an existing student's recognition profile with diversity gating.

        Returns True if a new sample was added, False if duplicate, rejected, or at capacity.
        """
        with self._lock:
            if embedding is None:
                return False
            vec = np.array(embedding, dtype=np.float32)
            norm = np.linalg.norm(vec)
            if norm < 1e-6:
                return False
            vec = vec / norm

            target_usn = student_usn.strip().upper()
            student_indices = [
                int(idx) for idx, u in self.metadata.items()
                if u.strip().upper() == target_usn
            ]

            # Bounded retention policy per student
            if len(student_indices) >= max_samples:
                return False

            # Check for near-duplicate embeddings of this student
            for idx in student_indices:
                try:
                    existing_vec = self.index.reconstruct(idx)
                    sim = float(np.dot(vec, existing_vec))
                    if sim >= dup_threshold:
                        return False
                except Exception:
                    pass

            self.add_student(target_usn, vec)
            return True

    def add_student_vectors(self, student_usn: str, embeddings: List[np.ndarray], dup_threshold: float = 0.95) -> int:
        """Add multiple diverse embedding vectors for a student into FAISS with near-duplicate filtering."""
        with self._lock:
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
        with self._lock:
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

            if self.verify_index(new_index, new_metadata):
                self.index = new_index
                self.metadata = new_metadata
                self.save_index()
                logger.info(
                    f"Removed {len(indices_to_remove)} old vectors for student {student_usn} from FAISS. "
                    f"Index now contains {self.index.ntotal} vectors."
                )
                return len(indices_to_remove)
            else:
                logger.error(f"Reconstructed index failed verification. Aborting removal for {student_usn}.")
                return 0

    def search_face(
        self,
        embedding: np.ndarray,
        threshold: float = 0.70,
        allowed_usns: Optional[Set[str]] = None,
    ) -> Optional[Tuple[str, float]]:
        """Search for the closest matching student in FAISS for a given embedding.

        Args:
            embedding: 512-dimensional query embedding (normalized)
            threshold: Cosine similarity threshold (minimum similarity to accept match)
            allowed_usns: Optional set of uppercase student USNs to filter search by (e.g. Section A only).
                          If provided, any candidate outside this set is strictly ignored.

        Returns:
            Tuple of (student_usn, similarity_score) or None if no match meets the threshold
        """
        import time
        start_time = time.perf_counter()

        if self.index is None or self.index.ntotal == 0:
            duration_ms = (time.perf_counter() - start_time) * 1000.0
            logger.debug(f"Match: None SearchTime={duration_ms:.1f}ms")
            return None

        # Format input query vector
        query = np.array([embedding], dtype=np.float32)

        # Normalize query vector if needed
        norm = np.linalg.norm(query)
        if norm > 1e-6:
            query = query / norm

        # If allowed_usns filter is provided, query top-K candidates to find the best match within the whitelist
        if allowed_usns:
            norm_allowed = {u.strip().upper() for u in allowed_usns if u}
            # Scalable candidate retrieval based on whitelist size and total index size (replaces hardcoded 15)
            search_k = min(max(len(norm_allowed) * 5, 50, self.index.ntotal), self.index.ntotal)
            distances, indices = self.index.search(query, search_k)
            duration_ms = (time.perf_counter() - start_time) * 1000.0

            for i in range(search_k):
                cand_idx = int(indices[0][i])
                cand_sim = float(distances[0][i])
                if cand_idx == -1 or cand_sim < threshold:
                    break
                student_usn = self.metadata.get(str(cand_idx))
                if student_usn and student_usn.strip().upper() in norm_allowed:
                    logger.info(f"Match (Section-Filtered): USN={student_usn} Similarity={cand_sim:.3f} SearchTime={duration_ms:.1f}ms")
                    return student_usn, cand_sim

            logger.debug(f"Match: None (No candidate in allowed section) SearchTime={duration_ms:.1f}ms")
            return None

        # Standard unconstrained search for single nearest neighbor (k=1)
        distances, indices = self.index.search(query, 1)

        best_idx = int(indices[0][0])
        best_sim = float(distances[0][0])

        if best_idx == -1:
            duration_ms = (time.perf_counter() - start_time) * 1000.0
            logger.debug(f"Match: None SearchTime={duration_ms:.1f}ms")
            return None

        student_usn = self.metadata.get(str(best_idx))
        duration_ms = (time.perf_counter() - start_time) * 1000.0

        if student_usn and best_sim >= threshold:
            logger.info(f"Match: USN={student_usn} Similarity={best_sim:.3f} SearchTime={duration_ms:.1f}ms")
            return student_usn, best_sim

        logger.debug(f"Match: None SearchTime={duration_ms:.1f}ms")
        return None

    def search_top_k(
        self,
        embedding: np.ndarray,
        k: int = 3,
        threshold: float = 0.50,
        allowed_usns: Optional[Set[str]] = None,
    ) -> List[Tuple[str, float]]:
        """Search for top-K matching students in FAISS index for a given embedding.

        Args:
            embedding: 512-dimensional query embedding (normalized)
            k: Number of nearest neighbors to retrieve
            threshold: Minimum cosine similarity to accept
            allowed_usns: Optional set of uppercase student USNs to filter search by (e.g. active session roster).

        Returns:
            List of (student_usn, similarity_score) sorted descending by similarity
        """
        if self.index is None or self.index.ntotal == 0 or embedding is None:
            return []

        query = np.array([embedding], dtype=np.float32)
        norm = np.linalg.norm(query)
        if norm > 1e-6:
            query = query / norm

        if allowed_usns:
            norm_allowed = {u.strip().upper() for u in allowed_usns if u}
            search_k = min(max(len(norm_allowed) * 5, 50, self.index.ntotal), self.index.ntotal)
            distances, indices = self.index.search(query, search_k)
            results = []
            seen_usns = set()
            for sim, idx in zip(distances[0], indices[0]):
                if idx != -1 and float(sim) >= threshold:
                    usn = self.metadata.get(str(int(idx)))
                    if usn:
                        u_clean = usn.strip().upper()
                        if u_clean in norm_allowed and u_clean not in seen_usns:
                            seen_usns.add(u_clean)
                            results.append((usn, float(sim)))
                            if len(results) >= k:
                                break
            return results

        actual_k = min(k, self.index.ntotal)
        if actual_k <= 0:
            return []

        distances, indices = self.index.search(query, actual_k)
        results = []
        for sim, idx in zip(distances[0], indices[0]):
            if idx != -1 and float(sim) >= threshold:
                usn = self.metadata.get(str(int(idx)))
                if usn:
                    results.append((usn, float(sim)))
        return results

    def rebuild_index(self, enrolled_embeddings: List[Tuple[str, np.ndarray]]) -> None:
        """Reconstruct the FAISS index from scratch using active database records.

        Prevents fragmentation and handles student deletions.

        Args:
            enrolled_embeddings: List of tuples (student_usn, embedding_vector)
        """
        with self._lock:
            logger.info(f"Rebuilding FAISS index from scratch with {len(enrolled_embeddings)} records...")
            
            # Create a fresh index
            new_index = faiss.IndexFlatIP(self.dimension)
            new_metadata: Dict[str, str] = {}
            
            if enrolled_embeddings:
                vectors = []
                for idx, (usn, emb) in enumerate(enrolled_embeddings):
                    vectors.append(emb)
                    new_metadata[str(idx)] = usn.strip().upper()
                    
                vectors_np = np.array(vectors, dtype=np.float32)
                new_index.add(vectors_np)

            if not self.verify_index(new_index, new_metadata):
                logger.error("Rebuilt index failed verification. Retaining existing index.")
                return

            self.index = new_index
            self.metadata = new_metadata
            self.save_index()
            logger.info("FAISS index rebuild completed successfully.")

    def rebuild_from_postgres(self) -> int:
        """Reconstruct the FAISS vector index directly from durable PostgreSQL/SQLite records.

        Uses the project's configured SQLAlchemy database engine with automatic fallback,
        ensuring that database configuration is respected without direct raw psycopg2 calls.
        """
        import json
        from sqlalchemy import text
        from ..config.database import engine
        logger.info("Rebuilding FAISS index from durable database FaceEmbedding records...")

        try:
            enrolled_embeddings: List[Tuple[str, np.ndarray]] = []
            with engine.connect() as conn:
                try:
                    result = conn.execute(text("""
                        SELECT s."rollNumber", s."studentId", s."usn", fe."embeddingVector"
                        FROM "FaceEmbedding" fe
                        JOIN "Student" s ON s.id = fe."studentId"
                        ORDER BY fe."createdAt" ASC
                    """))
                    rows = result.fetchall()
                except Exception as pg_err:
                    logger.debug(f"PostgreSQL FaceEmbedding query skipped ({pg_err}), trying SQLite fallback schema...")
                    try:
                        result = conn.execute(text("""
                            SELECT s.usn, s.usn, s.usn, e.vector_path
                            FROM embeddings e
                            JOIN face_profiles fp ON fp.id = e.face_profile_id
                            JOIN students s ON s.id = fp.student_id
                        """))
                        rows = result.fetchall()
                    except Exception:
                        rows = []

            for r_roll, r_sid, r_usn, r_vec in rows:
                target_usn = r_roll or r_sid or r_usn
                if not target_usn or not r_vec:
                    continue
                try:
                    vec_list = json.loads(r_vec) if isinstance(r_vec, str) else r_vec
                    if len(vec_list) == self.dimension:
                        arr = np.array(vec_list, dtype=np.float32)
                        norm = np.linalg.norm(arr)
                        if norm > 0:
                            arr = arr / norm
                        enrolled_embeddings.append((target_usn.strip().upper(), arr))
                except Exception as ex:
                    logger.debug(f"Skipping malformed embedding: {ex}")

            self.rebuild_index(enrolled_embeddings)
            logger.info(f"Reconstructed FAISS index with {len(enrolled_embeddings)} vectors from database.")
            return len(enrolled_embeddings)
        except Exception as e:
            logger.error(f"Failed to rebuild FAISS index from database: {e}")
            return 0


# Singleton instance
faiss_service = FaissService()
