"""SmartCampus AI — Enrollment Background Worker.

Processes video uploads asynchronously using Celery.
Pipeline: frame extraction -> face detection -> embedding -> clustering
"""

import json
import uuid
from pathlib import Path
from datetime import datetime
from typing import Optional

from celery import Celery
from ..config.settings import settings

# Initialize Celery app
celery_app = Celery(
    "enrollment",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)


class JobProgressTracker:
    """Tracks and reports enrollment job progress."""

    def __init__(self, job_id: str, total_frames: int):
        self.job_id = job_id
        self.total_frames = total_frames
        self.processed_frames = 0
        self.detected_faces = 0
        self.embedding_count = 0
        self.cluster_count = 0

    def update(self, frames_processed: int = 1) -> float:
        self.processed_frames += frames_processed
        return self.get_progress()

    def get_progress(self) -> float:
        if self.total_frames == 0:
            return 0.0
        return round((self.processed_frames / self.total_frames) * 100, 1)

    def get_state(self) -> dict:
        return {
            "job_id": self.job_id,
            "progress": self.get_progress(),
            "status": "PROCESSING",
            "total_frames": self.total_frames,
            "processed_frames": self.processed_frames,
            "detected_faces": self.detected_faces,
            "generated_clusters": self.cluster_count,
        }


@celery_app.task(bind=True, max_retries=3, default_retry_delay=30)
def process_enrollment_video(
    self,
    job_id: str,
    video_path: str,
    institution_id: str,
    classroom_id: str,
    uploaded_by: str,
) -> dict:
    """Main enrollment pipeline — processes a classroom video.

    Steps:
    1. Extract frames from video
    2. Detect faces in each frame
    3. Generate face embeddings
    4. Cluster faces to identify unique students
    5. Save results for teacher review

    Returns:
        Summary of processing results
    """
    from ..services.video_processor import VideoProcessor
    from ..services.face_detector import FaceDetector
    from ..services.face_embedder import FaceEmbedder
    from ..services.clustering import FaceClusteringService

    video_path_obj = Path(video_path)
    if not video_path_obj.exists():
        raise FileNotFoundError(f"Video file not found: {video_path}")

    processor = VideoProcessor()
    detector = FaceDetector()
    embedder = FaceEmbedder()
    clusterer = FaceClusteringService()

    # Step 1: Get video info
    cap = processor.open_video(str(video_path_obj))
    video_info = processor.get_video_info(cap)
    cap.release()

    total_frames = video_info["total_frames"]
    tracker = JobProgressTracker(job_id, total_frames)

    # Step 2: Extract optimal frames
    self.update_state(state="PROCESSING", meta={"progress": 0, "stage": "extracting_frames"})
    frames = processor.get_optimal_frames(str(video_path_obj))
    tracker.total_frames = len(frames)

    # Step 3 & 4: Detect faces and generate embeddings
    self.update_state(state="PROCESSING", meta={"progress": 10, "stage": "detecting_faces"})
    all_embeddings = []
    face_output_dir = Path(settings.face_data_dir) / job_id
    face_output_dir.mkdir(parents=True, exist_ok=True)

    for frame_idx, frame in frames:
        # Detect faces
        detections = detector.detect(frame)

        # Get face crops
        face_crops = detector.get_face_crops(frame, detections)

        for det, crop in face_crops:
            quality = detector.compute_quality_score(crop)

            if quality < 0.3:
                continue

            # Save thumbnail
            thumbnail_name = f"{job_id}_frame{frame_idx}_{uuid.uuid4().hex[:8]}.jpg"
            detector.save_face_crop(
                crop,
                (0, 0, crop.shape[1], crop.shape[0]),
                str(face_output_dir),
                thumbnail_name,
            )

            # Generate embedding
            embedding = embedder.create_face_embedding(crop, det, quality)
            if embedding is not None:
                embedding.thumbnail_path = str(face_output_dir / thumbnail_name)
                all_embeddings.append(embedding)

        tracker.processed_frames += 1
        tracker.detected_faces += len(detections)

        # Report progress periodically
        if tracker.processed_frames % 10 == 0:
            self.update_state(
                state="PROCESSING",
                meta=tracker.get_state(),
            )

    # Step 5: Cluster embeddings
    self.update_state(state="PROCESSING", meta={**tracker.get_state(), "stage": "clustering"})
    _, clusters = clusterer.cluster_embeddings(all_embeddings)
    tracker.cluster_count = len(clusters)

    # Calculate cluster confidences
    cluster_mapping = {}
    for cluster in clusters:
        cluster_embeddings = [e for e in all_embeddings if e.thumbnail_path in cluster.thumbnail_paths]
        confidence = clusterer.compute_cluster_confidence(
            cluster_embeddings if cluster_embeddings else all_embeddings[:1]
        )
        cluster_mapping[cluster.cluster_id] = {
            "sample_count": cluster.sample_count,
            "quality_score": cluster.quality_score,
            "confidence": confidence,
            "representative_face": cluster.representative_face,
        }

    # Step 6: Final summary
    result = {
        "job_id": job_id,
        "status": "REVIEW_REQUIRED",
        "progress": 100.0,
        "video_info": video_info,
        "total_frames_processed": tracker.processed_frames,
        "total_faces_detected": tracker.detected_faces,
        "total_embeddings_generated": len(all_embeddings),
        "clusters_generated": len(clusters),
        "clusters": cluster_mapping,
        "completed_at": datetime.utcnow().isoformat(),
    }

    return result


@celery_app.task
def cleanup_expired_jobs():
    """Clean up expired enrollment data based on retention policy."""
    # Placeholder — would delete old face data and embeddings
    pass
