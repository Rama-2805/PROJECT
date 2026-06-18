"""SmartCampus AI — Enrollment Coordination Service.

Coordinates database operations, embedding calculation, FAISS registration,
and file storage updates when a teacher enrolls a student.
Conforms to version-controlled FaceProfile and Embedding schemas.
"""

import os
import cv2
import logging
import numpy as np
from sqlalchemy.orm import Session
from ..models.student import Student
from ..models.face_profile import FaceProfile
from ..models.embedding import Embedding
from ..models.unknown_face import UnknownFace
from .image_storage import image_storage
from .embedding_service import embedding_service
from .faiss_service import faiss_service
from ..api.websocket import websocket_manager

logger = logging.getLogger("smartcampus.enrollment")


class EnrollmentService:
    """Orchestrates the student face enrollment pipeline."""

    async def enroll_student(
        self, db: Session, cluster_id: str, name: str, usn: str, department: str, semester: int = None, section: str = None
    ) -> dict:
        """Enroll a student by assigning a name/USN to a cluster of unknown faces.

        Flow:
            1. Validate student USN uniqueness.
            2. Fetch all images in the cluster folder.
            3. Generate and average ArcFace embeddings for the cluster images.
            4. Create Student, V1 FaceProfile, and Embedding records in the database.
            5. Register the average embedding in the FAISS index.
            6. Move cluster images to the student storage folder.
            7. Clean up the cluster's UnknownFace DB records.
            8. Broadcast STUDENT_ENROLLED and FAISS_UPDATED WebSocket events.

        Args:
            db: Database session
            cluster_id: Source cluster identifier
            name: Student name
            usn: Unique Student USN
            department: Academic department
            semester: Academic semester (optional)
            section: Academic section (optional)

        Returns:
            Dict representing the created student profile
        """
        # 1. Check if student already exists
        existing_student = db.query(Student).filter(Student.usn == usn).first()
        if existing_student:
            raise ValueError(f"Student with USN '{usn}' already enrolled.")

        # 2. Get cluster images
        image_paths = image_storage.get_cluster_images(cluster_id)
        if not image_paths:
            raise ValueError(f"No best images found for cluster '{cluster_id}'. Make sure clustering has run.")

        # CHANGE 10: Verify pose coverage (at least 3 of: front, left, right, up, down)
        valid_poses = {"front", "left", "right", "up", "down"}
        detected_poses = set()
        for path in image_paths:
            base_name = os.path.splitext(os.path.basename(path))[0].lower()
            for pose in valid_poses:
                if pose in base_name:
                    detected_poses.add(pose)
                    break

        if len(detected_poses) < 3:
            raise ValueError(
                f"Enrollment rejected: Insufficient pose coverage. "
                f"Cluster must contain at least 3 distinct head poses from front, left, right, up, down. "
                f"Found only {len(detected_poses)}: {', '.join(sorted(detected_poses)) or 'None'}."
            )

        # 3. Generate embeddings for each image in the cluster
        embeddings = []
        for path in image_paths:
            img = cv2.imread(path)
            if img is None:
                continue
            
            emb = embedding_service.generate_embedding(img)
            if emb is not None:
                embeddings.append(emb)

        if not embeddings:
            raise ValueError(f"Could not extract face embeddings from any images in cluster '{cluster_id}'.")

        # Compute average normalized embedding
        avg_embedding = embedding_service.compute_average_embedding(embeddings)
        if avg_embedding is None:
            raise ValueError("Failed to compute average face embedding.")

        # 4. Save average embedding to student folder
        vector_path = image_storage.save_student_embedding(avg_embedding, usn)

        # 5. Create database records
        student = Student(
            name=name,
            usn=usn,
            department=department,
            semester=semester,
            section=section
        )
        db.add(student)
        db.commit()
        db.refresh(student)

        # Determine average quality score of the cluster
        unknown_faces = db.query(UnknownFace).filter(UnknownFace.cluster_id == cluster_id).all()
        avg_quality = float(np.mean([f.quality_score for f in unknown_faces])) if unknown_faces else 80.0

        # Create Version 1 Active Profile
        face_profile = FaceProfile(
            student_id=student.id,
            version=1,
            quality_score=round(avg_quality, 1),
            accuracy_estimate=95.0,
            is_active=True
        )
        db.add(face_profile)
        db.commit()
        db.refresh(face_profile)

        # Create Embedding record pointing to V1 profile
        embedding_record = Embedding(
            face_profile_id=face_profile.id,
            vector_path=vector_path
        )
        db.add(embedding_record)
        db.commit()

        # 6. Add embedding to FAISS index
        faiss_service.add_student(usn, avg_embedding)

        # 7. Move cluster images to the student storage folder
        moved_images = image_storage.move_cluster_to_student(cluster_id, usn)

        # 8. Delete associated UnknownFace records from database
        db.query(UnknownFace).filter(UnknownFace.cluster_id == cluster_id).delete()
        db.commit()

        # 9. Broadcast WebSocket events
        student_data = {
            "id": student.id,
            "name": student.name,
            "usn": student.usn,
            "department": student.department,
            "semester": student.semester,
            "section": student.section,
            "images_count": len(moved_images),
            "quality_score": face_profile.quality_score,
            "version": face_profile.version
        }
        
        await websocket_manager.broadcast("STUDENT_ENROLLED", student_data)
        await websocket_manager.broadcast(
            "FAISS_UPDATED", 
            {"total_vectors": faiss_service.index.ntotal, "last_action": "ENROLL"}
        )

        logger.info(f"Successfully enrolled student {name} ({usn})")
        return student_data

    async def disenroll_student(self, db: Session, usn: str) -> bool:
        """Disenroll a student, removing their DB records, storage files, and FAISS vector."""
        student = db.query(Student).filter(Student.usn == usn).first()
        if not student:
            return False

        # 1. Delete files from storage
        image_storage.delete_student_files(usn)

        # 2. Delete student from database (cascades to face profiles and embeddings)
        db.delete(student)
        db.commit()

        # 3. Rebuild FAISS index from remaining active embeddings in the database
        remaining_embeddings = []
        all_active_profiles = db.query(FaceProfile).filter(FaceProfile.is_active == True).all()
        
        for profile in all_active_profiles:
            s = db.query(Student).filter(Student.id == profile.student_id).first()
            emb_rec = db.query(Embedding).filter(Embedding.face_profile_id == profile.id).first()
            
            if s and emb_rec and os.path.exists(emb_rec.vector_path):
                try:
                    vec = np.load(emb_rec.vector_path)
                    remaining_embeddings.append((s.usn, vec))
                except Exception as e:
                    logger.error(f"Error loading embedding for {s.usn} during rebuild: {e}")

        faiss_service.rebuild_index(remaining_embeddings)

        # 4. Broadcast WebSocket event
        await websocket_manager.broadcast("FAISS_UPDATED", {
            "total_vectors": faiss_service.index.ntotal,
            "last_action": "DISENROLL"
        })

        logger.info(f"Successfully disenrolled student {usn}")
        return True


# Singleton instance
enrollment_service = EnrollmentService()
