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
    detection_confidence_threshold: float = 0.6
    max_faces_per_frame: int = 20

    # Face Recognition
    recognition_confidence_threshold: float = 0.7
    embedding_size: int = 512  # ArcFace embedding dimension

    # Clustering
    min_cluster_size: int = 3
    cluster_selection_epsilon: float = 0.5
    min_samples: int = 2

    # Security
    encrypt_embeddings: bool = True
    data_retention_days: int = 365

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
