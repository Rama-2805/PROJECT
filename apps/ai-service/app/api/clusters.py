"""SmartCampus AI — Clusters API Router."""

import os
import shutil
import logging
from typing import Dict, List, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..config.settings import settings
from ..config.database import get_db
from ..models.unknown_face import UnknownFace
from ..services.face_clustering import face_clustering_service
from ..services.image_storage import image_storage
from .websocket import websocket_manager

logger = logging.getLogger("smartcampus.clusters_api")

router = APIRouter(prefix=f"{settings.api_prefix}/clusters", tags=["Face Clusters"])


def get_relative_storage_path(absolute_path: str) -> str:
    if not absolute_path:
        return ""
    abs_norm = os.path.normpath(absolute_path)
    idx = abs_norm.find("storage" + os.sep)
    if idx != -1:
        return abs_norm[idx:].replace(os.sep, "/")
    idx_slash = abs_norm.find("storage/")
    if idx_slash != -1:
        return abs_norm[idx_slash:]
    return absolute_path


@router.get("")
@router.get("/")
def get_all_clusters(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """Get summaries of all unknown face clusters."""
    # Group by cluster_id and get count and average quality
    results = (
        db.query(
            UnknownFace.cluster_id,
            func.count(UnknownFace.id).label("images_count"),
            func.avg(UnknownFace.quality_score).label("avg_quality"),
            func.min(UnknownFace.created_at).label("first_seen"),
            func.max(UnknownFace.created_at).label("last_seen")
        )
        .filter(UnknownFace.cluster_id.isnot(None))
        .group_by(UnknownFace.cluster_id)
        .all()
    )

    summaries = []
    for row in results:
        # Find representative image (highest quality score)
        rep_face = (
            db.query(UnknownFace)
            .filter(UnknownFace.cluster_id == row.cluster_id)
            .order_by(UnknownFace.quality_score.desc())
            .first()
        )
        rep_image = get_relative_storage_path(rep_face.image_path) if rep_face else ""

        summaries.append({
            "cluster_id": row.cluster_id,
            "appearance_count": int(row.images_count),
            "first_seen": row.first_seen.isoformat() if row.first_seen else None,
            "last_seen": row.last_seen.isoformat() if row.last_seen else None,
            "representative_image": rep_image,
            "quality": round(float(row.avg_quality), 1) if row.avg_quality else 0.0
        })

    # Sort clusters by last_seen (descending) so latest ones appear first
    summaries.sort(key=lambda x: x["last_seen"] or "", reverse=True)
    return summaries


@router.get("/{cluster_id}")
def get_cluster_details(cluster_id: str, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Get details, statistics, and best images for a specific cluster."""
    # Check if cluster has records in database
    faces = db.query(UnknownFace).filter(UnknownFace.cluster_id == cluster_id).all()
    if not faces:
        raise HTTPException(
            status_code=404,
            detail=f"Cluster with ID '{cluster_id}' not found."
        )

    # Calculate statistics
    quality_scores = [f.quality_score for f in faces]
    images_count = len(faces)
    avg_quality = sum(quality_scores) / images_count
    min_quality = min(quality_scores)
    max_quality = max(quality_scores)

    # Get representative image
    rep_face = (
        db.query(UnknownFace)
        .filter(UnknownFace.cluster_id == cluster_id)
        .order_by(UnknownFace.quality_score.desc())
        .first()
    )
    rep_image = get_relative_storage_path(rep_face.image_path) if rep_face else ""

    # Format result
    return {
        "cluster_id": cluster_id,
        "first_seen": min(f.created_at for f in faces).isoformat(),
        "last_seen": max(f.created_at for f in faces).isoformat(),
        "appearance_count": images_count,
        "representative_image": rep_image,
        "statistics": {
            "total_images": images_count,
            "avg_quality": round(avg_quality, 1),
            "min_quality": round(min_quality, 1),
            "max_quality": round(max_quality, 1),
            "created_at_range": {
                "earliest": min(f.created_at for f in faces).isoformat(),
                "latest": max(f.created_at for f in faces).isoformat()
            }
        },
        "faces": [
            {
                "id": f.id,
                "image_path": get_relative_storage_path(f.image_path),
                "quality_score": round(f.quality_score, 1),
                "created_at": f.created_at.isoformat()
            } for f in faces
        ]
    }


@router.delete("/{cluster_id}")
def delete_cluster(cluster_id: str, db: Session = Depends(get_db)):
    """Delete a cluster and all its associated unknown face records and images."""
    faces = db.query(UnknownFace).filter(UnknownFace.cluster_id == cluster_id).all()
    if not faces:
        raise HTTPException(
            status_code=404,
            detail=f"Cluster with ID '{cluster_id}' not found."
        )

    # 1. Delete associated crops and embeddings from disk
    for face in faces:
        if face.image_path and os.path.exists(face.image_path):
            try:
                os.remove(face.image_path)
            except Exception as e:
                logger.error(f"Error removing image file {face.image_path}: {e}")

        if face.embedding_path and os.path.exists(face.embedding_path):
            try:
                os.remove(face.embedding_path)
            except Exception as e:
                logger.error(f"Error removing embedding file {face.embedding_path}: {e}")

    # Delete cluster directory if exists
    cluster_dir = image_storage.clusters_dir / f"cluster_{cluster_id}"
    if cluster_dir.exists():
        try:
            shutil.rmtree(str(cluster_dir), ignore_errors=True)
        except Exception as e:
            logger.error(f"Error removing cluster directory {cluster_dir}: {e}")

    # 2. Delete database records
    db.query(UnknownFace).filter(UnknownFace.cluster_id == cluster_id).delete()
    db.commit()

    return {
        "status": "success",
        "message": f"Cluster '{cluster_id}' and all its {len(faces)} detections deleted successfully."
    }


@router.post("/run")
async def trigger_clustering(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Manually run the auto-clustering HDBSCAN algorithm over unassigned unknown faces."""
    try:
        stats = face_clustering_service.run_auto_clustering(db)
        
        # Broadcast CLUSTER_CREATED event
        await websocket_manager.broadcast("CLUSTER_CREATED", {
            "processed_faces": stats["processed"],
            "clusters_created": stats["clusters_created"]
        })
        
        return {
            "status": "success",
            "message": f"Auto-clustering completed successfully. Created {stats['clusters_created']} clusters.",
            "details": stats
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error running auto-clustering: {str(e)}"
        )
