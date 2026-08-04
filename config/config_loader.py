import os
import yaml
from pydantic import BaseModel, ConfigDict, Field
from typing import List, Dict, Any, Optional

class SystemConfig(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    project_name: str = "SmartClassroom_Student_Enrollment"
    device: str = "auto"
    log_level: str = "INFO"
    checkpoint_file: str = "data/.checkpoint.json"

class PathsConfig(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    raw_videos_dir: str = "footage"
    enrolled_students_dir: str = "data/enrolled_students"
    embeddings_dir: str = "embeddings"
    database_dir: str = "database"
    reports_dir: str = "reports"
    models_dir: str = "models"
    logs_dir: str = "logs"

class FrameExtractionConfig(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    fps: float = 1.0

class PersonDetectionConfig(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    model_name: str = "yolov8m.pt"
    conf_threshold: float = 0.40
    iou_threshold: float = 0.45
    target_classes: List[int] = [0]

class FaceDetectionConfig(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    model_name: str = "buffalo_l"
    det_thresh: float = 0.50
    det_size: List[int] = [640, 640]
    padding: float = 0.15
    min_face_size: int = 60

class QualityAssessmentConfig(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    min_blur_score: float = 80.0
    min_tenengrad_score: float = 100.0
    min_brightness: float = 40.0
    max_brightness: float = 220.0
    min_sharpness: float = 30.0
    max_yaw_angle: float = 35.0
    max_pitch_angle: float = 25.0
    max_roll_angle: float = 30.0
    min_overall_quality: float = 0.55

class DuplicateRemovalConfig(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    enabled: bool = True
    phash_threshold: int = 8
    ssim_threshold: float = 0.88
    cosine_similarity_threshold: float = 0.85

class FaceEmbeddingsConfig(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    model_name: str = "buffalo_l"
    embedding_dim: int = 512
    normalize: bool = True

class ClusteringConfig(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    algorithm: str = "hdbscan"
    min_cluster_size: int = 8
    min_samples: int = 3
    cluster_selection_epsilon: float = 0.38

class BestImageSelectionConfig(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    min_images_per_student: int = 20
    max_images_per_student: int = 40

class DatabaseConfig(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    faiss_index_type: str = "IndexFlatIP"
    faiss_index_file: str = "database/faiss_index.bin"
    sqlite_db_file: str = "database/student_db.sqlite"

class ReportsConfig(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    export_json: bool = True
    export_csv: bool = True
    export_pdf: bool = True
    json_filename: str = "reports/enrollment_report.json"
    csv_filename: str = "reports/enrollment_report.csv"
    pdf_filename: str = "reports/enrollment_report.pdf"

class AppConfig(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    system: SystemConfig = Field(default_factory=SystemConfig)
    paths: PathsConfig = Field(default_factory=PathsConfig)
    frame_extraction: FrameExtractionConfig = Field(default_factory=FrameExtractionConfig)
    person_detection: PersonDetectionConfig = Field(default_factory=PersonDetectionConfig)
    face_detection: FaceDetectionConfig = Field(default_factory=FaceDetectionConfig)
    quality_assessment: QualityAssessmentConfig = Field(default_factory=QualityAssessmentConfig)
    duplicate_removal: DuplicateRemovalConfig = Field(default_factory=DuplicateRemovalConfig)
    face_embeddings: FaceEmbeddingsConfig = Field(default_factory=FaceEmbeddingsConfig)
    clustering: ClusteringConfig = Field(default_factory=ClusteringConfig)
    best_image_selection: BestImageSelectionConfig = Field(default_factory=BestImageSelectionConfig)
    database: DatabaseConfig = Field(default_factory=DatabaseConfig)
    reports: ReportsConfig = Field(default_factory=ReportsConfig)

def load_config(config_path: str = "config/config.yaml") -> AppConfig:
    if not os.path.exists(config_path):
        return AppConfig()
    with open(config_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    config = AppConfig(**data)
    
    dirs_to_create = [
        config.paths.enrolled_students_dir,
        config.paths.embeddings_dir,
        config.paths.database_dir,
        config.paths.reports_dir,
        config.paths.models_dir,
        config.paths.logs_dir,
    ]
    for d in dirs_to_create:
        os.makedirs(d, exist_ok=True)
    return config
