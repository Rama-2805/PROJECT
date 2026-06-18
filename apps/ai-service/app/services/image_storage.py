"""SmartCampus AI — Image & Embedding Storage Service.

Manages filesystem storage for face crops, cluster previews, enrolled student profiles,
serialized embeddings, and continuous learning face candidates.
"""

import os
import shutil
import logging
from pathlib import Path
import cv2
import numpy as np
from ..config.settings import settings

logger = logging.getLogger("smartcampus.storage")


class ImageStorageService:
    """Service to handle saving, loading, moving, and deleting face images and embeddings."""

    def __init__(self):
        self.base_dir = Path(os.getcwd()).resolve()
        
        # Define storage subdirectories
        self.storage_dir = Path(settings.storage_dir).resolve()
        self.unknown_faces_dir = self.storage_dir / "unknown_faces"
        self.clusters_dir = self.storage_dir / "clusters"
        self.students_dir = self.storage_dir / "students"
        self.candidates_dir = self.storage_dir / "candidates"
        
        # Vectors directory for FAISS files
        self.vectors_dir = Path(settings.face_index_path).parent.resolve()

        # Ensure directories exist
        self._init_directories()

    def _init_directories(self):
        """Ensure all required directories are created."""
        for directory in [
            self.unknown_faces_dir,
            self.clusters_dir,
            self.students_dir,
            self.candidates_dir,
            self.vectors_dir,
        ]:
            directory.mkdir(parents=True, exist_ok=True)
            logger.info(f"Storage directory ensured: {directory}")

    def save_unknown_face(
        self, face_crop: np.ndarray, embedding: np.ndarray, filename_prefix: str
    ) -> tuple[str, str]:
        """Save an unknown face crop image and its raw embedding vector.

        Args:
            face_crop: OpenCV BGR image crop
            embedding: 512D ArcFace numpy embedding
            filename_prefix: Unique identifier prefix

        Returns:
            Tuple of (saved_image_path, saved_embedding_path)
        """
        img_filename = f"{filename_prefix}.jpg"
        emb_filename = f"{filename_prefix}.npy"

        img_path = self.unknown_faces_dir / img_filename
        emb_path = self.unknown_faces_dir / emb_filename

        # Save image crop
        cv2.imwrite(str(img_path), face_crop)

        # Save raw numpy array
        np.save(str(emb_path), embedding)

        return str(img_path), str(emb_path)

    def save_candidate_face(
        self, face_crop: np.ndarray, embedding: np.ndarray, student_usn: str, filename_prefix: str
    ) -> tuple[str, str]:
        """Save a continuous learning candidate face crop and its embedding.

        Args:
            face_crop: OpenCV BGR image crop
            embedding: 512D ArcFace numpy embedding
            student_usn: Student USN
            filename_prefix: Unique identifier prefix

        Returns:
            Tuple of (saved_image_path, saved_embedding_path)
        """
        student_cand_dir = self.candidates_dir / student_usn
        student_cand_dir.mkdir(parents=True, exist_ok=True)

        img_filename = f"{filename_prefix}.jpg"
        emb_filename = f"{filename_prefix}.npy"

        img_path = student_cand_dir / img_filename
        emb_path = student_cand_dir / emb_filename

        # Save image crop
        cv2.imwrite(str(img_path), face_crop)

        # Save raw numpy array
        np.save(str(emb_path), embedding)

        return str(img_path), str(emb_path)

    def get_candidate_images(self, student_usn: str) -> list[tuple[str, str]]:
        """Get all stored candidate image and embedding paths for a student.

        Returns:
            List of tuples (image_path, embedding_path)
        """
        student_cand_dir = self.candidates_dir / student_usn
        if not student_cand_dir.exists() or not student_cand_dir.is_dir():
            return []

        candidates = []
        for file_path in student_cand_dir.iterdir():
            if file_path.suffix.lower() in [".jpg", ".jpeg", ".png"]:
                emb_path = file_path.with_suffix(".npy")
                if emb_path.exists():
                    candidates.append((str(file_path), str(emb_path)))
        return candidates

    def save_cluster_preview(self, face_crop: np.ndarray, cluster_id: str, pose_name: str) -> str:
        """Save a representative best face image for a cluster.

        Args:
            face_crop: OpenCV BGR image crop
            cluster_id: Cluster identifier string
            pose_name: Pose category (front, left, right, up, down)

        Returns:
            Absolute file path of the saved preview image
        """
        cluster_folder = self.clusters_dir / f"cluster_{cluster_id}"
        cluster_folder.mkdir(parents=True, exist_ok=True)

        filename = f"{pose_name}.jpg"
        file_path = cluster_folder / filename

        cv2.imwrite(str(file_path), face_crop)
        return str(file_path)

    def move_cluster_to_student(self, cluster_id: str, student_usn: str) -> list[str]:
        """Move cluster candidate images to the student directory upon enrollment.

        Args:
            cluster_id: The source cluster ID
            student_usn: The target student USN

        Returns:
            List of paths of the moved images
        """
        cluster_folder = self.clusters_dir / f"cluster_{cluster_id}"
        student_folder = self.students_dir / student_usn
        student_folder.mkdir(parents=True, exist_ok=True)

        moved_paths = []
        if cluster_folder.exists() and cluster_folder.is_dir():
            for file_path in cluster_folder.iterdir():
                if file_path.suffix.lower() in [".jpg", ".jpeg", ".png"]:
                    dest_path = student_folder / file_path.name
                    shutil.move(str(file_path), str(dest_path))
                    moved_paths.append(str(dest_path))

            # Clean up empty cluster folder
            shutil.rmtree(str(cluster_folder), ignore_errors=True)

        return moved_paths

    def save_student_embedding(self, embedding: np.ndarray, student_usn: str) -> str:
        """Save the average student embedding to their directory.

        Args:
            embedding: 512D ArcFace numpy embedding
            student_usn: Target student USN

        Returns:
            Absolute file path of the saved embedding file
        """
        student_folder = self.students_dir / student_usn
        student_folder.mkdir(parents=True, exist_ok=True)

        emb_path = student_folder / "embedding.npy"
        np.save(str(emb_path), embedding)

        return str(emb_path)

    def delete_student_files(self, student_usn: str) -> None:
        """Delete all files and directory associated with a student.

        Args:
            student_usn: Student USN
        """
        # Delete enrollment files
        student_folder = self.students_dir / student_usn
        if student_folder.exists() and student_folder.is_dir():
            shutil.rmtree(str(student_folder), ignore_errors=True)
            logger.info(f"Deleted student enrollment folder: {student_folder}")

        # Delete candidate files
        student_cand_dir = self.candidates_dir / student_usn
        if student_cand_dir.exists() and student_cand_dir.is_dir():
            shutil.rmtree(str(student_cand_dir), ignore_errors=True)
            logger.info(f"Deleted student candidate folder: {student_cand_dir}")

    def get_cluster_images(self, cluster_id: str) -> list[str]:
        """Get list of absolute paths for best images in a cluster."""
        cluster_folder = self.clusters_dir / f"cluster_{cluster_id}"
        if not cluster_folder.exists() or not cluster_folder.is_dir():
            return []
        
        return [
            str(f) for f in cluster_folder.iterdir()
            if f.suffix.lower() in [".jpg", ".jpeg", ".png"]
        ]


# Singleton instance
image_storage = ImageStorageService()
