"""SmartCampus AI — Pytest Fixtures and Configurations."""

import os
import sys
import pytest
import numpy as np
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Add application path to sys.path to resolve imports correctly
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

# Set environment variables for testing
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["STORAGE_DIR"] = "test_storage"
os.environ["FACE_INDEX_PATH"] = "test_vectors/face_index.faiss"
os.environ["METADATA_PATH"] = "test_vectors/metadata.json"

from app.config.database import Base, get_db
from app.models import Student, FaceProfile, Embedding, UnknownFace, Camera, Attendance, CandidateImage, AuditLog
from app.main import app

# Create in-memory SQLite database for testing.
# StaticPool ensures ALL connections go to the same in-memory database,
# which is critical when the TestClient runs API handlers in worker threads.
test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="function")
def db_session():
    """Provides a transactional database session for each test function."""
    Base.metadata.create_all(bind=test_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(scope="function")
def client(db_session):
    """Provides a TestClient connected to the mock database."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def mock_insightface(monkeypatch):
    """Mock the heavy InsightFace library to avoid model downloads during tests.

    IMPORTANT: The face_detector code does `import insightface` then accesses
    `insightface.app.FaceAnalysis(...)`. Since `insightface` is a MagicMock,
    the attribute chain `insightface.app.FaceAnalysis` must be explicitly set up
    to return the correct mock face objects.
    """
    from app.services.face_detector import face_detector
    face_detector._model = None

    mock_face = MagicMock()
    mock_face.det_score = 0.95
    mock_face.bbox = np.array([10.0, 10.0, 110.0, 110.0])
    mock_face.landmark = np.array([
        [30.0, 30.0],   # Left eye
        [70.0, 30.0],   # Right eye
        [50.0, 50.0],   # Nose tip
        [35.0, 70.0],   # Mouth left
        [65.0, 70.0],   # Mouth right
    ])
    mock_face.pose = [0.0, 0.0, 0.0]
    # 512-dimensional mock embedding
    mock_face.embedding = np.random.randn(512).astype(np.float32)
    mock_face.embedding = mock_face.embedding / np.linalg.norm(mock_face.embedding)

    # The model object returned by insightface.app.FaceAnalysis()
    mock_app = MagicMock()
    mock_app.get.return_value = [mock_face]

    # Build the top-level insightface mock.
    # face_detector.py does: `import insightface`
    # Then: `self._model = insightface.app.FaceAnalysis(...)`
    # So we need: insightface.app.FaceAnalysis(...) → mock_app
    mock_insightface_module = MagicMock()
    mock_insightface_module.app.FaceAnalysis.return_value = mock_app
    orig_insightface = sys.modules.get("insightface")
    orig_insightface_app = sys.modules.get("insightface.app")

    sys.modules["insightface"] = mock_insightface_module
    sys.modules["insightface.app"] = mock_insightface_module.app

    # Mock cv2 functions that read/write from file to speed up tests
    import cv2
    monkeypatch.setattr(cv2, "imwrite", lambda *args, **kwargs: True)
    # Return a dummy 100x100 BGR image with mid-range brightness (not black)
    monkeypatch.setattr(cv2, "imread", lambda *args, **kwargs: np.ones((100, 100, 3), dtype=np.uint8) * 127)

    yield mock_app

    if orig_insightface is not None:
        sys.modules["insightface"] = orig_insightface
    else:
        sys.modules.pop("insightface", None)

    if orig_insightface_app is not None:
        sys.modules["insightface.app"] = orig_insightface_app
    else:
        sys.modules.pop("insightface.app", None)
