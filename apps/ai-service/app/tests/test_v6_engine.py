"""SmartCampus AI — Attendance & Learning Engine Unit Tests."""

import time
import pytest
import numpy as np
from unittest.mock import MagicMock
from app.models.student import Student
from app.models.attendance import Attendance
from app.models.candidate_image import CandidateImage
from app.models.unknown_face import UnknownFace
from app.services.attendance_engine import attendance_engine
from app.services.face_tracker import TrackedFace


@pytest.fixture(autouse=True)
def clean_attendance_engine():
    """Ensure clean active sessions list before and after tests."""
    attendance_engine.active_sessions.clear()
    attendance_engine.broadcast_cooldowns.clear()
    yield
    attendance_engine.active_sessions.clear()


def _make_mock_quality(score=90.0, width=120, height=120):
    """Helper to build a quality analysis dict matching FaceQualityService output."""
    return {
        "is_acceptable": True,
        "score": score,
        "size_score": 100.0,
        "blur_score": 100.0,
        "brightness_score": 100.0,
        "pose_score": 100.0,
        "pose": {"pitch": 0.0, "yaw": 0.0, "roll": 0.0},
        "dimensions": {"width": width, "height": height},
    }


def _make_mock_detection(crop):
    """Helper to build a detection dict matching FaceDetector output."""
    raw_face = MagicMock()
    raw_face.pose = [0.0, 0.0, 0.0]
    raw_face.det_score = 0.95
    return [{
        "bbox": [10, 10, 110, 110],
        "confidence": 0.95,
        "landmarks": np.zeros((5, 2)),
        "crop": crop,
        "raw_face": raw_face,
    }]


def test_attendance_marking_rule(db_session, monkeypatch):
    """Test visibility rule: mark attendance only if student is visible for >= 5 seconds."""
    # Seed student in DB
    student = Student(name="Manjunatha R", usn="ENG_USN001", department="CSE", semester=6, section="A")
    db_session.add(student)
    db_session.commit()

    # Track object simulating student recognized at 0.95 confidence
    track = TrackedFace(track_id="track_123", bbox=[10, 10, 110, 110], confidence=0.90)
    track.first_seen = time.time() - 2.0  # Visible for 2 seconds

    # Build a valid crop (not all-black, so Laplacian variance is non-zero)
    dummy_crop = np.ones((120, 120, 3), dtype=np.uint8) * 127

    # Mock the entire detection+quality+embedding pipeline inside _process_tracked_face
    monkeypatch.setattr(
        "app.services.face_detector.face_detector.detect_faces",
        lambda *args: _make_mock_detection(dummy_crop),
    )
    monkeypatch.setattr(
        "app.services.face_quality_service.face_quality_service.analyze_quality",
        lambda *args: _make_mock_quality(),
    )
    monkeypatch.setattr(
        "app.services.embedding_service.embedding_service.generate_embedding",
        lambda *args: np.random.randn(512).astype(np.float32),
    )
    # Mock FAISS matching to return the student's USN
    monkeypatch.setattr(
        "app.services.faiss_service.faiss_service.search_face",
        lambda *args, **kwargs: ("ENG_USN001", 0.95),
    )
    # Mock candidate capture to avoid candidate queue database modifications in this test
    monkeypatch.setattr(attendance_engine, "_process_learning_candidate", lambda *args: None)
    # Mock WebSocket broadcasts
    monkeypatch.setattr(
        "app.services.attendance_engine.websocket_manager.broadcast_sync",
        lambda *args, **kwargs: None,
    )

    # 1. Processing track with duration < 5s -> should NOT mark attendance
    attendance_engine._process_tracked_face(db_session, "webcam", "CSE_6A", track, dummy_crop)
    attendance_count = db_session.query(Attendance).count()
    assert attendance_count == 0

    # 2. Shift first_seen back so duration is 6 seconds (>= 5.0) -> should mark attendance
    track.first_seen = time.time() - 6.0
    attendance_engine._process_tracked_face(db_session, "webcam", "CSE_6A", track, dummy_crop)

    attendance_count = db_session.query(Attendance).count()
    assert attendance_count == 1
    att_record = db_session.query(Attendance).first()
    assert att_record.student_id == student.id
    assert att_record.class_id == "CSE_6A"


def test_continuous_learning_candidate_capture(db_session, monkeypatch):
    """Test candidate capture triggers when recognition confidence is > 98% and quality > 85."""
    student = Student(name="Manjunatha R", usn="ENG_USN001", department="CSE", semester=6, section="A")
    db_session.add(student)
    db_session.commit()

    track = TrackedFace(track_id="track_456", bbox=[10, 10, 110, 110], confidence=0.99)
    track.first_seen = time.time() - 1.0

    # Build a textured crop (non-uniform so Laplacian variance is naturally high)
    rng = np.random.RandomState(42)
    dummy_crop = rng.randint(80, 180, (120, 120, 3), dtype=np.uint8)

    # Mock high quality analysis (is_acceptable=True, score=90)
    monkeypatch.setattr(
        "app.services.face_detector.face_detector.detect_faces",
        lambda *args: _make_mock_detection(dummy_crop),
    )
    monkeypatch.setattr(
        "app.services.face_quality_service.face_quality_service.analyze_quality",
        lambda *args: _make_mock_quality(score=90.0, width=120, height=120),
    )
    monkeypatch.setattr(
        "app.services.embedding_service.embedding_service.generate_embedding",
        lambda *args: np.random.randn(512).astype(np.float32),
    )
    monkeypatch.setattr(
        "app.services.faiss_service.faiss_service.search_face",
        lambda *args, **kwargs: ("ENG_USN001", 0.99),
    )
    # Mock image storage save_candidate_face
    monkeypatch.setattr(
        "app.services.image_storage.image_storage.save_candidate_face",
        lambda *args: ("cand.jpg", "cand.npy"),
    )
    # Mock WebSocket broadcasts
    monkeypatch.setattr(
        "app.services.attendance_engine.websocket_manager.broadcast_sync",
        lambda *args, **kwargs: None,
    )
    # Mock os.path.exists for candidate dedup check
    import os
    monkeypatch.setattr(os.path, "exists", lambda path: False)

    attendance_engine._process_tracked_face(db_session, "webcam", "CSE_6A", track, dummy_crop)

    # Assert CandidateImage record is created in the database
    cands_count = db_session.query(CandidateImage).filter(CandidateImage.student_id == student.id).count()
    assert cands_count == 1

