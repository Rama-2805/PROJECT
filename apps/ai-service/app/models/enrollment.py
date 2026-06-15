"""SmartCampus AI — Enrollment Data Models."""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class JobStatus(str, Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class BoundingBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float


class FaceLandmarks(BaseModel):
    left_eye: tuple[float, float]
    right_eye: tuple[float, float]
    nose: tuple[float, float]
    mouth_left: tuple[float, float]
    mouth_right: tuple[float, float]


class DetectedFace(BaseModel):
    track_id: Optional[str] = None
    bounding_box: BoundingBox
    confidence: float
    landmarks: Optional[FaceLandmarks] = None
    frame_index: int
    timestamp: float


class FaceEmbedding(BaseModel):
    face_id: str
    embedding: List[float]
    quality_score: float
    thumbnail_path: Optional[str] = None
    detection_metadata: Optional[dict] = None


class FaceCluster(BaseModel):
    cluster_id: str
    job_id: str
    sample_count: int
    quality_score: float
    representative_face: Optional[str] = None
    thumbnail_paths: List[str] = []
    status: str = "UNASSIGNED"
    assigned_student_id: Optional[str] = None
    assigned_student_name: Optional[str] = None


class EnrollmentJobOut(BaseModel):
    job_id: str
    institution_id: str
    uploaded_by: str
    video_path: str
    status: JobStatus
    progress_percentage: float = 0.0
    total_frames: int = 0
    processed_frames: int = 0
    detected_faces_count: int = 0
    generated_clusters: int = 0
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ClusterAssignment(BaseModel):
    cluster_id: str
    student_id: str
    student_name: str


class ClusterMerge(BaseModel):
    source_cluster_id: str
    target_cluster_id: str


class ProgressUpdate(BaseModel):
    job_id: str
    progress: float
    status: JobStatus
    detected_faces: int = 0
    generated_clusters: int = 0
