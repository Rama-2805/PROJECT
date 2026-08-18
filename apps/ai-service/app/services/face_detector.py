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
_SCRFD_INTERNAL_THRESH = 0.25

# Validation gate: the minimum confidence we accept after all other checks pass.
# Real classroom data shows valid back-row faces scoring 0.35-0.50.
_VALIDATION_CONFIDENCE_GATE = 0.35


class FaceDetector:
    """Detects faces in video frames using InsightFace SCRFD 10G (primary) and generates crops."""

    def __init__(self, providers: List[str] = None):
        self.confidence_threshold = _VALIDATION_CONFIDENCE_GATE
        self._model = None
        self.requested_providers = providers
        # Adaptive recovery state & profiling counters
        self.recovery_cooldown_counter = 0
        self.recovery_cooldown_frames = 5
        self.primary_detector_calls = 0
        self.recovery_detector_calls = 0
        self.duplicate_detections_removed = 0

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
                # HIGH RESOLUTION 1280x1280 detection size for full classroom student recall (front/middle/back rows)
                self._model.prepare(ctx_id=-1, det_thresh=_SCRFD_INTERNAL_THRESH, det_size=(1280, 1280))
                logger.info(f"[SCRFD] Model loaded successfully: det_10g.onnx (det_thresh={_SCRFD_INTERNAL_THRESH}, det_size=(1280, 1280), gate={_VALIDATION_CONFIDENCE_GATE})")
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

        self.primary_detector_calls += 1
        h, w = frame.shape[:2]

        # Primary: InsightFace SCRFD 10G (detection-only)
        try:
            det_model = self.model.det_model
            det_model.det_thresh = _SCRFD_INTERNAL_THRESH
            bboxes, kpss = det_model.detect(frame, max_num=0, metric="default")
        except Exception as e:
            logger.error(f"[SCRFD] Error during SCRFD 10G detection: {e}")
            return []

        if bboxes is None or len(bboxes) == 0:
            return []

        raw_count = len(bboxes)
        detections = []

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

        return detections

    def set_det_size(self, size_tuple: Tuple[int, int]):
        """Dynamically set det_size on InsightFace SCRFD model."""
        m = self.model
        if m is not None and hasattr(m, "det_model"):
            m.det_model.input_size = size_tuple
            m.det_model.input_shape = (1, 3, size_tuple[1], size_tuple[0])

    def detect_multiscale_faces(
        self,
        frame: np.ndarray,
        upscale_factor: float = 1.8,
        back_row_y_max: int = 550,
        force_recovery: bool = False,
        iou_thresh: float = 0.35,
    ) -> List[Dict[str, Any]]:
        """Multi-scale SCRFD face detection with targeted ROI tiling for back-row classroom faces."""
        if not getattr(self, "enable_multiscale", True):
            return self.detect_faces(frame)

        if frame is None or frame.size == 0:
            return []

        # Decrement recovery cooldown counter if active
        if self.recovery_cooldown_counter > 0:
            self.recovery_cooldown_counter -= 1

        # Step 1: Scale 1 Primary Full-Frame Detection
        scale1_dets = self.detect_faces(frame)
        for d in scale1_dets:
            d["source"] = "FULL_FRAME"

        # Step 2: Coverage & Small-Face Risk Assessment
        h, w = frame.shape[:2]
        back_row_dets = [d for d in scale1_dets if (d["bbox"][1] + d["bbox"][3]) / 2.0 < back_row_y_max]
        back_sizes = [(d["bbox"][2] - d["bbox"][0]) for d in back_row_dets]
        avg_back_size = float(np.mean(back_sizes)) if back_sizes else 0.0

        # Adaptive Trigger: Trigger targeted recovery if back-row count is low (< 15) or avg size < 40px
        needs_recovery = force_recovery or (len(back_row_dets) < 15) or (avg_back_size > 0 and avg_back_size < 40.0)

        # Check Recovery Cooldown
        if needs_recovery and self.recovery_cooldown_counter > 0 and not force_recovery:
            logger.debug(f"[SCRFD ADAPTIVE COOLDOWN] Small-face recovery needed but cooldown active ({self.recovery_cooldown_counter} frames left) -> Using Scale 1 detections.")
            return scale1_dets

        if not needs_recovery:
            return scale1_dets

        # Set Cooldown counter
        self.recovery_cooldown_counter = self.recovery_cooldown_frames
        self.recovery_detector_calls += 1

        # Step 3: Targeted ROI Tiling (Scale 2)
        tiles = [(0, 0, 1080, 650), (840, 0, 1920, 650), (0, 400, 1920, 1080)]
        scale2_raw = []
        for tx1, ty1, tx2, ty2 in tiles:
            t_crop = frame[ty1:ty2, tx1:tx2]
            t_dets = self.detect_faces(t_crop) or []
            for d in t_dets:
                bx1, by1, bx2, by2 = d["bbox"]
                scale2_raw.append({
                    **d,
                    "bbox": [bx1 + tx1, by1 + ty1, bx2 + tx1, by2 + ty1],
                    "source": "ROI_TILE"
                })

        # Step 4: Targeted Small-Face Recovery (Scale 3 - 2x2 Overlapping Grid on Back-Row ROI y < back_row_y_max)
        roi_h = min(h, back_row_y_max)
        tile_w = int(w * 0.58)
        tile_h = int(roi_h * 0.58)

        sub_tiles = [
            (0, 0, tile_w, tile_h),
            (w - tile_w, 0, w, tile_h),
            (0, roi_h - tile_h, tile_w, roi_h),
            (w - tile_w, roi_h - tile_h, w, roi_h)
        ]

        scale3_raw = []
        for stx1, sty1, stx2, sty2 in sub_tiles:
            sub_crop = frame[sty1:sty2, stx1:stx2]
            if sub_crop.size == 0: continue
            
            enlarged_crop = cv2.resize(sub_crop, (0, 0), fx=upscale_factor, fy=upscale_factor, interpolation=cv2.INTER_CUBIC)
            sub_dets = self.detect_faces(enlarged_crop) or []

            for d in sub_dets:
                bx1, by1, bx2, by2 = d["bbox"]
                orig_bx1 = max(0, int(bx1 / upscale_factor) + stx1)
                orig_by1 = max(0, int(by1 / upscale_factor) + sty1)
                orig_bx2 = min(w, int(bx2 / upscale_factor) + stx1)
                orig_by2 = min(h, int(by2 / upscale_factor) + sty1)

                scale3_raw.append({
                    **d,
                    "bbox": [orig_bx1, orig_by1, orig_bx2, orig_by2],
                    "source": "SMALL_FACE_RECOVERY"
                })

        # Merge all scales with IoU NMS Duplicate Suppression
        all_candidates = scale1_dets + scale2_raw + scale3_raw
        if not all_candidates:
            return []

        sorted_cand = sorted(all_candidates, key=lambda x: x["confidence"], reverse=True)
        final_dets = []

        while sorted_cand:
            best = sorted_cand.pop(0)
            final_dets.append(best)
            remains = []
            for d in sorted_cand:
                b1, b2 = best["bbox"], d["bbox"]
                x1 = max(b1[0], b2[0])
                y1 = max(b1[1], b2[1])
                x2 = min(b1[2], b2[2])
                y2 = min(b1[3], b2[3])
                inter = max(0, x2 - x1) * max(0, y2 - y1)
                area1 = (b1[2] - b1[0]) * (b1[3] - b1[1])
                area2 = (b2[2] - b2[0]) * (b2[3] - b2[1])
                union = area1 + area2 - inter
                iou = inter / float(union) if union > 0 else 0.0
                if iou < iou_thresh:
                    remains.append(d)
            sorted_cand = remains

        self.duplicate_detections_removed += (len(all_candidates) - len(final_dets))
        logger.info(f"[SCRFD ADAPTIVE RECOVERY] Scale 1 ({len(scale1_dets)}) + Scale 2 ({len(scale2_raw)}) + Scale 3 ({len(scale3_raw)}) = {len(all_candidates)} candidates -> {len(final_dets)} unique faces after NMS (thresh={iou_thresh})")
        return final_dets



# Singleton instance
face_detector = FaceDetector()




