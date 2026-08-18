"""Controlled 20-frame profiling script for SmartCampus AI pipeline.
Measures per-frame Stage-1 processing time, track count, quality evaluations, and Stage-2 timing.
"""

import os
import sys
import time
import cv2

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "apps", "ai-service"))

from app.services.classroom_pipeline import ClassroomPipeline
from app.services.face_detector import face_detector
from app.services.embedding_service import embedding_service
from app.services.faiss_service import faiss_service

def profile_20_frames(video_path: str = "footage/2.mp4", frame_count: int = 20):
    print("=" * 80)
    print(f"PROFILING {frame_count} FRAMES FOR PERFORMANCE ACCUMULATION")
    print("=" * 80, flush=True)

    cap = cv2.VideoCapture(video_path)
    fps_in = cap.get(cv2.CAP_PROP_FPS) or 30.0
    pipeline = ClassroomPipeline(session_id="profiling_001", base_storage_dir="storage")

    # Warmup / Cold-start model init (frame -1 / dummy)
    ret, dummy_frame = cap.read()
    if ret:
        t_init_0 = time.time()
        print("Initializing ONNX models (cold start)...", flush=True)
        _ = face_detector.detect_multiscale_faces(dummy_frame)
        print(f"ONNX Model Initialization complete in {(time.time() - t_init_0)*1000:.1f} ms", flush=True)

    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
    stage1_frame_durations = []
    
    t_global_start = time.time()

    for i in range(frame_count):
        ret, frame = cap.read()
        if not ret:
            break

        timestamp_sec = i / fps_in

        # Strictly measure _process_frame duration
        t0_proc = time.time()
        active_tracks = pipeline._process_frame(
            frame=frame,
            frame_number=i,
            video_name=os.path.basename(video_path),
            timestamp_sec=timestamp_sec,
            face_detector=face_detector,
            embedding_service=embedding_service,
        )
        dt_proc_ms = (time.time() - t0_proc) * 1000.0
        stage1_frame_durations.append(dt_proc_ms)

        tr = pipeline.tracker
        if i % 5 == 0 or i == frame_count - 1:
            print(
                f"Frame {i:02d} | _process_frame: {dt_proc_ms:7.1f} ms ({1000.0/dt_proc_ms:5.2f} FPS) | "
                f"Detections: {pipeline.current_frame_faces:02d} | Active: {len(tr.active_tracks_list):02d} | "
                f"Lost: {len(tr.lost_tracks_list):02d} | Total Tracks: {tr.total_tracks_created:02d} | "
                f"Quality Acc: {pipeline.quality_accepted} | Quality Rej: {pipeline.quality_rejected}",
                flush=True
            )

    cap.release()

    # Stage 2 ArcFace & HDBSCAN & FAISS
    t0_stage2 = time.time()
    print("\nExecuting Stage 2 ArcFace Embedding Extraction...", flush=True)
    pipeline._extract_deferred_embeddings(embedding_service)
    stage2_dur_ms = (time.time() - t0_stage2) * 1000.0

    t0_hdbscan = time.time()
    print("Executing HDBSCAN Clustering...", flush=True)
    pipeline.run_hdbscan_clustering()
    hdbscan_dur_ms = (time.time() - t0_hdbscan) * 1000.0

    t0_faiss = time.time()
    recognized_cnt = 0
    for t_id, track in pipeline.tracker.tracks.items():
        if track.embeddings:
            centroid = getattr(track, "track_centroid", None) or getattr(track, "rolling_embedding", None)
            if centroid is not None:
                match = faiss_service.search_face(centroid, threshold=0.580)
                if match:
                    recognized_cnt += 1
    faiss_dur_ms = (time.time() - t0_faiss) * 1000.0

    total_bench_dur_sec = time.time() - t_global_start

    avg_stage1_ms = sum(stage1_frame_durations) / len(stage1_frame_durations) if stage1_frame_durations else 0.0
    avg_stage1_fps = 1000.0 / avg_stage1_ms if avg_stage1_ms > 0 else 0.0

    print("\n" + "=" * 80)
    print("PROFILING SUMMARY")
    print("=" * 80)
    print(f"Average Stage-1 Frame Time: {avg_stage1_ms:.1f} ms")
    print(f"Average Stage-1 FPS:        {avg_stage1_fps:.2f} FPS")
    print(f"Stage-2 ArcFace Time:       {stage2_dur_ms:.1f} ms")
    print(f"HDBSCAN Time:               {hdbscan_dur_ms:.1f} ms")
    print(f"FAISS Search Time:          {faiss_dur_ms:.1f} ms")
    print(f"Total Benchmark Time:       {total_bench_dur_sec:.2f} seconds")
    print("=" * 80)

if __name__ == "__main__":
    profile_20_frames()
