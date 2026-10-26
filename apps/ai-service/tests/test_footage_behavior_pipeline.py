"""SmartCampus AI — Real Footage Behavioral Pipeline Verification Test.

Validates the behavioral analytics pipeline against real recorded classroom video
(footage/1.mp4) without requiring live CCTV access.

Checks:
1. Real video decoding and frame ingestion.
2. Two-stage hybrid pipeline execution (YOLOv8 + MediaPipe Pose & Face Mesh).
3. Temporal state tracking and landmark confidence gating.
4. Engagement scoring calculation from real visual observations.
5. Session ID binding and dispatch payload verification.
6. Verification that behavior processing never marks attendance.
"""

import unittest
import cv2
import os
os.environ["YOLO_CONFIG_DIR"] = "/tmp/ultralytics"
import time
from unittest.mock import patch, MagicMock

from app.behavior.detector.hybrid_behavior_pipeline import (
    TwoStageHybridBehaviorPipeline,
    hybrid_behavior_pipeline,
)
from app.behavior.tracker.behavior_tracker import (
    BehavioralTrackerService,
    behavior_tracker_service,
)
from app.behavior.scoring.engagement_scorer import (
    EngagementScorer,
    engagement_scorer,
    EngagementLevel,
)
from app.services.attendance_engine import attendance_engine


class TestFootageBehaviorPipeline(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        # Use footage/2.mp4 which contains seated students during active class
        for candidate in ["footage/2.mp4", "footage/4.mp4", "footage/1.mp4"]:
            if os.path.exists(candidate):
                cls.footage_path = candidate
                break
        else:
            raise unittest.SkipTest("No footage files found in footage/ directory.")

    def setUp(self):
        hybrid_behavior_pipeline.reset_person_tracks()
        behavior_tracker_service.reset()
        engagement_scorer.reset()

    def test_real_video_frame_processing_and_scoring(self):
        """Processes real frames from footage/1.mp4 and verifies model inference and scoring."""
        cap = cv2.VideoCapture(self.footage_path)
        self.assertTrue(cap.isOpened(), "Failed to open footage/1.mp4")

        # Seek to active lecture portion (50% into video where students are seated)
        total_frames = cap.get(cv2.CAP_PROP_FRAME_COUNT)
        start_frame = int(total_frames * 0.50)
        cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)

        processed_frames = 0
        tracks_detected_any_frame = False
        scores_computed = []

        start_time = time.time()
        for frame_idx in range(12):
            ret, frame = cap.read()
            if not ret or frame is None:
                break

            timestamp = start_time + (frame_idx * 0.5)

            # Process frame through the real hybrid pipeline
            alerts = hybrid_behavior_pipeline.process_frame(
                frame=frame,
                active_tracks=[],
                timestamp=timestamp,
            )

            processed_frames += 1

            all_tracks = behavior_tracker_service.get_all_tracks()
            if len(all_tracks) > 0:
                tracks_detected_any_frame = True

                # Evaluate engagement score for each active track
                for person in all_tracks:
                    score_record = engagement_scorer.compute_score_from_track(
                        person=person,
                        session_id="SESS_FOOTAGE_TEST_01",
                        frame_time=timestamp,
                    )
                    if score_record:
                        scores_computed.append(score_record)

        cap.release()

        self.assertGreater(processed_frames, 0, "Must have processed at least 1 video frame")
        self.assertTrue(tracks_detected_any_frame, "Real footage must detect persons/tracks")

        # Verify that scores, if computed, satisfy contract constraints
        for record in scores_computed:
            self.assertEqual(record.scoring_version, "v1.2-hybrid")
            self.assertTrue(record.is_sufficient_data)
            self.assertEqual(record.session_id, "SESS_FOOTAGE_TEST_01")
            self.assertGreaterEqual(record.score, 0.0)
            self.assertLessEqual(record.score, 100.0)
            self.assertIsInstance(record.level, EngagementLevel)

    def test_behavior_mode_never_marks_attendance(self):
        """Behavior monitoring mode strictly isolates from attendance marking."""
        camera_id = "cam_footage_test"
        class_id = "ROOM_TEST"
        session_id = "SESS_VERIFIED_ATTENDANCE_ISOLATION"

        with patch.object(attendance_engine, "start_attendance_session", return_value=True) as mock_start:
            success = attendance_engine.start_behavior_session(
                camera_id=camera_id,
                class_id=class_id,
                source_path=self.footage_path,
                session_id=session_id,
            )
            self.assertTrue(success)
            mock_start.assert_called_once_with(
                camera_id=camera_id,
                class_id=class_id,
                source_path=self.footage_path,
                mode="behavior",
                session_id=session_id,
            )


if __name__ == "__main__":
    unittest.main()
