"""SmartCampus AI — Camera Service Unit Tests."""

import cv2
import pytest
from unittest.mock import MagicMock
from app.services.camera_service import camera_service, CameraState


def test_camera_lifecycle(monkeypatch):
    """Test starting, state verification, and stopping of a camera thread."""
    # Mock cv2.VideoCapture
    mock_cap = MagicMock()
    mock_cap.isOpened.return_value = True
    mock_cap.read.return_value = (True, MagicMock())
    
    monkeypatch.setattr(cv2, "VideoCapture", lambda *args, **kwargs: mock_cap)

    camera_id = "test_cam"
    source = "0"

    # Start camera
    started = camera_service.start_camera(camera_id, source)
    assert started is True
    
    # Assert state transitions to ONLINE or CONNECTING
    state = camera_service.get_camera_state(camera_id)
    assert state in [CameraState.ONLINE, CameraState.CONNECTING]

    # Stop camera
    camera_service.stop_camera(camera_id)
    assert camera_service.get_camera_state(camera_id) == CameraState.OFFLINE


def test_camera_test_endpoint(client, monkeypatch):
    """Test the POST /api/v1/camera/test endpoint."""
    import numpy as np
    
    # Mock cv2.VideoCapture
    mock_cap = MagicMock()
    mock_cap.isOpened.return_value = True
    # mock frame: a 300x300 BGR image
    dummy_frame = np.ones((300, 300, 3), dtype=np.uint8) * 127
    mock_cap.read.return_value = (True, dummy_frame)
    monkeypatch.setattr(cv2, "VideoCapture", lambda *args, **kwargs: mock_cap)

    # Mock face_detector.detect_faces to return a dummy detection list
    monkeypatch.setattr(
        "app.services.face_detector.face_detector.detect_faces",
        lambda frame: [{"bbox": [10, 10, 100, 100], "confidence": 0.9}]
    )

    response = client.post("/api/v1/camera/test", json={"source": "0"})
    assert response.status_code == 200
    data = response.json()
    assert data["camera_status"] == "ONLINE"
    assert data["faces_detected"] == 1
    assert data["resolution"] == "300x300"
    assert "fps" in data
