"""SmartCampus AI — Face Clustering & Duplicate Filter Service.

Filters out duplicate unknown face captures and groups unassigned unknown faces into
clusters using DBSCAN. Selects the best 10 images representing different head poses
(Front, Left, Right, Up, Down) for enrollment.
"""

import os
import cv2
import uuid
import logging
from pathlib import Path
from typing import Optional
import numpy as np
from sqlalchemy.orm import Session
from sklearn.cluster import DBSCAN
from ..config.settings import settings
from ..models.unknown_face import UnknownFace
from .image_storage import image_storage

logger = logging.getLogger("smartcampus.clustering")


class FaceClusteringService:
    """Handles duplicate filtering, DBSCAN clustering, and pose-based image selection."""

    def __init__(self):
        self.duplicate_threshold = settings.duplicate_unknown_threshold
        self.min_cluster_size = settings.min_cluster_size
        self.eps = settings.clustering_eps

    def duplicate_unknown_filter(self, db: Session, embedding: np.ndarray) -> Optional[str]:
        """Compare a face embedding against all existing unassigned unknown face embeddings.

        If a match is found (similarity >= duplicate_threshold), returns its cluster_id
        so the new frame is grouped under that same person.

        Args:
            db: Database session
            embedding: 512D normalized query embedding

        Returns:
            Existing cluster_id if duplicate, or None if it's a new person
        """
        # Fetch all unknown faces from the database
        unknown_faces = db.query(UnknownFace).all()
        if not unknown_faces:
            return None

        best_cluster_id = None
        best_similarity = -1.0

        for face in unknown_faces:
            # Check if embedding file exists
            if not os.path.exists(face.embedding_path):
                continue
            
            try:
                # Load stored embedding
                stored_emb = np.load(face.embedding_path)
                
                # Compute cosine similarity (dot product of L2 normalized vectors)
                similarity = float(np.dot(embedding, stored_emb))
                
                if similarity > best_similarity:
                    best_similarity = similarity
                    best_cluster_id = face.cluster_id
            except Exception as e:
                logger.error(f"Error loading/comparing embedding at {face.embedding_path}: {e}")

        # If similarity meets threshold, group under the matched cluster_id
        if best_similarity >= self.duplicate_threshold and best_cluster_id:
            logger.info(f"Duplicate found: grouped with cluster {best_cluster_id} (similarity: {best_similarity:.3f})")
            return best_cluster_id

        return None

    def run_auto_clustering(self, db: Session) -> dict:
        """Run DBSCAN clustering over all unassigned (or all) unknown face embeddings.

        Groups similar faces and assigns them a cluster ID.
        Then, performs Best Image Selection for each cluster.

        Args:
            db: Database session

        Returns:
            Dict containing number of processed faces and created clusters
        """
        # Fetch all unknown faces
        faces = db.query(UnknownFace).all()
        if not faces or len(faces) < self.min_cluster_size:
            logger.info(f"Not enough unknown faces to run clustering (got {len(faces)}, min {self.min_cluster_size})")
            return {"processed": len(faces), "clusters_created": 0}

        # Load embeddings and match to face records
        valid_faces = []
        embeddings = []

        for face in faces:
            if not os.path.exists(face.embedding_path):
                continue
            try:
                emb = np.load(face.embedding_path)
                # Ensure it is normalized
                norm = np.linalg.norm(emb)
                if norm > 0:
                    emb = emb / norm
                embeddings.append(emb)
                valid_faces.append(face)
            except Exception as e:
                logger.error(f"Error loading embedding for clustering: {e}")

        if len(embeddings) < self.min_cluster_size:
            logger.info("Not enough valid embeddings to cluster.")
            return {"processed": len(valid_faces), "clusters_created": 0}

        X = np.array(embeddings)

        # DBSCAN with cosine metric
        # Epsilon is the maximum distance between two samples.
        # Cosine distance = 1 - cosine_similarity.
        # Epsilon of 0.3 means similarity threshold of 0.7.
        dbscan = DBSCAN(eps=self.eps, min_samples=self.min_cluster_size, metric="cosine")
        labels = dbscan.fit_predict(X)

        cluster_counts = {}
        # Group database records by cluster labels
        # Label -1 is noise (unclustered/outliers)
        for face, label in zip(valid_faces, labels):
            if label == -1:
                # If unassigned previously, we can give it an isolated new cluster ID or keep it null
                # To be clean, we let noise faces remain unassigned or keep their existing ID.
                continue
            
            cluster_id = f"cluster_{label}"
            face.cluster_id = cluster_id
            db.add(face)
            
            cluster_counts[cluster_id] = cluster_counts.get(cluster_id, 0) + 1

        db.commit()

        # Run best image selection for each created cluster
        for cluster_id in cluster_counts.keys():
            self.select_best_cluster_images(db, cluster_id)

        logger.info(f"Auto-clustering created {len(cluster_counts)} clusters: {cluster_counts}")
        return {"processed": len(valid_faces), "clusters_created": len(cluster_counts), "clusters": cluster_counts}

    def select_best_cluster_images(self, db: Session, cluster_id: str) -> None:
        """Analyze all faces in a cluster, select top 10 best, and classify them by pose.

        Saves them to storage/clusters/cluster_{cluster_id}/.

        Poses:
            - Front (yaw < 15, pitch < 15)
            - Left (yaw > 15)
            - Right (yaw < -15)
            - Up (pitch > 15)
            - Down (pitch < -15)

        Args:
            db: Database session
            cluster_id: Cluster identifier
        """
        faces = db.query(UnknownFace).filter(UnknownFace.cluster_id == cluster_id).all()
        if not faces:
            return

        from .face_quality_service import face_quality_service

        # Read images and analyze poses
        categorized_faces = {
            "front": [],
            "left": [],
            "right": [],
            "up": [],
            "down": []
        }
        all_scored_faces = []

        for face in faces:
            if not os.path.exists(face.image_path) or not os.path.exists(face.embedding_path):
                continue
            
            try:
                img = cv2.imread(face.image_path)
                if img is None:
                    continue

                # We need raw_face to get pose. We can estimate pose from landmarks if not saved,
                # but since we have face_quality_service fallback to landmarks, we can pass dummy face_obj
                # with landmark data or estimate it directly.
                # Let's read landmarks from database if we had them, or just estimate pose using standard face crop.
                # Since we don't save landmarks in UnknownFace model, let's load the crop in FaceDetector
                # or estimate it using landmarks from detector. Let's do a quick face detection on the crop itself
                # to get landmarks and pose!
                from .face_detector import face_detector
                detections = face_detector.detect_faces(img)
                
                if detections:
                    det = detections[0]
                    analysis = face_quality_service.analyze_quality(det["crop"], det["raw_face"])
                    pose = analysis["pose"]
                    yaw = pose["yaw"]
                    pitch = pose["pitch"]
                else:
                    # Fallback to frontal if detection fails on crop
                    yaw, pitch = 0.0, 0.0

                face_data = (face, img, face.quality_score)
                all_scored_faces.append(face_data)

                # Categorize based on yaw/pitch
                if abs(yaw) < 15.0 and abs(pitch) < 15.0:
                    categorized_faces["front"].append(face_data)
                elif yaw >= 15.0:
                    categorized_faces["left"].append(face_data)
                elif yaw <= -15.0:
                    categorized_faces["right"].append(face_data)
                elif pitch >= 15.0:
                    categorized_faces["up"].append(face_data)
                elif pitch <= -15.0:
                    categorized_faces["down"].append(face_data)

            except Exception as e:
                logger.error(f"Error analyzing face {face.id} for pose: {e}")

        # Select the single best image for each of the 5 pose categories
        selected_candidates = []
        poses_selected = []
        for pose_name, candidates in categorized_faces.items():
            if candidates:
                # Sort by quality score (descending)
                candidates.sort(key=lambda x: x[2], reverse=True)
                best_face, img, score = candidates[0]
                
                # Save to cluster previews directory
                image_storage.save_cluster_preview(img, cluster_id, pose_name)
                selected_candidates.append(best_face)
                poses_selected.append(pose_name)

        # We want to fill the rest of the 10 spots with the highest quality remaining images
        all_scored_faces.sort(key=lambda x: x[2], reverse=True)
        
        # Track which faces have already been added as pose representatives
        selected_ids = {f.id for f in selected_candidates}
        
        filler_count = 1
        for face, img, score in all_scored_faces:
            if len(selected_candidates) >= 10:
                break
            if face.id not in selected_ids:
                # Save as a filler crop
                image_storage.save_cluster_preview(img, cluster_id, f"extra_{filler_count}")
                selected_candidates.append(face)
                selected_ids.add(face.id)
                filler_count += 1

        logger.info(f"Selected {len(selected_candidates)} best images for cluster {cluster_id} (poses: {poses_selected})")


# Singleton instance
face_clustering_service = FaceClusteringService()
