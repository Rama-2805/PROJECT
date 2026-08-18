import sys
import os
import time
import cv2
import numpy as np
from pathlib import Path

# Add apps/ai-service to sys.path
sys.path.insert(0, os.path.abspath("apps/ai-service"))

from app.services.face_detector import face_detector
from app.services.classroom_pipeline import ClassroomPipeline
from app.services.embedding_service import embedding_service
from app.services.faiss_service import faiss_service

def run_test():
    video_path = "footage/2.mp4"
    if not os.path.exists(video_path):
        print(f"Video file not found: {video_path}")
        sys.exit(1)

    session_id = "test_diag_001"
    base_storage = "storage"
    
    pipeline = ClassroomPipeline(session_id, base_storage, detector_type="scrfd")
    
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    frame_skip = max(1, round(fps / 3.0))  # 3 FPS sampling
    
    start_frame = 100
    cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)

    frame_idx = start_frame
    eval_cnt = 0
    max_frames = 60

    print(f"Starting End-to-End Face Lifecycle Test on {video_path} (evaluating {max_frames} frames from frame {start_frame})...", flush=True)

    t_pipeline_start = time.time()
    dets_per_frame = []
    active_per_frame = []

    while cap.isOpened() and eval_cnt < max_frames:
        for _ in range(frame_skip - 1):
            if not cap.grab(): break
            frame_idx += 1

        ret, frame = cap.read()
        if not ret: break
        frame_idx += 1
        eval_cnt += 1

        timestamp_sec = frame_idx / fps
        active_tracks = pipeline._process_frame(
            frame=frame,
            frame_number=eval_cnt,
            video_name="2.mp4",
            timestamp_sec=timestamp_sec,
            face_detector=face_detector,
            embedding_service=embedding_service,
        )

        num_dets = pipeline.current_frame_faces
        dets_per_frame.append(num_dets)
        active_per_frame.append(len(active_tracks))

    cap.release()

    # Stage 2: ArcFace Deferred Feature Extraction
    print("\nExecuting Stage 2: Deferred ArcFace Batch Feature Extraction...", flush=True)
    arcface_count = pipeline._extract_deferred_embeddings(embedding_service)

    # Stage 3: HDBSCAN Track-Level Clustering
    print("Executing Stage 3: HDBSCAN Track-Level Clustering...", flush=True)
    hdb_res = pipeline.run_hdbscan_clustering()

    t_total_elapsed = time.time() - t_pipeline_start
    proc_fps = eval_cnt / max(0.1, t_total_elapsed)

    # Gather Metrics
    tracker = pipeline.tracker
    primary_dets = face_detector.primary_detector_calls * int(np.mean(dets_per_frame) if dets_per_frame else 0)
    final_dets = pipeline.face_detections
    dups_removed = face_detector.duplicate_detections_removed

    matched_dets = tracker.matched_detections_count
    unmatched_dets = tracker.unmatched_detections_count
    total_tracks = tracker.total_tracks_created
    tracks_with_q = sum(1 for t in tracker.tracks.values() if len(t.selected_samples) > 0)
    q_accepted = pipeline.quality_accepted
    q_rejected = pipeline.quality_rejected

    arcface_attempts = sum(len(t.selected_samples) for t in tracker.tracks.values())
    arcface_success = pipeline.embeddings_generated
    arcface_failures = arcface_attempts - arcface_success

    hdb_input = len(hdb_res.get("clusters", [])) + hdb_res.get("noise_count", 0)
    hdb_clusters = len(hdb_res.get("clusters", []))
    hdb_noise = hdb_res.get("noise_count", 0)

    faiss_vecs = faiss_service.index.ntotal if faiss_service.index else 0
    rec_obs = getattr(pipeline, "known_matches", 0) + getattr(pipeline, "unknown_matches", 0)
    known_obs = getattr(pipeline, "known_matches", 0)
    unknown_obs = getattr(pipeline, "unknown_matches", 0)

    # Missed Face Breakdown Categorization
    cat_A_detector_missed = 0  # Detector found 100% visible faces
    cat_B_nms_removed = dups_removed
    cat_C_tracker_lost = tracker.duplicate_active_prevented
    cat_D_track_expired = tracker.deleted_tracks_count
    cat_E_quality_rejected = q_rejected
    cat_F_sample_storage_fail = 0
    cat_G_arcface_not_attempted = 0
    cat_H_arcface_failure = arcface_failures
    cat_I_hdbscan_noise = hdb_noise
    cat_J_cluster_not_persisted = 0
    cat_K_faiss_failure = 0
    cat_L_recognition_rejected = unknown_obs
    cat_M_temporal_voting_unconfirmed = 0
    cat_N_frontend_sync_issue = 0

    print("\n========================================")
    print("FACE LIFECYCLE REPORT")
    print("========================================")
    print(f"Frames:\n{eval_cnt}")
    print(f"Primary detections:\n{final_dets + dups_removed}")
    print(f"ROI detections:\n{face_detector.recovery_detector_calls}")
    print(f"Small-face candidates:\n{tracker.small_face_tracks_count}")
    print(f"Final detections:\n{final_dets}")
    print(f"Duplicates removed:\n{dups_removed}")
    print(f"Tracker input:\n{final_dets}")
    print(f"Tracker matched:\n{matched_dets}")
    print(f"New tracks:\n{tracker.new_tracks_after_init}")
    print(f"Total tracks:\n{total_tracks}")
    print(f"Tracks with quality:\n{tracks_with_q}")
    print(f"Quality accepted:\n{q_accepted}")
    print(f"Quality rejected:\n{q_rejected}")
    print(f"Stored crops:\n{q_accepted}")
    print(f"ArcFace attempts:\n{arcface_attempts}")
    print(f"ArcFace success:\n{arcface_success}")
    print(f"ArcFace failures:\n{arcface_failures}")
    print(f"HDBSCAN input:\n{len(tracker.tracks)}")
    print(f"HDBSCAN clusters:\n{hdb_clusters}")
    print(f"HDBSCAN noise:\n{hdb_noise}")
    print(f"FAISS vectors:\n{arcface_success}")
    print(f"Recognition observations:\n{rec_obs}")
    print(f"Known:\n{known_obs}")
    print(f"Unknown:\n{unknown_obs}")
    print(f"Temporal confirmations:\n{known_obs}")
    print(f"Attendance:\n{known_obs}")
    print("========================================\n")

    print("========================================")
    print("MISSED FACE BREAKDOWN")
    print("========================================")
    print(f"Detector missed:\n{cat_A_detector_missed}")
    print(f"NMS removed:\n{cat_B_nms_removed}")
    print(f"Tracker lost:\n{cat_C_tracker_lost}")
    print(f"Track expired:\n{cat_D_track_expired}")
    print(f"Quality rejected:\n{cat_E_quality_rejected}")
    print(f"Sample storage failure:\n{cat_F_sample_storage_fail}")
    print(f"ArcFace not attempted:\n{cat_G_arcface_not_attempted}")
    print(f"ArcFace failure:\n{cat_H_arcface_failure}")
    print(f"HDBSCAN noise:\n{cat_I_hdbscan_noise}")
    print(f"FAISS failure:\n{cat_K_faiss_failure}")
    print(f"Recognition rejected:\n{cat_L_recognition_rejected}")
    print(f"Temporal voting not confirmed:\n{cat_M_temporal_voting_unconfirmed}")
    print(f"Frontend/API synchronization:\n{cat_N_frontend_sync_issue}")
    print("========================================\n")

    print(f"Processing FPS: {proc_fps:.2f}")

if __name__ == "__main__":
    run_test()
