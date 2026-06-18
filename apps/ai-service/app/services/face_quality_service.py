"""SmartCampus AI — Face Quality Filter Service.

Filters out small, blurry, dark, or extremely skewed faces.
Generates a quality score from 0 to 100.
Accepts only faces with a quality score of 70+.
"""

import math
import logging
import cv2
import numpy as np
from typing import Dict, Any, Tuple
from ..config.settings import settings

logger = logging.getLogger("smartcampus.quality")


class FaceQualityService:
    """Evaluates face crops for blur, brightness, size, and pose.

    Accepts only high-quality face captures (score >= 70).
    """

    def __init__(self):
        self.min_quality_score = settings.min_quality_score

    def estimate_pose_from_landmarks(self, landmarks: np.ndarray) -> Tuple[float, float, float]:
        """Estimate pitch, yaw, and roll from 5 facial landmarks as a fallback.

        Landmarks indices:
            0: Left eye
            1: Right eye
            2: Nose tip
            3: Mouth left corner
            4: Mouth right corner

        Returns:
            Tuple of (pitch, yaw, roll) in degrees
        """
        if landmarks is None or len(landmarks) < 5:
            return 0.0, 0.0, 0.0

        le = landmarks[0]  # Left eye
        re = landmarks[1]  # Right eye
        nt = landmarks[2]  # Nose tip
        ml = landmarks[3]  # Mouth left
        mr = landmarks[4]  # Mouth right

        # 1. Roll: angle between eyes
        dx_eyes = re[0] - le[0]
        dy_eyes = re[1] - le[1]
        roll = math.degrees(math.atan2(dy_eyes, dx_eyes))

        # 2. Yaw: nose deviation between eyes
        # Distance from nose to left eye vs distance from nose to right eye
        dist_l_eye = math.sqrt((nt[0] - le[0])**2 + (nt[1] - le[1])**2)
        dist_r_eye = math.sqrt((nt[0] - re[0])**2 + (nt[1] - re[1])**2)
        
        sum_eye_dist = dist_l_eye + dist_r_eye
        if sum_eye_dist > 0:
            ratio = dist_l_eye / sum_eye_dist
            # Shift center to 0.0 and map deviation to degrees (-90 to 90)
            yaw = (ratio - 0.5) * 90.0
        else:
            yaw = 0.0

        # 3. Pitch: vertical nose position relative to eyes-mouth height
        eye_center_y = (le[1] + re[1]) / 2.0
        mouth_center_y = (ml[1] + mr[1]) / 2.0
        total_height = mouth_center_y - eye_center_y

        if total_height > 0:
            nose_relative_y = nt[1] - eye_center_y
            # Nose usually lies at around 55% of the distance from eyes to mouth.
            ratio_pitch = nose_relative_y / total_height
            pitch = (ratio_pitch - 0.55) * 90.0
        else:
            pitch = 0.0

        return float(pitch), float(yaw), float(roll)

    def get_pose(self, face_obj: Any) -> Tuple[float, float, float]:
        """Extract pose (pitch, yaw, roll) from face object or landmarks."""
        # Check if pose attribute exists in raw face object
        if hasattr(face_obj, "pose") and face_obj.pose is not None:
            pose = face_obj.pose
            # InsightFace returns [pitch, yaw, roll]
            return float(pose[0]), float(pose[1]), float(pose[2])

        # If not present, fallback to estimation from landmarks
        if hasattr(face_obj, "landmark") and face_obj.landmark is not None:
            return self.estimate_pose_from_landmarks(face_obj.landmark)

        return 0.0, 0.0, 0.0

    def analyze_quality(self, face_crop: np.ndarray, raw_face: Any) -> Dict[str, Any]:
        """Assess quality metrics of a face crop.

        Args:
            face_crop: OpenCV BGR cropped face image
            raw_face: The raw face object from InsightFace

        Returns:
            Dict containing detailed scores and final quality_score
        """
        if face_crop is None or face_crop.size == 0:
            return {"score": 0.0, "is_acceptable": False}

        h, w = face_crop.shape[:2]
        
        # 1. Size Score: penalize tiny faces (min size 80x80)
        # Optimal size is 120x120 or larger
        if w < 80 or h < 80:
            size_score = 0.0
        else:
            size_score = min(100.0, (w * h) / (120 * 120) * 100.0)

        # 2. Blur Score: Laplacian variance
        gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
        lap_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        # Normal high-quality face should have lap_var >= 50.0
        blur_score = min(100.0, (lap_var / 80.0) * 100.0)

        # 3. Brightness Score: average intensity (ideal range: 90 - 170)
        mean_brightness = np.mean(gray)
        if mean_brightness < 50 or mean_brightness > 220:
            brightness_score = 0.0
        else:
            # Distance from center of ideal range (127)
            brightness_score = max(0.0, 100.0 - abs(mean_brightness - 127) * (100.0 / 127.0))

        # 4. Pose Score: penalize extreme head rotations
        pitch, yaw, roll = self.get_pose(raw_face)
        # Standardize yaw/pitch/roll. Anything above 45 degrees gets heavy penalty.
        max_angle = max(abs(pitch), abs(yaw), abs(roll))
        pose_score = max(0.0, 100.0 - (max_angle / 45.0) * 100.0)

        # Combine scores with weighting
        # Size (25%), Blur (35%), Brightness (20%), Pose (20%)
        overall_score = (
            size_score * 0.25 +
            blur_score * 0.35 +
            brightness_score * 0.20 +
            pose_score * 0.20
        )
        
        # Round score to 1 decimal place
        overall_score = round(float(overall_score), 1)
        
        is_acceptable = (
            overall_score >= self.min_quality_score and
            w >= 80 and h >= 80 and
            lap_var >= 40.0 and  # absolute minimum threshold for blur
            mean_brightness >= 50 and mean_brightness <= 220  # absolute brightness limits
        )

        return {
            "score": overall_score,
            "size_score": size_score,
            "blur_score": blur_score,
            "brightness_score": brightness_score,
            "pose_score": pose_score,
            "pose": {"pitch": round(pitch, 1), "yaw": round(yaw, 1), "roll": round(roll, 1)},
            "dimensions": {"width": w, "height": h},
            "is_acceptable": is_acceptable
        }


# Singleton instance
face_quality_service = FaceQualityService()
