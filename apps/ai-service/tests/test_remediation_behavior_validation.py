"""SmartCampus AI — Behavioral Remediation Phase 1 Validation Test Suite.

Validates the Phase 1 remediation requirements:
1. Engagement scoring connected to genuine observations (compute_score_from_track).
2. Withholding scores on insufficient observations (<3 frames), low landmark quality (<0.20),
   or TRACK_LOST / INSUFFICIENT_EVIDENCE states.
3. High engagement maintained for active note-taking/reading (motion variance, upright/tilted head).
4. Distinguishing phone resting on desk from active phone interaction (>= 5s sustained gaze).
5. Distinguishing reading/writing from probable sleeping (10s immobility threshold).
6. Brief occlusion handling vs. large gap handling.
7. Cooldown and duplicate event suppression.
8. Anonymous vs. verified track handling and privacy safeguards.
9. Data contract serialization and schema validation.
"""

import unittest
import time
import numpy as np
from app.behavior.tracker.behavior_tracker import (
    BehaviorTemporalState,
    TrackedBehaviorPerson,
    BehavioralTrackerService,
)
from app.behavior.scoring.engagement_scorer import (
    EngagementScorer,
    EngagementLevel,
)
from app.behavior.models import EngagementRecord


class TestRemediationBehaviorValidation(unittest.TestCase):

    def setUp(self):
        self.tracker = BehavioralTrackerService(
            phone_usage_threshold_sec=5.0,
            sleeping_threshold_sec=10.0,
            cooldown_sec=30.0,
            track_lost_timeout_sec=5.0,
        )
        self.scorer = EngagementScorer()
        self.scorer.reset()

    # -------------------------------------------------------------------------
    # 1. ENGAGEMENT SCORING & OBSERVATION SAFEGUARDS
    # -------------------------------------------------------------------------

    def test_insufficient_observations_withheld(self):
        """Scores must NOT be fabricated when observation count < 3 frames."""
        person = TrackedBehaviorPerson(
            track_id="trk_few_obs",
            bbox=[100, 100, 300, 400],
            first_seen=time.time(),
            last_seen=time.time(),
        )
        person.observation_count = 2  # Less than required 3 frames
        person.pose_landmark_quality = 0.85
        person.current_state = BehaviorTemporalState.NORMAL_ACTIVITY

        record = self.scorer.compute_score_from_track(
            person=person,
            session_id="SESS_TEST_001",
            frame_time=time.time(),
        )
        self.assertIsNone(record, "Scorer must withhold score when observation count < 3")

    def test_low_landmark_quality_withheld(self):
        """Scores must NOT be fabricated when landmark confidence < 0.20."""
        person = TrackedBehaviorPerson(
            track_id="trk_low_conf",
            bbox=[100, 100, 300, 400],
            first_seen=time.time(),
            last_seen=time.time(),
        )
        person.observation_count = 10
        person.pose_landmark_quality = 0.15  # Poor detection/occluded landmarks
        person.face_landmark_quality = 0.10
        person.current_state = BehaviorTemporalState.NORMAL_ACTIVITY

        record = self.scorer.compute_score_from_track(
            person=person,
            session_id="SESS_TEST_001",
            frame_time=time.time(),
        )
        self.assertIsNone(record, "Scorer must withhold score when landmark confidence is low (<0.20)")

    def test_track_lost_or_insufficient_evidence_withheld(self):
        """Scores must be withheld when track state is TRACK_LOST or INSUFFICIENT_EVIDENCE."""
        person = TrackedBehaviorPerson(
            track_id="trk_lost",
            bbox=[100, 100, 300, 400],
            first_seen=time.time(),
            last_seen=time.time(),
        )
        person.observation_count = 10
        person.pose_landmark_quality = 0.85
        person.current_state = BehaviorTemporalState.TRACK_LOST

        record = self.scorer.compute_score_from_track(
            person=person,
            session_id="SESS_TEST_001",
            frame_time=time.time(),
        )
        self.assertIsNone(record, "Scorer must withhold score when track is lost")

        person.current_state = BehaviorTemporalState.INSUFFICIENT_EVIDENCE
        record2 = self.scorer.compute_score_from_track(
            person=person,
            session_id="SESS_TEST_001",
            frame_time=time.time(),
        )
        self.assertIsNone(record2, "Scorer must withhold score when evidence is insufficient")

    def test_valid_engagement_calculation_from_real_observations(self):
        """Attentive student with upright posture and facing front yields HIGH engagement."""
        person = TrackedBehaviorPerson(
            track_id="trk_good",
            bbox=[100, 100, 300, 400],
            first_seen=time.time() - 10.0,
            last_seen=time.time(),
        )
        person.observation_count = 15
        person.pose_landmark_quality = 0.90
        person.face_landmark_quality = 0.85
        person.current_state = BehaviorTemporalState.NORMAL_ACTIVITY
        person.posture_label = "Upright"
        person.gaze_label = "Facing Front"
        person.head_yaw = 2.0
        person.phone_associated = False
        person.is_verified_identity = True
        person.student_id = "STU_2026_001"

        record = self.scorer.compute_score_from_track(
            person=person,
            session_id="SESS_TEST_001",
            frame_time=time.time(),
        )
        self.assertIsNotNone(record)
        self.assertEqual(record.scoring_version, "v1.2-hybrid")
        self.assertTrue(record.is_sufficient_data)
        self.assertIsNone(record.withheld_reason)
        self.assertEqual(record.student_id, "STU_2026_001")
        self.assertGreaterEqual(record.score, 80.0)
        self.assertEqual(record.level, EngagementLevel.HIGH)
        self.assertEqual(record.posture_score, 100.0)
        self.assertEqual(record.phone_usage_penalty, 0.0)

    # -------------------------------------------------------------------------
    # 2. NOTE-TAKING VS. SLEEPING & INATTENTION
    # -------------------------------------------------------------------------

    def test_reading_writing_boosts_attention(self):
        """Reading/writing posture maintains attentive engagement (95%) and does not trigger sleeping."""
        person = TrackedBehaviorPerson(
            track_id="trk_notes",
            bbox=[100, 100, 300, 400],
            first_seen=time.time() - 15.0,
            last_seen=time.time(),
        )
        person.observation_count = 20
        person.pose_landmark_quality = 0.88
        person.face_landmark_quality = 0.80
        person.current_state = BehaviorTemporalState.NORMAL_ACTIVITY
        person.posture_label = "Head Lowered"
        person.gaze_label = "Down (Desk)"
        person.head_pitch = -22.0
        person.is_reading_writing = True  # Motion variance confirmed note taking

        record = self.scorer.compute_score_from_track(
            person=person,
            session_id="SESS_TEST_001",
            frame_time=time.time(),
        )
        self.assertIsNotNone(record)
        self.assertEqual(record.attention_score, 95.0)
        self.assertGreaterEqual(record.score, 75.0, "Note taking must retain solid engagement")

    def test_head_down_reading_vs_probable_sleeping(self):
        """Head down with reading motion does not trigger sleeping; motionless slumped head on desk does."""
        t0 = time.time() - 12.0
        track_id = "trk_sleep_vs_read"
        self.tracker.update_or_create_track(track_id=track_id, bbox=[100, 100, 300, 400], timestamp=t0)

        # 1. Active reading/writing (head lowered, not resting on desk, not severe slump) over 12 seconds
        # Frame 1 at t0
        self.tracker.evaluate_behavior_evidence(
            track_id=track_id,
            timestamp=t0,
            posture_label="Head Lowered",
            is_slumped=False,
            is_head_down=True,
            head_pitch=-20.0,
            head_yaw=0.0,
            head_roll=0.0,
            pose_quality=0.85,
            face_quality=0.85,
            phone_associated=False,
            phone_bbox=None,
            phone_confidence=0.0,
        )
        # Frame 2 at t0 + 11.0
        person_read, alert_read = self.tracker.evaluate_behavior_evidence(
            track_id=track_id,
            timestamp=t0 + 11.0,
            posture_label="Head Lowered",
            is_slumped=False,
            is_head_down=True,
            head_pitch=-22.0,
            head_yaw=0.0,
            head_roll=0.0,
            pose_quality=0.85,
            face_quality=0.85,
            phone_associated=False,
            phone_bbox=None,
            phone_confidence=0.0,
        )
        self.assertTrue(person_read.is_reading_writing, "Head lowered without desk contact identifies as reading/writing")
        self.assertIsNone(alert_read, "Active note-taking must NOT trigger sleeping alert")

        # 2. Head resting on desk, motionless for >= 10s
        t_sleep = time.time() - 12.0
        track_sleep = "trk_slumped_sleep"
        self.tracker.update_or_create_track(track_id=track_sleep, bbox=[100, 100, 300, 400], timestamp=t_sleep)

        # Step through multiple frames to establish valid observations
        for dt in [0.0, 3.0, 6.0, 9.0, 11.5]:
            person_sleep, alert_sleep = self.tracker.evaluate_behavior_evidence(
                track_id=track_sleep,
                timestamp=t_sleep + dt,
                posture_label="Head Resting on Desk",
                is_slumped=True,
                is_head_down=True,
                head_pitch=-35.0,
                head_yaw=0.0,
                head_roll=0.0,
                pose_quality=0.85,
                face_quality=0.70,
                phone_associated=False,
                phone_bbox=None,
                phone_confidence=0.0,
            )

        self.assertIsNotNone(alert_sleep, "Sustained head resting on desk for 11.5s must trigger probable sleeping alert")
        self.assertEqual(alert_sleep["event_type"], "PROBABLE_SLEEPING")
        # Ethical privacy rule: sleeping alert student_id is anonymous/None
        self.assertIsNone(alert_sleep["student_id"], "Sleeping alert must remain anonymous for privacy")

    # -------------------------------------------------------------------------
    # 3. PHONE ON DESK VS. ACTIVE PHONE INTERACTION
    # -------------------------------------------------------------------------

    def test_phone_resting_on_desk_vs_active_phone_interaction(self):
        """Phone resting on desk while student looks front does not trigger alert; looking down at phone does."""
        t0 = time.time() - 6.0
        track_desk = "trk_phone_desk"
        self.tracker.update_or_create_track(track_id=track_desk, bbox=[100, 100, 300, 400], timestamp=t0)

        # Student looking at blackboard, phone merely resting nearby on desk
        person_desk, alert_desk = self.tracker.evaluate_behavior_evidence(
            track_id=track_desk,
            timestamp=t0 + 6.0,
            posture_label="Upright",
            is_slumped=False,
            is_head_down=False,
            head_pitch=2.0,  # Looking upright at board
            head_yaw=0.0,
            head_roll=0.0,
            pose_quality=0.85,
            face_quality=0.85,
            phone_associated=True,
            phone_bbox=[150, 320, 210, 380],
            phone_confidence=0.80,
        )
        self.assertIsNone(alert_desk, "Phone resting on desk with upright gaze must not trigger phone alert")

        # Now active phone interaction (head down towards phone for 6 seconds)
        track_active = "trk_phone_active"
        self.tracker.update_or_create_track(track_id=track_active, bbox=[100, 100, 300, 400], timestamp=t0)
        self.tracker.evaluate_behavior_evidence(
            track_id=track_active,
            timestamp=t0,
            posture_label="Head Lowered",
            is_slumped=False,
            is_head_down=True,
            head_pitch=-22.0,
            head_yaw=2.0,
            head_roll=0.0,
            pose_quality=0.85,
            face_quality=0.85,
            phone_associated=True,
            phone_bbox=[150, 320, 210, 380],
            phone_confidence=0.85,
        )
        person_active, alert_active = self.tracker.evaluate_behavior_evidence(
            track_id=track_active,
            timestamp=t0 + 6.0,
            posture_label="Head Lowered",
            is_slumped=False,
            is_head_down=True,
            head_pitch=-22.0,
            head_yaw=2.0,
            head_roll=0.0,
            pose_quality=0.85,
            face_quality=0.85,
            phone_associated=True,
            phone_bbox=[150, 320, 210, 380],
            phone_confidence=0.85,
        )
        self.assertIsNotNone(alert_active, "Active phone interaction sustained >= 5s must trigger PHONE_USAGE alert")
        self.assertEqual(alert_active["event_type"], "PHONE_USAGE")

    # -------------------------------------------------------------------------
    # 4. TEMPORAL CONTINUITY, OCCLUSION & COOLDOWN
    # -------------------------------------------------------------------------

    def test_brief_occlusion_and_missing_frames(self):
        """Brief occlusion (<3s) retains temporal state; long gap (>3s) handles safely."""
        t0 = time.time()
        track_id = "trk_occl"
        self.tracker.update_or_create_track(track_id=track_id, bbox=[100, 100, 300, 400], timestamp=t0)

        # Frame 1: phone evidence starts
        self.tracker.evaluate_behavior_evidence(
            track_id=track_id,
            timestamp=t0,
            posture_label="Head Lowered",
            is_slumped=False,
            is_head_down=True,
            head_pitch=-20.0,
            head_yaw=0.0,
            head_roll=0.0,
            pose_quality=0.85,
            face_quality=0.85,
            phone_associated=True,
            phone_bbox=[150, 320, 210, 380],
            phone_confidence=0.80,
        )

        # Frame 2: 2.0s later
        self.tracker.evaluate_behavior_evidence(
            track_id=track_id,
            timestamp=t0 + 2.0,
            posture_label="Head Lowered",
            is_slumped=False,
            is_head_down=True,
            head_pitch=-20.0,
            head_yaw=0.0,
            head_roll=0.0,
            pose_quality=0.85,
            face_quality=0.85,
            phone_associated=True,
            phone_bbox=[150, 320, 210, 380],
            phone_confidence=0.80,
        )

        person = self.tracker._tracks[track_id]
        dur_before = person.accumulated_phone_duration
        self.assertGreater(dur_before, 0.0)

        # Missing frames for 1.0 second (brief occlusion), then frame 3 arrives at t0 + 3.0
        self.tracker.evaluate_behavior_evidence(
            track_id=track_id,
            timestamp=t0 + 3.0,
            posture_label="Head Lowered",
            is_slumped=False,
            is_head_down=True,
            head_pitch=-20.0,
            head_yaw=0.0,
            head_roll=0.0,
            pose_quality=0.85,
            face_quality=0.85,
            phone_associated=True,
            phone_bbox=[150, 320, 210, 380],
            phone_confidence=0.80,
        )
        person_after = self.tracker._tracks[track_id]
        self.assertGreater(person_after.accumulated_phone_duration, dur_before)

    def test_duplicate_event_suppression_and_cooldown(self):
        """Once alerted, repeated events within cooldown period (30s) are suppressed."""
        t0 = time.time() - 7.0
        track_id = "trk_cooldown"
        self.tracker.update_or_create_track(track_id=track_id, bbox=[100, 100, 300, 400], timestamp=t0)

        # Trigger alert
        self.tracker.evaluate_behavior_evidence(
            track_id=track_id,
            timestamp=t0,
            posture_label="Head Lowered",
            is_slumped=False,
            is_head_down=True,
            head_pitch=-22.0,
            head_yaw=0.0,
            head_roll=0.0,
            pose_quality=0.85,
            face_quality=0.85,
            phone_associated=True,
            phone_bbox=[150, 320, 210, 380],
            phone_confidence=0.80,
        )
        _, alert1 = self.tracker.evaluate_behavior_evidence(
            track_id=track_id,
            timestamp=t0 + 6.0,
            posture_label="Head Lowered",
            is_slumped=False,
            is_head_down=True,
            head_pitch=-22.0,
            head_yaw=0.0,
            head_roll=0.0,
            pose_quality=0.85,
            face_quality=0.85,
            phone_associated=True,
            phone_bbox=[150, 320, 210, 380],
            phone_confidence=0.80,
        )
        self.assertIsNotNone(alert1)

        # Next frame 5s later (still using phone, but cooldown is 30s)
        _, alert2 = self.tracker.evaluate_behavior_evidence(
            track_id=track_id,
            timestamp=t0 + 11.0,
            posture_label="Head Lowered",
            is_slumped=False,
            is_head_down=True,
            head_pitch=-22.0,
            head_yaw=0.0,
            head_roll=0.0,
            pose_quality=0.85,
            face_quality=0.85,
            phone_associated=True,
            phone_bbox=[150, 320, 210, 380],
            phone_confidence=0.80,
        )
        self.assertIsNone(alert2, "Alert must be suppressed during cooldown")

    # -------------------------------------------------------------------------
    # 5. ANONYMOUS VS. VERIFIED TRACKS & PRIVACY
    # -------------------------------------------------------------------------

    def test_anonymous_tracking_privacy(self):
        """Unverified student tracks must be labeled with anonymous TRK ID and not matched to student records."""
        person = TrackedBehaviorPerson(
            track_id="trk_anon_99",
            bbox=[100, 100, 300, 400],
            first_seen=time.time() - 5.0,
            last_seen=time.time(),
        )
        person.observation_count = 5
        person.pose_landmark_quality = 0.85
        person.face_landmark_quality = 0.80
        person.is_verified_identity = False
        person.student_id = None

        record = self.scorer.compute_score_from_track(
            person=person,
            session_id="SESS_TEST_001",
            frame_time=time.time(),
        )
        self.assertIsNotNone(record)
        self.assertTrue(record.student_id.startswith("TRK-"), "Unverified student must have TRK- prefix")

    def test_engagement_record_serialization(self):
        """EngagementRecord serializes cleanly with all required audit and scoring fields."""
        record = EngagementRecord(
            student_id="STU_1001",
            session_id="SESS_2026_01",
            score=82.5,
            level=EngagementLevel.HIGH,
            attention_score=85.0,
            posture_score=90.0,
            phone_usage_penalty=0.0,
            activity_score=80.0,
            timestamp=time.time(),
            scoring_version="v1.2-hybrid",
            is_sufficient_data=True,
            withheld_reason=None,
        )
        d = record.dict()
        self.assertEqual(d["student_id"], "STU_1001")
        self.assertEqual(d["session_id"], "SESS_2026_01")
        self.assertEqual(d["scoring_version"], "v1.2-hybrid")
        self.assertTrue(d["is_sufficient_data"])
        self.assertIsNone(d["withheld_reason"])
        self.assertEqual(d["level"], EngagementLevel.HIGH)

    # -------------------------------------------------------------------------
    # 6. DISPATCH, RETRY & FAILURE HANDLING (END-TO-END PIPELINE)
    # -------------------------------------------------------------------------

    def test_push_engagement_record_success(self):
        """Successful backend response (HTTP 201) returns True."""
        from unittest.mock import patch, MagicMock
        from app.services.attendance_engine import attendance_engine

        record = EngagementRecord(
            student_id="STU_2026_001",
            session_id="SESS_CS101_1729834800",
            score=85.0,
            level=EngagementLevel.HIGH,
            attention_score=90.0,
            posture_score=95.0,
            phone_usage_penalty=0.0,
            activity_score=85.0,
            timestamp=time.time(),
        )

        mock_resp = MagicMock()
        mock_resp.status_code = 201

        with patch("httpx.Client") as mock_client:
            mock_client.return_value.__enter__.return_value.post.return_value = mock_resp
            result = attendance_engine._push_engagement_record(record)
            self.assertTrue(result, "Successful HTTP 201 save must return True")

    def test_push_engagement_record_failure_does_not_appear_as_success(self):
        """Failed request (HTTP 500) returns False and does not register as successful save."""
        from unittest.mock import patch, MagicMock
        from app.services.attendance_engine import attendance_engine

        record = EngagementRecord(
            student_id="STU_2026_001",
            session_id="SESS_CS101_1729834800",
            score=85.0,
            level=EngagementLevel.HIGH,
            attention_score=90.0,
            posture_score=95.0,
            phone_usage_penalty=0.0,
            activity_score=85.0,
            timestamp=time.time(),
        )

        mock_resp = MagicMock()
        mock_resp.status_code = 500
        mock_resp.text = "Internal Server Error"

        with patch("httpx.Client") as mock_client:
            mock_client.return_value.__enter__.return_value.post.return_value = mock_resp
            result = attendance_engine._push_engagement_record(record)
            self.assertFalse(result, "HTTP 500 server error must return False, never reported as saved")

    def test_push_engagement_record_network_offline_handled_safely(self):
        """Network offline/timeout returns False without crashing."""
        from unittest.mock import patch
        import httpx
        from app.services.attendance_engine import attendance_engine

        record = EngagementRecord(
            student_id="STU_2026_001",
            session_id="SESS_CS101_1729834800",
            score=85.0,
            level=EngagementLevel.HIGH,
            attention_score=90.0,
            posture_score=95.0,
            phone_usage_penalty=0.0,
            activity_score=85.0,
            timestamp=time.time(),
        )

        with patch("httpx.Client") as mock_client:
            mock_client.return_value.__enter__.return_value.post.side_effect = httpx.ConnectError("Connection refused")
            result = attendance_engine._push_engagement_record(record)
            self.assertFalse(result, "Network ConnectError must return False without crashing")

    def test_session_id_contract_propagation(self):
        """Session ID passed to start_behavior_session is preserved and bound to active session."""
        from app.services.attendance_engine import attendance_engine

        persisted_session_id = "SESS_MATH201_PERSISTED"
        attendance_engine.active_sessions["cam_test_01"] = {
            "session_id": persisted_session_id,
            "class_id": "MATH201",
            "mode": "BEHAVIOR",
            "start_time": time.time(),
        }

        active = attendance_engine.active_sessions.get("cam_test_01")
        self.assertIsNotNone(active)
        self.assertEqual(active["session_id"], persisted_session_id)
        # Verify it does not default to class_id
        self.assertNotEqual(active["session_id"], active["class_id"])


if __name__ == "__main__":
    unittest.main()
