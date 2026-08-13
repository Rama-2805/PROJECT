"""SmartCampus AI — MediaPipe Face Landmarker & Pose Quality Service.

Integrates MediaPipe Face Mesh / Face Landmarker to extract 3D facial landmarks,
estimate 3D head pose (yaw, pitch, roll in degrees), measure face resolution and clarity,
and compute a normalized quality score (0.0 to 1.0) for enrollment sample selection.
"""

import logging
import cv2
import numpy as np
from typing import Dict, Any, Optional

from app.config.settings import settings

logger = logging.getLogger("smartcampus.mediapipe_quality")


class MediaPipeFaceQuality:
    """MediaPipe Face Landmarker quality analysis service."""

    def __init__(self):
        self._face_mesh = None
        self._initialized = False

    def _init_mediapipe(self):
        if self._initialized:
            return
        try:
            import mediapipe as mp
            self.mp_face_mesh = mp.solutions.face_mesh
            self._face_mesh = self.mp_face_mesh.FaceMesh(
                static_image_mode=True,
                max_num_faces=1,
                refine_landmarks=True,
                min_detection_confidence=0.5,
            )
            self._initialized = True
            logger.info("[MEDIAPIPE] MediaPipe Face Landmarker initialized successfully.")
        except Exception as e:
            logger.error(f"[MEDIAPIPE] Failed to initialize MediaPipe: {e}")
            self._face_mesh = None

    def evaluate_crop(self, crop: np.ndarray) -> Dict[str, Any]:
        """Evaluate a face crop image using MediaPipe Face Landmarker.

        Returns structured dict with quality metrics, head pose angles, and acceptance status.
        """
        if crop is None or crop.size == 0:
            return {
                "landmark_detected": False,
                "face_width": 0,
                "face_height": 0,
                "head_yaw": 0.0,
                "head_pitch": 0.0,
                "head_roll": 0.0,
                "sharpness": 0.0,
                "brightness": 0.0,
                "overall_quality_score": 0.0,
                "is_acceptable": False,
                "rejection_reason": "invalid_crop",
            }

        h, w = crop.shape[:2]
        min_w = getattr(settings, "min_face_width", 40)
        min_h = getattr(settings, "min_face_height", 40)

        # 1. Face Size Check
        if w < min_w or h < min_h:
            logger.debug(f"[MEDIAPIPE] Crop rejected due to size: {w}x{h} < {min_w}x{min_h}")
            return {
                "landmark_detected": False,
                "face_width": w,
                "face_height": h,
                "head_yaw": 0.0,
                "head_pitch": 0.0,
                "head_roll": 0.0,
                "sharpness": 0.0,
                "brightness": 0.0,
                "overall_quality_score": 0.0,
                "is_acceptable": False,
                "rejection_reason": f"face_size_too_small_{w}x{h}",
            }

        # 2. Image Clarity (Sharpness & Brightness)
        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY) if len(crop.shape) == 3 else crop
        sharpness = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        brightness = float(np.mean(gray))

        # 3. MediaPipe 3D Landmark & Pose Extraction
        self._init_mediapipe()

        landmark_detected = False
        yaw, pitch, roll = 0.0, 0.0, 0.0

        if self._face_mesh is not None:
            rgb_crop = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
            results = self._face_mesh.process(rgb_crop)

            if results and results.multi_face_landmarks:
                landmarks = results.multi_face_landmarks[0].landmark
                landmark_detected = True
                yaw, pitch, roll = self._estimate_head_pose(landmarks, w, h)

        # 4. Pose Angle Limits
        max_yaw = getattr(settings, "max_yaw", 30.0)
        max_pitch = getattr(settings, "max_pitch", 25.0)
        max_roll = getattr(settings, "max_roll", 25.0)

        is_pose_acceptable = (
            abs(yaw) <= max_yaw and
            abs(pitch) <= max_pitch and
            abs(roll) <= max_roll
        )

        # 5. Composite Quality Score Calculation (0.0 to 1.0)
        # Size score (max at 120px)
        size_score = min(1.0, (w * h) / (120.0 * 120.0))
        # Sharpness score (normalized at 100.0)
        sharp_score = min(1.0, sharpness / 100.0)
        # Brightness score (ideal around 128)
        bright_score = 1.0 - abs(brightness - 128.0) / 128.0
        bright_score = max(0.0, min(1.0, bright_score))
        # Pose score (penalty for non-frontal angles)
        pose_penalty = (abs(yaw) / 45.0 + abs(pitch) / 35.0 + abs(roll) / 35.0) / 3.0
        pose_score = max(0.0, 1.0 - pose_penalty)
        # Landmark score
        lm_score = 1.0 if landmark_detected else 0.5

        overall_quality_score = round(
            0.30 * size_score +
            0.25 * sharp_score +
            0.25 * pose_score +
            0.10 * bright_score +
            0.10 * lm_score,
            3
        )

        rejection_reason = None
        if not is_pose_acceptable:
            rejection_reason = f"pose_angle_exceeded_y{yaw:.1f}_p{pitch:.1f}_r{roll:.1f}"
        elif overall_quality_score < getattr(settings, "min_track_quality", 0.70):
            rejection_reason = f"quality_below_threshold_{overall_quality_score:.2f}"

        is_acceptable = (rejection_reason is None)

        if is_acceptable:
            logger.info(
                f"[MEDIAPIPE] Track crop ACCEPTED: score={overall_quality_score:.2f} "
                f"yaw={yaw:.1f}° pitch={pitch:.1f}° roll={roll:.1f}° sharpness={sharpness:.1f}"
            )
        else:
            logger.info(f"[MEDIAPIPE] Track crop REJECTED: {rejection_reason}")

        return {
            "landmark_detected": landmark_detected,
            "face_width": w,
            "face_height": h,
            "head_yaw": round(yaw, 1),
            "head_pitch": round(pitch, 1),
            "head_roll": round(roll, 1),
            "sharpness": round(sharpness, 1),
            "brightness": round(brightness, 1),
            "overall_quality_score": overall_quality_score,
            "is_acceptable": is_acceptable,
            "rejection_reason": rejection_reason,
        }

    def _estimate_head_pose(self, landmarks, img_w: int, img_h: int):
        """Estimate 3D head pose (yaw, pitch, roll) from MediaPipe 468 landmarks."""
        try:
            # Key 2D facial landmark indices in MediaPipe Face Mesh
            # Nose tip: 1, Chin: 152, Left eye left corner: 33, Right eye right corner: 263, Left mouth corner: 61, Right mouth corner: 291
            image_points = np.array([
                (landmarks[1].x * img_w, landmarks[1].y * img_h),     # Nose tip
                (landmarks[152].x * img_w, landmarks[152].y * img_h), # Chin
                (landmarks[33].x * img_w, landmarks[33].y * img_h),   # Left eye left corner
                (landmarks[263].x * img_w, landmarks[263].y * img_h), # Right eye right corner
                (landmarks[61].x * img_w, landmarks[61].y * img_h),   # Left mouth corner
                (landmarks[291].x * img_w, landmarks[291].y * img_h), # Right mouth corner
            ], dtype=np.float64)

            # Generic 3D model points (in mm)
            model_points = np.array([
                (0.0, 0.0, 0.0),             # Nose tip
                (0.0, -330.0, -65.0),        # Chin
                (-225.0, 170.0, -135.0),     # Left eye left corner
                (225.0, 170.0, -135.0),      # Right eye right corner
                (-150.0, -150.0, -125.0),    # Left mouth corner
                (150.0, -150.0, -125.0)      # Right mouth corner
            ], dtype=np.float64)

            focal_length = img_w
            center = (img_w / 2.0, img_h / 2.0)
            camera_matrix = np.array([
                [focal_length, 0, center[0]],
                [0, focal_length, center[1]],
                [0, 0, 1]
            ], dtype=np.float64)

            dist_coeffs = np.zeros((4, 1))
            success, rotation_vector, _ = cv2.solvePnP(
                model_points, image_points, camera_matrix, dist_coeffs, flags=cv2.SOLVEPNP_ITERATIVE
            )

            if not success:
                return 0.0, 0.0, 0.0

            rmat, _ = cv2.Rodrigues(rotation_vector)
            angles, _, _, _, _, _ = cv2.RQDecomp3x3(rmat)

            pitch, yaw, roll = angles[0], angles[1], angles[2]
            return float(yaw), float(pitch), float(roll)
        except Exception:
            return 0.0, 0.0, 0.0


# Global singleton instance
mediapipe_face_quality_service = MediaPipeFaceQuality()
