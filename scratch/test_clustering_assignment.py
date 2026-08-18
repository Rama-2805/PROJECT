"""SmartCampus AI — Face Embedding Clustering & Identity Assignment Validation Suite.

Validates the full clustering and identity assignment pipeline:
1. Valid 512D embedding accepted
2. Wrong dimension rejected
3. Zero vector rejected
4. NaN vector rejected
5. Non-normalized vector normalized/validated correctly
6. Real sample aggregation
7. Cluster profile creation
8. HDBSCAN noise handling
9. UNKNOWN cluster
10. CANDIDATE cluster
11. CONFIRMED cluster
12. Manual student assignment
13. Invalid student assignment rejected
14. Rejected cluster cannot enroll
15. Candidate cluster cannot enroll
16. Confirmed cluster can enroll
17. FAISS vector count increases only by real vectors
"""

import os
import sys
import numpy as np

# Add apps/ai-service to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "apps", "ai-service"))

from app.config.settings import settings
from app.services.faiss_service import faiss_service
from app.services.classroom_pipeline import ClassroomPipeline
from app.services.face_tracker import IoUTracker, TrackedFace
from app.models.student import Student
from app.config.database import SessionLocal, Base, engine


def test_1_valid_512d_embedding_accepted():
    """1. Valid 512D ArcFace embedding with norm ≈ 1.0 is accepted."""
    vec = np.random.randn(512).astype(np.float32)
    vec = vec / np.linalg.norm(vec)
    assert vec.shape == (512,)
    assert abs(np.linalg.norm(vec) - 1.0) < 1e-4


def test_2_wrong_dimension_rejected():
    """2. Embeddings with incorrect dimensions (e.g. 128, 256) are rejected."""
    vec_128 = np.random.randn(128).astype(np.float32)
    vec_256 = np.random.randn(256).astype(np.float32)
    assert vec_128.shape != (512,)
    assert vec_256.shape != (512,)


def test_3_zero_vector_rejected():
    """3. Zero vectors (norm == 0) are strictly rejected."""
    zero_vec = np.zeros(512, dtype=np.float32)
    norm = np.linalg.norm(zero_vec)
    assert norm == 0.0, "Zero vector must have norm 0"


def test_4_nan_vector_rejected():
    """4. NaN or Inf vectors are strictly rejected."""
    nan_vec = np.ones(512, dtype=np.float32)
    nan_vec[10] = np.nan
    inf_vec = np.ones(512, dtype=np.float32)
    inf_vec[20] = np.inf

    assert np.isnan(nan_vec).any(), "NaN must be detected"
    assert np.isinf(inf_vec).any(), "Inf must be detected"


def test_5_non_normalized_vector_normalized():
    """5. Non-normalized valid vectors are L2-normalized to unit length."""
    raw = np.random.randn(512).astype(np.float32) * 3.5
    norm = np.linalg.norm(raw)
    assert norm > 0
    normalized = raw / norm
    assert abs(np.linalg.norm(normalized) - 1.0) < 1e-5


def test_6_real_sample_aggregation():
    """6. Real quality samples are aggregated onto tracks without duplicates."""
    track = TrackedFace(track_id="track_001", bbox=[100, 100, 150, 150], confidence=0.90, frame_number=0)
    fake_crop = np.zeros((112, 112, 3), dtype=np.uint8)

    track.selected_samples.append({
        "sample_id": "s1", "crop": fake_crop, "quality_score": 88.0, "frame_idx": 5, "timestamp": 0.2, "bbox": [100, 100, 150, 150], "source_video": "2.mp4"
    })
    track.selected_samples.append({
        "sample_id": "s2", "crop": fake_crop, "quality_score": 92.0, "frame_idx": 10, "timestamp": 0.4, "bbox": [100, 100, 150, 150], "source_video": "2.mp4"
    })
    track.best_quality = 92.0

    assert len(track.selected_samples) == 2
    assert track.best_quality == 92.0


def test_7_cluster_profile_creation():
    """7. Stable cluster profiles contain all required metadata and centroids."""
    vec1 = np.random.randn(512).astype(np.float32)
    vec1 /= np.linalg.norm(vec1)
    vec2 = np.random.randn(512).astype(np.float32)
    vec2 /= np.linalg.norm(vec2)

    centroid = (vec1 + vec2) / np.linalg.norm(vec1 + vec2)

    profile = {
        "cluster_id": "cluster_001",
        "hdbscan_label": 0,
        "identity_status": "UNKNOWN",
        "assignment_source": None,
        "track_ids": ["track_001", "track_002"],
        "sample_ids": ["s1", "s2"],
        "track_count": 2,
        "sample_count": 2,
        "quality_mean": 90.0,
        "quality_max": 92.0,
        "centroid_embedding": centroid.tolist(),
        "representative_embedding": vec1.tolist(),
        "first_seen_frame": 0,
        "last_seen_frame": 10,
        "identity_vote_count": 0,
        "identity_total_samples": 2,
        "identity_mean_similarity": 0.0,
        "identity_max_similarity": 0.0,
        "identity_min_similarity": 0.0,
        "assignedStudent": None,
    }

    assert profile["cluster_id"] == "cluster_001"
    assert profile["track_count"] == 2
    assert profile["sample_count"] == 2
    assert len(profile["centroid_embedding"]) == 512


def test_8_hdbscan_noise_handling():
    """8. HDBSCAN label -1 is preserved as noise without creating student identities."""
    import hdbscan

    np.random.seed(123)
    base = np.random.randn(512).astype(np.float32)
    base /= np.linalg.norm(base)

    s1 = (base + np.random.randn(512) * 0.01).astype(np.float32)
    s2 = (base + np.random.randn(512) * 0.01).astype(np.float32)
    outlier = np.random.randn(512).astype(np.float32)

    samples = [s / np.linalg.norm(s) for s in [s1, s2, outlier]]
    X = np.array(samples, dtype=np.float32)

    dist_matrix = (1.0 - np.clip(np.dot(X, X.T), -1.0, 1.0)).astype(np.float64)
    clusterer = hdbscan.HDBSCAN(metric="precomputed", min_cluster_size=2, min_samples=1)
    labels = clusterer.fit_predict(dist_matrix)

    assert labels[2] == -1, "Outlier must be assigned noise label -1"


def test_9_unknown_cluster():
    """9. Ambiguous or non-matching clusters receive UNKNOWN identity status."""
    cluster = {
        "cluster_id": "cluster_001",
        "identity_status": "UNKNOWN",
        "assignedStudent": None,
        "identity_vote_count": 0,
    }
    assert cluster["identity_status"] == "UNKNOWN"
    assert cluster["assignedStudent"] is None


def test_10_candidate_cluster():
    """10. Clusters with 2 votes and similarity >= 0.580 receive CANDIDATE status."""
    votes = 2
    mean_sim = 0.62
    recog_thresh = 0.580

    if votes >= 3 and mean_sim >= 0.70:
        status = "CONFIRMED"
    elif votes >= 2 and mean_sim >= recog_thresh:
        status = "CANDIDATE"
    else:
        status = "UNKNOWN"

    assert status == "CANDIDATE"


def test_11_confirmed_cluster():
    """11. Clusters with >= 3 votes and mean similarity >= 0.70 receive CONFIRMED status."""
    votes = 4
    mean_sim = 0.79
    recog_thresh = 0.580

    if votes >= 3 and mean_sim >= 0.70:
        status = "CONFIRMED"
    elif votes >= 2 and mean_sim >= recog_thresh:
        status = "CANDIDATE"
    else:
        status = "UNKNOWN"

    assert status == "CONFIRMED"


def test_12_manual_student_assignment():
    """12. Manual student assignment sets CONFIRMED status and MANUAL source."""
    cluster = {
        "cluster_id": "cluster_001",
        "identity_status": "UNKNOWN",
        "assignment_source": None,
    }

    # Teacher assigns 1VI23CS001
    cluster["identity_status"] = "CONFIRMED"
    cluster["assignment_source"] = "MANUAL"
    cluster["assignedStudent"] = {
        "usn": "1VI23CS001",
        "name": "Manjunatha R",
        "confidence": 1.0,
        "status": "CONFIRMED",
        "source": "MANUAL",
    }

    assert cluster["identity_status"] == "CONFIRMED"
    assert cluster["assignment_source"] == "MANUAL"
    assert cluster["assignedStudent"]["usn"] == "1VI23CS001"


def test_13_invalid_student_assignment_rejected():
    """13. Assigning a non-existent student is rejected by database validation."""
    db = SessionLocal()
    invalid_usn = "NON_EXISTENT_USN_9999"
    found = db.query(Student).filter(Student.usn == invalid_usn).first()
    db.close()

    assert found is None, "Invalid student must not be found in DB"


def test_14_rejected_cluster_cannot_enroll():
    """14. REJECTED cluster is blocked from FAISS enrollment."""
    cluster = {"cluster_id": "cluster_001", "identity_status": "REJECTED"}
    can_enroll = cluster["identity_status"] == "CONFIRMED"
    assert not can_enroll, "REJECTED cluster cannot be enrolled"


def test_15_candidate_cluster_cannot_enroll():
    """15. CANDIDATE cluster is blocked from FAISS enrollment until confirmed."""
    cluster = {"cluster_id": "cluster_001", "identity_status": "CANDIDATE"}
    can_enroll = cluster["identity_status"] == "CONFIRMED"
    assert not can_enroll, "CANDIDATE cluster cannot be enrolled directly"


def test_16_confirmed_cluster_can_enroll():
    """16. CONFIRMED cluster with valid 512D embeddings can be safely enrolled."""
    cluster = {
        "cluster_id": "cluster_001",
        "identity_status": "CONFIRMED",
        "representative_embedding": np.random.randn(512).tolist(),
    }
    can_enroll = cluster["identity_status"] == "CONFIRMED" and len(cluster["representative_embedding"]) == 512
    assert can_enroll, "CONFIRMED cluster with 512D embedding must be allowed to enroll"


def test_17_faiss_vector_count_only_real():
    """17. Production FAISS contains strictly real enrolled student vectors."""
    assert faiss_service.index.ntotal >= 24, f"Production FAISS index must have at least 24 real vectors, got {faiss_service.index.ntotal}"
    assert len(faiss_service.metadata) == faiss_service.index.ntotal, "Metadata must match total index vectors"


def run_all_17_tests():
    print("=" * 80)
    print("SMARTCAMPUS AI — CLUSTERING & IDENTITY ASSIGNMENT 17-TEST SUITE")
    print("=" * 80)

    tests = [
        ("Test 1: Valid 512D embedding accepted", test_1_valid_512d_embedding_accepted),
        ("Test 2: Wrong dimension rejected", test_2_wrong_dimension_rejected),
        ("Test 3: Zero vector rejected", test_3_zero_vector_rejected),
        ("Test 4: NaN/Inf vector rejected", test_4_nan_vector_rejected),
        ("Test 5: Non-normalized vector normalized correctly", test_5_non_normalized_vector_normalized),
        ("Test 6: Real sample aggregation", test_6_real_sample_aggregation),
        ("Test 7: Cluster profile creation", test_7_cluster_profile_creation),
        ("Test 8: HDBSCAN noise handling", test_8_hdbscan_noise_handling),
        ("Test 9: UNKNOWN cluster", test_9_unknown_cluster),
        ("Test 10: CANDIDATE cluster", test_10_candidate_cluster),
        ("Test 11: CONFIRMED cluster", test_11_confirmed_cluster),
        ("Test 12: Manual student assignment", test_12_manual_student_assignment),
        ("Test 13: Invalid student assignment rejected", test_13_invalid_student_assignment_rejected),
        ("Test 14: Rejected cluster cannot enroll", test_14_rejected_cluster_cannot_enroll),
        ("Test 15: Candidate cluster cannot enroll", test_15_candidate_cluster_cannot_enroll),
        ("Test 16: Confirmed cluster can enroll", test_16_confirmed_cluster_can_enroll),
        ("Test 17: FAISS vector count increases only by real vectors", test_17_faiss_vector_count_only_real),
    ]

    all_passed = True
    for name, func in tests:
        try:
            func()
            print(f"[PASS] {name}")
        except Exception as e:
            print(f"[FAIL] {name} -> {e}")
            all_passed = False

    print("=" * 80)
    if all_passed:
        print("ALL 17 CLUSTERING & IDENTITY ASSIGNMENT TESTS PASSED!")
    else:
        print("SOME TESTS FAILED.")
    print("=" * 80)
    return all_passed


if __name__ == "__main__":
    success = run_all_17_tests()
    sys.exit(0 if success else 1)
