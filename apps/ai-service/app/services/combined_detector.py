"""SmartCampus AI — Combined Face Detector (SCRFD 10G + YOLO11).

Executes both SCRFD 10G and YOLO11 detectors and merges bounding box candidates using
Non-Maximum Suppression (NMS) to achieve maximum recall on small/far classroom faces.
"""

import logging
import numpy as np
from typing import List, Dict, Any
from .face_detector import face_detector as scrfd_detector
from .yolo_detector import yolo_detector

logger = logging.getLogger("smartcampus.combined_detector")


def _calculate_iou(box1: List[int], box2: List[int]) -> float:
    """Calculate Intersection over Union (IoU) of two bounding boxes [x1, y1, x2, y2]."""
    x1 = max(box1[0], box2[0])
    y1 = max(box1[1], box2[1])
    x2 = min(box1[2], box2[2])
    y2 = min(box1[3], box2[3])

    inter_area = max(0, x2 - x1) * max(0, y2 - y1)
    if inter_area == 0:
        return 0.0

    box1_area = (box1[2] - box1[0]) * (box1[3] - box1[1])
    box2_area = (box2[2] - box2[0]) * (box2[3] - box2[1])

    union_area = float(box1_area + box2_area - inter_area)
    return inter_area / union_area if union_area > 0 else 0.0


class CombinedDetector:
    """Combines SCRFD 10G and YOLO11 detections via IoU NMS fusion."""

    def __init__(self, iou_threshold: float = 0.50):
        self.iou_threshold = iou_threshold
        self.scrfd = scrfd_detector
        self.yolo = yolo_detector

    def detect_faces(self, frame: np.ndarray) -> List[Dict[str, Any]]:
        """Run SCRFD 10G and YOLO11, merging detections using NMS."""
        if frame is None or frame.size == 0:
            return []

        h, w = frame.shape[:2]
        logger.info(f"[COMBINED] Running SCRFD 10G + YOLO11 on frame: {w}x{h}")

        scrfd_dets = self.scrfd.detect_faces(frame)
        yolo_dets = self.yolo.detect_faces(frame)

        all_dets = list(scrfd_dets) + list(yolo_dets)
        if not all_dets:
            logger.info("[COMBINED] Raw detections: 0 | Valid merged faces: 0")
            return []

        # Sort detections descending by confidence score
        all_dets.sort(key=lambda d: d.get("confidence", 0.0), reverse=True)

        merged_dets = []
        for det in all_dets:
            bbox = det["bbox"]
            keep = True

            for kept_det in merged_dets:
                iou = _calculate_iou(bbox, kept_det["bbox"])
                if iou >= self.iou_threshold:
                    keep = False
                    # Retain landmarks if existing kept det lacked them
                    if kept_det.get("landmarks") is None and det.get("landmarks") is not None:
                        kept_det["landmarks"] = det["landmarks"]
                    break

            if keep:
                merged_dets.append(det)

        logger.info(
            f"[COMBINED] SCRFD detections: {len(scrfd_dets)} | "
            f"YOLO11 detections: {len(yolo_dets)} | "
            f"Final Merged Detections: {len(merged_dets)}"
        )
        return merged_dets


# Singleton instance
combined_detector = CombinedDetector()
