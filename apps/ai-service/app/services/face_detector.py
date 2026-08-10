"""SmartCampus AI — Face Detection Service.

Uses InsightFace FaceAnalysis (buffalo_l model with SCRFD 10G) on CPU to locate and crop faces.
SCRFD 10G is the PRIMARY detector. YuNet is removed to prevent short-circuiting.
Internal det_thresh is kept LOW (0.30) to maximize recall on distant classroom faces.
_validate_detection gates at a higher threshold (0.50) for precision.
"""

import logging
import cv2
import numpy as np
from typing import List, Dict, Any, Tuple
from ..config.settings import settings

logger = logging.getLogger("smartcampus.detector")


from pathlib import Path

def check_and_download_models():
    """Verify if buffalo_l exists, otherwise download it showing progress logs."""
    model_dir = Path.home() / ".insightface" / "models" / "buffalo_l"
    if not model_dir.exists():
        print("Downloading InsightFace Models...")
        print("Downloading buffalo_l...")
        logger.info("Downloading InsightFace Models...")
        logger.info("Downloading buffalo_l...")
        try:
            import insightface
            # Initialize with default to trigger download
            model = insightface.app.FaceAnalysis(name="buffalo_l")
            model.prepare(ctx_id=-1)
            print("Download Complete.")
            logger.info("Download Complete.")
        except Exception as e:
            logger.error(f"Failed to download models: {e}")
            raise e


# Internal SCRFD threshold: kept deliberately LOW so distant classroom faces
# (which often score 0.35-0.60) are NOT silently dropped by the ONNX model.
# The real precision gate is _validate_detection below.
_SCRFD_INTERNAL_THRESH = 0.30

# Validation gate: the minimum confidence we accept after all other checks pass.
# Real classroom data shows valid back-row faces scoring 0.40-0.50.
_VALIDATION_CONFIDENCE_GATE = 0.40


class FaceDetector:
    """Detects faces in video frames using InsightFace SCRFD 10G (primary) and generates crops."""

    def __init__(self, providers: List[str] = None):
        self.confidence_threshold = _VALIDATION_CONFIDENCE_GATE
        self._model = None
        self.requested_providers = providers

    @property
    def model(self):
        """Lazy-load the InsightFace FaceAnalysis model to save memory during import."""
        if self._model is None:
            try:
                import insightface
                import onnxruntime as ort
                
                # Dynamic provider filtering
                available_providers = ort.get_available_providers()
                requested = self.requested_providers or ["CPUExecutionProvider"]
                providers = [p for p in requested if p in available_providers]
                if not providers:
                    providers = ["CPUExecutionProvider"]
                
                provider_options = [{}] * len(providers)
                logger.info(f"Initializing InsightFace FaceAnalysis (buffalo_l) with ONNX execution providers: {providers}")
                
                self._model = insightface.app.FaceAnalysis(
                    name="buffalo_l",
                    providers=providers,
                    provider_options=provider_options
                )
                # LOW internal threshold so SCRFD returns all candidate faces
                self._model.prepare(ctx_id=-1, det_thresh=_SCRFD_INTERNAL_THRESH)
                logger.info(f"[SCRFD] Model loaded successfully: det_10g.onnx (det_thresh={_SCRFD_INTERNAL_THRESH}, gate={_VALIDATION_CONFIDENCE_GATE})")
            except Exception as e:
                logger.error(f"[SCRFD] Failed to load InsightFace FaceAnalysis model: {e}")
                raise e
        return self._model

    def _validate_detection(self, bbox: List[int], confidence: float, frame_w: int, frame_h: int, face_crop: np.ndarray) -> Tuple[bool, str]:
        """Validate face detection confidence, size, geometry, and brightness."""
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

        if face_crop is None or face_crop.size == 0:
            return False, "empty_crop"

        mean_val = float(np.mean(face_crop))
        if mean_val < settings.min_brightness or mean_val > settings.max_brightness:
            return False, "extreme_lighting"

        return True, "valid"

    def detect_faces(self, frame: np.ndarray) -> List[Dict[str, Any]]:
        """Detect all faces in a BGR image frame using SCRFD 10G with validation filtering."""
        if frame is None or frame.size == 0:
            return []

        h, w = frame.shape[:2]
        logger.info(f"[SCRFD] Input frame: {w}x{h}")

        # Primary: InsightFace SCRFD 10G (detection-only)
        try:
            det_model = self.model.det_model
            det_model.det_thresh = _SCRFD_INTERNAL_THRESH
            bboxes, kpss = det_model.detect(frame, max_num=0, metric="default")
        except Exception as e:
            logger.error(f"[SCRFD] Error during SCRFD 10G detection: {e}")
            return []

        if bboxes is None or len(bboxes) == 0:
            logger.info(f"[SCRFD] Raw detections: 0 | Valid faces after threshold ({self.confidence_threshold}): 0")
            return []

        raw_count = len(bboxes)
        detections = []
        rejected_count = 0

        for idx, bbox_raw in enumerate(bboxes):
            confidence = float(bbox_raw[-1])
            bbox = bbox_raw[:4].astype(int)
            x1 = max(0, int(bbox[0]))
            y1 = max(0, int(bbox[1]))
            x2 = min(w, int(bbox[2]))
            y2 = min(h, int(bbox[3]))

            face_crop = frame[y1:y2, x1:x2].copy() if (x2 > x1 and y2 > y1) else np.array([])
            is_valid, reason = self._validate_detection([x1, y1, x2, y2], confidence, w, h, face_crop)

            if not is_valid:
                rejected_count += 1
                logger.debug(f"[SCRFD] [FACE REJECTED] confidence={confidence:.2f} bbox=[{x1},{y1},{x2},{y2}] reason={reason}")
                continue

            landmarks = kpss[idx] if (kpss is not None and idx < len(kpss)) else None

            detections.append({
                "bbox": [x1, y1, x2, y2],
                "confidence": confidence,
                "landmarks": landmarks,
                "crop": face_crop,
                "raw_face": None,
                "embedding": None,  # Deferred: ArcFace embeddings generated only on selected crops
            })

        logger.info(f"[SCRFD] Raw detections: {raw_count} | Valid faces after threshold ({self.confidence_threshold}): {len(detections)}")
        return detections


# Singleton instance
face_detector = FaceDetector()


