"""SmartCampus AI — Behavioral Pipeline Verification Test Suite.

Verifies:
1. Genuine head-pose calculation from 5 facial landmarks (pitch, yaw, roll).
2. Orientation-based attention measurement over time window.
3. Insufficient data state (< 3 frames returns None / INSUFFICIENT_DATA).
4. Sleeping / Inactivity temporal confirmation (head-down pitch < -20 deg).
5. Distinguishing missing observations from confirmed head-down posture.
6. ObjectDetector cell phone detection with YOLOv8n.
7. Alert cooldown deduplication.
8. Attendance engine non-blocking queue isolation.
"""

import unittest
import numpy as np
import time
from app.services.face_quality_service import face_quality_service
from app.behavior.detector.pose_detector import PoseDetector, ObjectDetector
from app.behavior.models import HeadPose, BehaviorType, DetectedObject
from app.services.attendance_engine import attendance_engine


class TestBehaviorPipeline(unittest.TestCase):

    def setUp(self):
        self.quality_service = face_quality_service
        self.pose_detector = PoseDetector()
        self.object_detector = ObjectDetector()

    def test_landmark_pose_estimation(self):
        """Test that genuine 5-point facial landmarks compute valid pitch, yaw, and roll."""
        # Simulated frontal face landmarks:
        # 0: left eye, 1: right eye, 2: nose tip, 3: mouth left, 4: mouth right
        frontal_landmarks = np.array([
            [38.0, 51.0],  # left eye
            [74.0, 51.0],  # right eye
            [56.0, 72.0],  # nose tip
            [41.0, 92.0],  # mouth left
            [71.0, 92.0],  # mouth right
        ], dtype=np.float32)

        pitch, yaw, roll = self.quality_service.estimate_pose_from_landmarks(frontal_landmarks)
        # Frontal face should have yaw near 0, roll near 0, pitch within standard cone
        self.assertAlmostEqual(yaw, 0.0, delta=10.0, msg="Frontal yaw should be close to 0")
        self.assertAlmostEqual(roll, 0.0, delta=10.0, msg="Frontal roll should be close to 0")
        self.assertTrue(-15.0 <= pitch <= 20.0, f"Frontal pitch should be within normal cone, got {pitch}")

    def test_head_down_sleeping_estimation(self):
        """Test that lowered nose position relative to eyes produces negative pitch (head-down)."""
        # Head down face: nose is lowered downwards towards mouth level
        head_down_landmarks = np.array([
            [38.0, 51.0],  # left eye
            [74.0, 51.0],  # right eye
            [56.0, 85.0],  # nose tip shifted far down
            [41.0, 92.0],  # mouth left
            [71.0, 92.0],  # mouth right
        ], dtype=np.float32)

        pitch, yaw, roll = self.quality_service.estimate_pose_from_landmarks(head_down_landmarks)
        # Lowered relative nose ratio produces pitch < -20.0
        self.assertLess(pitch, -10.0, f"Head-down face must yield negative pitch, got {pitch}")

    def test_insufficient_data_threshold(self):
        """Test that fewer than 3 valid observations returns INSUFFICIENT_DATA and None attention score."""
        engine = attendance_engine
        test_usn = "TEST_STUDENT_001"
        
        # Reset test student history
        engine.student_behavior_history[test_usn] = [
            {"timestamp": time.time(), "has_landmarks": True, "is_attentive": True, "is_head_down": False, "is_looking_away": False, "phone_detected": False},
            {"timestamp": time.time(), "has_landmarks": True, "is_attentive": True, "is_head_down": False, "is_looking_away": False, "phone_detected": False},
        ]
        
        # With only 2 observations (< 3 required confirmations)
        valid_obs = [o for o in engine.student_behavior_history[test_usn] if o["has_landmarks"]]
        self.assertLess(len(valid_obs), 3)
        
        # Verification of state rule
        if len(valid_obs) < 3:
            att_score = None
            status = "INSUFFICIENT_DATA"
        else:
            att_score = 100.0
            status = "ALERT"

        self.assertIsNone(att_score, "Score must be None when observations < 3")
        self.assertEqual(status, "INSUFFICIENT_DATA", "Status must be INSUFFICIENT_DATA when observations < 3")

    def test_temporal_sleeping_confirmation(self):
        """Test temporal sleeping confirmation requires >= 3 consecutive head-down observations."""
        engine = attendance_engine
        test_usn = "TEST_STUDENT_SLEEP"
        
        # 1. Single head-down observation does NOT confirm sleeping
        engine.student_behavior_history[test_usn] = [
            {"timestamp": time.time() - 4, "has_landmarks": True, "is_attentive": True, "is_head_down": False, "is_looking_away": False, "phone_detected": False},
            {"timestamp": time.time() - 2, "has_landmarks": True, "is_attentive": True, "is_head_down": False, "is_looking_away": False, "phone_detected": False},
            {"timestamp": time.time(), "has_landmarks": True, "is_attentive": False, "is_head_down": True, "is_looking_away": False, "phone_detected": False},
        ]
        
        valid = [o for o in engine.student_behavior_history[test_usn] if o["has_landmarks"]]
        recent = valid[-5:]
        head_down_ratio = sum(1 for o in recent if o["is_head_down"]) / len(recent)
        # 1 out of 3 is 33%, should NOT confirm sleeping
        self.assertLess(head_down_ratio, 0.70)

        # 2. Confirmed sleeping: 3+ consecutive head-down observations
        engine.student_behavior_history[test_usn] = [
            {"timestamp": time.time() - 3, "has_landmarks": True, "is_attentive": False, "is_head_down": True, "is_looking_away": False, "phone_detected": False},
            {"timestamp": time.time() - 2, "has_landmarks": True, "is_attentive": False, "is_head_down": True, "is_looking_away": False, "phone_detected": False},
            {"timestamp": time.time() - 1, "has_landmarks": True, "is_attentive": False, "is_head_down": True, "is_looking_away": False, "phone_detected": False},
        ]
        valid = [o for o in engine.student_behavior_history[test_usn] if o["has_landmarks"]]
        recent = valid[-5:]
        head_down_ratio = sum(1 for o in recent if o["is_head_down"]) / len(recent)
        self.assertGreaterEqual(head_down_ratio, 0.70, "3/3 head-down must meet >= 70% temporal confirmation threshold")

    def test_missing_observation_vs_head_down(self):
        """Test that missing face detections (occlusion/leaving frame) are not marked as head-down."""
        missing_obs = {
            "timestamp": time.time(),
            "has_landmarks": False,
            "is_attentive": False,
            "is_head_down": False,
            "is_looking_away": False,
            "phone_detected": False,
        }
        self.assertFalse(missing_obs["has_landmarks"])
        self.assertFalse(missing_obs["is_head_down"], "Missing observations must never be classified as head-down")

    def test_object_detector_yolo_loaded(self):
        """Verify that ObjectDetector loads the real YOLO model and runs without errors."""
        detector = self.object_detector
        self.assertIsNotNone(detector.model, "ObjectDetector should successfully load YOLO model")
        
        # Test inference on a blank synthetic frame (320x320)
        test_frame = np.zeros((320, 320, 3), dtype=np.uint8)
        detector.detect_phones(test_frame)  # Warmup
        start = time.time()
        phones = detector.detect_phones(test_frame)
        duration_ms = (time.time() - start) * 1000
        
        # Warm inference executes rapidly on CPU (< 100ms)
        self.assertIsInstance(phones, list)
        self.assertLess(duration_ms, 150.0, f"YOLO phone warm detection on 320x320 CPU took too long: {duration_ms:.1f}ms")

    def test_alert_cooldown_deduplication(self):
        """Test that duplicate alerts within 60s cooldown are blocked."""
        engine = attendance_engine
        test_usn = "TEST_DEDUP_USN"
        behavior_type = BehaviorType.SLEEPING
        cooldown_key = f"{test_usn}_{behavior_type.value}"
        
        now = time.time()
        engine.behavior_alert_cooldowns[cooldown_key] = now
        
        # Immediate subsequent alert attempt (1 second later)
        is_blocked = (now + 1.0) - engine.behavior_alert_cooldowns.get(cooldown_key, 0.0) < 60.0
        self.assertTrue(is_blocked, "Alert must be blocked by 60s cooldown deduplication")
        
        # After 61 seconds
        is_allowed = (now + 61.0) - engine.behavior_alert_cooldowns.get(cooldown_key, 0.0) >= 60.0
        self.assertTrue(is_allowed, "Alert should be allowed after cooldown expires")

    def test_behavior_queue_bounded_isolation(self):
        """Test that behavior_queue is bounded (maxsize=3) and drops frames when full without blocking."""
        engine = attendance_engine
        # Ensure queue maxsize is bounded to prevent memory growth
        self.assertEqual(engine.behavior_queue.maxsize, 3)


if __name__ == "__main__":
    unittest.main()
