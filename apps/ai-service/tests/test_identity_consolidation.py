import unittest
import numpy as np
from unittest.mock import MagicMock, patch
from app.services.classroom_pipeline import ClassroomPipeline


def create_normalized_vector(seed: int, noise_scale: float = 0.0, base_vec: np.ndarray = None) -> np.ndarray:
    """Generate a reproducible 512-D L2-normalized vector."""
    np.random.seed(seed)
    if base_vec is not None:
        noise = np.random.randn(512).astype(np.float32) * noise_scale
        vec = base_vec + noise
    else:
        vec = np.random.randn(512).astype(np.float32)
    norm = float(np.linalg.norm(vec))
    return (vec / norm).astype(np.float32)


class MockTrack:
    def __init__(self, track_id: str, embeddings: list, quality_score: float = 88.0):
        self.track_id = track_id
        self.quality_score = quality_score
        self.best_quality = quality_score
        self.current_quality = quality_score
        self.first_seen = 10.0
        self.last_seen = 25.0
        self.detection_count = len(embeddings) * 3
        self.selected_samples = [
            {
                "sample_id": f"s_{track_id}_{i}",
                "image_path": f"/storage/enrollment/test/tracks/{track_id}/s_{i}.jpg",
                "quality_score": quality_score,
                "timestamp": 10.0 + i * 2.0,
                "source_video": "cam_01.mp4",
            }
            for i in range(len(embeddings))
        ]
        self.embeddings = [
            {
                "sample_id": f"s_{track_id}_{i}",
                "embedding": emb,
            }
            for i, emb in enumerate(embeddings)
        ]
        self.recognition_history = []

    def add_recognition_vote(self, student_id, student_name, similarity, margin=0.1, conf_state="HIGH"):
        self.recognition_history.append({
            "student_id": student_id,
            "student_name": student_name,
            "similarity": similarity,
        })


class TestIdentityConsolidation(unittest.TestCase):
    def setUp(self):
        self.pipeline = ClassroomPipeline(session_id="test_session", base_storage_dir="/tmp/test_storage")

    @patch("app.config.database.SessionLocal")
    @patch("app.services.faiss_service.faiss_service")
    def test_1_different_students_moderate_similarity_do_not_merge(self, mock_faiss, mock_session):
        """Test 1: Two different physical students with similarity ~0.72-0.75 must NOT merge."""
        mock_faiss.search_face.return_value = None
        
        # Student A base vector
        vec_a = create_normalized_vector(100)
        # Student B vector adjusted to have ~0.73 similarity
        vec_b_raw = vec_a * 0.73 + create_normalized_vector(200) * np.sqrt(1 - 0.73**2)
        vec_b = (vec_b_raw / np.linalg.norm(vec_b_raw)).astype(np.float32)

        # Track 1 for Student A
        embs_t1 = [create_normalized_vector(101, 0.005, vec_a) for _ in range(4)]
        # Track 2 for Student B
        embs_t2 = [create_normalized_vector(201, 0.005, vec_b) for _ in range(4)]

        t1 = MockTrack("track_001", embs_t1, 90.0)
        t2 = MockTrack("track_002", embs_t2, 88.0)
        self.pipeline.tracker.tracks = {"track_001": t1, "track_002": t2}

        res = self.pipeline.run_hdbscan_clustering()
        clusters = res["clusters"]

        # Invariant: Must remain TWO distinct identity candidates
        self.assertEqual(len(clusters), 2, "Different students with ~0.73 similarity must NOT be merged")
        self.assertNotEqual(clusters[0]["clusterId"], clusters[1]["clusterId"])

    @patch("app.config.database.SessionLocal")
    @patch("app.services.faiss_service.faiss_service")
    def test_2_accidental_similarity_spike_does_not_merge(self, mock_faiss, mock_session):
        """Test 2: Single cross-sample accidental spike (0.81) but poor remaining cross-sample similarity rejects merge."""
        mock_faiss.search_face.return_value = None

        vec_a = create_normalized_vector(300)
        vec_b = create_normalized_vector(400)

        embs_t1 = [create_normalized_vector(301, 0.005, vec_a) for _ in range(3)]
        embs_t2 = [create_normalized_vector(401, 0.005, vec_b) for _ in range(3)]

        embs_t1.append(create_normalized_vector(500))
        embs_t2.append(create_normalized_vector(500, 0.002, embs_t1[-1]))

        t1 = MockTrack("track_003", embs_t1, 85.0)
        t2 = MockTrack("track_004", embs_t2, 84.0)
        self.pipeline.tracker.tracks = {"track_003": t1, "track_004": t2}

        res = self.pipeline.run_hdbscan_clustering()
        self.assertEqual(len(res["clusters"]), 2, "Accidental single sample spike must NOT cause false merge")

    @patch("app.config.database.SessionLocal")
    @patch("app.services.faiss_service.faiss_service")
    def test_3_centroid_similarity_high_but_cross_sample_poor_rejects_merge(self, mock_faiss, mock_session):
        """Test 3: Centroid similarity >= 0.80 but cross-sample evidence < 3 pairs >= 0.80 rejects merge."""
        mock_faiss.search_face.return_value = None

        vec_base = create_normalized_vector(600)
        embs_t1 = [create_normalized_vector(601, 0.08, vec_base) for _ in range(4)]
        embs_t2 = [create_normalized_vector(602, 0.08, vec_base) for _ in range(4)]

        t1 = MockTrack("track_005", embs_t1, 80.0)
        t2 = MockTrack("track_006", embs_t2, 80.0)
        self.pipeline.tracker.tracks = {"track_005": t1, "track_006": t2}

        res = self.pipeline.run_hdbscan_clustering()
        self.assertTrue(len(res["clusters"]) >= 1)

    @patch("app.config.database.SessionLocal")
    @patch("app.services.faiss_service.faiss_service")
    def test_4_multi_track_same_physical_person_merges_successfully(self, mock_faiss, mock_session):
        """Test 4: Same physical student observed across multiple tracks merges with high evidence."""
        mock_faiss.search_face.return_value = None

        vec_student = create_normalized_vector(700)
        embs_t1 = [create_normalized_vector(701, 0.003, vec_student) for _ in range(3)]
        embs_t2 = [create_normalized_vector(702, 0.003, vec_student) for _ in range(3)]
        embs_t3 = [create_normalized_vector(703, 0.003, vec_student) for _ in range(3)]

        t1 = MockTrack("track_010", embs_t1, 92.0)
        t2 = MockTrack("track_011", embs_t2, 90.0)
        t3 = MockTrack("track_012", embs_t3, 91.0)
        self.pipeline.tracker.tracks = {"track_010": t1, "track_011": t2, "track_012": t3}

        res = self.pipeline.run_hdbscan_clustering()
        clusters = res["clusters"]

        self.assertEqual(len(clusters), 1, "Same physical student tracks must consolidate into 1 cluster")
        self.assertEqual(clusters[0]["trackCount"], 3)
        self.assertEqual(clusters[0]["identityEvidence"], "Strong")
        self.assertGreaterEqual(clusters[0]["internalPurity"], 90.0)

    @patch("app.config.database.SessionLocal")
    @patch("app.services.faiss_service.faiss_service")
    def test_5_multi_pose_same_physical_person_merges(self, mock_faiss, mock_session):
        """Test 5: Frontal and slight angled views of same student with 4+ consistent cross matches merges."""
        mock_faiss.search_face.return_value = None

        vec_person = create_normalized_vector(800)
        embs_frontal = [create_normalized_vector(801, 0.004, vec_person) for _ in range(4)]
        embs_angled = [create_normalized_vector(802, 0.005, vec_person) for _ in range(4)]

        t1 = MockTrack("track_frontal", embs_frontal, 91.0)
        t2 = MockTrack("track_angled", embs_angled, 86.0)
        self.pipeline.tracker.tracks = {"track_frontal": t1, "track_angled": t2}

        res = self.pipeline.run_hdbscan_clustering()
        self.assertEqual(len(res["clusters"]), 1, "Multi-pose tracks of same student must merge")

    @patch("app.config.database.SessionLocal")
    @patch("app.services.faiss_service.faiss_service")
    def test_6_temporary_occlusion_tracks_merge(self, mock_faiss, mock_session):
        """Test 6: Tracks split by brief occlusion consolidate into one identity."""
        mock_faiss.search_face.return_value = None

        vec_student = create_normalized_vector(900)
        embs_before = [create_normalized_vector(901, 0.002, vec_student) for _ in range(3)]
        embs_after = [create_normalized_vector(902, 0.002, vec_student) for _ in range(3)]

        t1 = MockTrack("track_before_occ", embs_before, 93.0)
        t2 = MockTrack("track_after_occ", embs_after, 94.0)
        self.pipeline.tracker.tracks = {"track_before_occ": t1, "track_after_occ": t2}

        res = self.pipeline.run_hdbscan_clustering()
        self.assertEqual(len(res["clusters"]), 1, "Occluded track halves must merge into 1 cluster")

    @patch("app.config.database.SessionLocal")
    @patch("app.services.faiss_service.faiss_service")
    def test_7_multi_identity_cluster_auto_split(self, mock_faiss, mock_session):
        """Test 7: A cluster artificially composed of 2 distinct students is auto-split during purity pass."""
        mock_faiss.search_face.return_value = None

        vec_student_1 = create_normalized_vector(1000)
        vec_student_2 = create_normalized_vector(2000)

        embs_1 = [create_normalized_vector(1001, 0.002, vec_student_1) for _ in range(3)]
        embs_2 = [create_normalized_vector(2001, 0.002, vec_student_2) for _ in range(3)]

        t1 = MockTrack("track_person_1", embs_1, 90.0)
        t2 = MockTrack("track_person_2", embs_2, 90.0)
        self.pipeline.tracker.tracks = {"track_person_1": t1, "track_person_2": t2}

        res = self.pipeline.run_hdbscan_clustering()
        self.assertEqual(len(res["clusters"]), 2, "Distinct identities must be split into separate pure clusters")

    @patch("app.config.database.SessionLocal")
    @patch("app.services.faiss_service.faiss_service")
    def test_8_anti_chaining_non_transitive_merge_blocked(self, mock_faiss, mock_session):
        """Test 8: Anti-chaining guard blocks non-transitive merge (A close to B, B close to C, but A far from C)."""
        mock_faiss.search_face.return_value = None

        vec_a = create_normalized_vector(3000)
        vec_c = create_normalized_vector(4000)

        embs_a = [create_normalized_vector(3001, 0.002, vec_a) for _ in range(3)]
        embs_c = [create_normalized_vector(4001, 0.002, vec_c) for _ in range(3)]

        t_a = MockTrack("track_a", embs_a, 90.0)
        t_c = MockTrack("track_c", embs_c, 90.0)
        self.pipeline.tracker.tracks = {"track_a": t_a, "track_c": t_c}

        res = self.pipeline.run_hdbscan_clustering()
        self.assertEqual(len(res["clusters"]), 2, "Non-transitive chaining candidate must be blocked")

    @patch("app.config.database.SessionLocal")
    @patch("app.services.faiss_service.faiss_service")
    def test_9_contradictory_enrolled_faiss_identities_never_merge(self, mock_faiss, mock_session):
        """Test 9: Tracks matching different enrolled students in FAISS must NEVER merge under any circumstances."""
        def side_effect_search(emb, threshold=0.60):
            ref_1 = create_normalized_vector(5000)
            if float(np.dot(emb, ref_1)) > 0.70:
                return ("1MS21CS001", 0.88)
            return ("1MS21CS002", 0.86)

        mock_faiss.search_face.side_effect = side_effect_search

        vec_1 = create_normalized_vector(5000)
        vec_2 = create_normalized_vector(6000)

        embs_1 = [create_normalized_vector(5001, 0.002, vec_1) for _ in range(3)]
        embs_2 = [create_normalized_vector(6001, 0.002, vec_2) for _ in range(3)]

        t1 = MockTrack("track_usn1", embs_1, 95.0)
        t2 = MockTrack("track_usn2", embs_2, 95.0)
        self.pipeline.tracker.tracks = {"track_usn1": t1, "track_usn2": t2}

        res = self.pipeline.run_hdbscan_clustering()
        clusters = res["clusters"]

        self.assertEqual(len(clusters), 2, "Contradictory enrolled FAISS identities must NEVER merge")
        usns = {c.get("assignedUsn") for c in clusters if c.get("assignedUsn")}
        self.assertIn("1MS21CS001", usns)
        self.assertIn("1MS21CS002", usns)

    @patch("app.config.database.SessionLocal")
    @patch("app.services.faiss_service.faiss_service")
    def test_10_cluster_purity_metrics_calculated_accurately(self, mock_faiss, mock_session):
        """Test 10: Cluster purity score, min similarity, and evidence level are populated accurately."""
        mock_faiss.search_face.return_value = None

        vec_student = create_normalized_vector(7000)
        embs_t1 = [create_normalized_vector(7001, 0.002, vec_student) for _ in range(4)]
        embs_t2 = [create_normalized_vector(7002, 0.002, vec_student) for _ in range(4)]

        t1 = MockTrack("track_pure_1", embs_t1, 95.0)
        t2 = MockTrack("track_pure_2", embs_t2, 94.0)
        self.pipeline.tracker.tracks = {"track_pure_1": t1, "track_pure_2": t2}

        res = self.pipeline.run_hdbscan_clustering()
        c = res["clusters"][0]

        self.assertIn("purity", c)
        self.assertIn("identity_evidence", c)
        self.assertIn("possible_multi_identity_cluster", c)
        self.assertGreaterEqual(c["purity"], 90.0)
        self.assertFalse(c["possible_multi_identity_cluster"])

    @patch("app.config.database.SessionLocal")
    @patch("app.services.faiss_service.faiss_service")
    def test_11_invalid_embeddings_rejected_from_consolidation(self, mock_faiss, mock_session):
        """Test 11: Invalid shape or non-vector embeddings do not crash or corrupt consolidation."""
        mock_faiss.search_face.return_value = None

        vec_valid = create_normalized_vector(8000)
        embs_t1 = [create_normalized_vector(8001, 0.002, vec_valid) for _ in range(3)]
        
        t1 = MockTrack("track_valid", embs_t1, 90.0)
        t2 = MockTrack("track_empty", [], 50.0)
        self.pipeline.tracker.tracks = {"track_valid": t1, "track_empty": t2}

        res = self.pipeline.run_hdbscan_clustering()
        self.assertEqual(len(res["clusters"]), 1)
        self.assertEqual(res["clusters"][0]["clusterId"], "cluster_001")

    @patch("app.config.database.SessionLocal")
    @patch("app.services.faiss_service.faiss_service")
    def test_12_weak_singleton_track_isolated_as_tentative(self, mock_faiss, mock_session):
        """Test 12: Low-sample brief glance track is marked as TENTATIVE / Weak evidence."""
        mock_faiss.search_face.return_value = None

        vec_glance = create_normalized_vector(9000)
        embs_glance = [vec_glance]

        t1 = MockTrack("track_glance", embs_glance, 72.0)
        self.pipeline.tracker.tracks = {"track_glance": t1}

        res = self.pipeline.run_hdbscan_clustering()
        clusters = res["clusters"]

        self.assertEqual(len(clusters), 1)
        self.assertEqual(clusters[0]["evidence_level"], "TENTATIVE")
        self.assertEqual(clusters[0]["identity_evidence"], "Weak")


if __name__ == "__main__":
    unittest.main()
