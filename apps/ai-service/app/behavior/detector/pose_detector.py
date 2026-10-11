"""SmartCampus AI — Pose & Head Pose Detection Service.

Analyzes student body posture and head orientation using MediaPipe Pose
to identify attentive, sleeping, and distracted behaviors.
"""

import cv2
import math
import numpy as np
from typing import Optional, List, Tuple
from ..models import PoseLandmarks, HeadPose, DetectedPerson, DetectedObject


class PoseDetector:
    """Detects human pose landmarks and computes head orientation."""

    def __init__(self):
        self._pose_model = None
        self._face_mesh = None

    @property
    def pose_model(self):
        if self._pose_model is None:
            import mediapipe as mp
            self._pose_model = mp.solutions.pose.Pose(
                static_image_mode=False,
                model_complexity=1,
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5,
            )
        return self._pose_model

    @property
    def face_mesh(self):
        if self._face_mesh is None:
            import mediapipe as mp
            self._face_mesh = mp.solutions.face_mesh.FaceMesh(
                static_image_mode=False,
                max_num_faces=5,
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5,
            )
        return self._face_mesh

    def detect_pose(self, frame: np.ndarray) -> List[PoseLandmarks]:
        """Detect body pose landmarks for all people in frame."""
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.pose_model.process(rgb)

        poses = []
        if results.pose_landmarks:
            h, w = frame.shape[:2]
            for landmark in results.pose_landmarks.landmark:
                pass  # landmarks is a single NormalizedLandmarkList per person
            # Process each detected pose
            for detection in [results.pose_landmarks]:
                pose = PoseLandmarks(
                    nose=self._get_lm(detection, 0, w, h),
                    left_eye=self._get_lm(detection, 2, w, h),
                    right_eye=self._get_lm(detection, 5, w, h),
                    left_ear=self._get_lm(detection, 7, w, h),
                    right_ear=self._get_lm(detection, 8, w, h),
                    left_shoulder=self._get_lm(detection, 11, w, h),
                    right_shoulder=self._get_lm(detection, 12, w, h),
                    left_hip=self._get_lm(detection, 23, w, h),
                    right_hip=self._get_lm(detection, 24, w, h),
                )
                poses.append(pose)

        return poses

    def _get_lm(self, landmarks, idx: int, w: int, h: int) -> tuple:
        """Get landmark coordinates in pixel space."""
        lm = landmarks.landmark[idx]
        return (lm.x * w, lm.y * h, lm.z * w)

    def compute_head_pose(self, landmarks: PoseLandmarks) -> HeadPose:
        """Estimate head pose from facial landmarks.

        Uses nose-to-ear vectors to compute yaw, pitch, and roll.
        """
        # Yaw: left-right rotation based on left/right ear x-coordinates
        ear_width = abs(landmarks.right_ear[0] - landmarks.left_ear[0])
        if ear_width > 0:
            nose_offset = (landmarks.nose[0] - landmarks.left_ear[0]) / ear_width
            yaw = (nose_offset - 0.5) * 180  # Convert to degrees
        else:
            yaw = 0.0

        # Pitch: up-down based on nose y relative to ears
        ear_y_avg = (landmarks.left_ear[1] + landmarks.right_ear[1]) / 2
        nose_ear_dist = ear_y_avg - landmarks.nose[1]
        pitch = max(-90, min(90, nose_ear_dist * 0.5))

        # Roll: rotation based on eye y-difference
        eye_diff = landmarks.right_eye[1] - landmarks.left_eye[1]
        eye_dist = abs(landmarks.right_eye[0] - landmarks.left_eye[0])
        roll = math.degrees(math.atan2(eye_diff, eye_dist)) if eye_dist > 0 else 0.0

        return HeadPose(yaw=float(yaw), pitch=float(pitch), roll=float(roll))

    def is_looking_away(self, head_pose: HeadPose, threshold: float = 30.0) -> bool:
        """Check if student is looking away from front."""
        return abs(head_pose.yaw) > threshold or abs(head_pose.pitch) > 25.0

    def is_head_down(self, head_pose: HeadPose, threshold: float = -20.0) -> bool:
        """Check if student's head is lowered (possible sleeping)."""
        return head_pose.pitch < threshold

    def classify_posture(self, landmarks: PoseLandmarks) -> str:
        """Classify body posture as attentive, slouching, or upright."""
        shoulder_y = (landmarks.left_shoulder[1] + landmarks.right_shoulder[1]) / 2
        hip_y = (landmarks.left_hip[1] + landmarks.right_hip[1]) / 2
        nose_y = landmarks.nose[1]

        torso_length = abs(hip_y - shoulder_y)
        if torso_length == 0:
            return "upright"

        upright_ratio = abs(nose_y - shoulder_y) / torso_length
        if upright_ratio > 1.2:
            return "upright"
        elif upright_ratio > 0.8:
            return "slight_slouching"
        else:
            return "slouching"

    def compute_posture_score(self, posture: str) -> float:
        """Convert posture classification to a numeric score (0-1)."""
        scores = {"upright": 1.0, "slight_slouching": 0.6, "slouching": 0.3}
        return scores.get(posture, 0.5)


class ObjectDetector:
    """Detects mobile phones and other classroom objects using YOLO.

    For development: uses simple color/shape detection as fallback.
    """

    def __init__(self):
        self._model = None
        self._class_names = {67: "cell phone"}  # COCO class ID for phone

    @property
    def model(self):
        if self._model is None:
            try:
                from ultralytics import YOLO
                self._model = YOLO("yolov8n.pt")
            except Exception:
                try:
                    import torch
                    self._model = torch.hub.load("ultralytics/yolov5", "yolov5s", pretrained=True, verbose=False)
                except Exception:
                    self._model = None
        return self._model

    def detect_phones(self, frame: np.ndarray) -> List[DetectedObject]:
        """Detect mobile phones in the frame."""
        if self.model is None or frame is None or frame.size == 0:
            return self._fallback_detect(frame)

        phones = []
        try:
            # Check if ultralytics YOLO model
            if hasattr(self.model, "predict") or type(self.model).__name__ == "YOLO":
                results = self.model(frame, classes=[67], conf=0.45, verbose=False, imgsz=320)
                if results and len(results) > 0 and results[0].boxes is not None:
                    for box in results[0].boxes:
                        coords = box.xyxy[0].cpu().numpy()
                        conf = float(box.conf[0].cpu().numpy())
                        phones.append(DetectedObject(
                            class_id=67,
                            label="cell phone",
                            confidence=conf,
                            bounding_box=(float(coords[0]), float(coords[1]), float(coords[2]), float(coords[3])),
                        ))
                return phones

            # Fallback to PyTorch hub format if applicable
            results = self.model(frame)
            detections = results.xyxy[0].cpu().numpy()
            for det in detections:
                x1, y1, x2, y2, conf, cls_id = det
                if int(cls_id) == 67 and conf > 0.45:  # cell phone
                    phones.append(DetectedObject(
                        class_id=67,
                        label="cell phone",
                        confidence=float(conf),
                        bounding_box=(float(x1), float(y1), float(x2), float(y2)),
                    ))
        except Exception:
            return self._fallback_detect(frame)

        return phones

    def _fallback_detect(self, frame: np.ndarray) -> List[DetectedObject]:
        """Simple color-based phone detection fallback.

        Detects rectangular objects with phone-like aspect ratio
        and common phone colors (dark, silver).
        """
        phones = []
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)

        # Dark rectangular objects
        lower_dark = np.array([0, 0, 0])
        upper_dark = np.array([180, 50, 100])
        mask = cv2.inRange(hsv, lower_dark, upper_dark)
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        for contour in contours:
            area = cv2.contourArea(contour)
            if area < 500 or area > 50000:
                continue
            x, y, w, h = cv2.boundingRect(contour)
            aspect_ratio = max(w, h) / min(w, h)
            if 1.5 < aspect_ratio < 3.5:  # Phone-like aspect ratio
                phones.append(DetectedObject(
                    class_id=67,
                    label="cell phone",
                    confidence=0.6,
                    bounding_box=(float(x), float(y), float(x + w), float(y + h)),
                ))

        return phones
