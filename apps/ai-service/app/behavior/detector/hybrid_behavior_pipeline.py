"""SmartCampus AI — Two-Stage Hybrid Behavioral Monitoring Pipeline.

STAGE 1: YOLOv8 Detection
- Detects persons (COCO class 0) and mobile phones (COCO class 67).
- Computes bounding boxes, class labels, confidence scores.
- Spatial person-phone association based on hand/lap/desk ROI proximity and overlap.

STAGE 2: Behavioral and Temporal Analysis
- Extracts body posture landmarks via MediaPipe Pose on person ROIs.
- Computes real 3D head orientation (pitch, yaw, roll) from facial landmarks.
- Evaluates gaze consistency: checks if downward head direction is consistent with looking towards the detected phone.
- Detects sustained forward-slumped / lowered-head posture.
- Maintains per-person temporal state machine (NORMAL, OBSERVING_PHONE, POSSIBLE_PHONE_USAGE, OBSERVING_POSTURE, POSSIBLE_SLEEPING, ALERTED, INSUFFICIENT_VISUAL_EVIDENCE, TRACK_LOST).
- Generates PHONE_USAGE alert (>= 5.0s) and POSSIBLE_SLEEPING_POSTURE alert (>= 10.0s) with 60s cooldown deduplication.
"""

import cv2
import math
import time
import logging
from pathlib import Path
import numpy as np
from typing import List, Dict, Optional, Tuple, Any

from ..models import DetectedObject, BehaviorType, BehaviorEvent
from ..tracker.behavior_tracker import behavior_tracker_service, BehaviorTemporalState, TrackedBehaviorPerson
from ...services.face_quality_service import face_quality_service

logger = logging.getLogger("smartcampus.hybrid_pipeline")


class TwoStageHybridBehaviorPipeline:
    """Two-Stage Hybrid Behavioral Monitoring Pipeline."""

    def __init__(self):
        self._yolo_model = None
        self._yolo_load_attempted = False
        self._pose_model = None
        self._coco_classes = {0: "person", 67: "cell phone"}
        self._last_process_time = 0.0
        self._warned_phone_unavailable = False

        # Spatial/temporal association for Stage-1 person ROIs that have no face track.
        # Keeps a stable behavioural track id per detected person instead of re-using
        # the (unstable) detection index of each frame.
        self._person_tracks: Dict[str, Dict[str, Any]] = {}
        self._person_track_counter: int = 0
        self._person_track_ttl: float = 3.5
        self._person_track_iou_min: float = 0.25

    @staticmethod
    def _iou(a: List[float], b: List[float]) -> float:
        ix1, iy1 = max(a[0], b[0]), max(a[1], b[1])
        ix2, iy2 = min(a[2], b[2]), min(a[3], b[3])
        iw, ih = max(0.0, ix2 - ix1), max(0.0, iy2 - iy1)
        inter = iw * ih
        if inter <= 0:
            return 0.0
        area_a = max(1.0, (a[2] - a[0]) * (a[3] - a[1]))
        area_b = max(1.0, (b[2] - b[0]) * (b[3] - b[1]))
        return inter / (area_a + area_b - inter)

    def _associate_person_tracks(
        self, person_boxes: List[List[float]], timestamp: float
    ) -> List[str]:
        """Greedy IoU association of person boxes to stable track ids across frames."""
        # Expire stale person tracks
        stale = [tid for tid, t in self._person_tracks.items() if timestamp - t["last_seen"] > self._person_track_ttl]
        for tid in stale:
            self._person_tracks.pop(tid, None)

        assigned: List[Optional[str]] = [None] * len(person_boxes)
        # Greedy best-IoU matching against existing tracks
        pairs = []
        for i, box in enumerate(person_boxes):
            for tid, t in self._person_tracks.items():
                score = self._iou(box, t["bbox"])
                if score >= self._person_track_iou_min:
                    pairs.append((score, i, tid))
        pairs.sort(key=lambda p: -p[0])
        used_boxes: set = set()
        used_tracks: set = set()
        for score, i, tid in pairs:
            if i in used_boxes or tid in used_tracks or assigned[i] is not None:
                continue
            assigned[i] = tid
            used_boxes.add(i)
            used_tracks.add(tid)
            self._person_tracks[tid]["bbox"] = person_boxes[i]
            self._person_tracks[tid]["last_seen"] = timestamp

        # Create tracks for unmatched detections
        for i, box in enumerate(person_boxes):
            if assigned[i] is None:
                self._person_track_counter += 1
                tid = f"P{self._person_track_counter}"
                self._person_tracks[tid] = {"bbox": box, "last_seen": timestamp}
                assigned[i] = tid

        return [tid or "" for tid in assigned]

    def reset_person_tracks(self):
        """Clear Stage-1 person associations (called when a monitoring session starts/stops)."""
        self._person_tracks.clear()
        self._person_track_counter = 0

    @staticmethod
    def _checkpoint_candidates() -> List[Path]:
        """Resolve Stage-1 checkpoint locations without relying on the process CWD."""
        module_dir = Path(__file__).resolve()           # .../app/behavior/detector
        app_dir = module_dir.parents[2]                 # .../apps/ai-service/app
        ai_service_dir = module_dir.parents[3]          # .../apps/ai-service
        repo_root = module_dir.parents[5] if len(module_dir.parents) > 5 else ai_service_dir.parent.parent
        return [
            ai_service_dir / "yolov8n.pt",
            repo_root / "yolov8n.pt",
            app_dir / "yolov8n.pt",
            Path.cwd() / "yolov8n.pt",
        ]

    @property
    def yolo_model(self):
        """Lazy loader for the YOLOv8 Stage-1 checkpoint (COCO classes 0 = person, 67 = cell phone).

        The checkpoint is verified to expose the required classes before it is used. When it cannot
        be loaded, Stage 1 reports 'phone detection unavailable' instead of substituting a heuristic
        detector — no phone detection is ever fabricated.
        """
        if self._yolo_model is None and not self._yolo_load_attempted:
            self._yolo_load_attempted = True
            checkpoint = next((p for p in self._checkpoint_candidates() if p.is_file()), None)
            if checkpoint is None:
                logger.error(
                    "Stage 1 checkpoint yolov8n.pt not found in %s — phone detection is unavailable "
                    "until a compatible checkpoint is provided.",
                    [str(p) for p in self._checkpoint_candidates()],
                )
                return None
            try:
                from ultralytics import YOLO
                model = YOLO(str(checkpoint))
                names = getattr(model, "names", {}) or {}
                if names.get(0) != "person" or names.get(67) != "cell phone":
                    logger.error(
                        "Stage 1 checkpoint %s does not expose required COCO classes (person=0, cell phone=67); "
                        "got %s. Phone detection disabled for this session.",
                        checkpoint, names,
                    )
                    self._yolo_model = None
                else:
                    self._yolo_model = model
                    logger.info(
                        "Loaded Stage-1 checkpoint %s (person + cell phone) for behavioral object detection",
                        checkpoint,
                    )
            except Exception as e:
                logger.error(f"Could not load Stage-1 YOLO checkpoint: {e}")
                self._yolo_model = None
        return self._yolo_model

    @property
    def pose_model(self):
        """Lazy loader for MediaPipe Pose model."""
        if self._pose_model is None:
            try:
                import mediapipe as mp
                self._pose_model = mp.solutions.pose.Pose(
                    static_image_mode=False,
                    model_complexity=1,
                    min_detection_confidence=0.45,
                    min_tracking_confidence=0.45,
                )
                logger.info("Initialized MediaPipe Pose for Stage 2 posture analysis")
            except Exception as e:
                logger.warning(f"Could not load MediaPipe Pose: {e}")
                self._pose_model = None
        return self._pose_model

    # ─────────────────────────────────────────────────────────────────────
    # STAGE 1: YOLOv8 OBJECT DETECTION & SPATIAL ASSOCIATION
    # ─────────────────────────────────────────────────────────────────────

    def detect_stage1_objects(self, frame: np.ndarray) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Detect persons (class 0) and mobile phones (class 67) using YOLOv8.
        
        Returns:
            (persons_list, phones_list)
        """
        if frame is None or frame.size == 0:
            return [], []

        h, w = frame.shape[:2]
        persons = []
        phones = []

        if self.yolo_model is not None:
            try:
                # Run YOLO with classes 0 (person) and 67 (cell phone)
                results = self.yolo_model(frame, classes=[0, 67], conf=0.35, verbose=False, imgsz=384)
                if results and len(results) > 0 and results[0].boxes is not None:
                    for box in results[0].boxes:
                        coords = box.xyxy[0].cpu().numpy()
                        cls_id = int(box.cls[0].cpu().numpy())
                        conf = float(box.conf[0].cpu().numpy())

                        x1 = max(0, min(float(coords[0]), w - 1))
                        y1 = max(0, min(float(coords[1]), h - 1))
                        x2 = max(x1 + 1, min(float(coords[2]), w))
                        y2 = max(y1 + 1, min(float(coords[3]), h))

                        obj = {
                            "bbox": [x1, y1, x2, y2],
                            "confidence": conf,
                            "class_id": cls_id,
                            "label": "person" if cls_id == 0 else "cell phone"
                        }

                        if cls_id == 0:
                            persons.append(obj)
                        elif cls_id == 67:
                            phones.append(obj)

                    return persons, phones
            except Exception as e:
                logger.debug(f"Stage 1 YOLO inference failed: {e}")

        if not self._warned_phone_unavailable:
            self._warned_phone_unavailable = True
            logger.warning(
                "Stage 1 phone detection unavailable (checkpoint not loaded). "
                "No heuristic substitute is used — phone evidence will remain inconclusive."
            )
        return persons, []

    def associate_phone_with_person(
        self,
        person_bbox: List[float],
        detected_phones: List[Dict[str, Any]],
        pose_landmarks: Optional[Any] = None
    ) -> Tuple[bool, Optional[Dict[str, Any]], float]:
        """STEP B: Person-Object Association based on spatial desk/lap proximity.
        
        Returns:
            (is_associated, best_phone_obj, distance_px)
        """
        if not detected_phones:
            return False, None, 9999.0

        px1, py1, px2, py2 = person_bbox
        pw = max(10.0, px2 - px1)
        ph = max(10.0, py2 - py1)

        # Student desk/lap region of interest in front of torso
        desk_x1 = px1 - pw * 0.25
        desk_y1 = py1 + ph * 0.30
        desk_x2 = px2 + pw * 0.25
        desk_y2 = py2 + ph * 0.35

        best_phone = None
        min_dist = 9999.0

        for phone in detected_phones:
            pbx1, pby1, pbx2, pby2 = phone["bbox"]
            pcx = (pbx1 + pbx2) / 2.0
            pcy = (pby1 + pby2) / 2.0

            # Check if phone center lies within the desk/lap boundary
            if desk_x1 <= pcx <= desk_x2 and desk_y1 <= pcy <= desk_y2:
                # Compute distance to person torso center
                person_center_x = (px1 + px2) / 2.0
                person_center_y = py1 + ph * 0.65
                dist = math.sqrt((pcx - person_center_x)**2 + (pcy - person_center_y)**2)

                if dist < min_dist:
                    min_dist = dist
                    best_phone = phone

        if best_phone is not None:
            return True, best_phone, min_dist

        return False, None, min_dist

    # ─────────────────────────────────────────────────────────────────────
    # STAGE 2: BEHAVIORAL & TEMPORAL ANALYSIS
    # ─────────────────────────────────────────────────────────────────────

    def analyze_pose_and_posture(
        self,
        frame: np.ndarray,
        person_bbox: List[float]
    ) -> Tuple[str, bool, bool, float]:
        """STEP B: Pose analysis on Person Upper Body ROI using MediaPipe Pose.
        
        Returns:
            (posture_label, is_slumped, is_head_down, pose_quality)
        """
        h_f, w_f = frame.shape[:2]
        x1 = max(0, min(int(person_bbox[0]), w_f - 1))
        y1 = max(0, min(int(person_bbox[1]), h_f - 1))
        x2 = max(x1 + 1, min(int(person_bbox[2]), w_f))
        y2 = max(y1 + 1, min(int(person_bbox[3]), h_f))

        crop = frame[y1:y2, x1:x2]
        if crop.size == 0 or crop.shape[0] < 20 or crop.shape[1] < 20:
            return "Upright", False, False, 0.0

        if self.pose_model is not None:
            try:
                rgb_crop = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
                res = self.pose_model.process(rgb_crop)
                if res.pose_landmarks:
                    lms = res.pose_landmarks.landmark
                    # Key landmarks: nose(0), left_shoulder(11), right_shoulder(12), left_wrist(15), right_wrist(16)
                    nose = lms[0]
                    l_sh = lms[11]
                    r_sh = lms[12]

                    sh_avg_y = (l_sh.y + r_sh.y) / 2.0
                    pose_quality = min(1.0, (nose.visibility + l_sh.visibility + r_sh.visibility) / 3.0)

                    # Posture classification:
                    # In normal sitting: nose is well above shoulders (nose.y < sh_avg_y - 0.15)
                    # Slumped: nose is at or below shoulder level (collapsed spine)
                    diff = sh_avg_y - nose.y
                    if diff < 0.02:
                        return "Slumped", True, True, pose_quality
                    elif diff < 0.10:
                        return "Head Lowered", False, True, pose_quality
                    else:
                        return "Upright", False, False, pose_quality
            except Exception as e:
                logger.debug(f"MediaPipe Pose processing error: {e}")

        # Geometric aspect ratio fallback on upper body crop:
        # High-mounted classroom CCTV cameras naturally produce upper body crops with aspect ~0.7-1.0.
        # Flattened posture horizontally across the desk (aspect < 0.60) indicates head resting on desk.
        ch, cw = crop.shape[:2]
        aspect = ch / max(1, cw)
        if aspect < 0.60:
            return "Head Resting on Desk", True, True, 0.45
        else:
            return "Upright", False, False, 0.40

    def process_frame(
        self,
        frame: np.ndarray,
        active_tracks: List[Any],
        timestamp: float
    ) -> List[Dict[str, Any]]:
        """Processes a live frame through the Two-Stage Hybrid Pipeline.
        
        Args:
            frame: Video frame (BGR)
            active_tracks: TrackedFace or person tracks from tracking service
            timestamp: Real timestamp (seconds)
            
        Returns:
            List of generated alert dictionaries
        """
        if frame is None or frame.size == 0:
            return []

        h_f, w_f = frame.shape[:2]

        # Stage 1: Detect Persons & Phones via YOLOv8
        detected_persons, detected_phones = self.detect_stage1_objects(frame)

        generated_alerts = []

        # ── Build analysis targets ────────────────────────────────────────────
        # (a) Face tracks: identity-capable tracks coming from the face pipeline
        analysis_targets: List[Dict[str, Any]] = []
        claimed_person_idx: set = set()

        for track in (active_tracks or []):
            # Robust extraction supporting both dict snapshots and TrackedFace objects
            track_id = str(track.get("track_id") if isinstance(track, dict) else getattr(track, "track_id", "0"))
            raw_bbox = track.get("bbox") if isinstance(track, dict) else getattr(track, "bbox", [0, 0, 0, 0])
            face_bbox = [float(v) for v in raw_bbox]
            student_usn = track.get("student_usn") if isinstance(track, dict) else getattr(track, "student_usn", None)
            student_name = track.get("student_name") if isinstance(track, dict) else getattr(track, "student_name", None)
            landmarks = track.get("landmarks") if isinstance(track, dict) else getattr(track, "landmarks", None)

            # Associate face track with YOLO person body bounding box if available
            fx1, fy1, fx2, fy2 = face_bbox
            fcx = (fx1 + fx2) / 2.0
            fcy = (fy1 + fy2) / 2.0
            fw = max(10.0, fx2 - fx1)
            fh = max(10.0, fy2 - fy1)

            matched_person_bbox = None
            for idx, p in enumerate(detected_persons):
                px1, py1, px2, py2 = p["bbox"]
                if px1 <= fcx <= px2 and py1 <= fcy <= py2:
                    matched_person_bbox = [px1, py1, px2, py2]
                    claimed_person_idx.add(idx)
                    break

            # If no YOLO body detected, synthesize upper body / desk ROI from the face track
            if matched_person_bbox is None:
                matched_person_bbox = [
                    max(0.0, fcx - fw * 1.5),
                    max(0.0, fy1),
                    min(float(w_f), fcx + fw * 1.5),
                    min(float(h_f), fy1 + fh * 3.8)
                ]

            analysis_targets.append({
                "track_id": track_id,
                "person_bbox": matched_person_bbox,
                "face_size": (fw, fh),
                "student_usn": student_usn,
                "student_name": student_name,
                "landmarks": landmarks,
            })

        # (b) Stage-1 person detections without an associated face track — analysed as
        #     unidentified person ROIs so behavioural analysis does not depend on face detection.
        unclaimed_boxes = [
            detected_persons[idx]["bbox"]
            for idx in range(len(detected_persons))
            if idx not in claimed_person_idx
        ]
        unclaimed_ids = self._associate_person_tracks(unclaimed_boxes, timestamp)

        unclaimed_iter = iter(unclaimed_ids)
        for idx in range(len(detected_persons)):
            if idx in claimed_person_idx:
                continue
            px1, py1, px2, py2 = detected_persons[idx]["bbox"]
            analysis_targets.append({
                "track_id": next(unclaimed_iter),
                "person_bbox": [px1, py1, px2, py2],
                "face_size": (max(20.0, (px2 - px1) * 0.35), max(20.0, (py2 - py1) * 0.35)),
                "student_usn": None,
                "student_name": None,
                "landmarks": None,
            })

        for target in analysis_targets:
            track_id = target["track_id"]
            person_bbox = target["person_bbox"]
            fw, fh = target["face_size"]
            student_usn = target["student_usn"]
            student_name = target["student_name"]
            landmarks = target["landmarks"]

            # Step B: Associate phone with this person's desk/lap ROI
            phone_assoc, phone_obj, phone_dist = self.associate_phone_with_person(person_bbox, detected_phones)
            phone_bbox = phone_obj["bbox"] if phone_obj else None
            phone_conf = phone_obj["confidence"] if phone_obj else 0.0

            # Step C: Analyze Head Orientation & Gaze from facial landmarks
            pitch, yaw, roll = 0.0, 0.0, 0.0
            face_quality = 0.0

            if landmarks is not None and len(landmarks) >= 5:
                try:
                    pitch, yaw, roll = face_quality_service.estimate_pose_from_landmarks(landmarks)
                    face_quality = 0.85
                except Exception:
                    pass

            # Step D: Analyze body posture from Person Upper Body ROI
            posture_label, is_slumped, is_head_down, pose_quality = self.analyze_pose_and_posture(frame, person_bbox)

            # Re-evaluate head-down status if pitch from facial landmarks confirms negative pitch
            if pitch < -18.0:
                is_head_down = True
                if posture_label == "Upright":
                    posture_label = "Head Lowered"
            elif pitch > -8.0 and posture_label != "Head Resting on Desk":
                # If head pitch is upright, student is looking towards the front/board
                is_head_down = False

            # Active phone use vs phone resting on desk:
            # If phone is visible on desk but student is looking upright at the board,
            # this is NOT active phone use -> keep phone_assoc False or inconclusive
            active_phone_interaction = False
            if phone_assoc:
                if pitch < -12.0 or is_head_down:
                    active_phone_interaction = True
                elif phone_dist < fw * 1.2 and pitch < -6.0:
                    active_phone_interaction = True

            # Step E: Update Temporal Behavioral State Machine with verified identity synchronization
            is_verified = bool(student_usn)
            person_state, alert = behavior_tracker_service.evaluate_behavior_evidence(
                track_id=track_id,
                timestamp=timestamp,
                posture_label=posture_label,
                is_slumped=is_slumped,
                is_head_down=is_head_down,
                head_pitch=pitch,
                head_yaw=yaw,
                head_roll=roll,
                pose_quality=pose_quality,
                face_quality=face_quality,
                phone_associated=active_phone_interaction,
                phone_bbox=phone_bbox,
                phone_confidence=phone_conf,
                student_id=student_usn,
                student_name=student_name or student_usn,
                is_verified_identity=is_verified,
            )
            person_state.bbox = list(person_bbox)

            if alert:
                generated_alerts.append(alert)

        # Prune stale tracks
        behavior_tracker_service.prune_stale_tracks(timestamp)

        return generated_alerts


# Global singleton instance
hybrid_behavior_pipeline = TwoStageHybridBehaviorPipeline()
