"""SmartCampus AI — YOLO26-Face vs SCRFD Baseline Comparative Evaluation.

Benchmarks and compares:
1. SCRFD 10G (InsightFace buffalo_l ONNX baseline)
2. YOLO26-S-Face (Single-pass full frame 1280x1280)
3. YOLO26-S-Face + Targeted ROI Tiling (Full frame + Back row ROI)

Metrics:
- Detection count (front, middle, and back-row small faces < 45px)
- Inference Latency (Mean, Median, P95, Min, Max in ms)
- Throughput (FPS on Apple Silicon CPU)
- ArcFace Landmark alignment and 512-D embedding extraction success rate
"""

import os
os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "TRUE")
import time
import json
import logging
from pathlib import Path
from typing import Dict, Any, List

import torch
import cv2
cv2.setNumThreads(0)
import numpy as np

from app.config.settings import settings
from app.services.yolo26_detector import YOLO26FaceDetector, yolo26_detector
from app.services.face_detector import face_detector
from app.services.embedding_service import embedding_service
from app.services.face_quality_service import face_quality_service

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("smartcampus.eval_compare")


def load_test_frames(max_frames: int = 10) -> List[np.ndarray]:
    """Sample diverse active classroom frames from footage and live preview."""
    frames = []

    # 1. High-quality live classroom preview
    preview = Path("storage/enrollment/test_temporal_001/live_preview.jpg")
    if preview.exists():
        img = cv2.imread(str(preview))
        if img is not None:
            frames.append(img)

    # 2. Packed classroom lecture footage (footage/2.mp4 and footage/3.mp4)
    for vid_path, start_frame in [("footage/2.mp4", 11950), ("footage/3.mp4", 11950)]:
        p = Path(vid_path)
        if p.exists() and len(frames) < max_frames:
            cap = cv2.VideoCapture(str(p))
            for offset in [0, 25, 50, 75, 100]:
                if len(frames) >= max_frames:
                    break
                cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame + offset)
                ret, frame = cap.read()
                if ret and frame is not None:
                    frames.append(frame)
            cap.release()

    return frames


def evaluate_detector(detector_name: str, frames: List[np.ndarray], run_fn) -> Dict[str, Any]:
    """Run benchmark for a given detector function across test frames."""
    latencies = []
    total_faces = 0
    small_faces = 0   # width < 45px (back rows)
    medium_faces = 0  # 45px <= width < 90px
    large_faces = 0   # width >= 90px
    embeddings_generated = 0

    # Warmup
    if frames:
        _ = run_fn(frames[0])

    for i, frame in enumerate(frames):
        t0 = time.perf_counter()
        detections = run_fn(frame)
        t1 = time.perf_counter()
        lat_ms = (t1 - t0) * 1000.0
        latencies.append(lat_ms)

        total_faces += len(detections)
        for det in detections:
            bbox = det["bbox"]
            w = bbox[2] - bbox[0]
            h = bbox[3] - bbox[1]
            if min(w, h) < 45:
                small_faces += 1
            elif min(w, h) < 90:
                medium_faces += 1
            else:
                large_faces += 1

            # Test embedding extraction
            crop = det.get("crop")
            lm = det.get("landmarks")
            if crop is not None and crop.size > 0:
                emb = embedding_service.generate_embedding(crop, landmarks=lm)
                if emb is not None and len(emb) == 512:
                    embeddings_generated += 1

    latencies_arr = np.array(latencies) if latencies else np.array([0.0])
    mean_lat = float(np.mean(latencies_arr))
    median_lat = float(np.median(latencies_arr))
    p95_lat = float(np.percentile(latencies_arr, 95))
    min_lat = float(np.min(latencies_arr))
    max_lat = float(np.max(latencies_arr))
    fps = 1000.0 / mean_lat if mean_lat > 0 else 0.0

    return {
        "detector": detector_name,
        "frames_evaluated": len(frames),
        "total_detections": total_faces,
        "avg_detections_per_frame": round(total_faces / max(1, len(frames)), 2),
        "small_faces_detected": small_faces,
        "medium_faces_detected": medium_faces,
        "large_faces_detected": large_faces,
        "embeddings_extracted": embeddings_generated,
        "embedding_success_rate_pct": round(
            (embeddings_generated / max(1, total_faces)) * 100.0, 1
        ),
        "mean_latency_ms": round(mean_lat, 2),
        "median_latency_ms": round(median_lat, 2),
        "p95_latency_ms": round(p95_lat, 2),
        "min_latency_ms": round(min_lat, 2),
        "max_latency_ms": round(max_lat, 2),
        "fps": round(fps, 1),
    }


def main():
    print("=" * 80)
    print("SMARTCAMPUS AI: YOLO26-FACE vs SCRFD COMPARATIVE BENCHMARK")
    print("Hardware: Apple Silicon CPU (M-Series, 16 GB Unified Memory)")
    print("=" * 80)

    # 1. Load test frames from active footage and preview
    frames = load_test_frames(max_frames=10)
    logger.info(f"Loaded {len(frames)} active classroom frames (Shape: {frames[0].shape})")

    # 2. Config 1: SCRFD 10G Baseline
    logger.info("Evaluating [1/3] SCRFD 10G (InsightFace buffalo_l)...")
    scrfd_res = evaluate_detector(
        "SCRFD 10G Baseline",
        frames,
        lambda f: face_detector.detect_scrfd_faces(f),
    )

    # 3. Config 2: YOLO26-S-Face Single-Pass
    logger.info("Evaluating [2/3] YOLO26-S-Face Single-Pass (1280x1280)...")
    yolo_single_res = evaluate_detector(
        "YOLO26-S-Face (Single-Pass)",
        frames,
        lambda f: yolo26_detector.detect_faces(f, enable_tiling=False),
    )

    # 4. Config 3: YOLO26-S-Face + Targeted ROI Tiling
    logger.info("Evaluating [3/3] YOLO26-S-Face + Back-Row ROI Tiling...")
    yolo_tiled_res = evaluate_detector(
        "YOLO26-S-Face (With Tiling)",
        frames,
        lambda f: yolo26_detector.detect_faces(f, enable_tiling=True),
    )

    results = [scrfd_res, yolo_single_res, yolo_tiled_res]

    # Print Table
    print("\n" + "=" * 90)
    print(f"{'Detector Model':<30} | {'Faces/Frm':<10} | {'Small (<45px)':<14} | {'Mean Lat (ms)':<14} | {'FPS':<8} | {'Emb Success'}")
    print("-" * 90)
    for r in results:
        print(
            f"{r['detector']:<30} | "
            f"{r['avg_detections_per_frame']:<10} | "
            f"{r['small_faces_detected']:<14} | "
            f"{r['mean_latency_ms']:<14} | "
            f"{r['fps']:<8} | "
            f"{r['embedding_success_rate_pct']}%"
        )
    print("=" * 90)

    # Output detailed JSON
    out_path = Path("apps/ai-service/storage/yolo26_vs_scrfd_benchmark.json")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w") as f:
        json.dump(results, f, indent=2)
    logger.info(f"Detailed benchmark metrics written to {out_path}")


if __name__ == "__main__":
    main()
