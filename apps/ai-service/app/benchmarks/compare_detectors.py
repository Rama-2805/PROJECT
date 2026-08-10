"""SmartCampus AI — Fair Detector Comparison Benchmark.

Runs SCRFD 10G, YOLO11, and Combined (SCRFD + YOLO11) detectors on IDENTICAL classroom video frames
(footage/1.mp4) to fairly compare face detection recall, small/far face detection, false positive rates,
and processing speed (FPS).
"""

import asyncio
import time
import cv2
import numpy as np
from pathlib import Path
from typing import Dict, Any, List

from app.services.face_detector import FaceDetector
from app.services.yolo_detector import YOLO11Detector
from app.services.combined_detector import CombinedDetector

VIDEO_PATH = "/Users/rama/Major project/PROJECT/apps/ai-service/storage/enrollment/cmsko6b5k0000nc6eunarzfx6/videos/1786211444237_1.mp4"


def evaluate_detector_on_frames(
    detector,
    detector_name: str,
    frames: List[np.ndarray],
    timestamps: List[float],
) -> Dict[str, Any]:
    """Evaluate a detector on a fixed sequence of frames and calculate performance metrics."""
    evaluated_frames = len(frames)
    frames_with_faces = 0
    total_detections = 0
    per_frame_counts = []
    confidence_scores = []
    
    start_t = time.time()
    
    for idx, frame in enumerate(frames):
        try:
            dets = detector.detect_faces(frame)
        except Exception as e:
            print(f"[{detector_name}] Error on frame #{idx + 1}: {e}")
            dets = []
            
        count = len(dets) if dets else 0
        per_frame_counts.append(count)
        
        if count > 0:
            frames_with_faces += 1
            total_detections += count
            for d in dets:
                confidence_scores.append(d.get("confidence", 0.0))

    elapsed_sec = max(0.001, time.time() - start_t)
    fps = round(evaluated_frames / elapsed_sec, 2)
    avg_per_frame = round(total_detections / max(1, evaluated_frames), 2)
    min_per_frame = min(per_frame_counts) if per_frame_counts else 0
    max_per_frame = max(per_frame_counts) if per_frame_counts else 0
    avg_conf = round(float(np.mean(confidence_scores)), 3) if confidence_scores else 0.0

    return {
        "detector_name": detector_name,
        "evaluated_frames": evaluated_frames,
        "frames_with_faces": frames_with_faces,
        "total_detections": total_detections,
        "per_frame_counts": per_frame_counts,
        "avg_detections_per_frame": avg_per_frame,
        "min_detections_per_frame": min_per_frame,
        "max_detections_per_frame": max_per_frame,
        "avg_confidence": avg_conf,
        "elapsed_sec": round(elapsed_sec, 2),
        "fps": fps,
    }


def run_fair_detector_comparison():
    print("==================================================")
    print("SMARTCAMPUS AI — FAIR DETECTOR COMPARISON BENCHMARK")
    print("==================================================")
    print(f"Video Source: {Path(VIDEO_PATH).name}\n")

    cap = cv2.VideoCapture(VIDEO_PATH)
    if not cap.isOpened():
        print(f"Error: Could not open video file at {VIDEO_PATH}")
        return

    fps_val = cap.get(cv2.CAP_PROP_FPS) or 25.0
    
    # ── Test Suite A: Empty Morning Classroom Frames (t=500s) ───
    print("Extracting Test Suite A: Empty Morning Classroom Frames (t=500s)...")
    cap.set(cv2.CAP_PROP_POS_FRAMES, int(500 * fps_val))
    empty_frames = []
    empty_timestamps = []
    for i in range(10):
        for _ in range(12): cap.grab()  # 0.5s sampling step
        ret, frame = cap.read()
        if ret:
            empty_frames.append(frame)
            empty_timestamps.append(500.0 + i * 0.5)

    # ── Test Suite B: Populated 7th Sem CSE Classroom Frames (t=4200s) ─
    print("Extracting Test Suite B: Populated Classroom Frames (t=4200s)...")
    cap.set(cv2.CAP_PROP_POS_FRAMES, int(4200 * fps_val))
    populated_frames = []
    populated_timestamps = []
    for i in range(10):
        for _ in range(12): cap.grab()  # 0.5s sampling step
        ret, frame = cap.read()
        if ret:
            populated_frames.append(frame)
            populated_timestamps.append(4200.0 + i * 0.5)

    cap.release()

    print(f"Loaded {len(empty_frames)} Empty Frames and {len(populated_frames)} Populated Frames.\n")

    # Instantiate detectors
    scrfd = FaceDetector()
    yolo = YOLO11Detector()
    combined = CombinedDetector()

    # 1. Evaluate SCRFD 10G
    print("Benchmarking SCRFD 10G...")
    res_scrfd_empty = evaluate_detector_on_frames(scrfd, "SCRFD 10G", empty_frames, empty_timestamps)
    res_scrfd_pop = evaluate_detector_on_frames(scrfd, "SCRFD 10G", populated_frames, populated_timestamps)

    # 2. Evaluate YOLO11
    print("Benchmarking YOLO11...")
    res_yolo_empty = evaluate_detector_on_frames(yolo, "YOLO11", empty_frames, empty_timestamps)
    res_yolo_pop = evaluate_detector_on_frames(yolo, "YOLO11", populated_frames, populated_timestamps)

    # 3. Evaluate Combined (SCRFD 10G + YOLO11)
    print("Benchmarking Combined (SCRFD 10G + YOLO11)...")
    res_comb_empty = evaluate_detector_on_frames(combined, "Combined (SCRFD + YOLO11)", empty_frames, empty_timestamps)
    res_comb_pop = evaluate_detector_on_frames(combined, "Combined (SCRFD + YOLO11)", populated_frames, populated_timestamps)

    print("\n==================================================")
    print("DETECTOR PERFORMANCE COMPARISON RESULTS")
    print("==================================================")

    fmt = "{:<25} | {:<10} | {:<12} | {:<8} | {:<10} | {:<15}"
    print(fmt.format("Detector Option", "Avg/Frame", "Total Dets", "FPS", "Min-Max", "False Positives"))
    print("-" * 90)

    for pop_res, empty_res in [
        (res_scrfd_pop, res_scrfd_empty),
        (res_yolo_pop, res_yolo_empty),
        (res_comb_pop, res_comb_empty),
    ]:
        name = pop_res["detector_name"]
        avg_f = pop_res["avg_detections_per_frame"]
        total_d = pop_res["total_detections"]
        fps = pop_res["fps"]
        min_max = f"{pop_res['min_detections_per_frame']}-{pop_res['max_detections_per_frame']}"
        fp_count = empty_res["total_detections"]
        
        print(fmt.format(name, str(avg_f), str(total_d), str(fps), min_max, f"{fp_count} (in empty frames)"))

    print("==================================================\n")


if __name__ == "__main__":
    run_fair_detector_comparison()
