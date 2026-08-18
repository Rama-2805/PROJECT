"""SCRFD Resolution & Multiscale Profiling Script.
Measures face detections, small-face (<40px) recall, average inference time (ms), and pipeline FPS
across det_size (1280x1280, 1024x1024, 960x960, 896x896) over 20 frames of footage/2.mp4.
"""

import os
import sys
import time
import cv2
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "apps", "ai-service"))

from app.services.face_detector import face_detector

def set_scrfd_det_size(detector, size_tuple):
    """Dynamically set det_size on InsightFace SCRFD model."""
    if hasattr(detector.model, "det_model"):
        detector.model.det_model.input_size = size_tuple
        detector.model.det_model.input_shape = (1, 3, size_tuple[1], size_tuple[0])

def profile_scrfd():
    video_path = "footage/2.mp4"
    frame_count = 20
    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        print(f"ERROR: Cannot open {video_path}")
        return

    frames = []
    for _ in range(frame_count):
        ret, frame = cap.read()
        if not ret:
            break
        frames.append(frame)
    cap.release()

    # Warmup ONNX models
    _ = face_detector.model

    test_configs = [
        ("1280x1280 (Multi-Scale 8-pass Baseline)", (1280, 1280), True),
        ("1280x1280 (Single Pass)", (1280, 1280), False),
        ("1024x1024 (Single Pass)", (1024, 1024), False),
        ("960x960   (Single Pass)", (960, 960), False),
        ("896x896   (Single Pass)", (896, 896), False),
    ]

    print("=" * 85)
    print(f"SCRFD DETECTOR RESOLUTION & TILING PROFILING ({len(frames)} FRAMES)")
    print("=" * 85)
    print(f"{'CONFIG / DETECTOR RESOLUTION':<42} | {'TOTAL DETS':<10} | {'SMALL (<40px)':<12} | {'AVG TIME (ms)':<14} | {'FPS':<6}")
    print("-" * 85)

    baseline_dets = 0
    baseline_small = 0

    for name, det_size, use_multiscale in test_configs:
        set_scrfd_det_size(face_detector, det_size)
        face_detector.recovery_cooldown_counter = 0

        det_times = []
        total_dets = 0
        small_dets = 0

        for frame in frames:
            t0 = time.time()
            if use_multiscale and hasattr(face_detector, "detect_multiscale_faces"):
                dets = face_detector.detect_multiscale_faces(frame)
            else:
                dets = face_detector.detect_faces(frame)
            dt_ms = (time.time() - t0) * 1000.0
            det_times.append(dt_ms)

            cnt = len(dets or [])
            total_dets += cnt
            for d in (dets or []):
                w = d["bbox"][2] - d["bbox"][0]
                h = d["bbox"][3] - d["bbox"][1]
                if min(w, h) < 40:
                    small_dets += 1

        avg_time = sum(det_times) / len(det_times) if det_times else 0.0
        fps = 1000.0 / avg_time if avg_time > 0 else 0.0

        if "Baseline" in name:
            baseline_dets = total_dets
            baseline_small = small_dets

        recall_str = ""
        if baseline_dets > 0 and "Baseline" not in name:
            rec_pct = (total_dets / baseline_dets) * 100.0
            sm_pct = (small_dets / max(1, baseline_small)) * 100.0
            recall_str = f" ({rec_pct:.1f}% tot, {sm_pct:.1f}% sm)"

        print(f"{name:<42} | {total_dets:<10} | {small_dets:<12} | {avg_time:<14.1f} | {fps:<6.2f}{recall_str}", flush=True)

    print("=" * 85)

if __name__ == "__main__":
    profile_scrfd()
