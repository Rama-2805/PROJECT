import sys
import os
import json
import time
import cv2
import numpy as np

sys.path.insert(0, os.path.abspath("apps/ai-service"))

from app.services.face_detector import face_detector
from app.services.classroom_pipeline import ClassroomPipeline
from app.services.embedding_service import embedding_service
from app.services.faiss_service import faiss_service

def run_diagnostic():
    video_path = "footage/2.mp4"
    if not os.path.exists(video_path):
        print(f"Video file not found: {video_path}")
        sys.exit(1)

    print("========================================", flush=True)
    print("STEP 3 — INSPECTING FAISS INDEX & METADATA MAPPING", flush=True)
    print("========================================", flush=True)

    faiss_vec_count = faiss_service.index.ntotal if faiss_service.index else 0
    print(f"FAISS Total Vector Count: {faiss_vec_count}", flush=True)
    print("FAISS Metadata Mapping:", flush=True)
    print(json.dumps(faiss_service.metadata, indent=2), flush=True)

    # Step 1 & Pipeline Run: Process 30 representative frames of footage/2.mp4
    session_id = "test_diag_unknown_001"
    pipeline = ClassroomPipeline(session_id, "storage", detector_type="scrfd")

    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    frame_skip = max(1, round(fps / 3.0))

    start_frame = 100
    cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)

    frame_idx = start_frame
    eval_cnt = 0
    max_frames = 30

    print(f"\nProcessing {max_frames} frames from {video_path} starting at frame {start_frame}...", flush=True)

    while cap.isOpened() and eval_cnt < max_frames:
        for _ in range(frame_skip - 1):
            if not cap.grab(): break
            frame_idx += 1

        ret, frame = cap.read()
        if not ret: break
        frame_idx += 1
        eval_cnt += 1

        timestamp_sec = frame_idx / fps
        pipeline._process_frame(
            frame=frame,
            frame_number=eval_cnt,
            video_name="2.mp4",
            timestamp_sec=timestamp_sec,
            face_detector=face_detector,
            embedding_service=embedding_service,
        )

    cap.release()

    # Deferred ArcFace Batch Feature Extraction
    print("\nExecuting Stage 2 Deferred ArcFace Embedding Extraction...", flush=True)
    arcface_count = pipeline._extract_deferred_embeddings(embedding_service)
    print(f"ArcFace embeddings generated: {arcface_count}", flush=True)

    # Stage 3 HDBSCAN Clustering
    print("\nExecuting Stage 3 HDBSCAN Track-Level Clustering...", flush=True)
    hdb_res = pipeline.run_hdbscan_clustering()

    print("\n========================================", flush=True)
    print("STEP 2 — FAISS SIMILARITY DISTRIBUTION ANALYSIS", flush=True)
    print("========================================", flush=True)

    threshold = 0.58

    unknown_sims = []
    known_sims = []

    row_sims = {"front": [], "middle": [], "back": []}
    size_sims = {"<20": [], "20-30": [], "30-40": [], "40-50": [], ">50": []}

    indiv_vs_centroid = []

    # Detailed Face Lifecycle Records
    lifecycle_records = []

    for t_id, track in pipeline.tracker.tracks.items():
        bx1, by1, bx2, by2 = [int(v) for v in track.bbox]
        w_px = max(1, bx2 - bx1)
        h_px = max(1, by2 - by1)
        face_size = max(w_px, h_px)

        # Estimate row position based on cy in image (1080p frame)
        cy = (by1 + by2) / 2.0
        if cy > 650:
            row = "front"
        elif cy > 400:
            row = "middle"
        else:
            row = "back"

        # Face size group
        if face_size < 20:
            sz_group = "<20"
        elif face_size <= 30:
            sz_group = "20-30"
        elif face_size <= 40:
            sz_group = "30-40"
        elif face_size <= 50:
            sz_group = "40-50"
        else:
            sz_group = ">50"

        has_emb = len(track.embeddings) > 0
        hdb_label = getattr(track, "cluster_id", -1)
        if hdb_label == -1 and hasattr(pipeline, "hdbscan_clusters") and pipeline.hdbscan_clusters:
            for c in pipeline.hdbscan_clusters:
                if track.track_id in c.get("track_ids", []):
                    hdb_label = c.get("cluster_id", -1)
                    break
        is_noise = (hdb_label == -1)

        # Centroid embedding search
        embs = [e.get("embedding") for e in track.embeddings if e.get("embedding") is not None]
        centroid_emb = np.mean(embs, axis=0) if embs else None
        centroid_top1_sim = 0.0
        centroid_top1_usn = None

        if centroid_emb is not None and faiss_service.index and faiss_service.index.ntotal > 0:
            c_norm = np.linalg.norm(centroid_emb)
            c_vec = (centroid_emb / c_norm).astype(np.float32)
            c_dists, c_indices = faiss_service.index.search(np.array([c_vec]), min(3, faiss_service.index.ntotal))
            if int(c_indices[0][0]) != -1:
                centroid_top1_usn = faiss_service.metadata.get(str(c_indices[0][0]))
                centroid_top1_sim = float(c_dists[0][0])

        # Individual embeddings search
        track_indiv_sims = []
        for emb_dict in track.embeddings:
            emb = emb_dict.get("embedding")
            if emb is None: continue
            norm = np.linalg.norm(emb)
            if norm < 1e-6: continue
            vec = (emb / norm).astype(np.float32)

            if faiss_service.index and faiss_service.index.ntotal > 0:
                dists, indices = faiss_service.index.search(np.array([vec]), min(3, faiss_service.index.ntotal))
                top1_idx = int(indices[0][0])
                top1_sim = float(dists[0][0]) if top1_idx != -1 else 0.0
                top1_usn = faiss_service.metadata.get(str(top1_idx)) if top1_idx != -1 else None

                track_indiv_sims.append(top1_sim)

                row_sims[row].append(top1_sim)
                size_sims[sz_group].append(top1_sim)

                if top1_sim >= threshold and top1_usn:
                    known_sims.append(top1_sim)
                else:
                    unknown_sims.append(top1_sim)

        # Compare individual vs centroid
        if track_indiv_sims and centroid_top1_sim > 0:
            mean_indiv_sim = float(np.mean(track_indiv_sims))
            indiv_vs_centroid.append((t_id, mean_indiv_sim, centroid_top1_sim, mean_indiv_sim - centroid_top1_sim))

        # Determine Reason for UNKNOWN
        reason = "KNOWN"
        if not track.selected_samples:
            reason = "E_QUALITY_REJECTED"
        elif not has_emb:
            reason = "G_NO_EMBEDDING"
        elif centroid_top1_sim < threshold:
            reason = "C_UNENROLLED_STUDENT_LOW_FAISS_SIM"
        elif is_noise:
            reason = "E_HDBSCAN_NOISE"
        elif len(track.recognition_votes) < 3:
            reason = "M_TEMPORAL_VOTE_INSUFFICIENT"

        lifecycle_records.append({
            "track_id": t_id,
            "bbox": [bx1, by1, bx2, by2],
            "face_width": w_px,
            "face_height": h_px,
            "row": row,
            "quality_score": track.best_quality,
            "sample_count": len(track.selected_samples),
            "embedding_count": len(track.embeddings),
            "hdbscan_label": hdb_label,
            "is_noise": is_noise,
            "centroid_usn": centroid_top1_usn,
            "centroid_sim": round(centroid_top1_sim, 3),
            "indiv_mean_sim": round(float(np.mean(track_indiv_sims)), 3) if track_indiv_sims else 0.0,
            "vote_count": len(track.recognition_votes),
            "confirmed_id": track.assigned_name,
            "reason": reason,
        })

    # Print Similarity Statistics
    print("\nSIMILARITY STATISTICS:", flush=True)
    print("UNKNOWN Embeddings FAISS Similarity (Top-1 against Enrolled DB):", flush=True)
    if unknown_sims:
        print(f"  Min:    {np.min(unknown_sims):.3f}", flush=True)
        print(f"  Mean:   {np.mean(unknown_sims):.3f}", flush=True)
        print(f"  Median: {np.median(unknown_sims):.3f}", flush=True)
        print(f"  Max:    {np.max(unknown_sims):.3f}", flush=True)
    else:
        print("  None", flush=True)

    print("KNOWN Embeddings FAISS Similarity:", flush=True)
    if known_sims:
        print(f"  Min:    {np.min(known_sims):.3f}", flush=True)
        print(f"  Mean:   {np.mean(known_sims):.3f}", flush=True)
        print(f"  Median: {np.median(known_sims):.3f}", flush=True)
        print(f"  Max:    {np.max(known_sims):.3f}", flush=True)
    else:
        print("  None", flush=True)

    print("\nROW-WISE FAISS SIMILARITY DISTRIBUTION:", flush=True)
    for r, sims in row_sims.items():
        if sims:
            print(f"  {r.upper():6s} ROW: count={len(sims):3d} | mean={np.mean(sims):.3f} | max={np.max(sims):.3f}", flush=True)

    print("\nSIZE-WISE FAISS SIMILARITY DISTRIBUTION:", flush=True)
    for sz, sims in size_sims.items():
        if sims:
            print(f"  {sz:6s} PX: count={len(sims):3d} | mean={np.mean(sims):.3f} | max={np.max(sims):.3f}", flush=True)

    print("\n========================================", flush=True)
    print("STEP 5 & 6 — HDBSCAN & CENTROID DILUTION INSPECTION", flush=True)
    print("========================================", flush=True)

    dilutions = [diff for _, mean_ind, cent_sim, diff in indiv_vs_centroid if diff > 0.05]
    print(f"Total Tracks Evaluated for Centroid Dilution: {len(indiv_vs_centroid)}", flush=True)
    print(f"Tracks with >0.05 Centroid Dilution: {len(dilutions)}", flush=True)
    if dilutions:
        print(f"Max Centroid Dilution: {np.max(dilutions):.3f}", flush=True)
    else:
        print("No centroid dilution detected. Centroid averaging preserves representation.", flush=True)

    print("\n========================================", flush=True)
    print("REASON BREAKDOWN FOR UNKNOWN TRACKS", flush=True)
    print("========================================", flush=True)

    reasons_count = {}
    for rec in lifecycle_records:
        r = rec["reason"]
        reasons_count[r] = reasons_count.get(r, 0) + 1

    for r, count in sorted(reasons_count.items()):
        print(f"  {r}: {count} tracks", flush=True)

    # Save complete diagnostic JSON
    diag_out = {
        "faiss_enrolled_records": len(faiss_service.metadata),
        "faiss_metadata": faiss_service.metadata,
        "tracks_evaluated": len(lifecycle_records),
        "reasons_count": reasons_count,
        "lifecycle_records": lifecycle_records,
    }
    with open("scratch/diagnostic_results.json", "w") as f:
        json.dump(diag_out, f, indent=2)

    print("\nSaved full diagnostic log to scratch/diagnostic_results.json", flush=True)

if __name__ == "__main__":
    run_diagnostic()
