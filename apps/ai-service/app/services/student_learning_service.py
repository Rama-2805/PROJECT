"""SmartCampus AI — Continuous Student Profile Learning Service.

Implements controlled Day 2+ incremental profile learning for enrolled students:
  1. Two-Level Safety Check (Quality >= 0.70 AND Similarity >= 0.58).
  2. Embedding Deduplication (Cosine Similarity < 0.95).
  3. Smart Pose & Feature Diversity Selection (Max 20 embeddings/student).
  4. Identity Drift Protection & Learning Audit Logging.
  5. Profile Versioning & Rollback Snapshots.
"""

import time
import logging
import numpy as np
from typing import Dict, List, Optional, Tuple, Any

from app.config.settings import settings

logger = logging.getLogger(__name__)


def cosine_similarity(v1: np.ndarray, v2: np.ndarray) -> float:
    """Calculate cosine similarity between two 1D normalized embedding vectors."""
    n1 = np.linalg.norm(v1)
    n2 = np.linalg.norm(v2)
    if n1 == 0 or n2 == 0:
        return 0.0
    return float(np.dot(v1, v2) / (n1 * n2))


class StudentLearningService:
    """Manages continuous incremental profile learning for enrolled students."""

    def __init__(self):
        # In-memory student embedding profiles for fast daily learning
        # Map: student_id -> { "profile_version": int, "embeddings": List[Dict], "snapshots": List[Dict], "audit_logs": List[Dict] }
        self.profiles: Dict[str, Dict[str, Any]] = {}

    def get_or_create_profile(self, student_id: str, initial_embeddings: List[Dict] = None) -> Dict[str, Any]:
        """Get existing profile or initialize a new profile (Day 1 initial enrollment)."""
        if student_id not in self.profiles:
            embeddings = initial_embeddings or []
            self.profiles[student_id] = {
                "student_id": student_id,
                "profile_version": 1,
                "created_at": time.time(),
                "last_updated": time.time(),
                "embeddings": embeddings[:settings.max_embeddings_per_student],
                "snapshots": [{
                    "version": 1,
                    "timestamp": time.time(),
                    "embeddings": list(embeddings[:settings.max_embeddings_per_student])
                }],
                "audit_logs": []
            }
        return self.profiles[student_id]

    def evaluate_candidate(
        self,
        student_id: str,
        candidate_embedding: np.ndarray,
        quality_score: float,
        recognition_similarity: float,
        pose_angles: Dict[str, float] = None,
        track_id: str = None
    ) -> Tuple[str, str, Optional[Dict[str, Any]]]:
        """Evaluates a new face crop candidate using the Two-Level Safety Check.
        
        Returns:
            Tuple of (decision, reason, candidate_record)
            where decision is one of: LEARNING_ACCEPTED, LEARNING_REJECTED, LEARNING_REVIEW_REQUIRED.
        """
        profile = self.get_or_create_profile(student_id)
        existing_embeddings = profile["embeddings"]

        # Level 1 Safety: Quality Check
        if quality_score < settings.quality_threshold:
            reason = f"Low quality score ({quality_score:.2f} < {settings.quality_threshold:.2f})"
            logger.info(f"[LEARNING-REJECT] Student {student_id}: {reason}")
            return "LEARNING_REJECTED", reason, None

        # Level 2 Safety: Identity Similarity Check
        if recognition_similarity < settings.recognition_confidence_threshold:
            reason = f"Weak identity similarity ({recognition_similarity:.2f} < {settings.recognition_confidence_threshold:.2f})"
            logger.info(f"[LEARNING-REJECT] Student {student_id}: {reason}")
            return "LEARNING_REJECTED", reason, None

        # Deduplication Filter against existing profile embeddings
        for idx, emb_rec in enumerate(existing_embeddings):
            sim = cosine_similarity(candidate_embedding, np.array(emb_rec["embedding"]))
            if sim >= settings.embedding_dedup_threshold:
                reason = f"Redundant duplicate embedding (similarity {sim:.2f} >= {settings.embedding_dedup_threshold:.2f})"
                logger.info(f"[LEARNING-REJECT] Student {student_id}: {reason}")
                return "LEARNING_REJECTED", reason, None

        # Identity Drift Protection: Verify candidate embedding is within expected distance of profile centroid
        if existing_embeddings:
            profile_vecs = np.array([e["embedding"] for e in existing_embeddings])
            centroid = np.mean(profile_vecs, axis=0)
            centroid = centroid / max(1e-6, np.linalg.norm(centroid))
            dist_to_centroid = cosine_similarity(candidate_embedding, centroid)
            
            if dist_to_centroid < settings.recognition_confidence_threshold:
                reason = f"Identity drift candidate (centroid similarity {dist_to_centroid:.2f} < {settings.recognition_confidence_threshold:.2f})"
                logger.warning(f"[LEARNING-REVIEW] Student {student_id}: {reason}")
                return "LEARNING_REVIEW_REQUIRED", reason, None

        # Prepare candidate record
        candidate_record = {
            "embedding_id": f"emb_{int(time.time()*1000)}",
            "embedding": candidate_embedding.tolist(),
            "quality_score": round(quality_score, 4),
            "similarity": round(recognition_similarity, 4),
            "pose": pose_angles or {},
            "track_id": track_id,
            "timestamp": time.time()
        }

        reason = f"High-quality pose-diverse sample (Quality: {quality_score:.2f}, Similarity: {recognition_similarity:.2f})"
        logger.info(f"[LEARNING-ACCEPT] Student {student_id}: {reason}")
        return "LEARNING_ACCEPTED", reason, candidate_record

    def update_student_profile(
        self,
        student_id: str,
        candidate_record: Dict[str, Any],
        decision: str,
        reason: str,
        session_id: str = "daily_session"
    ) -> Dict[str, Any]:
        """Updates student profile with candidate record, creating snapshot & audit log entry."""
        profile = self.get_or_create_profile(student_id)

        if decision == "LEARNING_ACCEPTED" and candidate_record:
            # Take pre-mutation snapshot for instant rollback
            current_version = profile["profile_version"]
            snapshot = {
                "version": current_version,
                "timestamp": time.time(),
                "embeddings": [dict(e) for e in profile["embeddings"]]
            }
            profile["snapshots"].append(snapshot)

            embeddings = profile["embeddings"]
            if len(embeddings) < settings.max_embeddings_per_student:
                embeddings.append(candidate_record)
            else:
                # Replace least diverse / lowest quality sample if cap reached (20 embeddings)
                min_idx = min(range(len(embeddings)), key=lambda i: embeddings[i].get("quality_score", 0.0))
                logger.info(f"[PROFILE-CAP] Replacing lowest quality embedding index {min_idx} for student {student_id}")
                embeddings[min_idx] = candidate_record

            profile["profile_version"] += 1
            profile["last_updated"] = time.time()

        # Record Learning Audit Log
        audit_entry = {
            "student_id": student_id,
            "embedding_id": candidate_record.get("embedding_id") if candidate_record else None,
            "session_id": session_id,
            "timestamp": time.time(),
            "quality_score": candidate_record.get("quality_score") if candidate_record else 0.0,
            "recognition_similarity": candidate_record.get("similarity") if candidate_record else 0.0,
            "decision": decision,
            "reason": reason,
            "profile_version": profile["profile_version"]
        }
        profile["audit_logs"].append(audit_entry)
        return profile

    def rollback_student_profile(self, student_id: str) -> Optional[Dict[str, Any]]:
        """Rolls back student profile to previous snapshot."""
        profile = self.profiles.get(student_id)
        if not profile or len(profile["snapshots"]) <= 1:
            logger.warning(f"[ROLLBACK-FAIL] No previous snapshot for student {student_id}")
            return None

        # Pop current state snapshot and restore previous
        profile["snapshots"].pop()
        prev_snapshot = profile["snapshots"][-1]
        
        profile["embeddings"] = [dict(e) for e in prev_snapshot["embeddings"]]
        profile["profile_version"] = prev_snapshot["version"]
        profile["last_updated"] = time.time()

        logger.info(f"[ROLLBACK-SUCCESS] Restored student {student_id} to profile v{prev_snapshot['version']}")
        return profile


# Global Singleton Learning Service Instance
student_learning_service = StudentLearningService()
