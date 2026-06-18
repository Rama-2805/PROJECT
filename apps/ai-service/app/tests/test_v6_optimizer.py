"""SmartCampus AI — Weekly Face Optimizer & Rollback Unit Tests."""

import os
import pytest
import numpy as np
from unittest.mock import MagicMock
from app.models.student import Student
from app.models.face_profile import FaceProfile
from app.models.embedding import Embedding
from app.models.candidate_image import CandidateImage
from app.services.weekly_optimizer import weekly_face_optimizer


def test_weekly_optimizer_and_profile_versioning(db_session, monkeypatch):
    """Test consolidating learning candidates, version incrementing, and updating profile state."""
    # Seed Student
    student = Student(name="Manjunatha R", usn="1VI23CS001", department="CSE", semester=6, section="A")
    db_session.add(student)
    db_session.commit()

    # V1 Profile (Active)
    profile_v1 = FaceProfile(student_id=student.id, version=1, quality_score=80.0, is_active=True)
    db_session.add(profile_v1)
    db_session.commit()
    db_session.refresh(profile_v1)

    # Mock V1 Embedding
    emb_v1 = Embedding(face_profile_id=profile_v1.id, vector_path="v1.npy")
    db_session.add(emb_v1)
    db_session.commit()

    # Add 2 learning candidate images to database queue
    cand1 = CandidateImage(student_id=student.id, image_path="c1.jpg", quality_score=88.0, embedding_path="c1.npy")
    cand2 = CandidateImage(student_id=student.id, image_path="c2.jpg", quality_score=90.0, embedding_path="c2.npy")
    db_session.add(cand1)
    db_session.add(cand2)
    db_session.commit()

    # Mock filesystem interactions
    monkeypatch.setattr(os.path, "exists", lambda path: True)
    
    # Return distinct mock vectors (similarity < 0.98)
    v1_arr = np.zeros(512)
    v1_arr[0] = 1.0
    c1_arr = np.zeros(512)
    c1_arr[1] = 1.0
    
    monkeypatch.setattr(np, "load", lambda path: v1_arr if "v1" in str(path) else c1_arr)
    monkeypatch.setattr(np, "save", lambda path, arr: True)
    
    # Mock face crop reading
    import cv2
    monkeypatch.setattr(cv2, "imread", lambda *args: np.zeros((100, 100, 3), dtype=np.uint8))
    
    # Mock FAISS rebuild
    monkeypatch.setattr("app.services.faiss_service.faiss_service.rebuild_index", lambda *args: None)

    # Run optimization
    report = weekly_face_optimizer.run_optimization(db_session)
    assert report["students_updated"] == 1

    # Assert new profile V2 is created and active
    profiles = db_session.query(FaceProfile).filter(FaceProfile.student_id == student.id).order_by(FaceProfile.version).all()
    assert len(profiles) == 2
    assert profiles[0].version == 1
    assert profiles[0].is_active is False
    
    assert profiles[1].version == 2
    assert profiles[1].is_active is True
    assert profiles[1].quality_score > 80.0

    # Verify candidate queue is cleaned up
    remaining_cands = db_session.query(CandidateImage).filter(CandidateImage.student_id == student.id).count()
    assert remaining_cands == 0


def test_rollback_support(db_session, monkeypatch):
    """Test rolling back student profile versions."""
    student = Student(name="Manjunatha R", usn="1VI23CS001", department="CSE")
    db_session.add(student)
    db_session.commit()

    # Seed two profile versions: V1 (inactive), V2 (active)
    p1 = FaceProfile(student_id=student.id, version=1, quality_score=80.0, is_active=False)
    p2 = FaceProfile(student_id=student.id, version=2, quality_score=85.0, is_active=True)
    db_session.add(p1)
    db_session.add(p2)
    db_session.commit()

    # Link mock embeddings
    emb1 = Embedding(face_profile_id=p1.id, vector_path="v1.npy")
    emb2 = Embedding(face_profile_id=p2.id, vector_path="v2.npy")
    db_session.add(emb1)
    db_session.add(emb2)
    db_session.commit()

    monkeypatch.setattr(os.path, "exists", lambda path: True)
    monkeypatch.setattr(np, "load", lambda path: np.zeros(512))
    
    # Mock FAISS rebuild
    monkeypatch.setattr("app.services.faiss_service.faiss_service.rebuild_index", lambda *args: None)

    # Rollback to version 1
    success = weekly_face_optimizer.rollback_student_profile(db_session, student.usn, target_version=1)
    assert success is True

    # Assert profile states have inverted: V1 is now active, V2 is inactive
    db_session.refresh(p1)
    db_session.refresh(p2)
    assert p1.is_active is True
    assert p2.is_active is False
