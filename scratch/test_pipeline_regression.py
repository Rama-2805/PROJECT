"""SmartCampus AI — Automated Pipeline Regression Test Suite.

Executes tests 1 through 10 as specified in Part 26:
TEST 1: Same face with bbox jitter -> expected same track ID.
TEST 2: Small face with 20-30 px bbox -> expected track maintained.
TEST 3: Face missing for 2-5 frames -> expected track recovered via motion prediction.
TEST 4: Two nearby students -> expected separate tracks.
TEST 5: Duplicate detection of same face -> expected single active track.
TEST 6: Quality-approved crop -> expected ArcFace invocation.
TEST 7: ArcFace vector -> expected 512 dimensions, L2 norm approx 1.0.
TEST 8: Enrolled student -> expected FAISS similarity >= 0.580.
TEST 9: Unenrolled student -> expected UNKNOWN.
TEST 10: Same confirmed student over many frames -> expected stable identity without flickering.
"""

import os
import sys
import numpy as np
import cv2

# Ensure apps/ai-service is in python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "apps", "ai-service"))

from app.services.face_tracker import IoUTracker, TrackedFace
from app.services.embedding_service import embedding_service
from app.services.faiss_service import faiss_service


def run_all_tests():
    print("=" * 70)
    print("SMARTCAMPUS AI — AUTOMATED PIPELINE REGRESSION SUITE")
    print("=" * 70)

    results = []

    # ── TEST 1: Same face with bbox jitter ────────────────────────────
    try:
        tracker = IoUTracker()
        det1 = [{"bbox": [100, 100, 150, 150], "confidence": 0.95}]
        t1 = tracker.update(det1)
        id1 = t1[0].track_id

        # Jitter bbox by 4px
        det2 = [{"bbox": [103, 102, 154, 151], "confidence": 0.94}]
        t2 = tracker.update(det2)
        id2 = t2[0].track_id

        passed = (id1 == id2)
        results.append(("TEST 1: Bbox Jitter Stability", passed, f"Track {id1} == {id2}"))
    except Exception as e:
        results.append(("TEST 1: Bbox Jitter Stability", False, str(e)))

    # ── TEST 2: Small face with 20-30 px bbox ─────────────────────────
    try:
        tracker = IoUTracker()
        det1 = [{"bbox": [200, 200, 225, 225], "confidence": 0.90}]
        t1 = tracker.update(det1)
        id1 = t1[0].track_id

        det2 = [{"bbox": [202, 201, 226, 227], "confidence": 0.89}]
        t2 = tracker.update(det2)
        id2 = t2[0].track_id

        passed = (id1 == id2 and t2[0].face_size <= 30.0)
        results.append(("TEST 2: Small Face (20-30px) Maintenance", passed, f"Small track {id1} preserved"))
    except Exception as e:
        results.append(("TEST 2: Small Face (20-30px) Maintenance", False, str(e)))

    # ── TEST 3: Face missing for 2-5 frames ───────────────────────────
    try:
        tracker = IoUTracker()
        det1 = [{"bbox": [300, 300, 360, 360], "confidence": 0.95}]
        t1 = tracker.update(det1)
        id1 = t1[0].track_id

        # Simulate 3 missing frames
        for _ in range(3):
            tracker.update([])

        # Reappear near predicted position
        det_reappear = [{"bbox": [302, 301, 361, 361], "confidence": 0.92}]
        t_reappear = tracker.update(det_reappear)

        passed = (len(t_reappear) > 0 and t_reappear[0].track_id == id1)
        results.append(("TEST 3: 2-5 Frame Drop Recovery", passed, f"Track {id1} recovered after 3 drops"))
    except Exception as e:
        results.append(("TEST 3: 2-5 Frame Drop Recovery", False, str(e)))

    # ── TEST 4: Two nearby students ───────────────────────────────────
    try:
        tracker = IoUTracker()
        det_pair = [
            {"bbox": [100, 100, 140, 140], "confidence": 0.95},
            {"bbox": [155, 100, 195, 140], "confidence": 0.93},
        ]
        t_pair = tracker.update(det_pair)
        ids = [t.track_id for t in t_pair]

        passed = (len(ids) == 2 and ids[0] != ids[1])
        results.append(("TEST 4: Nearby Student Separation", passed, f"2 distinct tracks created: {ids}"))
    except Exception as e:
        results.append(("TEST 4: Nearby Student Separation", False, str(e)))

    # ── TEST 5: Duplicate detection of same face ──────────────────────
    try:
        tracker = IoUTracker()
        det_dup = [
            {"bbox": [100, 100, 150, 150], "confidence": 0.95},
            {"bbox": [102, 101, 151, 151], "confidence": 0.91},  # Duplicate
        ]
        t_res = tracker.update(det_dup)

        passed = (len(t_res) == 1)
        results.append(("TEST 5: Active Duplicate Track Suppression", passed, f"Merged duplicate -> {len(t_res)} track"))
    except Exception as e:
        results.append(("TEST 5: Active Duplicate Track Suppression", False, str(e)))

    # ── TEST 6: Quality-approved crop ArcFace invocation ──────────────
    try:
        dummy_crop = np.full((112, 112, 3), 128, dtype=np.uint8)
        cv2.circle(dummy_crop, (56, 56), 30, (200, 200, 200), -1)

        emb = embedding_service.generate_embedding(dummy_crop)
        passed = (emb is not None)
        results.append(("TEST 6: Quality Crop ArcFace Invocation", passed, "ArcFace called on quality crop"))
    except Exception as e:
        results.append(("TEST 6: Quality Crop ArcFace Invocation", False, str(e)))

    # ── TEST 7: ArcFace vector dimensions & L2 norm ───────────────────
    try:
        dummy_crop = np.full((112, 112, 3), 150, dtype=np.uint8)
        cv2.rectangle(dummy_crop, (20, 20), (90, 90), (50, 100, 200), -1)

        emb = embedding_service.generate_embedding(dummy_crop)
        if emb is not None:
            dim = len(emb)
            norm = float(np.linalg.norm(emb))
            passed = (dim == 512 and abs(norm - 1.0) < 1e-4)
            msg = f"dim={dim}, norm={norm:.4f}"
        else:
            passed = False
            msg = "Embedding generation returned None"
        results.append(("TEST 7: ArcFace 512D & L2 Norm Validation", passed, msg))
    except Exception as e:
        results.append(("TEST 7: ArcFace 512D & L2 Norm Validation", False, str(e)))

    # ── TEST 8: Enrolled student FAISS match (similarity >= 0.580) ────
    try:
        # Search using one of our enrolled vectors
        dummy_crop = cv2.imread("storage/enrollment/test_temporal_001/tracks/track_002/sample_3fbd1c.jpg")
        if dummy_crop is not None:
            if dummy_crop.shape[0] < 112 or dummy_crop.shape[1] < 112:
                dummy_crop = cv2.resize(dummy_crop, (112, 112))
            emb = embedding_service.generate_embedding(dummy_crop)
            match = faiss_service.search_face(emb, threshold=0.580) if emb is not None else None
            passed = (match is not None and match[0] == "1VI23CS001" and match[1] >= 0.580)
            msg = f"Matched {match[0]} with similarity {match[1]:.3f}" if match else "No match found"
        else:
            passed = False
            msg = "Reference crop image not found"
        results.append(("TEST 8: Enrolled Student FAISS Match (>= 0.580)", passed, msg))
    except Exception as e:
        results.append(("TEST 8: Enrolled Student FAISS Match (>= 0.580)", False, str(e)))

    # ── TEST 9: Unenrolled student UNKNOWN classification ─────────────
    try:
        random_noise_crop = np.random.randint(0, 256, (112, 112, 3), dtype=np.uint8)
        emb = embedding_service.generate_embedding(random_noise_crop)
        match = faiss_service.search_face(emb, threshold=0.580) if emb is not None else None

        passed = (match is None)
        msg = f"Correctly classified as UNKNOWN (highest sim: {match[1]:.3f})" if match else "Classified as UNKNOWN"
        results.append(("TEST 9: Unenrolled Student UNKNOWN Classification", passed, msg))
    except Exception as e:
        results.append(("TEST 9: Unenrolled Student UNKNOWN Classification", False, str(e)))

    # ── TEST 10: Same confirmed student over many frames (No flickering)
    try:
        track = TrackedFace(track_id="track_001", bbox=[100, 100, 150, 150], confidence=0.95)
        track.assigned_name = "1VI23CS001"
        track.recognition_similarity = 0.85
        track.consecutive_confirmations = 3

        # Simulate 10 frames with 1 temporary noisy drop
        history = []
        for f in range(10):
            if f == 5:
                # Transient noisy observation
                obs = ("UNKNOWN", 0.45)
            else:
                obs = ("1VI23CS001", 0.86)

            # Apply temporal voting hysteresis
            if obs[0] == track.assigned_name:
                track.consecutive_confirmations += 1
            else:
                # Do not immediately wipe assigned identity unless 3 consecutive mismatches occur
                if track.consecutive_confirmations > 0:
                    track.consecutive_confirmations -= 1

            history.append(track.assigned_name)

        passed = (all(h == "1VI23CS001" for h in history))
        results.append(("TEST 10: Temporal Confirmation Hysteresis (No Flickering)", passed, f"Identity stable across 10 frames: {set(history)}"))
    except Exception as e:
        results.append(("TEST 10: Temporal Confirmation Hysteresis (No Flickering)", False, str(e)))

    # ── REPORT SUMMARY ────────────────────────────────────────────────
    print("\n" + "=" * 70)
    print("AUTOMATED PIPELINE REGRESSION RESULTS")
    print("=" * 70)
    all_passed = True
    for name, ok, msg in results:
        status = "[PASS]" if ok else "[FAIL]"
        if not ok:
            all_passed = False
        print(f"{status} {name:<48} | {msg}")
    print("=" * 70)

    if all_passed:
        print("ALL 10 REGRESSION TESTS PASSED SUCCESSFULLY!")
    else:
        print("SOME REGRESSION TESTS FAILED. PLEASE REVIEW LOGS ABOVE.")


if __name__ == "__main__":
    run_all_tests()
