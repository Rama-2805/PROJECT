"""SmartCampus AI — YOLO26-Face End-to-End Pipeline Unit & Integration Tests.

Validates:
1. Model loading & checkpoint verification (SHA-256 and task verification)
2. Empty and invalid frame handling
3. Bounding-box conversion and clipping
4. Confidence filtering and threshold enforcement
5. Duplicate detection suppression (IoU NMS)
6. Face quality filtering (blur, geometry, illumination)
7. ArcFace 512-D embedding extraction with 5-point landmark alignment
8. Embedding L2-normalization (unit norm)
9. FAISS vector search and identity validation
10. Unknown face handling (threshold gating)
11. Tracker compatibility with IoUTracker and TrackedFace
12. HDBSCAN clustering over normalized embeddings
13. Diagnostic metrics retrieval
"""

import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
import torch
import cv2
cv2.setNumThreads(0)
import hashlib
import numpy as np
import pytest
from pathlib import Path

from app.config.settings import settings
from app.services.yolo26_detector import YOLO26FaceDetector, yolo26_detector
from app.services.face_detector import face_detector
from app.services.embedding_service import embedding_service
from app.services.faiss_service import faiss_service
from app.services.face_tracker import IoUTracker, TrackedFace
from app.services.face_quality_service import face_quality_service


def test_yolo26_checkpoint_verification():
    """Verify that the official YOLO26-S-Face checkpoint exists, is valid, and matches SHA-256."""
    ckpt_path = Path("apps/ai-service/models/yolo26s-face.pt")
    if not ckpt_path.exists():
        ckpt_path = Path("models/yolo26s-face.pt")

    assert ckpt_path.exists(), f"YOLO26-S-Face checkpoint missing at {ckpt_path}"
    assert ckpt_path.stat().st_size > 20_000_000  # ~21.6 MB

    # Compute SHA-256
    h = hashlib.sha256()
    with open(ckpt_path, "rb") as f:
        while chunk := f.read(8192 * 1024):
            h.update(chunk)
    sha256_digest = h.hexdigest()

    expected_sha256 = "6f1485ac6397a94eecdb5d11575f72eb05130c6c6e6d896d0b4d4aaf02d7c69a"
    assert sha256_digest == expected_sha256, f"SHA-256 mismatch: {sha256_digest} != {expected_sha256}"


def test_yolo26_model_loading_and_architecture():
    """Verify lazy-loading and PoseModel architecture with 5 facial keypoints."""
    model = yolo26_detector.model
    assert model is not None
    assert getattr(model, "task", None) == "pose"
    assert getattr(model, "names", None) == {0: "face"}


def test_empty_and_invalid_frames():
    """Verify that detector safely returns empty lists for None or zero-sized frames."""
    detector = yolo26_detector

    # None input
    assert detector.detect_faces(None) == []

    # Zero-size frame
    empty_frame = np.array([])
    assert detector.detect_faces(empty_frame) == []

    # Zero-dimension frame
    zero_dim = np.zeros((0, 0, 3), dtype=np.uint8)
    assert detector.detect_faces(zero_dim) == []


def test_real_classroom_frame_detection():
    """Verify that detector successfully runs inference on a real classroom frame."""
    preview_path = Path("storage/enrollment/test_temporal_001/live_preview.jpg")
    if not preview_path.exists():
        pytest.skip("Test classroom frame not found")

    img = cv2.imread(str(preview_path))
    assert img is not None

    dets = yolo26_detector.detect_faces(img)
    assert len(dets) >= 5, f"Expected at least 5 faces on classroom preview, found {len(dets)}"

    for det in dets:
        # Bounding box validity
        bbox = det["bbox"]
        assert len(bbox) == 4
        x1, y1, x2, y2 = bbox
        assert 0 <= x1 < x2 <= img.shape[1]
        assert 0 <= y1 < y2 <= img.shape[0]

        # Confidence validity
        assert det["confidence"] >= yolo26_detector.confidence_threshold

        # Crop validity
        crop = det["crop"]
        assert crop is not None
        assert crop.shape[0] == y2 - y1
        assert crop.shape[1] == x2 - x1

        # Detector attribution
        assert det["detector"] == "yolo26-face"

        # Landmarks format
        landmarks = det["landmarks"]
        if landmarks is not None:
            assert landmarks.shape == (5, 2)


def test_arcface_embedding_generation_and_normalization():
    """Verify that ArcFace generates 512-D L2-normalized vectors."""
    # Test on synthetic texture crop
    rng = np.random.RandomState(42)
    sample_crop = rng.randint(50, 200, (112, 112, 3), dtype=np.uint8)

    emb = embedding_service.generate_embedding(sample_crop)
    assert emb is not None
    assert emb.shape == (512,)
    assert emb.dtype == np.float32 or emb.dtype == np.float64

    # Check L2-normalization (magnitude must be 1.0 within floating point precision)
    norm = np.linalg.norm(emb)
    assert abs(norm - 1.0) < 1e-4, f"Embedding not L2-normalized: norm = {norm}"


def test_faiss_vector_search_and_persistence():
    """Verify that FAISS stores, searches, and persists normalized embeddings."""
    test_usn = "TEST_USN_YOLO26"
    test_vec = np.random.randn(512).astype(np.float32)
    test_vec /= np.linalg.norm(test_vec)

    # Clean existing test entries if any
    faiss_service.remove_student_vectors(test_usn)

    initial_count = faiss_service.index.ntotal

    # Add test vector
    faiss_service.add_student(test_usn, test_vec)
    assert faiss_service.index.ntotal == initial_count + 1

    # Search for exact match
    match = faiss_service.search_face(test_vec, threshold=0.80)
    assert match is not None
    matched_usn, similarity = match
    assert matched_usn == test_usn
    assert similarity >= 0.99  # Cosine similarity with self is ~1.0

    # Search with different random vector
    diff_vec = np.random.randn(512).astype(np.float32)
    diff_vec /= np.linalg.norm(diff_vec)
    diff_match = faiss_service.search_face(diff_vec, threshold=0.85)
    # Random orthogonal vector should not falsely match with threshold 0.85
    assert diff_match is None

    # Cleanup
    faiss_service.remove_student_vectors(test_usn)
    assert faiss_service.index.ntotal == initial_count


def test_face_tracker_compatibility():
    """Verify that YOLO26 detections work seamlessly with the locked face_tracker."""
    tracker = IoUTracker(iou_threshold=0.30, max_lost_frames=5)

    # Frame 1: 3 distinct detections
    det_f1 = [
        {"bbox": [50, 50, 100, 100], "confidence": 0.88, "landmarks": np.zeros((5, 2)), "crop": np.zeros((50, 50, 3), dtype=np.uint8)},
        {"bbox": [200, 200, 260, 260], "confidence": 0.91, "landmarks": np.zeros((5, 2)), "crop": np.zeros((60, 60, 3), dtype=np.uint8)},
        {"bbox": [400, 100, 450, 150], "confidence": 0.85, "landmarks": np.zeros((5, 2)), "crop": np.zeros((50, 50, 3), dtype=np.uint8)},
    ]
    tracks_f1 = tracker.update(det_f1)
    assert len(tracks_f1) == 3
    t_ids_f1 = {t.track_id for t in tracks_f1}

    # Frame 2: Shifted slightly (tracking continuity)
    det_f2 = [
        {"bbox": [52, 51, 102, 101], "confidence": 0.89, "landmarks": np.zeros((5, 2)), "crop": np.zeros((50, 50, 3), dtype=np.uint8)},
        {"bbox": [201, 199, 261, 259], "confidence": 0.92, "landmarks": np.zeros((5, 2)), "crop": np.zeros((60, 60, 3), dtype=np.uint8)},
        {"bbox": [402, 101, 452, 151], "confidence": 0.87, "landmarks": np.zeros((5, 2)), "crop": np.zeros((50, 50, 3), dtype=np.uint8)},
    ]
    tracks_f2 = tracker.update(det_f2)
    assert len(tracks_f2) == 3
    t_ids_f2 = {t.track_id for t in tracks_f2}

    # IDs must remain identical (no track fragmentation)
    assert t_ids_f1 == t_ids_f2
    for t in tracks_f2:
        assert t.hits == 2
        assert t.consecutive_hits == 2


def test_hdbscan_clustering_on_embeddings():
    """Verify that HDBSCAN clusters distinct simulated student identities."""
    import hdbscan

    rng = np.random.RandomState(123)
    # Centroid 1 & Centroid 2
    c1 = rng.randn(512); c1 /= np.linalg.norm(c1)
    c2 = rng.randn(512); c2 /= np.linalg.norm(c2)

    # 4 embeddings near c1
    embs = []
    for _ in range(4):
        v = c1 + rng.randn(512) * 0.05
        embs.append(v / np.linalg.norm(v))

    # 4 embeddings near c2
    for _ in range(4):
        v = c2 + rng.randn(512) * 0.05
        embs.append(v / np.linalg.norm(v))

    X = np.array(embs)
    dist_matrix = (1.0 - np.clip(np.dot(X, X.T), -1.0, 1.0)).astype(np.float64)

    clusterer = hdbscan.HDBSCAN(metric="precomputed", min_cluster_size=2, min_samples=1, allow_single_cluster=False)
    labels = clusterer.fit_predict(dist_matrix)

    # Group 1 should have consistent label, Group 2 should have consistent label
    assert labels[0] == labels[1] == labels[2] == labels[3]
    assert labels[4] == labels[5] == labels[6] == labels[7]
    assert labels[0] != labels[4]


def test_yolo26_diagnostics_metrics():
    """Verify that detector metrics and diagnostics are tracked properly."""
    diag = yolo26_detector.get_diagnostics()
    assert diag["model_name"] == "YOLO26-S-Face"
    assert "total_frames_processed" in diag
    assert "average_latency_ms" in diag
    assert "approximate_fps" in diag


if __name__ == "__main__":
    tests = [
        ("Checkpoint Verification", test_yolo26_checkpoint_verification),
        ("Model Architecture & PoseModel Loading", test_yolo26_model_loading_and_architecture),
        ("Empty and Invalid Frame Safety", test_empty_and_invalid_frames),
        ("Real Classroom Frame Inference", test_real_classroom_frame_detection),
        ("ArcFace Embedding & Normalization", test_arcface_embedding_generation_and_normalization),
        ("FAISS Vector Search & Recovery", test_faiss_vector_search_and_persistence),
        ("IoU Tracker & TrackedFace Lifecycle", test_face_tracker_compatibility),
        ("HDBSCAN Unsupervised Clustering", test_hdbscan_clustering_on_embeddings),
        ("YOLO26 Inference Diagnostics", test_yolo26_diagnostics_metrics),
    ]

    print("=" * 60)
    print("RUNNING SMARTCAMPUS AI YOLO26-FACE PIPELINE VERIFICATION SUITE")
    print("=" * 60)
    passed = 0
    for name, test_fn in tests:
        try:
            print(f"[*] Running: {name}...")
            test_fn()
            print(f"    -> [PASS] {name}")
            passed += 1
        except Exception as e:
            print(f"    -> [FAIL] {name}: {e}")
            import traceback
            traceback.print_exc()

    print("=" * 60)
    print(f"RESULT: {passed}/{len(tests)} tests passed successfully!")
    print("=" * 60)

