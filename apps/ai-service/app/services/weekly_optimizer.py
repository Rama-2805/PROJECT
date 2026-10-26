"""SmartCampus AI — Weekly Face Optimizer & Learning Engine.

Fetches accumulated high-quality candidate face samples, removes duplicates,
re-averages embeddings, updates student profiles with version increments, and rebuilds FAISS.
"""

import os
import shutil
import logging
import numpy as np
from datetime import datetime
from sqlalchemy.orm import Session
from ..config.settings import settings
from ..models.student import Student
from ..models.face_profile import FaceProfile
from ..models.embedding import Embedding
from ..models.candidate_image import CandidateImage
from .image_storage import image_storage
from .embedding_service import embedding_service
from .faiss_service import faiss_service
from .security_service import security_service
from ..api.websocket import websocket_manager

logger = logging.getLogger("smartcampus.optimizer")


class WeeklyFaceOptimizer:
    """Consolidates face candidates and optimizes student recognition models incrementally."""

    def run_optimization(self, db: Session) -> dict:
        """Run the continuous learning optimization pass for all students.

        Flow:
            1. Fetch all students.
            2. For each student, check if new CandidateImage records exist.
            3. Merge current profile images with new candidate images.
            4. De-duplicate: compare embeddings, keeping the highest quality if similarity >= 0.98.
            5. Select top 20 highest-quality images (overall quality score >= 70).
            6. Re-calculate average normalized embedding vector.
            7. Increment FaceProfile version (V1 -> V2 -> V3) and create a new database record.
            8. Set previous FaceProfile versions as inactive.
            9. Delete processed CandidateImage queue records.
            10. Rebuild FAISS index from the new active profiles.
            11. Record run in AuditLog and return detailed optimization report.
        """
        students = db.query(Student).all()
        logger.info(f"Starting Face Profile Optimizer for {len(students)} students...")

        updated_students_count = 0
        total_candidates_processed = 0
        details = []

        for student in students:
            # Check for new candidate images
            candidates = db.query(CandidateImage).filter(CandidateImage.student_id == student.id, CandidateImage.status == "APPROVED").all()
            if not candidates:
                continue

            try:
                # 1. Load active face profile
                active_profile = (
                    db.query(FaceProfile)
                    .filter(FaceProfile.student_id == student.id)
                    .filter(FaceProfile.is_active == True)
                    .first()
                )
                if not active_profile:
                    # If somehow no active profile, skip or assume V1
                    current_version = 0
                    current_quality = 80.0
                else:
                    current_version = active_profile.version
                    current_quality = active_profile.quality_score

                # 2. Gather existing images from student folder
                student_folder = image_storage.students_dir / student.usn
                existing_images = []
                if student_folder.exists() and student_folder.is_dir():
                    existing_images = [
                        str(f) for f in student_folder.iterdir()
                        if f.suffix.lower() in [".jpg", ".jpeg", ".png"]
                    ]

                # Generate embeddings for existing images
                pool_embeddings = []
                pool_metadata = []  # List of dicts with quality_score, img_path

                import cv2
                for img_path in existing_images:
                    img = cv2.imread(img_path)
                    if img is None:
                        continue
                    emb = embedding_service.generate_embedding(img)
                    if emb is not None:
                        pool_embeddings.append(emb)
                        # Estimate quality score or read from DB (default to 80 if unknown)
                        pool_metadata.append({
                            "path": img_path,
                            "embedding": emb,
                            "quality": 80.0,
                            "is_candidate": False
                        })

                # 3. Add new candidate images to pool
                for cand in candidates:
                    if not os.path.exists(cand.image_path) or not os.path.exists(cand.embedding_path):
                        continue
                    try:
                        emb = np.load(cand.embedding_path)
                        pool_embeddings.append(emb)
                        pool_metadata.append({
                            "path": cand.image_path,
                            "embedding": emb,
                            "quality": cand.quality_score,
                            "is_candidate": True
                        })
                    except Exception as e:
                        logger.error(f"Error loading candidate vector {cand.embedding_path}: {e}")

                if not pool_embeddings:
                    continue

                # 4. Perform De-duplication
                # Keep only distinct face samples (similarity < 0.98)
                # If similarity >= 0.98, retain the one with higher quality score
                retained_samples = []
                
                # Sort pool by quality score (descending) to match highest-quality first
                pool_metadata.sort(key=lambda x: x["quality"], reverse=True)

                for sample in pool_metadata:
                    is_duplicate = False
                    for retained in retained_samples:
                        sim = float(np.dot(sample["embedding"], retained["embedding"]))
                        if sim >= 0.98:
                            is_duplicate = True
                            break
                    if not is_duplicate:
                        retained_samples.append(sample)

                # 5. Keep top 20 best quality samples (score >= 70)
                retained_samples = [s for s in retained_samples if s["quality"] >= 70.0]
                retained_samples = retained_samples[:20]

                if not retained_samples:
                    logger.warning(f"No acceptable face samples remaining after filtering for student {student.usn}")
                    continue

                # Compute new average embedding
                avg_emb = embedding_service.compute_average_embedding([s["embedding"] for s in retained_samples])
                if avg_emb is None:
                    continue

                # 6. Save new embedding v{next_version}.npy
                next_version = current_version + 1
                new_emb_path = student_folder / f"embedding_v{next_version}.npy"
                np.save(str(new_emb_path), avg_emb)

                # 7. Create next FaceProfile in Database
                new_quality = float(np.mean([s["quality"] for s in retained_samples]))
                # Calculate genuine intra-cluster sample cohesion as accuracy estimate
                sample_sims = [float(np.dot(s["embedding"], avg_emb)) for s in retained_samples]
                mean_cohesion = float(np.mean(sample_sims)) if sample_sims else 1.0
                cohesion_pct = round(max(0.0, min(100.0, mean_cohesion * 100.0)), 1)
                
                new_profile = FaceProfile(
                    student_id=student.id,
                    version=next_version,
                    quality_score=round(new_quality, 1),
                    accuracy_estimate=cohesion_pct,
                    is_active=True
                )
                db.add(new_profile)
                db.commit()
                db.refresh(new_profile)

                # 8. Set old profiles as inactive
                db.query(FaceProfile).filter(
                    FaceProfile.student_id == student.id,
                    FaceProfile.id != new_profile.id
                ).update({"is_active": False})
                db.commit()

                # 9. Link new Embedding record to new profile
                emb_record = Embedding(
                    face_profile_id=new_profile.id,
                    vector_path=str(new_emb_path)
                )
                db.add(emb_record)

                # Copy/rename files inside the student folder to match new best candidates
                # To keep it clean, we move candidate images selected for the profile into student folder
                for idx, sample in enumerate(retained_samples):
                    if sample["is_candidate"]:
                        filename = f"sample_v{next_version}_{idx}.jpg"
                        dest_path = student_folder / filename
                        try:
                            shutil.copy(sample["path"], str(dest_path))
                        except Exception as copy_err:
                            logger.error(f"Failed to copy candidate image: {copy_err}")

                # 10. Delete CandidateImage queue records for this student
                db.query(CandidateImage).filter(CandidateImage.student_id == student.id).delete()
                db.commit()

                updated_students_count += 1
                total_candidates_processed += len(candidates)
                
                details.append({
                    "usn": student.usn,
                    "name": student.name,
                    "old_version": current_version,
                    "new_version": next_version,
                    "candidates_added": len(candidates),
                    "new_quality": round(new_quality, 1)
                })

            except Exception as student_err:
                db.rollback()
                logger.error(f"Error optimizing student profile {student.usn}: {student_err}")

        # 11. Rebuild FAISS index from all active student profiles
        if updated_students_count > 0:
            self._rebuild_faiss_index(db)

        report = {
            "status": "success",
            "timestamp": datetime.utcnow().isoformat(),
            "students_updated": updated_students_count,
            "new_samples_added": total_candidates_processed,
            "details": details
        }

        # Save run to AuditLog
        security_service.log_audit(
            db,
            action="WEEKLY_FACE_OPTIMIZATION",
            details=f"Optimizer updated {updated_students_count} students, processed {total_candidates_processed} candidates."
        )

        return report

    def rollback_student_profile(self, db: Session, usn: str, target_version: int) -> bool:
        """Roll back a student's active face profile version to a previous target version."""
        student = db.query(Student).filter(Student.usn == usn).first()
        if not student:
            raise ValueError(f"Student with USN '{usn}' not found.")

        # Find target profile
        target_profile = (
            db.query(FaceProfile)
            .filter(FaceProfile.student_id == student.id)
            .filter(FaceProfile.version == target_version)
            .first()
        )
        if not target_profile:
            raise ValueError(f"Face profile version {target_version} not found for student '{usn}'.")

        try:
            # Set target profile as active, all others as inactive
            db.query(FaceProfile).filter(FaceProfile.student_id == student.id).update({"is_active": False})
            target_profile.is_active = True
            db.commit()

            # Rebuild FAISS index
            self._rebuild_faiss_index(db)

            # Log action
            security_service.log_audit(
                db,
                action="FACE_PROFILE_ROLLBACK",
                details=f"Student {usn} rolled back face profile to version {target_version}."
            )
            return True
        except Exception as e:
            db.rollback()
            logger.error(f"Rollback failed for student {usn}: {e}")
            raise e

    def _rebuild_faiss_index(self, db: Session):
        """Internal helper to load all active profiles and rebuild FAISS index."""
        active_embeddings = []
        
        # Optimize N+1 queries: join Student, FaceProfile, and Embedding tables in one call
        active_data = (
            db.query(Student.usn, Embedding.vector_path)
            .join(FaceProfile, Student.id == FaceProfile.student_id)
            .join(Embedding, FaceProfile.id == Embedding.face_profile_id)
            .filter(FaceProfile.is_active == True)
            .all()
        )

        for usn, vector_path in active_data:
            if vector_path and os.path.exists(vector_path):
                try:
                    vec = np.load(vector_path)
                    active_embeddings.append((usn, vec))
                except Exception as e:
                    logger.error(f"Error loading embedding for {usn}: {e}")

        faiss_service.rebuild_index(active_embeddings)
        websocket_manager.broadcast_sync(
            "FAISS_UPDATED", 
            {"total_vectors": faiss_service.index.ntotal, "last_action": "OPTIMIZE"}
        )


# Singleton instance
weekly_face_optimizer = WeeklyFaceOptimizer()
