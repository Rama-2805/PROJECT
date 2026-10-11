"""SmartCampus AI — YOLO26-Face Detection Service.

Integrates YOLO26-Face (specifically YOLO26-S-Face, trained on face detection with 5-point facial keypoints)
for high-recall face detection across front, middle, and back rows in classroom footage.

Supports:
- Single-pass full frame inference (1280x1280)
- Optional targeted ROI tiling for distant small classroom faces
- Strict IoU Non-Maximum Suppression (NMS) to eliminate duplicate detections
- Exact 5-point facial landmark extraction for ArcFace 112x112 alignment
- Configurable thresholds and comprehensive performance diagnostics
- Apple Silicon CPU optimization (benchmarked ~8-13 FPS vs ~1 FPS on MPS)
"""

import time
import logging
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional
import cv2
cv2.setNumThreads(0)
import numpy as np

from app.config.settings import settings

logger = logging.getLogger("smartcampus.yolo26_detector")


def _calculate_iou(box1: List[int], box2: List[int]) -> float:
    """Calculate Intersection-over-Union (IoU) of two bounding boxes [x1, y1, x2, y2]."""
    x1 = max(box1[0], box2[0])
    y1 = max(box1[1], box2[1])
    x2 = min(box1[2], box2[2])
    y2 = min(box1[3], box2[3])

    inter_w = max(0, x2 - x1)
    inter_h = max(0, y2 - y1)
    inter_area = inter_w * inter_h
    if inter_area == 0:
        return 0.0

    area1 = max(0, box1[2] - box1[0]) * max(0, box1[3] - box1[1])
    area2 = max(0, box2[2] - box2[0]) * max(0, box2[3] - box2[1])
    union_area = float(area1 + area2 - inter_area)

    return inter_area / union_area if union_area > 0 else 0.0


class YOLO26FaceDetector:
    """Detects faces in video frames using YOLO26-S-Face with facial landmarks."""

    def __init__(
        self,
        model_path: Optional[str] = None,
        confidence_threshold: Optional[float] = None,
        iou_threshold: Optional[float] = None,
        imgsz: Optional[int] = None,
        enable_tiling: Optional[bool] = None,
    ):
        self.model_path_str = model_path or settings.yolo26_model_path
        self.confidence_threshold = (
            confidence_threshold
            if confidence_threshold is not None
            else settings.yolo26_confidence_threshold
        )
        self.iou_threshold = (
            iou_threshold
            if iou_threshold is not None
            else settings.yolo26_iou_threshold
        )
        self.imgsz = imgsz or settings.yolo26_imgsz
        self.enable_tiling = (
            enable_tiling
            if enable_tiling is not None
            else settings.yolo26_enable_tiling
        )

        self._model = None
        self._resolved_model_path: Optional[Path] = None

        # Diagnostics & Profiling
        self.total_frames_processed: int = 0
        self.total_raw_detections: int = 0
        self.total_valid_detections: int = 0
        self.last_latency_ms: float = 0.0
        self.latency_history: List[float] = []
        self.max_history_len: int = 100
        self.last_inference_timestamp: Optional[float] = None
        self.last_inference_face_count: int = 0
        self.last_error: Optional[str] = None

    def _resolve_model_path(self) -> Path:
        """Resolve model checkpoint path from multiple possible candidate locations."""
        if self._resolved_model_path and self._resolved_model_path.exists():
            return self._resolved_model_path

        candidates = [
            Path(self.model_path_str),
            Path(__file__).resolve().parents[2] / self.model_path_str,
            Path(__file__).resolve().parents[2] / "models" / "yolo26s-face.pt",
            Path(__file__).resolve().parents[4] / "apps" / "ai-service" / "models" / "yolo26s-face.pt",
            Path("apps/ai-service/models/yolo26s-face.pt"),
            Path("models/yolo26s-face.pt"),
        ]

        for p in candidates:
            if p.exists() and p.is_file():
                self._resolved_model_path = p.resolve()
                return self._resolved_model_path

        # If not found directly, fallback to candidate
        return Path(self.model_path_str)

    @property
    def model(self):
        """Lazy-load the YOLO26-Face model to preserve memory during service startup."""
        if self._model is None:
            try:
                from ultralytics import YOLO

                path = self._resolve_model_path()
                logger.info(
                    f"[YOLO26-FACE] Loading model from {path} "
                    f"(conf={self.confidence_threshold}, imgsz={self.imgsz}, iou={self.iou_threshold})"
                )

                if not path.exists():
                    raise FileNotFoundError(f"YOLO26-Face checkpoint not found at: {path}")

                self._model = YOLO(str(path))
                logger.info(
                    f"[YOLO26-FACE] Checkpoint loaded successfully: {path.name} "
                    f"(task={getattr(self._model, 'task', 'pose')}, classes={getattr(self._model, 'names', {})})"
                )
            except Exception as e:
                logger.error(f"[YOLO26-FACE] Failed to load YOLO26-Face model: {e}")
                raise e
        return self._model

    def _validate_detection(
        self, bbox: List[int], confidence: float, frame_w: int, frame_h: int, crop: np.ndarray
    ) -> Tuple[bool, str]:
        """Validate detection confidence, bounding box geometry, aspect ratio, and lighting."""
        if confidence < self.confidence_threshold:
            return False, "low_confidence"

        x1, y1, x2, y2 = bbox
        cw, ch = x2 - x1, y2 - y1

        if cw <= 0 or ch <= 0:
            return False, "invalid_geometry"

        if cw < settings.min_face_width or ch < settings.min_face_height:
            return False, "too_small"

        aspect_ratio = max(cw / float(ch), ch / float(cw))
        if aspect_ratio > settings.max_face_aspect_ratio:
            return False, "invalid_aspect_ratio"

        area_ratio = (cw * ch) / float(frame_w * frame_h)
        if area_ratio < settings.min_face_area_ratio:
            return False, "too_small_area"

        if crop is None or crop.size == 0:
            return False, "empty_crop"

        mean_val = float(np.mean(crop))
        if mean_val < settings.min_brightness or mean_val > settings.max_brightness:
            return False, "extreme_lighting"

        return True, "valid"

    def _nms_suppress(
        self, candidates: List[Dict[str, Any]], iou_thresh: float
    ) -> List[Dict[str, Any]]:
        """Filter overlapping detections using greedy IoU Non-Maximum Suppression."""
        if not candidates:
            return []

        sorted_cand = sorted(candidates, key=lambda d: d.get("confidence", 0.0), reverse=True)
        kept: List[Dict[str, Any]] = []

        while sorted_cand:
            best = sorted_cand.pop(0)
            kept.append(best)
            remains = []
            for item in sorted_cand:
                iou = _calculate_iou(best["bbox"], item["bbox"])
                if iou < iou_thresh:
                    remains.append(item)
                else:
                    # If kept item lacked landmarks but overlapping item had them, preserve them
                    if best.get("landmarks") is None and item.get("landmarks") is not None:
                        best["landmarks"] = item["landmarks"]
            sorted_cand = remains

        return kept

    def detect_faces(
        self, frame: np.ndarray, enable_tiling: Optional[bool] = None
    ) -> List[Dict[str, Any]]:
        """Detect all faces in a BGR frame using YOLO26-Face with optional small-face tiling.

        Args:
            frame: BGR numpy image frame
            enable_tiling: Override instance tiling setting

        Returns:
            List of detection dictionaries compatible with FaceTracker and ClassroomPipeline
        """
        if frame is None or frame.size == 0:
            return []

        t0 = time.time()
        self.total_frames_processed += 1
        h, w = frame.shape[:2]

        use_tiling = self.enable_tiling if enable_tiling is None else enable_tiling

        raw_candidates: List[Dict[str, Any]] = []

        # ── 1. Scale 1: Full-Frame Primary Inference ──
        try:
            results = self.model.predict(
                source=frame,
                conf=self.confidence_threshold,
                iou=self.iou_threshold,
                imgsz=self.imgsz,
                verbose=False,
                device="cpu",  # Benchmarked optimal backend for Apple Silicon
            )
            if results and len(results) > 0 and results[0].boxes is not None:
                res = results[0]
                boxes = res.boxes
                kpts = getattr(res, "keypoints", None)

                for idx in range(len(boxes)):
                    b = boxes[idx]
                    conf = float(b.conf[0].cpu().item())
                    xyxy = b.xyxy[0].cpu().numpy().astype(int)

                    x1 = max(0, min(w - 1, int(xyxy[0])))
                    y1 = max(0, min(h - 1, int(xyxy[1])))
                    x2 = max(0, min(w, int(xyxy[2])))
                    y2 = max(0, min(h, int(xyxy[3])))

                    if x2 <= x1 or y2 <= y1:
                        continue

                    crop = frame[y1:y2, x1:x2].copy()
                    is_valid, reason = self._validate_detection([x1, y1, x2, y2], conf, w, h, crop)
                    if not is_valid:
                        continue

                    # Extract 5 landmarks if available
                    landmarks = None
                    if kpts is not None and idx < len(kpts):
                        try:
                            landmarks = kpts[idx].xy[0].cpu().numpy()  # Shape (5, 2)
                        except Exception:
                            landmarks = None

                    raw_candidates.append({
                        "bbox": [x1, y1, x2, y2],
                        "confidence": conf,
                        "landmarks": landmarks,
                        "crop": crop,
                        "raw_face": None,
                        "embedding": None,
                        "detector": "yolo26-face",
                        "source": "FULL_FRAME",
                    })
        except Exception as e:
            logger.error(f"[YOLO26-FACE] Error during full-frame inference: {e}")

        # ── 2. Scale 2: Targeted Back-Row ROI Tiling (for distant small faces) ──
        if use_tiling and h > 400:
            try:
                # Classroom footage camera is elevated, back row is top 65% of frame
                roi_h = int(h * 0.65)
                roi_crop = frame[0:roi_h, 0:w]

                tiled_results = self.model.predict(
                    source=roi_crop,
                    conf=self.confidence_threshold,
                    iou=self.iou_threshold,
                    imgsz=self.imgsz,
                    verbose=False,
                    device="cpu",
                )

                if tiled_results and len(tiled_results) > 0 and tiled_results[0].boxes is not None:
                    t_res = tiled_results[0]
                    t_boxes = t_res.boxes
                    t_kpts = getattr(t_res, "keypoints", None)

                    for idx in range(len(t_boxes)):
                        b = t_boxes[idx]
                        conf = float(b.conf[0].cpu().item())
                        xyxy = b.xyxy[0].cpu().numpy().astype(int)

                        # Adjust coordinates back to full frame
                        x1 = max(0, min(w - 1, int(xyxy[0])))
                        y1 = max(0, min(roi_h - 1, int(xyxy[1])))
                        x2 = max(0, min(w, int(xyxy[2])))
                        y2 = max(0, min(roi_h, int(xyxy[3])))

                        if x2 <= x1 or y2 <= y1:
                            continue

                        crop = frame[y1:y2, x1:x2].copy()
                        is_valid, reason = self._validate_detection([x1, y1, x2, y2], conf, w, h, crop)
                        if not is_valid:
                            continue

                        landmarks = None
                        if t_kpts is not None and idx < len(t_kpts):
                            try:
                                t_pts = t_kpts[idx].xy[0].cpu().numpy().copy()
                                # Adjust landmark y coordinates to full frame
                                landmarks = t_pts
                            except Exception:
                                landmarks = None

                        raw_candidates.append({
                            "bbox": [x1, y1, x2, y2],
                            "confidence": conf,
                            "landmarks": landmarks,
                            "crop": crop,
                            "raw_face": None,
                            "embedding": None,
                            "detector": "yolo26-face",
                            "source": "BACK_ROW_ROI",
                        })
            except Exception as e:
                logger.error(f"[YOLO26-FACE] Error during back-row ROI inference: {e}")

        # ── 3. Deduplicate across full frame and tiled inference using IoU NMS ──
        final_detections = self._nms_suppress(raw_candidates, iou_thresh=self.iou_threshold)

        # ── 4. Record Diagnostics ──
        latency = (time.time() - t0) * 1000.0  # ms
        self.last_latency_ms = latency
        self.latency_history.append(latency)
        if len(self.latency_history) > self.max_history_len:
            self.latency_history.pop(0)

        self.total_raw_detections += len(raw_candidates)
        self.total_valid_detections += len(final_detections)
        self.last_inference_timestamp = time.time()
        self.last_inference_face_count = len(final_detections)

        logger.debug(
            f"[YOLO26-FACE] Processed frame {w}x{h}: raw={len(raw_candidates)}, "
            f"final={len(final_detections)} faces in {latency:.2f} ms"
        )

        return final_detections

    def get_diagnostics(self) -> Dict[str, Any]:
        """Return diagnostic metrics and inference performance statistics."""
        avg_latency = (
            sum(self.latency_history) / len(self.latency_history)
            if self.latency_history
            else 0.0
        )
        fps = 1000.0 / avg_latency if avg_latency > 0 else 0.0

        resolved_path = self._resolve_model_path()
        return {
            "model_name": "YOLO26-S-Face",
            "model_path": str(resolved_path),
            "checkpoint_path": str(resolved_path),
            "checkpoint_exists": resolved_path.exists(),
            "model_loaded": self._model is not None,
            "status": "ACTIVE" if self._model is not None else "READY",
            "task": "face_detection_with_5_landmarks",
            "device": "cpu (Apple Silicon Optimized)",
            "imgsz": self.imgsz,
            "confidence_threshold": self.confidence_threshold,
            "iou_threshold": self.iou_threshold,
            "enable_tiling": self.enable_tiling,
            "total_frames_processed": self.total_frames_processed,
            "total_raw_detections": self.total_raw_detections,
            "total_valid_detections": self.total_valid_detections,
            "last_latency_ms": round(self.last_latency_ms, 2),
            "average_latency_ms": round(avg_latency, 2),
            "approximate_fps": round(fps, 1),
            "last_inference_timestamp": self.last_inference_timestamp,
            "last_inference_face_count": self.last_inference_face_count,
            "last_error": self.last_error,
        }


# Singleton instance
yolo26_detector = YOLO26FaceDetector()
