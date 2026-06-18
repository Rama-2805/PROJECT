"""SmartCampus AI — Clusters API Router."""

import os
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

router = APIRouter(prefix=f"{settings.api_prefix}/clusters", tags=["Face Clusters"])


@router.get("")
@router.get("/")
def get_all_clusters(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """Get summaries of all unknown face clusters.

    Returns:
        List of dicts: [{"cluster_id": "cluster_1", "images": 25, "quality": 91}]
    """
    # Group by cluster_id and get count and average quality
    results = (
        db.query(
            UnknownFace.cluster_id,
            func.count(UnknownFace.id).label("images_count"),
            func.avg(UnknownFace.quality_score).label("avg_quality")
        )
        .filter(UnknownFace.cluster_id.isnot(None))
        .group_by(UnknownFace.cluster_id)
        .all()
    )

    summaries = []
    for row in results:
        summaries.append({
            "cluster_id": row.cluster_id,
            "images": int(row.images_count),
            "quality": round(float(row.avg_quality), 1) if row.avg_quality else 0.0
        })

    # Sort clusters by average quality (descending)
    summaries.sort(key=lambda x: x["quality"], reverse=True)
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

    # Get preview images saved for this cluster
    preview_images = image_storage.get_cluster_images(cluster_id)
    
    # Organize preview images by their pose filenames
    best_images = {}
    for img_path in preview_images:
        filename = os.path.basename(img_path)
        pose_name = os.path.splitext(filename)[0]
        # Store relative or absolute path
        best_images[pose_name] = img_path

    # Format result
    return {
        "cluster_id": cluster_id,
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
        "best_images": best_images,
        "all_images": [
            {
                "id": f.id,
                "image_path": f.image_path,
                "quality_score": f.quality_score,
                "created_at": f.created_at.isoformat()
            } for f in faces
        ]
    }


@router.post("/run")
async def trigger_clustering(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Manually run the auto-clustering DBSCAN algorithm over unassigned unknown faces."""
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
