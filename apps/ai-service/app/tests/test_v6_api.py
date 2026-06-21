"""SmartCampus AI — API v6.0 Integration Tests."""

import os
import json
import pytest
import numpy as np
from app.models.student import Student
from app.models.face_profile import FaceProfile
from app.models.embedding import Embedding
from app.models.unknown_face import UnknownFace
from app.models.attendance import Attendance


def test_enrollment_pipeline_api(client, db_session, monkeypatch):
    """Test POST /enrollment/start and POST /enrollment/complete API cycles."""
    # Mock camera start capture
    monkeypatch.setattr(
        "app.services.camera_service.camera_service.start_camera",
        lambda *args: True,
    )
    monkeypatch.setattr(
        "app.services.camera_service.camera_service.stop_camera",
        lambda *args: None,
    )

    # 1. Start enrollment auto-capturing
    response = client.post("/api/v1/enrollment/start", json={"camera_id": "webcam", "source_path": "0"})
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["status"] == "success"
    assert "cluster_id" in res_data
    cluster_id = res_data["cluster_id"]

    # Seed an unknown face in DB under that cluster_id to simulate auto capture images
    face = UnknownFace(
        cluster_id=cluster_id,
        image_path="dummy.jpg",
        quality_score=90.0,
        embedding_path="dummy.npy",
    )
    db_session.add(face)
    db_session.commit()

    # Mock enrollment service file moves and embedding calculations
    monkeypatch.setattr(
        "app.services.image_storage.image_storage.get_cluster_images",
        lambda cid: ["front.jpg", "left.jpg", "right.jpg"],
    )
    monkeypatch.setattr(
        "app.services.image_storage.image_storage.save_student_embedding",
        lambda *args: "saved.npy",
    )
    monkeypatch.setattr(
        "app.services.image_storage.image_storage.move_cluster_to_student",
        lambda *args: ["img.jpg"],
    )
    import cv2
    monkeypatch.setattr(cv2, "imread", lambda *args: np.zeros((112, 112, 3), dtype=np.uint8))
    monkeypatch.setattr("app.services.faiss_service.faiss_service.add_student", lambda *args: None)

    # 2. Complete enrollment
    complete_payload = {
        "cluster_id": cluster_id,
        "name": "Manjunatha R",
        "usn": "V6API001",
        "department": "CSE",
        "semester": 6,
        "section": "A",
    }
    response = client.post("/api/v1/enrollment/complete", json=complete_payload)
    if response.status_code != 200:
        print("API COMPLETE ERROR:", response.status_code, response.json())
    assert response.status_code == 200
    assert response.json()["status"] == "success"

    # Verify student exists in DB with semester and section
    student = db_session.query(Student).filter(Student.usn == "V6API001").first()
    assert student is not None
    assert student.semester == 6
    assert student.section == "A"


def test_attendance_endpoints_api(client, monkeypatch):
    """Test start, stop, and fetch attendance reports API."""
    monkeypatch.setattr(
        "app.services.attendance_engine.attendance_engine.start_attendance_session",
        lambda *args, **kwargs: True,
    )
    monkeypatch.setattr(
        "app.services.attendance_engine.attendance_engine.stop_attendance_session",
        lambda *args, **kwargs: True,
    )

    # 1. Start loop
    start_payload = {
        "camera_id": "webcam",
        "class_id": "CSE_6A",
        "source_path": "0",
    }
    response = client.post("/api/v1/attendance/start", json=start_payload)
    assert response.status_code == 200
    assert response.json()["status"] == "success"

    # 2. Stop loop
    response = client.post("/api/v1/attendance/stop", json={"camera_id": "webcam"})
    assert response.status_code == 200
    assert response.json()["status"] == "success"


def test_unknown_faces_dashboard_endpoints(client, db_session, monkeypatch):
    """Test dashboard actions: marking visitor, ignoring, triggering security alert."""
    # Seed unknown face
    face = UnknownFace(
        cluster_id="unknown_xyz",
        image_path="dummy.jpg",
        quality_score=75.0,
        embedding_path="dummy.npy",
    )
    db_session.add(face)
    db_session.commit()

    monkeypatch.setattr(os.path, "exists", lambda path: True)
    monkeypatch.setattr(np, "load", lambda path: np.zeros(512))
    monkeypatch.setattr(
        "app.services.faiss_service.faiss_service.search_face",
        lambda *args, **kwargs: None,
    )
    monkeypatch.setattr(
        "app.services.image_storage.image_storage.get_cluster_images",
        lambda cid: ["front.jpg", "left.jpg", "right.jpg"],
    )

    # 1. Fetch dashboard
    response = client.get("/api/v1/unknown-faces")
    assert response.status_code == 200
    assert len(response.json()["data"]) == 1
    assert response.json()["data"][0]["cluster_id"] == "unknown_xyz"

    # 2. Trigger security alert
    alert_payload = {
        "cluster_id": "unknown_xyz",
        "location": "Room 302",
    }
    response = client.post("/api/v1/unknown-faces/alert", json=alert_payload)
    assert response.status_code == 200
    assert response.json()["status"] == "success"

    # 3. Ignore face (mock os.remove and shutil.rmtree to prevent filesystem errors)
    monkeypatch.setattr(os, "remove", lambda path: None)
    import shutil
    monkeypatch.setattr(shutil, "rmtree", lambda path, **kwargs: None)

    response = client.post("/api/v1/unknown-faces/ignore", json={"cluster_id": "unknown_xyz"})
    assert response.status_code == 200
    # Verify cleaned up
    assert db_session.query(UnknownFace).filter(UnknownFace.cluster_id == "unknown_xyz").count() == 0


def test_weekly_optimizer_and_analytics_endpoints(client, db_session, monkeypatch):
    """Test manually triggering weekly optimizer and fetching analytics."""
    monkeypatch.setattr(
        "app.services.weekly_optimizer.weekly_face_optimizer.run_optimization",
        lambda *args: {"students_updated": 0, "new_samples_added": 0},
    )

    # 1. Trigger optimizer run
    response = client.post("/api/v1/optimizer/run")
    assert response.status_code == 200
    assert response.json()["status"] == "success"

    # 2. Fetch analytics
    response = client.get("/api/v1/analytics")
    assert response.status_code == 200
    data = response.json()
    assert "summary" in data
    assert "attendance_percentage" in data["summary"]
