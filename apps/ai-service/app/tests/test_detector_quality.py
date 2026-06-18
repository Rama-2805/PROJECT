"""SmartCampus AI — Face Detector and Quality Filter Unit Tests."""

import numpy as np
import pytest
from unittest.mock import MagicMock
from app.services.face_detector import face_detector
from app.services.face_quality_service import face_quality_service


def test_face_detector_filtering(monkeypatch):
    """Test that face detector filters out low-confidence faces."""
    dummy_frame = np.zeros((480, 640, 3), dtype=np.uint8)

    # 1. High confidence face should be detected
    mock_face_high = MagicMock()
    mock_face_high.det_score = 0.92
    mock_face_high.bbox = np.array([20.0, 20.0, 100.0, 100.0])
    mock_face_high.landmark = np.zeros((5, 2))

    monkeypatch.setattr(face_detector.model, "get", lambda *args: [mock_face_high])
    results = face_detector.detect_faces(dummy_frame)
    assert len(results) == 1
    assert results[0]["confidence"] == 0.92
    assert results[0]["bbox"] == [20, 20, 100, 100]

    # 2. Low confidence face (< 0.8) should be skipped
    mock_face_low = MagicMock()
    mock_face_low.det_score = 0.75
    mock_face_low.bbox = np.array([20.0, 20.0, 100.0, 100.0])
    mock_face_low.landmark = np.zeros((5, 2))

    monkeypatch.setattr(face_detector.model, "get", lambda *args: [mock_face_low])
    results = face_detector.detect_faces(dummy_frame)
    assert len(results) == 0


def test_face_quality_scoring():
    """Test that the quality scoring assigns correct scores and acceptance criteria."""
    # Create a dummy high quality crop (120x120 pixels, with texture for blur detection)
    # Uniform images have zero Laplacian variance, so we add random texture
    rng = np.random.RandomState(42)
    high_qual_crop = rng.randint(100, 160, (120, 120, 3), dtype=np.uint8)
    
    raw_face = MagicMock()
    raw_face.pose = [0.0, 0.0, 0.0]
    
    metrics = face_quality_service.analyze_quality(high_qual_crop, raw_face)
    assert metrics["score"] > 70.0
    assert metrics["is_acceptable"] == True

    # Create a tiny face crop (50x50 pixels) — should be rejected
    tiny_crop = np.ones((50, 50, 3), dtype=np.uint8) * 127
    metrics = face_quality_service.analyze_quality(tiny_crop, raw_face)
    assert metrics["is_acceptable"] == False


def test_pose_estimation_from_landmarks():
    """Test that head pose is estimated correctly from landmark coordinates."""
    # Mock landmarks: eyes at same horizontal, nose centered, mouth aligned
    landmarks = np.array([
        [10.0, 20.0],  # Left eye
        [30.0, 20.0],  # Right eye
        [20.0, 25.0],  # Nose tip
        [12.0, 30.0],  # Mouth left
        [28.0, 30.0]   # Mouth right
    ])

    pitch, yaw, roll = face_quality_service.estimate_pose_from_landmarks(landmarks)
    # Since eyes are level, roll should be 0
    assert roll == 0.0
    # Since nose is exactly between eyes (10 and 30 -> 20), yaw should be close to 0
    assert abs(yaw) < 2.0
