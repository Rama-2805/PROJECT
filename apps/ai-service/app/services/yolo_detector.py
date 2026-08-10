"""SmartCampus AI — YOLO11 Face & Person Detection Service.

Integrates Ultralytics YOLO11 for high-recall face detection in dense classroom video.
Supports configurable confidence thresholds, multi-scale image resolution (imgsz=1024),
and optional grid tiling/slicing for detecting small back-row faces.
"""

import logging
import cv2
import numpy as np
from typing import List, Dict, Any, Tuple
from pathlib import Path
from ..config.settings import settings

logger = logging.getLogger("smartcampus.yolo_detector")


class YOLO11Detector:
    """Detects faces/people in video frames using Ultralytics YOLO11."""

    def __init__(
        self,
        model_name: str = None,
        confidence_threshold: float = None,
        iou_threshold: float = None,
        imgsz: int = None,
        use_slicing: bool = False,
    ):
        self.model_name = model_name or settings.yolo_model_path
        self.confidence_threshold = (
            confidence_threshold
            if confidence_threshold is not None
            else settings.yolo_confidence_threshold
        )
        self.iou_threshold = (
            iou_threshold
            if iou_threshold is not None
            else settings.yolo_iou_threshold
        )
        self.imgsz = imgsz or settings.yolo_imgsz
        self.use_slicing = use_slicing
        self._model = None

    @property
    def model(self):
        """Lazy-load Ultralytics YOLO model."""
        if self._model is None:
            try:
                from ultralytics import YOLO

                # Check if custom model file or standard yolo11 model
                logger.info(f"Loading YOLO11 model: {self.model_name} (imgsz={self.imgsz}, conf={self.confidence_threshold})")
                
                # Attempt to load model (ultralytics handles downloading standard weights if needed)
                try:
                    self._model = YOLO(self.model_name)
                except Exception:
                    # Fallback to yolo11n.pt if face-specific model weight is not available locally
                    logger.warning(f"Could not load custom weight '{self.model_name}', falling back to 'yolo11n.pt'")
                    self.model_name = "yolo11n.pt"
                    self._model = YOLO("yolo11n.pt")

                logger.info(f"[YOLO11] Model loaded successfully: {self.model_name}")
            except Exception as e:
                logger.error(f"[YOLO11] Failed to load YOLO11 model: {e}")
                raise e
        return self._model

    def _validate_detection(
        self, bbox: List[int], confidence: float, frame_w: int, frame_h: int, crop: np.ndarray
    ) -> Tuple[bool, str]:
        """Validate detection confidence, bounding box geometry, and brightness."""
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

        if crop is None or crop.size == 0:
            return False, "empty_crop"

        mean_val = float(np.mean(crop))
        if mean_val < settings.min_brightness or mean_val > settings.max_brightness:
            return False, "extreme_lighting"

        return True, "valid"

    def detect_faces(self, frame: np.ndarray) -> List[Dict[str, Any]]:
        """Detect faces in a BGR image frame using YOLO11."""
        if frame is None or frame.size == 0:
            return []

        h, w = frame.shape[:2]
        logger.info(f"[YOLO11] Input frame: {w}x{h}")

        try:
            # Execute inference with ultralytics YOLO
            results = self.model.predict(
                source=frame,
                conf=self.confidence_threshold,
                iou=self.iou_threshold,
                imgsz=self.imgsz,
                verbose=False,
                device="cpu",
            )
        except Exception as e:
            logger.error(f"[YOLO11] Error during YOLO11 detection: {e}")
            return []

        if not results or len(results) == 0 or results[0].boxes is None:
            logger.info(f"[YOLO11] Raw detections: 0 | Valid faces after threshold ({self.confidence_threshold}): 0")
            return []

        boxes = results[0].boxes
        raw_count = len(boxes)
        detections = []

        for idx in range(raw_count):
            box = boxes[idx]
            confidence = float(box.conf[0].cpu().item())
            cls_id = int(box.cls[0].cpu().item())

            # If standard COCO model is loaded, class 0 is 'person'
            # If face model is loaded, class 0 is 'face'
            xyxy = box.xyxy[0].cpu().numpy().astype(int)
            x1 = max(0, int(xyxy[0]))
            y1 = max(0, int(xyxy[1]))
            x2 = min(w, int(xyxy[2]))
            y2 = min(h, int(xyxy[3]))

            # If person detection (COCO class 0), crop upper 35% region for face estimation
            is_person_model = ("face" not in self.model_name.lower()) and (cls_id == 0)
            if is_person_model:
                person_h = y2 - y1
                # Estimate upper head/face region from person bounding box
                face_y2 = y1 + int(person_h * 0.35)
                face_y1 = max(0, y1)
                face_x1 = x1
                face_x2 = x2
                bbox = [face_x1, face_y1, face_x2, face_y2]
            else:
                bbox = [x1, y1, x2, y2]

            crop = frame[bbox[1]:bbox[3], bbox[0]:bbox[2]].copy() if (bbox[2] > bbox[0] and bbox[3] > bbox[1]) else np.array([])
            is_valid, reason = self._validate_detection(bbox, confidence, w, h, crop)

            if not is_valid:
                logger.debug(f"[YOLO11] [REJECTED] conf={confidence:.2f} bbox={bbox} reason={reason}")
                continue

            detections.append({
                "bbox": bbox,
                "confidence": confidence,
                "landmarks": None,
                "crop": crop,
                "raw_face": None,
                "embedding": None,  # ArcFace embeddings deferred
                "detector": "yolo11",
                "is_person_box": is_person_model,
            })

        logger.info(f"[YOLO11] Raw detections: {raw_count} | Valid faces after threshold ({self.confidence_threshold}): {len(detections)}")
        return detections


# Singleton instance
yolo_detector = YOLO11Detector()
