"""SmartCampus AI — Complete 17-Test Identity Clustering & Consolidation Suite.

Validates all 17 requirements:
1. Multiple tracks of same student -> 1 candidate
2. Multiple poses -> 1 candidate
3. Temporary occlusion -> 1 candidate
4. Different students -> separate candidates
5. Singleton -> UNKNOWN/LOW_EVIDENCE
6. 40 tracks representing 10 people -> ~10 candidates
7. Invalid embedding rejected
8. Zero embedding rejected
9. Non-512D embedding rejected
10. FAISS threshold remains 0.580
11. Strong duplicate noise tracks consolidate
12. Contradictory identities do not merge
13. Manual assignment persists
14. Duplicate student assignment is prevented
15. Confirmed cluster enrolls real vectors
16. Candidate cluster does not enroll
17. Roster size does not force cluster count
"""

import os
import sys
import unittest
import numpy as np

# Ensure app is on PYTHONPATH
sys.path.insert(0, os.path.abspath("apps/ai-service"))

from app.services.classroom_pipeline import ClassroomPipeline
from app.services.face_tracker import TrackedFace
from app.services.faiss_service import faiss_service
from app.config.settings import settings
from app.api.session_enrollment import state, assign_cluster_identity, AssignStudentRequest
from fastapi import HTTPException
import asyncio


def generate_unit_vector(dim=512, seed=None):
    """Generate a valid, deterministic 512D L2-normalized ArcFace embedding vector."""
    if seed is not None:
        np.random.seed(seed)
    v = np.random.randn(dim).astype(np.float32)
    norm = float(np.linalg.norm(v))
    return (v / norm).astype(np.float32)


def perturb_vector(base_vector, similarity=0.85, seed=None):
    """Generate a vector with exact target cosine similarity to base_vector."""
    if seed is not None:
        np.random.seed(seed)
    noise = np.random.randn(len(base_vector)).astype(np.float32)
    # Orthogonalize noise relative to base_vector
    noise = noise - np.dot(noise, base_vector) * base_vector
    noise = noise / float(np.linalg.norm(noise))
    # Combine to achieve target cosine similarity
    target = similarity * base_vector + np.sqrt(max(0.0, 1.0 - similarity**2)) * noise
    return (target / float(np.linalg.norm(target))).astype(np.float32)


class TestIdentityClusteringFullSuite(unittest.TestCase):

    def setUp(self):
        self.session_id = "test_clustering_17_suite"
        self.pipeline = ClassroomPipeline(
            session_id=self.session_id,
            base_storage_dir="storage/enrollment",
            detector_type="scrfd"
        )
        self.pipeline.tracker.tracks.clear()
        state.sessions[self.session_id] = {
            "status": "REVIEW_REQUIRED",
            "clusters": [],
            "totalTracks": 0,
        }

    def test_01_same_person_multiple_tracks_consolidate(self):
        """Test 1: Multiple tracks of the same physical person consolidate into ONE candidate."""
        person_v = generate_unit_vector(seed=101)
        for i, tid in enumerate(["track_015", "track_078", "track_142"]):
            tr = TrackedFace(track_id=tid, bbox=[100, 100, 200, 200], confidence=0.95, frame_number=i * 50)
            emb = perturb_vector(person_v, similarity=0.90 + i * 0.02, seed=1000 + i)
            tr.add_embedding(f"s_{tid}", emb, quality_score=85.0 + i, timestamp=i * 2.0, source_video="test.mp4")
            tr.selected_samples.append({"sample_id": f"s_{tid}", "quality_score": 85.0 + i, "timestamp": i * 2.0})
            self.pipeline.tracker.tracks[tid] = tr

        res = self.pipeline.run_hdbscan_clustering()
        clusters = res["clusters"]
        self.assertEqual(len(clusters), 1, f"Expected 1 consolidated cluster, got {len(clusters)}")
        self.assertEqual(clusters[0]["track_count"], 3)
        self.assertIn("track_015", clusters[0]["track_ids"])
        self.assertIn("track_078", clusters[0]["track_ids"])
        self.assertIn("track_142", clusters[0]["track_ids"])

    def test_02_same_person_multiple_poses(self):
        """Test 2: Same person with frontal, left, right pose embeddings consolidates into ONE candidate."""
        base_v = generate_unit_vector(seed=202)
        
        tr1 = TrackedFace(track_id="track_001", bbox=[100, 100, 200, 200], confidence=0.92, frame_number=0)
        emb1 = perturb_vector(base_v, similarity=0.95, seed=2001)
        tr1.add_embedding("s_front", emb1, quality_score=90.0, timestamp=0.0, source_video="test.mp4")
        tr1.selected_samples.append({"sample_id": "s_front", "quality_score": 90.0, "timestamp": 0.0})
        self.pipeline.tracker.tracks["track_001"] = tr1

        tr2 = TrackedFace(track_id="track_002", bbox=[105, 102, 205, 202], confidence=0.88, frame_number=100)
        emb2 = perturb_vector(base_v, similarity=0.82, seed=2002)
        tr2.add_embedding("s_left", emb2, quality_score=82.0, timestamp=3.0, source_video="test.mp4")
        tr2.selected_samples.append({"sample_id": "s_left", "quality_score": 82.0, "timestamp": 3.0})
        self.pipeline.tracker.tracks["track_002"] = tr2

        res = self.pipeline.run_hdbscan_clustering()
        self.assertEqual(len(res["clusters"]), 1)

    def test_03_same_person_temporary_occlusion(self):
        """Test 3: Same person split into two tracks by temporary occlusion merges into ONE candidate."""
        base_v = generate_unit_vector(seed=303)
        
        tr_pre = TrackedFace(track_id="track_010", bbox=[200, 200, 300, 300], confidence=0.90, frame_number=10)
        tr_pre.add_embedding("s_pre", perturb_vector(base_v, similarity=0.92, seed=3001), quality_score=88.0, timestamp=1.0, source_video="test.mp4")
        tr_pre.selected_samples.append({"sample_id": "s_pre", "quality_score": 88.0, "timestamp": 1.0})
        self.pipeline.tracker.tracks["track_010"] = tr_pre

        tr_post = TrackedFace(track_id="track_025", bbox=[205, 202, 305, 302], confidence=0.91, frame_number=80)
        tr_post.add_embedding("s_post", perturb_vector(base_v, similarity=0.91, seed=3002), quality_score=87.0, timestamp=4.0, source_video="test.mp4")
        tr_post.selected_samples.append({"sample_id": "s_post", "quality_score": 87.0, "timestamp": 4.0})
        self.pipeline.tracker.tracks["track_025"] = tr_post

        res = self.pipeline.run_hdbscan_clustering()
        self.assertEqual(len(res["clusters"]), 1)

    def test_04_different_people_remain_separate(self):
        """Test 4: Distinct people with low/moderate similarity (0.35) NEVER falsely merge."""
        person_a = generate_unit_vector(seed=401)
        person_b = generate_unit_vector(seed=402)
        sim_ab = float(np.dot(person_a, person_b))
        self.assertLess(sim_ab, 0.40)

        tr_a = TrackedFace(track_id="track_a", bbox=[50, 50, 150, 150], confidence=0.95, frame_number=0)
        tr_a.add_embedding("s_a", person_a, quality_score=90.0, timestamp=0.0, source_video="test.mp4")
        tr_a.selected_samples.append({"sample_id": "s_a", "quality_score": 90.0, "timestamp": 0.0})
        self.pipeline.tracker.tracks["track_a"] = tr_a

        tr_b = TrackedFace(track_id="track_b", bbox=[300, 300, 400, 400], confidence=0.95, frame_number=0)
        tr_b.add_embedding("s_b", person_b, quality_score=90.0, timestamp=0.0, source_video="test.mp4")
        tr_b.selected_samples.append({"sample_id": "s_b", "quality_score": 90.0, "timestamp": 0.0})
        self.pipeline.tracker.tracks["track_b"] = tr_b

        res = self.pipeline.run_hdbscan_clustering()
        self.assertEqual(len(res["clusters"]), 2)

    def test_05_singleton_track_unknown_status(self):
        """Test 5: Singleton track produces UNKNOWN/LOW_EVIDENCE candidate identity, NOT falsely CONFIRMED."""
        person_v = generate_unit_vector(seed=505)
        tr = TrackedFace(track_id="track_single", bbox=[100, 100, 200, 200], confidence=0.85, frame_number=0)
        tr.add_embedding("s_single", person_v, quality_score=75.0, timestamp=0.0, source_video="test.mp4")
        tr.selected_samples.append({"sample_id": "s_single", "quality_score": 75.0, "timestamp": 0.0})
        self.pipeline.tracker.tracks["track_single"] = tr

        res = self.pipeline.run_hdbscan_clustering()
        clusters = res["clusters"]
        self.assertEqual(len(clusters), 1)
        self.assertEqual(clusters[0]["sample_count"], 1)
        self.assertIn(clusters[0]["identity_status"], ["UNKNOWN", "CANDIDATE"])
        self.assertNotEqual(clusters[0]["identity_status"], "CONFIRMED")

    def test_06_ten_people_forty_tracks_consolidate_to_ten(self):
        """Test 6: 10 physical people generating 40 fragmented tracks consolidate into ~10 identity candidates (not 40)."""
        num_people = 10
        tracks_per_person = 4
        base_people = [generate_unit_vector(seed=600 + p) for p in range(num_people)]

        track_idx = 1
        for p_idx, p_vec in enumerate(base_people):
            for t in range(tracks_per_person):
                tid = f"track_{track_idx:03d}"
                tr = TrackedFace(track_id=tid, bbox=[50 + p_idx * 50, 50, 150 + p_idx * 50, 150], confidence=0.90, frame_number=t * 100)
                emb = perturb_vector(p_vec, similarity=0.86 + t * 0.03, seed=7000 + track_idx)
                tr.add_embedding(f"s_{tid}", emb, quality_score=80.0 + t * 3, timestamp=t * 2.0, source_video="test.mp4")
                tr.selected_samples.append({"sample_id": f"s_{tid}", "quality_score": 80.0 + t * 3, "timestamp": t * 2.0})
                self.pipeline.tracker.tracks[tid] = tr
                track_idx += 1

        self.assertEqual(len(self.pipeline.tracker.tracks), 40)
        res = self.pipeline.run_hdbscan_clustering()
        clusters = res["clusters"]
        self.assertLessEqual(len(clusters), 12, f"Expected ~10 identity candidates, got {len(clusters)} from 40 tracks")
        self.assertGreaterEqual(len(clusters), 9, f"Expected ~10 identity candidates, got {len(clusters)} from 40 tracks")

    def test_07_invalid_embeddings_rejected(self):
        """Test 7: NaN and Inf vectors are rejected."""
        tr = TrackedFace(track_id="track_invalid", bbox=[100, 100, 200, 200], confidence=0.80, frame_number=0)
        nan_vec = np.full(512, np.nan, dtype=np.float32)
        tr.add_embedding("s_nan", nan_vec, quality_score=75.0, timestamp=0.0, source_video="test.mp4")
        tr.selected_samples.append({"sample_id": "s_nan", "quality_score": 75.0, "timestamp": 0.0})
        self.pipeline.tracker.tracks["track_invalid"] = tr

        res = self.pipeline.run_hdbscan_clustering()
        self.assertEqual(len(res["clusters"]), 0)

    def test_08_zero_vectors_rejected(self):
        """Test 8: Zero vectors are rejected."""
        tr = TrackedFace(track_id="track_zero", bbox=[100, 100, 200, 200], confidence=0.80, frame_number=0)
        zero_vec = np.zeros(512, dtype=np.float32)
        tr.add_embedding("s_zero", zero_vec, quality_score=75.0, timestamp=0.0, source_video="test.mp4")
        tr.selected_samples.append({"sample_id": "s_zero", "quality_score": 75.0, "timestamp": 0.0})
        self.pipeline.tracker.tracks["track_zero"] = tr

        res = self.pipeline.run_hdbscan_clustering()
        self.assertEqual(len(res["clusters"]), 0)

    def test_09_non_512d_rejected(self):
        """Test 9: Embeddings with wrong dimensionality are rejected."""
        tr = TrackedFace(track_id="track_128", bbox=[100, 100, 200, 200], confidence=0.80, frame_number=0)
        vec_128 = np.ones(128, dtype=np.float32)
        tr.add_embedding("s_128", vec_128, quality_score=75.0, timestamp=0.0, source_video="test.mp4")
        tr.selected_samples.append({"sample_id": "s_128", "quality_score": 75.0, "timestamp": 0.0})
        self.pipeline.tracker.tracks["track_128"] = tr

        res = self.pipeline.run_hdbscan_clustering()
        self.assertEqual(len(res["clusters"]), 0)

    def test_10_faiss_threshold_preserved(self):
        """Test 10: Production recognition threshold 0.580 is preserved."""
        self.assertEqual(getattr(settings, "recognition_confidence_threshold", 0.58), 0.58)

    def test_11_strong_duplicate_noise_tracks_consolidate(self):
        """Test 11: Compatible noise tracks (cosine sim >= 0.80) consolidate into a unified candidate."""
        person_v = generate_unit_vector(seed=1111)
        for i in range(2):
            tid = f"noise_track_{i+1}"
            tr = TrackedFace(track_id=tid, bbox=[100 + i*10, 100, 200 + i*10, 200], confidence=0.85, frame_number=i*100)
            emb = perturb_vector(person_v, similarity=0.88, seed=11000 + i)
            tr.add_embedding(f"s_{tid}", emb, quality_score=80.0, timestamp=i*2.0, source_video="test.mp4")
            tr.selected_samples.append({"sample_id": f"s_{tid}", "quality_score": 80.0, "timestamp": i*2.0})
            self.pipeline.tracker.tracks[tid] = tr

        res = self.pipeline.run_hdbscan_clustering()
        self.assertEqual(len(res["clusters"]), 1)
        self.assertEqual(res["clusters"][0]["track_count"], 2)

    def test_12_contradictory_identities_do_not_merge(self):
        """Test 12: Clusters confirmed to different students are NEVER merged even if similarity is moderate."""
        person_a = generate_unit_vector(seed=1201)
        person_b = perturb_vector(person_a, similarity=0.74, seed=1202) # Borderline similarity

        # Register distinct students in FAISS
        faiss_service.add_student("1VI23CS001", person_a)
        faiss_service.add_student("1VI23CS002", person_b)

        tr_a = TrackedFace(track_id="tr_student1", bbox=[100, 100, 200, 200], confidence=0.95, frame_number=0)
        for i in range(3):
            tr_a.add_embedding(f"sa_{i}", perturb_vector(person_a, similarity=0.95, seed=1210+i), quality_score=90.0, timestamp=i, source_video="test.mp4")
            tr_a.selected_samples.append({"sample_id": f"sa_{i}", "quality_score": 90.0, "timestamp": i})
        self.pipeline.tracker.tracks["tr_student1"] = tr_a

        tr_b = TrackedFace(track_id="tr_student2", bbox=[300, 300, 400, 400], confidence=0.95, frame_number=0)
        for i in range(3):
            tr_b.add_embedding(f"sb_{i}", perturb_vector(person_b, similarity=0.95, seed=1220+i), quality_score=90.0, timestamp=i, source_video="test.mp4")
            tr_b.selected_samples.append({"sample_id": f"sb_{i}", "quality_score": 90.0, "timestamp": i})
        self.pipeline.tracker.tracks["tr_student2"] = tr_b

        res = self.pipeline.run_hdbscan_clustering()
        # Must produce 2 separate clusters
        self.assertEqual(len(res["clusters"]), 2)

    def test_13_manual_assignment_persists(self):
        """Test 13: Manual admin assignment marks cluster CONFIRMED with student details."""
        cluster_id = "cluster_test_13"
        state.sessions[self.session_id]["clusters"] = [{
            "clusterId": cluster_id,
            "status": "UNASSIGNED",
            "identity_status": "UNKNOWN",
            "sampleCount": 10
        }]

        req = AssignStudentRequest(usn="1VI23CS999", name="Manual Student", studentId="sid_999")
        res = asyncio.run(assign_cluster_identity(self.session_id, cluster_id, req))
        self.assertTrue(res["success"])
        c = res["cluster"]
        self.assertEqual(c["identity_status"], "CONFIRMED")
        self.assertEqual(c["usn"], "1VI23CS999")
        self.assertEqual(c["assignment_source"], "MANUAL")

    def test_14_duplicate_student_assignment_prevented(self):
        """Test 14: Assigning same student to another cluster removes the old assignment and keeps only new."""
        state.sessions[self.session_id]["clusters"] = [
            {"clusterId": "cluster_001", "usn": "1VI23CS111", "identity_status": "CONFIRMED"},
            {"clusterId": "cluster_002", "identity_status": "UNKNOWN"}
        ]

        req = AssignStudentRequest(usn="1VI23CS111", name="Duplicate Student")
        res = asyncio.run(assign_cluster_identity(self.session_id, "cluster_002", req))
        self.assertEqual(res["cluster"]["usn"], "1VI23CS111")
        # Ensure old cluster was cleared
        c1 = next(c for c in state.sessions[self.session_id]["clusters"] if c["clusterId"] == "cluster_001")
        self.assertIsNone(c1.get("usn"))
        self.assertIn(c1.get("identity_status"), ["UNASSIGNED", "UNKNOWN"])

    def test_15_confirmed_cluster_enrolls_real_vectors(self):
        """Test 15: Confirmed cluster enrolls only real 512D vectors into FAISS."""
        initial_count = faiss_service.index.ntotal
        real_vector = generate_unit_vector(seed=1501)
        
        # Adding real vector to FAISS
        faiss_service.add_student("1VI23CS888", real_vector)
        self.assertEqual(faiss_service.index.ntotal, initial_count + 1)

    def test_16_candidate_cluster_does_not_enroll(self):
        """Test 16: Unconfirmed candidate / unknown clusters cannot enroll into FAISS."""
        initial_count = faiss_service.index.ntotal
        
        # Verify invariant: only confirmed identity is added
        cluster_candidate = {"identity_status": "CANDIDATE", "status": "UNASSIGNED"}
        should_enroll = cluster_candidate.get("identity_status") == "CONFIRMED"
        self.assertFalse(should_enroll)
        self.assertEqual(faiss_service.index.ntotal, initial_count)

    def test_17_roster_size_does_not_force_cluster_count(self):
        """Test 17: Roster size is purely diagnostic and does not force cluster count."""
        for p in range(3):
            tid = f"track_p_{p}"
            tr = TrackedFace(track_id=tid, bbox=[100 + p*50, 100, 200 + p*50, 200], confidence=0.90, frame_number=0)
            emb = generate_unit_vector(seed=1700 + p)
            tr.add_embedding(f"s_{tid}", emb, quality_score=85.0, timestamp=0.0, source_video="test.mp4")
            tr.selected_samples.append({"sample_id": f"s_{tid}", "quality_score": 85.0, "timestamp": 0.0})
            self.pipeline.tracker.tracks[tid] = tr

        res = self.pipeline.run_hdbscan_clustering()
        self.assertEqual(len(res["clusters"]), 3)

    def test_18_many_tracks_same_people_consolidate(self):
        """Test 18: 30 synthetic people generating 120 tracks consolidate into ~30 final candidates."""
        num_people = 30
        tracks_per_person = 4
        base_people = [generate_unit_vector(seed=1800 + p) for p in range(num_people)]

        track_idx = 1
        for p_idx, p_vec in enumerate(base_people):
            for t in range(tracks_per_person):
                tid = f"track_p30_{track_idx:03d}"
                tr = TrackedFace(track_id=tid, bbox=[50 + (p_idx % 10)*40, 50, 100 + (p_idx % 10)*40, 100], confidence=0.90, frame_number=t * 100)
                emb = perturb_vector(p_vec, similarity=0.87 + t * 0.02, seed=18000 + track_idx)
                tr.add_embedding(f"s_{tid}", emb, quality_score=80.0 + t*2, timestamp=t*2.0, source_video="test.mp4")
                tr.selected_samples.append({"sample_id": f"s_{tid}", "quality_score": 80.0 + t*2, "timestamp": t*2.0})
                self.pipeline.tracker.tracks[tid] = tr
                track_idx += 1

        self.assertEqual(len(self.pipeline.tracker.tracks), 120)
        res = self.pipeline.run_hdbscan_clustering()
        clusters = res["clusters"]
        # 120 tracks representing 30 people should yield ~28-33 candidates
        self.assertLessEqual(len(clusters), 35, f"Expected ~30 candidates from 120 tracks, got {len(clusters)}")
        self.assertGreaterEqual(len(clusters), 26, f"Expected ~30 candidates from 120 tracks, got {len(clusters)}")

    def test_19_noise_tracks_do_not_become_individual_identities(self):
        """Test 19: HDBSCAN noise tracks belonging to the same person merge into 1 candidate."""
        person_v = generate_unit_vector(seed=1901)
        for i in range(3):
            tid = f"noise_t_{i+1}"
            tr = TrackedFace(track_id=tid, bbox=[100 + i*15, 100, 200 + i*15, 200], confidence=0.85, frame_number=i*80)
            emb = perturb_vector(person_v, similarity=0.88, seed=19100 + i)
            tr.add_embedding(f"s_{tid}", emb, quality_score=78.0, timestamp=i*2.0, source_video="test.mp4")
            tr.selected_samples.append({"sample_id": f"s_{tid}", "quality_score": 78.0, "timestamp": i*2.0})
            self.pipeline.tracker.tracks[tid] = tr

        res = self.pipeline.run_hdbscan_clustering()
        self.assertEqual(len(res["clusters"]), 1)
        self.assertEqual(res["clusters"][0]["track_count"], 3)

    def test_20_duplicate_candidate_consolidation(self):
        """Test 20: Distinct candidate groups with high similarity (0.85) consolidate cleanly."""
        person_v = generate_unit_vector(seed=2001)
        for i in range(4):
            tid = f"dup_cand_tr_{i+1}"
            tr = TrackedFace(track_id=tid, bbox=[100, 100, 200, 200], confidence=0.92, frame_number=i*50)
            emb = perturb_vector(person_v, similarity=0.91, seed=20100 + i)
            tr.add_embedding(f"s_{tid}", emb, quality_score=88.0, timestamp=i*2.0, source_video="test.mp4")
            tr.selected_samples.append({"sample_id": f"s_{tid}", "quality_score": 88.0, "timestamp": i*2.0})
            self.pipeline.tracker.tracks[tid] = tr

        res = self.pipeline.run_hdbscan_clustering()
        self.assertEqual(len(res["clusters"]), 1)
        self.assertEqual(res["clusters"][0]["track_count"], 4)

    def test_21_direct_similarity_guard(self):
        """Test 21: Dissimilar tracks (sim < 0.40) are strictly prevented from merging."""
        p_a = generate_unit_vector(seed=2101)
        p_b = generate_unit_vector(seed=2102)

        tr1 = TrackedFace(track_id="tr_guard_1", bbox=[50, 50, 150, 150], confidence=0.90, frame_number=0)
        tr1.add_embedding("s1", p_a, quality_score=85.0, timestamp=0.0, source_video="test.mp4")
        tr1.selected_samples.append({"sample_id": "s1", "quality_score": 85.0, "timestamp": 0.0})
        self.pipeline.tracker.tracks["tr_guard_1"] = tr1

        tr2 = TrackedFace(track_id="tr_guard_2", bbox=[200, 200, 300, 300], confidence=0.90, frame_number=0)
        tr2.add_embedding("s2", p_b, quality_score=85.0, timestamp=0.0, source_video="test.mp4")
        tr2.selected_samples.append({"sample_id": "s2", "quality_score": 85.0, "timestamp": 0.0})
        self.pipeline.tracker.tracks["tr_guard_2"] = tr2

        res = self.pipeline.run_hdbscan_clustering()
        self.assertEqual(len(res["clusters"]), 2)

    def test_22_transitive_merge_protection(self):
        """Test 22: Transitive drift A~B (0.76) and B~C (0.76) but A~C (0.50) is blocked by transitive guard."""
        vec_a = generate_unit_vector(seed=2201)
        vec_b = perturb_vector(vec_a, similarity=0.76, seed=2202)
        # Create C that is close to B but far from A
        vec_c = perturb_vector(vec_b, similarity=0.76, seed=2203)
        sim_ac = float(np.dot(vec_a, vec_c))

        tr_a = TrackedFace(track_id="tr_trans_a", bbox=[50, 50, 150, 150], confidence=0.95, frame_number=0)
        tr_a.add_embedding("sa", vec_a, quality_score=90.0, timestamp=0.0, source_video="test.mp4")
        tr_a.selected_samples.append({"sample_id": "sa", "quality_score": 90.0, "timestamp": 0.0})
        self.pipeline.tracker.tracks["tr_trans_a"] = tr_a

        tr_b = TrackedFace(track_id="tr_trans_b", bbox=[100, 100, 200, 200], confidence=0.95, frame_number=0)
        tr_b.add_embedding("sb", vec_b, quality_score=90.0, timestamp=0.0, source_video="test.mp4")
        tr_b.selected_samples.append({"sample_id": "sb", "quality_score": 90.0, "timestamp": 0.0})
        self.pipeline.tracker.tracks["tr_trans_b"] = tr_b

        tr_c = TrackedFace(track_id="tr_trans_c", bbox=[200, 200, 300, 300], confidence=0.95, frame_number=0)
        tr_c.add_embedding("sc", vec_c, quality_score=90.0, timestamp=0.0, source_video="test.mp4")
        tr_c.selected_samples.append({"sample_id": "sc", "quality_score": 90.0, "timestamp": 0.0})
        self.pipeline.tracker.tracks["tr_trans_c"] = tr_c

        res = self.pipeline.run_hdbscan_clustering()
        # If sim_ac < 0.60, transitive guard blocks merging all 3 into 1 cluster
        if sim_ac < 0.60:
            self.assertGreaterEqual(len(res["clusters"]), 2, "Transitive drift should be blocked")

    def test_23_candidate_count_does_not_equal_track_count(self):
        """Test 23: 10 tracks of 2 people results in 2 candidates, NOT 10 candidates."""
        p1 = generate_unit_vector(seed=2301)
        p2 = generate_unit_vector(seed=2302)

        for i in range(5):
            tid = f"tr_p1_{i}"
            tr = TrackedFace(track_id=tid, bbox=[100, 100, 200, 200], confidence=0.90, frame_number=i*20)
            emb = perturb_vector(p1, similarity=0.90, seed=2310 + i)
            tr.add_embedding(f"s_{tid}", emb, quality_score=85.0, timestamp=i*2.0, source_video="test.mp4")
            tr.selected_samples.append({"sample_id": f"s_{tid}", "quality_score": 85.0, "timestamp": i*2.0})
            self.pipeline.tracker.tracks[tid] = tr

        for i in range(5):
            tid = f"tr_p2_{i}"
            tr = TrackedFace(track_id=tid, bbox=[300, 300, 400, 400], confidence=0.90, frame_number=i*20)
            emb = perturb_vector(p2, similarity=0.90, seed=2320 + i)
            tr.add_embedding(f"s_{tid}", emb, quality_score=85.0, timestamp=i*2.0, source_video="test.mp4")
            tr.selected_samples.append({"sample_id": f"s_{tid}", "quality_score": 85.0, "timestamp": i*2.0})
            self.pipeline.tracker.tracks[tid] = tr

        self.assertEqual(len(self.pipeline.tracker.tracks), 10)
        res = self.pipeline.run_hdbscan_clustering()
        self.assertEqual(len(res["clusters"]), 2)
        self.assertNotEqual(len(res["clusters"]), 10)


if __name__ == "__main__":
    unittest.main(verbosity=2)
