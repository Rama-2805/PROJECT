import cv2
import numpy as np

class QualityAssessor:
    def __init__(self, min_blur=80.0, min_brightness=40.0, max_brightness=220.0, max_yaw=35.0):
        self.min_blur = min_blur
        self.min_brightness = min_brightness
        self.max_brightness = max_brightness
        self.max_yaw = max_yaw

    def evaluate_face(self, img: np.ndarray, bbox: tuple, pose: tuple = (0, 0, 0)) -> dict:
        if img is None or img.size == 0:
            return {"passed": False, "overall_quality": 0.0, "blur": 0.0, "brightness": 0.0}

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img
        blur_score = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        brightness = float(np.mean(gray))

        yaw = abs(pose[0]) if len(pose) > 0 else 0.0
        passed = (blur_score >= self.min_blur) and (self.min_brightness <= brightness <= self.max_brightness) and (yaw <= self.max_yaw)

        quality_score = min(1.0, (blur_score / 200.0) * 0.5 + (1.0 - yaw / 90.0) * 0.5)

        return {
            "passed": passed,
            "overall_quality": float(quality_score),
            "blur_score": blur_score,
            "brightness": brightness,
            "yaw": yaw,
        }
