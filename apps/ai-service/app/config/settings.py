"""SmartCampus AI — Face Enrollment Service Configuration."""

import os
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Application
    app_name: str = "SmartCampus AI - Face Enrollment Service"
    debug: bool = False
    api_prefix: str = "/api/v1"

    # Server
    host: str = "0.0.0.0"
    port: int = 8000

    # Backend API
    backend_api_url: str = os.getenv("BACKEND_API_URL") or os.getenv("BACKEND_URL") or "http://localhost:4000"
    backend_api_key: Optional[str] = None
    rtsp_stream_url: Optional[str] = None

    # Redis & Celery
    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/0"

    # File Storage
    upload_dir: str = "data/uploads"
    face_data_dir: str = "data/faces"
    max_upload_size_mb: int = 500

    # Video Processing & Intelligent Sampling
    frame_extraction_interval: float = 0.5  # Extract frame every 0.5 seconds
    target_processing_fps: float = 1.5      # Fast AI processing (1.5 FPS = 1 frame every ~20 frames)
    enrollment_sample_fps: float = 1.5      # Fast AI processing framerate
    min_track_observations: int = 2         # Minimum track observations before sample eligibility
    max_samples_per_track: int = 5          # Maximum high-quality diverse face crops per track (max 5)
    max_embeddings_per_track: int = 5       # Max ArcFace embeddings per track
    target_embeddings_per_track: int = 3    # Target ArcFace embeddings per track
    embedding_frame_interval: int = 10      # Minimum frames between embedding candidate samples
    embedding_frame_interval_sec: float = 1.0 # Minimum 1.0 second between crop samples per track
    quality_threshold: float = 0.60         # Minimum composite quality score (0.0 - 1.0)
    min_track_quality: float = 0.60         # Minimum composite quality score (0.0 - 1.0)
    duplicate_embedding_threshold: float = 0.95 # Cosine similarity threshold for duplicate embedding rejection
    embedding_dedup_threshold: float = 0.95     # Cosine similarity threshold for duplicate embedding rejection
    arcface_batch_size: int = 8             # ArcFace batch inference size
    min_track_quality_threshold: float = 30.0 # Quality score threshold (0-100) for track samples
    target_frame_size: tuple = (640, 480)
    blur_threshold: float = 50.0  # Laplacian variance threshold for blur detection

    # Continuous Student Profile Learning
    auto_learn_known_students: bool = True
    allow_auto_profile_update: bool = True
    max_embeddings_per_student: int = 20    # Max embeddings stored per student profile
    initial_embeddings_per_student: int = 5  # Target initial embeddings per student profile

    # Face Detection & Safety Filtering
    detection_model: str = "yolo26"                # Options: "yolo26", "scrfd", "combined"
    person_detector: str = "disabled"              # Options: "disabled", "yolo11"
    yolo_model_path: str = "yolo11n-face.pt"       # Default legacy YOLO11 face model weight
    yolo_confidence_threshold: float = 0.35        # YOLO11 confidence threshold for back-row faces
    yolo_iou_threshold: float = 0.45               # YOLO11 NMS IoU threshold
    yolo_imgsz: int = 1024                         # YOLO11 input resolution for high pixel detail
    yolo26_model_path: str = "models/yolo26s-face.pt" # Verified YOLO26-S-Face checkpoint
    yolo26_confidence_threshold: float = 0.30      # YOLO26 confidence threshold (optimized for classroom recall)
    yolo26_iou_threshold: float = 0.45             # YOLO26 NMS IoU threshold
    yolo26_imgsz: int = 1280                       # YOLO26 input resolution for distant faces
    yolo26_enable_tiling: bool = True              # Enable targeted ROI tiling for back-row small faces
    detection_confidence_threshold: float = 0.70  # Reject false positive detections < 0.70
    # MediaPipe Face Landmarker & Pose Quality Stage
    enable_mediapipe_quality: bool = True
    max_quality_attempts_per_track: int = 15  # Max crops evaluated by MediaPipe per track to prevent FPS spikes
    enable_roi_recovery: bool = False         # Bypass redundant ROI re-detection when multi-scale SCRFD is active
    max_yaw: float = 30.0    # Max head yaw angle in degrees
    max_pitch: float = 25.0  # Max head pitch angle in degrees
    max_roll: float = 25.0   # Max head roll angle in degrees
    min_face_width: int = 16  # Min face crop width in pixels (16px captures far/back-row classroom faces)
    min_face_height: int = 16 # Min face crop height in pixels (16px captures far/back-row classroom faces)
    faiss_top_k: int = 3      # Top-K candidate search depth for recognition diagnostics
    margin_ambiguity_threshold: float = 0.10 # Similarity margin below which identity is marked AMBIGUOUS
    min_face_area_ratio: float = 0.0001            # Minimum face area / frame area ratio
    max_face_aspect_ratio: float = 2.2            # Max aspect ratio (w/h or h/w)
    min_brightness: float = 20.0                   # Min average pixel intensity (0-255)
    max_brightness: float = 240.0                  # Max average pixel intensity (0-255)
    max_faces_per_frame: int = 40

    # Face Recognition
    recognition_confidence_threshold: float = 0.60
    embedding_size: int = 512  # ArcFace embedding dimension

    # Track-Centric Clustering
    min_cluster_size: int = 2
    cluster_selection_epsilon: float = 0.20  # Cosine distance threshold (prevents merging identities at 0.50-0.75 sim)
    min_samples: int = 1
    clustering_eps: float = 0.20  # Cosine distance threshold for DBSCAN
    hdbscan_min_cluster_size: int = 2  # Configurable HDBSCAN min_cluster_size for track-level clustering
    hdbscan_min_samples: int = 1       # Configurable HDBSCAN min_samples for track-level clustering
    duplicate_cluster_threshold: float = 0.85  # Cosine similarity threshold for candidate duplicates (preserves distinct students at 0.72-0.75)

    # Database
    database_url: str = "postgresql://smartcampus:smartcampus_dev@localhost:5432/smartcampus"

    # CCTV Auto Enrollment Thresholds & Folders
    duplicate_unknown_threshold: float = 0.85  # Cosine similarity for duplicate unknown filter
    min_quality_score: float = 70.0  # Min quality score (0-100) to accept a face
    storage_dir: str = "storage"  # Root directory for auto-enrollment storage
    face_index_path: str = "vectors/face_index.faiss"
    metadata_path: str = "vectors/metadata.json"

    # Weekly Optimizer Scheduler (configurable)
    optimizer_schedule_weekday: int = 6  # 0=Monday, 6=Sunday
    optimizer_schedule_hour: int = 2  # 2 AM

    # Security
    encrypt_embeddings: bool = True
    encryption_key: str = "dev-encryption-key-32-bytes-long!!"
    internal_api_key: str = "sc-internal-service-key-dev-only"
    data_retention_days: int = 365

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"


settings = Settings()
