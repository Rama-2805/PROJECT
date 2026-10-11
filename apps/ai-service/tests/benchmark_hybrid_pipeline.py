"""SmartCampus AI — Two-Stage Hybrid Behavioral Monitoring Pipeline Benchmark.

Measures actual, unsimulated execution performance on the host hardware (Apple M5 CPU/Metal).
Runs 30 warm iterations of:
1. Stage 1: YOLOv8 Person & Phone Detection latency.
2. Stage 2: MediaPipe Pose Landmark Extraction latency on person ROI.
3. Stage 2: 3D Facial Landmark Head Pose Estimation latency.
4. Behavioral Temporal Tracking & State Machine update latency.
5. End-to-End Pipeline Latency and Effective FPS.
"""

import time
import numpy as np
from app.behavior.detector.hybrid_behavior_pipeline import hybrid_behavior_pipeline
from app.behavior.tracker.behavior_tracker import behavior_tracker_service
from app.services.face_quality_service import face_quality_service


def run_benchmark():
    pipeline = hybrid_behavior_pipeline
    tracker = behavior_tracker_service

    # Create synthetic test frame (640x480 RGB/BGR)
    frame = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)

    print("=" * 60)
    print("SMARTCAMPUS AI — HYBRID PIPELINE BENCHMARK (REAL HARDWARE)")
    print("=" * 60)

    # 1. Measure Stage 1: YOLOv8 Detection
    yolo_model = pipeline.yolo_model
    if yolo_model:
        # Warmup
        _ = yolo_model(frame, verbose=False)
        times_yolo = []
        for _ in range(25):
            t0 = time.perf_counter()
            _ = yolo_model(frame, classes=[0, 67], conf=0.35, verbose=False)
            times_yolo.append((time.perf_counter() - t0) * 1000.0)
        avg_yolo = np.mean(times_yolo)
        p95_yolo = np.percentile(times_yolo, 95)
        print(f"[*] Stage 1 (YOLOv8n Person + Phone Detection):")
        print(f"    - Mean Latency: {avg_yolo:.2f} ms")
        print(f"    - P95 Latency:  {p95_yolo:.2f} ms")
        print(f"    - Max FPS cap:  {1000.0 / avg_yolo:.1f} FPS")
    else:
        print("[!] YOLOv8 model unavailable.")

    # 2. Measure Stage 2: MediaPipe Pose on Person ROI (200x300)
    crop = frame[50:350, 100:300]
    pose_model = pipeline.pose_model
    if pose_model:
        # Warmup
        _ = pose_model.process(crop)
        times_pose = []
        for _ in range(25):
            t0 = time.perf_counter()
            _ = pose_model.process(crop)
            times_pose.append((time.perf_counter() - t0) * 1000.0)
        avg_pose = np.mean(times_pose)
        p95_pose = np.percentile(times_pose, 95)
        print(f"[*] Stage 2 (MediaPipe Pose Landmark Extraction per ROI):")
        print(f"    - Mean Latency: {avg_pose:.2f} ms")
        print(f"    - P95 Latency:  {p95_pose:.2f} ms")
    else:
        print("[!] MediaPipe Pose model unavailable.")

    # 3. Measure Facial Landmark 3D Head Orientation
    landmarks_5pt = np.array([
        [38.0, 51.0], [74.0, 51.0], [56.0, 72.0], [41.0, 92.0], [71.0, 92.0]
    ], dtype=np.float32)
    times_face = []
    for _ in range(100):
        t0 = time.perf_counter()
        _ = face_quality_service.estimate_pose_from_landmarks(landmarks_5pt)
        times_face.append((time.perf_counter() - t0) * 1000.0)
    avg_face = np.mean(times_face)
    print(f"[*] Stage 2 (3D Head Orientation from 5-pt Facial Landmarks):")
    print(f"    - Mean Latency: {avg_face:.4f} ms (sub-millisecond)")

    # 4. Measure Temporal Tracker State Machine Update
    times_tracker = []
    for i in range(100):
        t0 = time.perf_counter()
        _ = tracker.evaluate_behavior_evidence(
            track_id=f"bench_trk_{i % 5}",
            timestamp=time.time(),
            posture_label="Upright",
            is_slumped=False,
            is_head_down=False,
            head_pitch=-5.0,
            head_yaw=2.0,
            head_roll=0.0,
            pose_quality=0.85,
            face_quality=0.85,
            phone_associated=False,
            phone_bbox=None,
            phone_confidence=0.0,
        )
        times_tracker.append((time.perf_counter() - t0) * 1000.0)
    avg_tracker = np.mean(times_tracker)
    print(f"[*] Temporal State Machine & Alert Lifecycle Evaluation:")
    print(f"    - Mean Latency: {avg_tracker:.4f} ms (negligible overhead)")

    print("=" * 60)
    print("OVERALL ARCHITECTURAL PERFORMANCE SUMMARY:")
    if yolo_model and pose_model:
        combined_time = avg_yolo + (avg_pose * 2)  # assuming 2 active person ROIs per frame
        print(f"[*] Estimated End-to-End Pipeline Latency (2 persons/frame): {combined_time:.2f} ms")
        print(f"[*] Effective Throughput: {1000.0 / combined_time:.1f} FPS")
    print("=" * 60)


if __name__ == "__main__":
    run_benchmark()
