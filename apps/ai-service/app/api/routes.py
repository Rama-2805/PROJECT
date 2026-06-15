"""SmartCampus AI — Enrollment API Routes.

Provides REST endpoints for video upload, job management,
cluster review, and student identity mapping.
"""

import uuid
import os
from pathlib import Path
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import JSONResponse

from ..config.settings import settings
from ..models.enrollment import (
    EnrollmentJobOut,
    JobStatus,
    ClusterAssignment,
    ClusterMerge,
    ProgressUpdate,
    FaceCluster,
)
from ..services.video_processor import VideoProcessor

router = APIRouter(prefix=f"{settings.api_prefix}/enrollment", tags=["Enrollment"])

# In-memory job store (replace with PostgreSQL/Redis in production)
jobs_store: dict = {}
clusters_store: dict = {}


@router.post("/upload-video", response_model=EnrollmentJobOut, status_code=201)
async def upload_video(
    file: UploadFile = File(...),
    institution_id: str = Form(...),
    classroom_id: str = Form(...),
    uploaded_by: str = Form(...),
):
    """Upload a classroom video for face enrollment processing.

    Supported formats: MP4, MOV, AVI
    """
    # Validate file type
    allowed_extensions = {".mp4", ".mov", ".avi"}
    file_ext = Path(file.filename).suffix.lower() if file.filename else ""
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{file_ext}'. Supported: {allowed_extensions}",
        )

    # Validate file size
    file_size = 0
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)

    job_id = f"JOB_{uuid.uuid4().hex[:8].upper()}"
    safe_filename = f"{job_id}{file_ext}"
    video_path = str(upload_dir / safe_filename)

    # Save uploaded file
    try:
        with open(video_path, "wb") as f:
            while chunk := await file.read(8 * 1024 * 1024):  # 8MB chunks
                file_size += len(chunk)
                if file_size > settings.max_upload_size_mb * 1024 * 1024:
                    os.remove(video_path)
                    raise HTTPException(
                        status_code=413,
                        detail=f"File exceeds maximum size of {settings.max_upload_size_mb}MB",
                    )
                f.write(chunk)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

    # Get video info
    try:
        processor = VideoProcessor()
        cap = processor.open_video(video_path)
        video_info = processor.get_video_info(cap)
        cap.release()
    except Exception as e:
        os.remove(video_path)
        raise HTTPException(status_code=400, detail=f"Invalid video file: {str(e)}")

    # Create enrollment job
    job = EnrollmentJobOut(
        job_id=job_id,
        institution_id=institution_id,
        uploaded_by=uploaded_by,
        video_path=video_path,
        status=JobStatus.PENDING,
        total_frames=video_info["total_frames"],
        created_at=datetime.utcnow(),
    )
    jobs_store[job_id] = job

    # Start async processing
    from ..workers.enrollment_worker import process_enrollment_video
    process_enrollment_video.delay(
        job_id=job_id,
        video_path=video_path,
        institution_id=institution_id,
        classroom_id=classroom_id,
        uploaded_by=uploaded_by,
    )

    # Update status to PROCESSING
    job.status = JobStatus.PROCESSING
    job.started_at = datetime.utcnow()

    return job


@router.get("/jobs", response_model=List[EnrollmentJobOut])
async def list_jobs(
    institution_id: Optional[str] = None,
    status: Optional[JobStatus] = None,
    limit: int = 20,
    offset: int = 0,
):
    """List all enrollment jobs with optional filtering."""
    jobs = list(jobs_store.values())

    if institution_id:
        jobs = [j for j in jobs if j.institution_id == institution_id]
    if status:
        jobs = [j for j in jobs if j.status == status]

    jobs.sort(key=lambda j: j.created_at, reverse=True)
    return jobs[offset : offset + limit]


@router.get("/jobs/{job_id}", response_model=EnrollmentJobOut)
async def get_job(job_id: str):
    """Get enrollment job details and current progress."""
    job = jobs_store.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.get("/clusters/{cluster_id}", response_model=FaceCluster)
async def get_cluster(cluster_id: str):
    """Get cluster details including sample thumbnails."""
    cluster = clusters_store.get(cluster_id)
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found")
    return cluster


@router.post("/clusters/{cluster_id}/assign")
async def assign_cluster(cluster_id: str, assignment: ClusterAssignment):
    """Assign a face cluster to an existing student."""
    cluster = clusters_store.get(cluster_id)
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found")

    cluster.assigned_student_id = assignment.student_id
    cluster.assigned_student_name = assignment.student_name
    cluster.status = "ASSIGNED"

    return {"message": "Cluster assigned successfully", "cluster": cluster}


@router.post("/clusters/merge")
async def merge_clusters(merge_request: ClusterMerge):
    """Merge two clusters that represent the same student."""
    source = clusters_store.get(merge_request.source_cluster_id)
    target = clusters_store.get(merge_request.target_cluster_id)

    if not source or not target:
        raise HTTPException(status_code=404, detail="One or both clusters not found")

    # Merge source into target
    target.sample_count += source.sample_count
    target.thumbnail_paths.extend(source.thumbnail_paths)

    # Calculate new quality score (weighted average)
    total = target.sample_count + source.sample_count
    target.quality_score = round(
        (target.quality_score * target.sample_count
         + source.quality_score * source.sample_count)
        / total,
        3,
    )

    # Remove source cluster
    clusters_store.pop(merge_request.source_cluster_id, None)

    return {"message": "Clusters merged successfully", "cluster": target}


@router.delete("/clusters/{cluster_id}")
async def delete_cluster(cluster_id: str):
    """Delete an invalid cluster."""
    if cluster_id not in clusters_store:
        raise HTTPException(status_code=404, detail="Cluster not found")

    clusters_store.pop(cluster_id)
    return {"message": "Cluster deleted successfully"}


@router.post("/clusters/sync", response_model=List[FaceCluster])
async def sync_clusters(job_id: str, clusters: List[FaceCluster]):
    """Sync clusters from the AI service to the backend."""
    for cluster in clusters:
        cluster.job_id = job_id
        clusters_store[cluster.cluster_id] = cluster

    # Update job status
    if job_id in jobs_store:
        jobs_store[job_id].status = JobStatus.REVIEW_REQUIRED
        jobs_store[job_id].generated_clusters = len(clusters)

    return clusters


@router.get("/jobs/{job_id}/progress", response_model=ProgressUpdate)
async def get_job_progress(job_id: str):
    """Get real-time progress for an enrollment job."""
    from celery.result import AsyncResult
    from ..workers.enrollment_worker import process_enrollment_video

    result = AsyncResult(job_id, app=process_enrollment_video.app)

    if result.state == "PENDING":
        return ProgressUpdate(job_id=job_id, progress=0.0, status=JobStatus.PENDING)
    elif result.state == "PROCESSING":
        meta = result.info or {}
        return ProgressUpdate(
            job_id=job_id,
            progress=meta.get("progress", 50.0),
            status=JobStatus.PROCESSING,
            detected_faces=meta.get("detected_faces", 0),
            generated_clusters=meta.get("generated_clusters", 0),
        )
    elif result.state == "SUCCESS":
        return ProgressUpdate(
            job_id=job_id,
            progress=100.0,
            status=JobStatus.COMPLETED,
            detected_faces=result.result.get("total_faces_detected", 0),
            generated_clusters=result.result.get("clusters_generated", 0),
        )
    elif result.state == "FAILURE":
        return ProgressUpdate(
            job_id=job_id,
            progress=0.0,
            status=JobStatus.FAILED,
        )

    return ProgressUpdate(job_id=job_id, progress=0.0, status=JobStatus.PENDING)
