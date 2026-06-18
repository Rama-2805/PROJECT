"""SmartCampus AI — API Endpoints Integration Tests."""

import os
import json
import pytest
import numpy as np
from app.models.unknown_face import UnknownFace
from app.models.student import Student
from app.models.face_profile import FaceProfile
from app.models.embedding import Embedding
from app.services.faiss_service import faiss_service


def test_health_endpoint(client):
    """Test health check API router."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "SmartCampus AI - Face Enrollment Service"
    assert "components" in data
    assert data["components"]["database"]["status"] == "healthy"


def test_unknown_faces_and_clusters_endpoints(client, db_session, monkeypatch):
    """Test querying unknown faces and clusters."""
    # Seed db with unknown face
    face = UnknownFace(
        cluster_id="cluster_test",
        image_path="dummy.jpg",
        quality_score=88.5,
        embedding_path="dummy.npy"
    )
    db_session.add(face)
    db_session.commit()

    # Mock os.path.exists and numpy for embedding loading
    monkeypatch.setattr(os.path, "exists", lambda path: True)
    monkeypatch.setattr(np, "load", lambda path: np.zeros(512))
    monkeypatch.setattr(
        "app.services.faiss_service.faiss_service.search_face",
        lambda *args, **kwargs: None,
    )
    monkeypatch.setattr(
        "app.services.image_storage.image_storage.get_cluster_images",
        lambda cid: ["front.jpg", "left.jpg"],
    )

    # 1. Fetch unknown faces
    response = client.get("/api/v1/unknown-faces")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["cluster_id"] == "cluster_test"

    # 2. Fetch all clusters
    response = client.get("/api/v1/clusters")
    assert response.status_code == 200
    clusters = response.json()
    assert len(clusters) == 1
    assert clusters[0]["cluster_id"] == "cluster_test"
    assert clusters[0]["images"] == 1
    assert clusters[0]["quality"] == 88.5

    # 3. Fetch cluster details
    response = client.get("/api/v1/clusters/cluster_test")
    assert response.status_code == 200
    details = response.json()
    assert details["cluster_id"] == "cluster_test"
    assert details["statistics"]["total_images"] == 1
    assert "front" in details["best_images"]


def test_enroll_student_flow(client, db_session, monkeypatch):
    """Test complete student enrollment via the unknown-faces/enroll endpoint."""
    # Seed db with unknown face cluster
    face = UnknownFace(
        cluster_id="cluster_enroll",
        image_path="dummy_crop.jpg",
        quality_score=92.0,
        embedding_path="dummy_emb.npy"
    )
    db_session.add(face)
    db_session.commit()

    # Mock storage methods and embedding calculations
    monkeypatch.setattr(
        "app.services.image_storage.image_storage.get_cluster_images",
        lambda cid: ["front.jpg", "left.jpg", "right.jpg"],
    )
    monkeypatch.setattr(
        "app.services.image_storage.image_storage.save_student_embedding",
        lambda emb, usn: "saved_emb_path.npy",
    )
    monkeypatch.setattr(
        "app.services.image_storage.image_storage.move_cluster_to_student",
        lambda cid, usn: ["students/usn/front.jpg"],
    )
    monkeypatch.setattr(
        "app.services.image_storage.image_storage.delete_student_files",
        lambda usn: None,
    )
    monkeypatch.setattr(
        "app.services.faiss_service.faiss_service.add_student",
        lambda *args: None,
    )

    # Mock image loading for embedding extraction
    import cv2
    monkeypatch.setattr(cv2, "imread", lambda path: np.zeros((112, 112, 3), dtype=np.uint8))

    # Enroll POST payload — uses the unknown-faces/enroll endpoint
    enroll_data = {
        "cluster_id": "cluster_enroll",
        "name": "Manjunatha R",
        "usn": "1VI23CS001",
        "department": "CSE",
        "semester": 6,
        "section": "A",
    }

    # Trigger enrollment via the Teacher Review Dashboard's enroll action
    response = client.post("/api/v1/unknown-faces/enroll", json=enroll_data)
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["status"] == "success"

    # Verify student is in DB
    student = db_session.query(Student).filter(Student.usn == "1VI23CS001").first()
    assert student is not None
    assert student.name == "Manjunatha R"

    # Verify cluster's UnknownFace was cleaned up
    remaining_unknowns = db_session.query(UnknownFace).filter(UnknownFace.cluster_id == "cluster_enroll").count()
    assert remaining_unknowns == 0
