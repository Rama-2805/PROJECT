"""SmartCampus AI — Face Enrollment Service Configuration."""

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
    backend_api_url: str = "http://localhost:4000"
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

    # Video Processing
    frame_extraction_interval: float = 0.5  # Extract frame every 0.5 seconds
    target_frame_size: tuple = (640, 480)
    blur_threshold: float = 50.0  # Laplacian variance threshold for blur detection

    # Face Detection
    detection_confidence_threshold: float = 0.8
    max_faces_per_frame: int = 20

    # Face Recognition
    recognition_confidence_threshold: float = 0.55
    embedding_size: int = 512  # ArcFace embedding dimension

    # Clustering
    min_cluster_size: int = 3
    cluster_selection_epsilon: float = 0.5
    min_samples: int = 2
    clustering_eps: float = 0.3  # Cosine distance threshold for DBSCAN

    # Database
    database_url: str = "postgresql://smartcampus:smartcampus_dev@localhost:5432/smartcampus"

    # CCTV Auto Enrollment Thresholds & Folders
    duplicate_unknown_threshold: float = 0.75  # Cosine similarity for duplicate unknown filter
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
    data_retention_days: int = 365

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"


settings = Settings()
