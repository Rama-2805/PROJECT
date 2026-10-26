"""SmartCampus AI — Two-Stage Hybrid Behavioral Monitoring Pipeline Test Suite.

Validates Section 9 Testing and Validation requirements:
PHONE USAGE:
1. Phone detected and sustained supporting head-orientation evidence (>=5s) triggers alert.
2. Phone resting on a desk (upright head / distant) does not trigger alert.
3. Student looking down without a detected phone does not trigger phone-use alert.
4. Phone visible but person association uncertain (distance > threshold) does not associate.
5. Phone temporarily occluded preserves temporal state within window.
6. Person track lost transitions correctly.
7. Brief phone appearance shorter than threshold (<5s) does not alert.
8. Continuous behavior does not generate duplicate alerts (cooldown).

SLEEPING:
1. Sustained sleeping-like posture beyond 10 seconds triggers "Possible sleeping posture".
2. Brief head movement (<10s) does not trigger alert.
3. Student leaning forward temporarily resets when returning to normal.
4. Head resting on desk / slumped posture detected.
5. Pose landmarks unavailable handled gracefully (INSUFFICIENT_VISUAL_EVIDENCE).
6. Occlusion / low-resolution footage handled safely.
7. Posture returns to normal resets evidence.
8. Track lost and reacquired handled safely.

APPLICATION:
1. Attendance and behavioral modes remain strictly separate.
2. Behavioral alerts never mark attendance.
3. Overlays are decoupled.
"""

import unittest
import numpy as np
import time
from app.behavior.tracker.behavior_tracker import (
    BehaviorTemporalState,
    TrackedBehaviorPerson,
    BehavioralTrackerService,
)
from app.behavior.detector.hybrid_behavior_pipeline import (
    TwoStageHybridBehaviorPipeline,
    hybrid_behavior_pipeline,
)
from app.services.attendance_engine import attendance_engine


class TestTwoStageHybridBehaviorPipeline(unittest.TestCase):

    def setUp(self):
        # Create fresh tracker service with standard thresholds
        self.tracker = BehavioralTrackerService(
            phone_usage_threshold_sec=5.0,
            sleeping_threshold_sec=10.0,
            cooldown_sec=30.0,
            track_lost_timeout_sec=5.0,
        )
        self.pipeline = hybrid_behavior_pipeline

    # -------------------------------------------------------------
    # PHONE USAGE TEST CASES (1 to 8)
    # -------------------------------------------------------------

    def test_phone_case_1_sustained_evidence_triggers_alert(self):
        """Case 1: Phone detected and sustained supporting head-down evidence (>= 5s) triggers alert."""
        track_id = "trk_phone_01"
        t0 = time.time() - 6.0  # started 6 seconds ago

        # Initialize track
        self.tracker.update_or_create_track(
            track_id=track_id,
            bbox=[100, 100, 300, 400],
            timestamp=t0,
        )

        # Frame 1 at t0: looking down towards phone
        person, alert1 = self.tracker.evaluate_behavior_evidence(
            track_id=track_id,
            timestamp=t0,
            posture_label="Upright",
            is_slumped=False,
            is_head_down=True,
            head_pitch=-22.0,  # Looking down
            head_yaw=4.0,
            head_roll=0.0,
            pose_quality=0.85,
            face_quality=0.85,
            phone_associated=True,
            phone_bbox=[180, 280, 240, 350],
            phone_confidence=0.88,
        )
        self.assertEqual(person.current_state, BehaviorTemporalState.OBSERVING_PHONE)
        self.assertIsNone(alert1, "No alert on initial observation")

        # Frame 2 at t0 + 6.0s (>= 5.0s sustained threshold)
        person, alert2 = self.tracker.evaluate_behavior_evidence(
            track_id=track_id,
            timestamp=t0 + 6.0,
            posture_label="Upright",
            is_slumped=False,
            is_head_down=True,
            head_pitch=-22.0,
            head_yaw=4.0,
            head_roll=0.0,
            pose_quality=0.85,
            face_quality=0.85,
            phone_associated=True,
            phone_bbox=[180, 280, 240, 350],
            phone_confidence=0.88,
        )
        self.assertIsNotNone(alert2, "Alert must be generated after 6s sustained evidence")
        self.assertEqual(alert2["event_type"], "PHONE_USAGE")
        self.assertGreaterEqual(alert2["duration"], 5.0)
        self.assertIn("Phone", alert2["title"])

    def test_phone_case_2_phone_resting_on_desk_no_alert(self):
        """Case 2: Phone resting on desk (student looking straight ahead at board) does not alert."""
        track_id = "trk_phone_02"
        t0 = time.time() - 8.0

        self.tracker.update_or_create_track(track_id, [100, 100, 300, 400], t0)

        # Student is looking straight forward (pitch = 2.0, yaw = 0.0)
        last_alert = None
        for step in range(5):
            _, last_alert = self.tracker.evaluate_behavior_evidence(
                track_id=track_id,
                timestamp=t0 + (step * 2.0),
                posture_label="Upright",
                is_slumped=False,
                is_head_down=False,
                head_pitch=2.0,   # Upright, looking ahead
                head_yaw=0.0,
                head_roll=0.0,
                pose_quality=0.85,
                face_quality=0.85,
                phone_associated=True,
                phone_bbox=[120, 350, 160, 400],
                phone_confidence=0.85,
            )

        self.assertIsNone(last_alert, "Resting phone with upright gaze must not generate alert")
        person = self.tracker.get_track(track_id)
        self.assertNotEqual(person.current_state, BehaviorTemporalState.ALERTED)

    def test_phone_case_3_looking_down_without_phone_no_phone_alert(self):
        """Case 3: Student looking down (reading a book / writing) without detected phone."""
        track_id = "trk_phone_03"
        t0 = time.time() - 7.0
        self.tracker.update_or_create_track(track_id, [100, 100, 300, 400], t0)

        last_alert = None
        for step in range(5):
            _, last_alert = self.tracker.evaluate_behavior_evidence(
                track_id=track_id,
                timestamp=t0 + (step * 1.5),
                posture_label="Head Lowered",
                is_slumped=False,
                is_head_down=True,
                head_pitch=-20.0,  # Looking down at notebook
                head_yaw=0.0,
                head_roll=0.0,
                pose_quality=0.85,
                face_quality=0.85,
                phone_associated=False,  # NO phone detected
                phone_bbox=None,
                phone_confidence=0.0,
            )

        self.assertTrue(last_alert is None or last_alert.get("event_type") != "PHONE_USAGE",
                        "Looking down without phone must never trigger PHONE_USAGE alert")

    def test_phone_case_4_phone_visible_but_unassociated_distant(self):
        """Case 4: Phone visible across room but distance exceeds association threshold."""
        person_bbox = [100, 100, 200, 300]
        distant_phone = [{"bbox": [700, 700, 750, 800], "confidence": 0.88, "class_name": "cell phone"}]

        assoc, phone_obj, dist = self.pipeline.associate_phone_with_person(person_bbox, distant_phone)
        self.assertFalse(assoc, "Distant phone must not be associated with student")
        self.assertIsNone(phone_obj)

    def test_phone_case_5_phone_temporarily_occluded_preserves_temporal_state(self):
        """Case 5: Phone temporarily occluded for 1-2 frames preserves accumulated evidence."""
        track_id = "trk_phone_05"
        t0 = time.time() - 6.0
        self.tracker.update_or_create_track(track_id, [100, 100, 300, 400], t0)

        # Frame 1 at t0: Phone visible + looking down
        self.tracker.evaluate_behavior_evidence(
            track_id=track_id,
            timestamp=t0,
            posture_label="Upright",
            is_slumped=False,
            is_head_down=True,
            head_pitch=-25.0,
            head_yaw=0.0,
            head_roll=0.0,
            pose_quality=0.85,
            face_quality=0.85,
            phone_associated=True,
            phone_bbox=[150, 250, 200, 320],
            phone_confidence=0.9,
        )

        # Frame 1b at t0 + 3.0s: Continues looking at phone (accumulates 3.0s)
        self.tracker.evaluate_behavior_evidence(
            track_id=track_id,
            timestamp=t0 + 3.0,
            posture_label="Upright",
            is_slumped=False,
            is_head_down=True,
            head_pitch=-25.0,
            head_yaw=0.0,
            head_roll=0.0,
            pose_quality=0.85,
            face_quality=0.85,
            phone_associated=True,
            phone_bbox=[150, 250, 200, 320],
            phone_confidence=0.9,
        )

        # Frame 2 at t0 + 4.0s: Phone occluded briefly (phone_associated=False)
        self.tracker.evaluate_behavior_evidence(
            track_id=track_id,
            timestamp=t0 + 4.0,
            posture_label="Upright",
            is_slumped=False,
            is_head_down=True,
            head_pitch=-25.0,
            head_yaw=0.0,
            head_roll=0.0,
            pose_quality=0.85,
            face_quality=0.85,
            phone_associated=False,  # Occlusion
            phone_bbox=None,
            phone_confidence=0.0,
        )

        person = self.tracker.get_track(track_id)
        # Phone evidence should not be completely wiped out to 0 on a single occluded frame
        self.assertGreater(person.accumulated_phone_duration, 0.0)

    def test_phone_case_6_person_track_lost_transitions_state(self):
        """Case 6: Person track lost for longer than timeout transitions to TRACK_LOST and prunes."""
        track_id = "trk_phone_06"
        t0 = time.time() - 35.0

        self.tracker.update_or_create_track(track_id, [100, 100, 300, 400], t0)

        # Prune tracks at current time (> track_timeout_sec and > 30s)
        self.tracker.prune_stale_tracks(current_time=time.time())
        person = self.tracker.get_track(track_id)
        self.assertIsNone(person, "Stale track should be pruned cleanly from memory")

    def test_phone_case_7_brief_phone_appearance_shorter_than_threshold_no_alert(self):
        """Case 7: Brief glance at phone (2.5s < 5.0s threshold) generates NO alert."""
        track_id = "trk_phone_07"
        t0 = time.time() - 2.5
        self.tracker.update_or_create_track(track_id, [100, 100, 300, 400], t0)

        # 2.5 seconds observation
        self.tracker.evaluate_behavior_evidence(
            track_id=track_id,
            timestamp=t0,
            posture_label="Upright",
            is_slumped=False,
            is_head_down=True,
            head_pitch=-25.0,
            head_yaw=0.0,
            head_roll=0.0,
            pose_quality=0.85,
            face_quality=0.85,
            phone_associated=True,
            phone_bbox=[150, 250, 200, 320],
            phone_confidence=0.9,
        )

        person, alert = self.tracker.evaluate_behavior_evidence(
            track_id=track_id,
            timestamp=t0 + 2.5,
            posture_label="Upright",
            is_slumped=False,
            is_head_down=True,
            head_pitch=-25.0,
            head_yaw=0.0,
            head_roll=0.0,
            pose_quality=0.85,
            face_quality=0.85,
            phone_associated=True,
            phone_bbox=[150, 250, 200, 320],
            phone_confidence=0.9,
        )

        self.assertIsNone(alert, "Brief 2.5s appearance must not trigger alert")
        self.assertIn(person.current_state, [
            BehaviorTemporalState.OBSERVING_PHONE,
            BehaviorTemporalState.POSSIBLE_PHONE_USAGE,
        ])

    def test_phone_case_8_continuous_behavior_does_not_generate_duplicate_alerts(self):
        """Case 8: Continuous phone usage generates exactly ONE alert (cooldown)."""
        track_id = "trk_phone_08"
        t0 = time.time() - 20.0
        self.tracker.update_or_create_track(track_id, [100, 100, 300, 400], t0)

        # Initial trigger at t0 + 6s
        self.tracker.evaluate_behavior_evidence(
            track_id=track_id,
            timestamp=t0,
            posture_label="Upright",
            is_slumped=False,
            is_head_down=True,
            head_pitch=-25.0,
            head_yaw=0.0,
            head_roll=0.0,
            pose_quality=0.85,
            face_quality=0.85,
            phone_associated=True,
            phone_bbox=[150, 250, 200, 320],
            phone_confidence=0.9,
        )

        _, alert1 = self.tracker.evaluate_behavior_evidence(
            track_id=track_id,
            timestamp=t0 + 6.0,
            posture_label="Upright",
            is_slumped=False,
            is_head_down=True,
            head_pitch=-25.0,
            head_yaw=0.0,
            head_roll=0.0,
            pose_quality=0.85,
            face_quality=0.85,
            phone_associated=True,
            phone_bbox=[150, 250, 200, 320],
            phone_confidence=0.9,
        )
        self.assertIsNotNone(alert1, "First alert should trigger at 6s")

        # Subsequent frames within cooldown (7s, 8s, 9s, 10s...)
        subsequent_alerts = 0
        for sec in range(7, 15):
            _, sub_alert = self.tracker.evaluate_behavior_evidence(
                track_id=track_id,
                timestamp=t0 + sec,
                posture_label="Upright",
                is_slumped=False,
                is_head_down=True,
                head_pitch=-25.0,
                head_yaw=0.0,
                head_roll=0.0,
                pose_quality=0.85,
                face_quality=0.85,
                phone_associated=True,
                phone_bbox=[150, 250, 200, 320],
                phone_confidence=0.9,
            )
            if sub_alert is not None:
                subsequent_alerts += 1

        self.assertEqual(subsequent_alerts, 0, "No duplicate alert spam allowed during continuous behavior")

    # -------------------------------------------------------------
    # SLEEPING TEST CASES (1 to 8)
    # -------------------------------------------------------------

    def test_sleep_case_1_sustained_posture_beyond_10s_triggers_alert(self):
        """Case 1: Sustained sleeping-like posture beyond 10 seconds triggers 'Possible sleeping posture'."""
        track_id = "trk_sleep_01"
        t0 = time.time() - 12.0
        self.tracker.update_or_create_track(track_id, [100, 100, 300, 400], t0)

        self.tracker.evaluate_behavior_evidence(
            track_id=track_id,
            timestamp=t0,
            posture_label="Slumped",
            is_slumped=True,
            is_head_down=True,
            head_pitch=-25.0,
            head_yaw=0.0,
            head_roll=0.0,
            pose_quality=0.85,
            face_quality=0.85,
            phone_associated=False,
            phone_bbox=None,
            phone_confidence=0.0,
        )

        _, alert = self.tracker.evaluate_behavior_evidence(
            track_id=track_id,
            timestamp=t0 + 11.0,
            posture_label="Slumped",
            is_slumped=True,
            is_head_down=True,
            head_pitch=-25.0,
            head_yaw=0.0,
            head_roll=0.0,
            pose_quality=0.85,
            face_quality=0.85,
            phone_associated=False,
            phone_bbox=None,
            phone_confidence=0.0,
        )
        self.assertIsNotNone(alert, "Sleeping alert must trigger after 11s")
        self.assertIn(alert["event_type"], ["PROBABLE_SLEEPING", "POSSIBLE_SLEEPING_POSTURE"])
        self.assertTrue("Sleeping" in alert["title"] or "sleeping" in alert["title"])
        self.assertGreaterEqual(alert["duration"], 10.0)

    def test_sleep_case_2_brief_head_movement_no_alert(self):
        """Case 2: Brief head dip (< 10s) does not trigger sleeping alert."""
        track_id = "trk_sleep_02"
        t0 = time.time() - 3.0
        self.tracker.update_or_create_track(track_id, [100, 100, 300, 400], t0)

        self.tracker.evaluate_behavior_evidence(
            track_id=track_id,
            timestamp=t0,
            posture_label="Slumped",
            is_slumped=True,
            is_head_down=True,
            head_pitch=-25.0,
            head_yaw=0.0,
            head_roll=0.0,
            pose_quality=0.85,
            face_quality=0.85,
            phone_associated=False,
            phone_bbox=None,
            phone_confidence=0.0,
        )

        _, alert = self.tracker.evaluate_behavior_evidence(
            track_id=track_id,
            timestamp=t0 + 3.0,
            posture_label="Slumped",
            is_slumped=True,
            is_head_down=True,
            head_pitch=-25.0,
            head_yaw=0.0,
            head_roll=0.0,
            pose_quality=0.85,
            face_quality=0.85,
            phone_associated=False,
            phone_bbox=None,
            phone_confidence=0.0,
        )
        self.assertIsNone(alert, "Brief 3s movement must not trigger sleeping alert")

    def test_sleep_case_3_student_leaning_forward_temporarily_resets(self):
        """Case 3: Student leans forward for 4s then sits upright -> evidence resets."""
        track_id = "trk_sleep_03"
        t0 = time.time() - 6.0
        self.tracker.update_or_create_track(track_id, [100, 100, 300, 400], t0)

        # Slumped for 4s
        self.tracker.evaluate_behavior_evidence(
            track_id=track_id,
            timestamp=t0,
            posture_label="Slumped",
            is_slumped=True,
            is_head_down=True,
            head_pitch=-25.0,
            head_yaw=0.0,
            head_roll=0.0,
            pose_quality=0.85,
            face_quality=0.85,
            phone_associated=False,
            phone_bbox=None,
            phone_confidence=0.0,
        )

        # Sits upright at t0 + 4s
        person, _ = self.tracker.evaluate_behavior_evidence(
            track_id=track_id,
            timestamp=t0 + 4.0,
            posture_label="Upright",
            is_slumped=False,  # Upright!
            is_head_down=False,
            head_pitch=2.0,
            head_yaw=0.0,
            head_roll=0.0,
            pose_quality=0.85,
            face_quality=0.85,
            phone_associated=False,
            phone_bbox=None,
            phone_confidence=0.0,
        )

        self.assertEqual(person.current_state, BehaviorTemporalState.NORMAL)
        self.assertEqual(person.accumulated_sleeping_duration, 0.0, "Evidence must reset when upright")

    def test_sleep_case_4_head_resting_on_desk_slumped(self):
        """Case 4: Head resting on desk / slumped posture detected."""
        mock_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        # Crop where height < width (resting on desk: h=60, w=120, aspect=0.5 < 0.8)
        label, is_slumped, is_head_down, q = self.pipeline.analyze_pose_and_posture(mock_frame, [100, 100, 220, 160])
        self.assertEqual(label, "Head Resting on Desk")
        self.assertTrue(is_slumped)
        self.assertTrue(is_head_down)

    def test_sleep_case_5_pose_landmarks_unavailable_handled_gracefully(self):
        """Case 5: Pose landmarks unavailable yields INSUFFICIENT_VISUAL_EVIDENCE, not false alert."""
        track_id = "trk_sleep_05"
        t0 = time.time() - 15.0
        self.tracker.update_or_create_track(track_id, [100, 100, 300, 400], t0)

        person, alert = self.tracker.evaluate_behavior_evidence(
            track_id=track_id,
            timestamp=t0 + 15.0,
            posture_label="Unknown",
            is_slumped=False,
            is_head_down=False,
            head_pitch=0.0,
            head_yaw=0.0,
            head_roll=0.0,
            pose_quality=0.05,  # Unreliable
            face_quality=0.05,  # Unreliable
            phone_associated=False,
            phone_bbox=None,
            phone_confidence=0.0,
        )

        self.assertIsNone(alert)
        self.assertEqual(person.current_state, BehaviorTemporalState.INSUFFICIENT_VISUAL_EVIDENCE)

    def test_sleep_case_6_occlusion_low_res_handled_safely(self):
        """Case 6: Occluded student with low quality landmarks handled safely."""
        track_id = "trk_sleep_06"
        t0 = time.time()
        self.tracker.update_or_create_track(track_id, [100, 100, 120, 125], t0)

        person, alert = self.tracker.evaluate_behavior_evidence(
            track_id=track_id,
            timestamp=t0,
            posture_label="Unknown",
            is_slumped=False,
            is_head_down=False,
            head_pitch=0.0,
            head_yaw=0.0,
            head_roll=0.0,
            pose_quality=0.10,
            face_quality=0.10,
            phone_associated=False,
            phone_bbox=None,
            phone_confidence=0.0,
        )
        self.assertIsNone(alert)
        self.assertEqual(person.current_state, BehaviorTemporalState.INSUFFICIENT_VISUAL_EVIDENCE)

    def test_sleep_case_7_posture_returns_to_normal_resets_evidence(self):
        """Case 7: Posture returns to normal -> state returns to NORMAL."""
        track_id = "trk_sleep_07"
        t0 = time.time() - 5.0
        self.tracker.update_or_create_track(track_id, [100, 100, 300, 400], t0)

        self.tracker.evaluate_behavior_evidence(
            track_id=track_id,
            timestamp=t0,
            posture_label="Slumped",
            is_slumped=True,
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
        person = self.tracker.get_track(track_id)
        self.assertEqual(person.current_state, BehaviorTemporalState.OBSERVING_POSTURE)

        # Returns to upright
        person, _ = self.tracker.evaluate_behavior_evidence(
            track_id=track_id,
            timestamp=t0 + 5.0,
            posture_label="Upright",
            is_slumped=False,
            is_head_down=False,
            head_pitch=0.0,
            head_yaw=0.0,
            head_roll=0.0,
            pose_quality=0.85,
            face_quality=0.85,
            phone_associated=False,
            phone_bbox=None,
            phone_confidence=0.0,
        )
        self.assertEqual(person.current_state, BehaviorTemporalState.NORMAL)

    def test_sleep_case_8_track_lost_and_reacquired(self):
        """Case 8: Track lost, pruned, and subsequently reacquired starts fresh clean state."""
        track_id = "trk_sleep_08"
        t0 = time.time() - 35.0
        self.tracker.update_or_create_track(track_id, [100, 100, 300, 400], t0)
        self.tracker.prune_stale_tracks(current_time=time.time())

        # Reacquired with new observation
        new_person = self.tracker.update_or_create_track(
            track_id=track_id,
            bbox=[110, 110, 310, 410],
            timestamp=time.time(),
        )
        self.assertEqual(new_person.accumulated_sleeping_duration, 0.0)
        self.assertEqual(new_person.current_state, BehaviorTemporalState.NORMAL)

    # -------------------------------------------------------------
    # APPLICATION LEVEL TEST CASES
    # -------------------------------------------------------------

    def test_app_behavior_never_marks_attendance(self):
        """Application Rule 1 & 2: Behavioral alerts never mark attendance."""
        from app.behavior.models import BehaviorType
        engine = attendance_engine
        initial_recognized_count = len(engine.session_recognized_students)

        # Trigger a confirmed behavior alert directly
        engine._trigger_confirmed_behavior_alert(
            student_usn="TEST_USN_999",
            student_name="Test Student",
            class_id="sec-a",
            camera_id="room-023",
            behavior_type=BehaviorType.PHONE_USAGE,
            confidence=0.91,
            duration=5.2,
            title="Mobile Phone Usage Detected",
            description="Active phone interaction observed",
        )

        # Attendance roster must NOT have changed
        self.assertEqual(
            len(engine.session_recognized_students),
            initial_recognized_count,
            "Behavioral alert MUST NEVER modify the attendance roster or mark students present!",
        )

    def test_app_stream_overlay_separation(self):
        """Application Rule: Attendance and Behavioral overlays are completely decoupled."""
        engine = attendance_engine
        # Create a mock color frame (480x640x3)
        mock_frame = np.zeros((480, 640, 3), dtype=np.uint8)

        # Render attendance overlay
        att_frame = engine._draw_attendance_overlay(mock_frame, [])
        self.assertEqual(att_frame.shape, mock_frame.shape)

        # Render behavior overlay
        beh_frame = engine._draw_behavior_overlay(mock_frame, [])
        self.assertEqual(beh_frame.shape, mock_frame.shape)


class TestPhase9StrictSleepingRequirements(unittest.TestCase):
    """Explicitly verifies the 12 sleeping classification test requirements from Phase 9."""

    def setUp(self):
        # Default strict configuration: 30s duration, 80% valid ratio, 0.90 confidence, 60s cooldown
        self.tracker = BehavioralTrackerService(
            phone_usage_threshold_sec=5.0,
            sleeping_threshold_sec=30.0,
            min_valid_obs_ratio=0.80,
            decision_confidence_threshold=0.90,
            cooldown_sec=60.0,
            track_lost_timeout_sec=5.0,
        )

    def test_1_person_writing_notes_no_sleeping_alert(self):
        """1. Person writing notes: head tilted down at notebook but torso upright.
        Expected: no probable-sleeping alert over 35 seconds.
        """
        track_id = "trk_write_01"
        t0 = time.time() - 35.0
        self.tracker.update_or_create_track(track_id, [100, 100, 300, 400], t0)

        alert_occurred = False
        for sec in range(0, 36, 2):
            person, alert = self.tracker.evaluate_behavior_evidence(
                track_id=track_id,
                timestamp=t0 + sec,
                posture_label="Head Lowered",
                is_slumped=False,
                is_head_down=True,
                head_pitch=-22.0 + (sec % 3),
                head_yaw=2.0,
                head_roll=0.0,
                pose_quality=0.85,
                face_quality=0.80,
                phone_associated=False,
                phone_bbox=None,
                phone_confidence=0.0,
            )
            if alert:
                alert_occurred = True

        self.assertFalse(alert_occurred, "Writing notes must never trigger a sleeping alert")
        self.assertIn(person.current_state, [BehaviorTemporalState.NORMAL_ACTIVITY, BehaviorTemporalState.NORMAL])
        self.assertTrue(person.is_reading_writing)

    def test_2_person_reading_textbook_no_sleeping_alert(self):
        """2. Person reading a textbook: head down at desk/book, posture upright.
        Expected: no probable-sleeping alert over 35 seconds.
        """
        track_id = "trk_read_01"
        t0 = time.time() - 35.0
        self.tracker.update_or_create_track(track_id, [100, 100, 300, 400], t0)

        alert_occurred = False
        for sec in range(0, 36, 2):
            person, alert = self.tracker.evaluate_behavior_evidence(
                track_id=track_id,
                timestamp=t0 + sec,
                posture_label="Head Lowered",
                is_slumped=False,
                is_head_down=True,
                head_pitch=-20.0,
                head_yaw=0.0,
                head_roll=0.0,
                pose_quality=0.88,
                face_quality=0.85,
                phone_associated=False,
                phone_bbox=None,
                phone_confidence=0.0,
            )
            if alert:
                alert_occurred = True

        self.assertFalse(alert_occurred, "Reading textbook must never trigger a sleeping alert")
        self.assertIn(person.current_state, [BehaviorTemporalState.NORMAL_ACTIVITY, BehaviorTemporalState.NORMAL])

    def test_3_person_briefly_looking_down_no_alert(self):
        """3. Person briefly looking down (5s < 30s threshold).
        Expected: no probable-sleeping alert.
        """
        track_id = "trk_brief_01"
        t0 = time.time() - 5.0
        self.tracker.update_or_create_track(track_id, [100, 100, 300, 400], t0)

        for sec in range(0, 6):
            person, alert = self.tracker.evaluate_behavior_evidence(
                track_id=track_id,
                timestamp=t0 + sec,
                posture_label="Head Resting on Desk",
                is_slumped=True,
                is_head_down=True,
                head_pitch=-30.0,
                head_yaw=0.0,
                head_roll=0.0,
                pose_quality=0.85,
                face_quality=0.85,
                phone_associated=False,
                phone_bbox=None,
                phone_confidence=0.0,
            )
            self.assertIsNone(alert, "Brief head drop (<30s) must not trigger sleeping alert")

    def test_4_person_briefly_closing_eyes_no_alert(self):
        """4. Person briefly closing their eyes or adjusting posture (<5s).
        Expected: no probable-sleeping alert.
        """
        track_id = "trk_blink_01"
        t0 = time.time() - 4.0
        self.tracker.update_or_create_track(track_id, [100, 100, 300, 400], t0)

        for sec in range(0, 5):
            person, alert = self.tracker.evaluate_behavior_evidence(
                track_id=track_id,
                timestamp=t0 + sec,
                posture_label="Upright",
                is_slumped=False,
                is_head_down=False,
                head_pitch=0.0,
                head_yaw=0.0,
                head_roll=0.0,
                pose_quality=0.85,
                face_quality=0.90,
                phone_associated=False,
                phone_bbox=None,
                phone_confidence=0.0,
            )
            self.assertIsNone(alert)

    def test_5_unrecognized_face_ordinary_posture_tracked_anonymously_no_alert(self):
        """5. Person with an unrecognized face but ordinary posture.
        Expected: tracked anonymously (Track P-xxx); no sleeping alert.
        """
        track_id = "trk_anon_01"
        t0 = time.time() - 35.0
        person = self.tracker.update_or_create_track(track_id, [100, 100, 300, 400], t0, student_id=None, student_name=None)
        self.assertIsNone(person.student_id)
        self.assertIn("Track P-", person.track_ref)

        for sec in range(0, 36, 2):
            person, alert = self.tracker.evaluate_behavior_evidence(
                track_id=track_id,
                timestamp=t0 + sec,
                posture_label="Upright",
                is_slumped=False,
                is_head_down=False,
                head_pitch=0.0,
                head_yaw=0.0,
                head_roll=0.0,
                pose_quality=0.85,
                face_quality=0.80,
                phone_associated=False,
                phone_bbox=None,
                phone_confidence=0.0,
            )
            self.assertIsNone(alert, "Unrecognized face with normal posture must never trigger sleeping alert")

    def test_6_insufficient_face_visibility_no_alert(self):
        """6. Person with insufficient face visibility or occlusion.
        Expected: INSUFFICIENT_EVIDENCE; no sleeping alert.
        """
        track_id = "trk_occl_01"
        t0 = time.time() - 35.0
        self.tracker.update_or_create_track(track_id, [100, 100, 300, 400], t0)

        for sec in range(0, 36, 2):
            person, alert = self.tracker.evaluate_behavior_evidence(
                track_id=track_id,
                timestamp=t0 + sec,
                posture_label="Unknown",
                is_slumped=False,
                is_head_down=False,
                head_pitch=0.0,
                head_yaw=0.0,
                head_roll=0.0,
                pose_quality=0.10,
                face_quality=0.10,
                phone_associated=False,
                phone_bbox=None,
                phone_confidence=0.0,
            )
            self.assertIsNone(alert)
        self.assertEqual(person.current_state, BehaviorTemporalState.INSUFFICIENT_EVIDENCE)

    def test_7_missing_or_low_quality_observations_no_alert(self):
        """7. Person with low valid-observation ratio (< 80%).
        Expected: no sleeping alert even if slumped.
        """
        track_id = "trk_lowqual_01"
        t0 = time.time() - 35.0
        self.tracker.update_or_create_track(track_id, [100, 100, 300, 400], t0)

        alert_occurred = False
        for sec in range(0, 36, 2):
            is_valid_frame = (sec % 6 == 0)
            q = 0.85 if is_valid_frame else 0.15
            _, alert = self.tracker.evaluate_behavior_evidence(
                track_id=track_id,
                timestamp=t0 + sec,
                posture_label="Head Resting on Desk",
                is_slumped=True,
                is_head_down=True,
                head_pitch=-30.0,
                head_yaw=0.0,
                head_roll=0.0,
                pose_quality=q,
                face_quality=q,
                phone_associated=False,
                phone_bbox=None,
                phone_confidence=0.0,
            )
            if alert:
                alert_occurred = True

        self.assertFalse(alert_occurred, "Low observation quality ratio (<80%) must not trigger alert")

    def test_8_sustained_sleeping_posture_strict_threshold_triggers_alert(self):
        """8. Person with sustained sleeping posture and sufficient independent temporal evidence (>= 30s).
        Expected: one probable-sleeping event after strict 30s threshold is satisfied.
        """
        track_id = "trk_sleep_strict_01"
        t0 = time.time() - 35.0
        self.tracker.update_or_create_track(track_id, [100, 100, 300, 400], t0)

        alerts = []
        for sec in range(0, 36, 2):
            person, alert = self.tracker.evaluate_behavior_evidence(
                track_id=track_id,
                timestamp=t0 + sec,
                posture_label="Head Resting on Desk",
                is_slumped=True,
                is_head_down=True,
                head_pitch=-32.0,
                head_yaw=0.0,
                head_roll=0.0,
                pose_quality=0.88,
                face_quality=0.85,
                phone_associated=False,
                phone_bbox=None,
                phone_confidence=0.0,
            )
            if alert:
                alerts.append(alert)

        self.assertEqual(len(alerts), 1, "Exactly one alert emitted when threshold is reached")
        first_alert = alerts[0]
        self.assertEqual(first_alert["event_type"], "PROBABLE_SLEEPING")
        self.assertIn("Probable Sleeping — Track P-", first_alert["title"])
        self.assertIsNone(first_alert["student_id"], "Sleeping alert must not expose student ID")
        self.assertGreaterEqual(first_alert["duration"], 30.0)
        self.assertGreaterEqual(first_alert["confidence"], 0.90)

    def test_9_track_interruption_deducts_missing_time(self):
        """9. Track interruption during suspected sleeping event:
        Missing frames do not count toward sleeping duration.
        """
        track_id = "trk_interruption_01"
        t0 = time.time() - 35.0
        self.tracker.update_or_create_track(track_id, [100, 100, 300, 400], t0)

        for sec in [0, 1, 2]:
            self.tracker.evaluate_behavior_evidence(
                track_id=track_id,
                timestamp=t0 + sec,
                posture_label="Head Resting on Desk",
                is_slumped=True,
                is_head_down=True,
                head_pitch=-30.0,
                head_yaw=0.0,
                head_roll=0.0,
                pose_quality=0.85,
                face_quality=0.85,
                phone_associated=False,
                phone_bbox=None,
                phone_confidence=0.0,
            )

        # 15 second gap (interruption) to t0 + 17s
        person, alert = self.tracker.evaluate_behavior_evidence(
            track_id=track_id,
            timestamp=t0 + 17.0,
            posture_label="Head Resting on Desk",
            is_slumped=True,
            is_head_down=True,
            head_pitch=-30.0,
            head_yaw=0.0,
            head_roll=0.0,
            pose_quality=0.85,
            face_quality=0.85,
            phone_associated=False,
            phone_bbox=None,
            phone_confidence=0.0,
        )
        self.assertIsNone(alert)
        self.assertLess(person.accumulated_sleeping_duration, 10.0)

    def test_10_conflicting_signals_no_alert(self):
        """10. Conflicting signals: slumped label, but high head motion variance (> 12 deg²).
        Expected: classified as active/writing; no probable-sleeping alert.
        """
        track_id = "trk_conflict_01"
        t0 = time.time() - 35.0
        self.tracker.update_or_create_track(track_id, [100, 100, 300, 400], t0)

        alerts = []
        for sec in range(0, 36, 2):
            p = -25.0 if (sec % 4 == 0) else -10.0
            _, alert = self.tracker.evaluate_behavior_evidence(
                track_id=track_id,
                timestamp=t0 + sec,
                posture_label="Slumped",
                is_slumped=True,
                is_head_down=True,
                head_pitch=p,
                head_yaw=float(sec % 5),
                head_roll=0.0,
                pose_quality=0.85,
                face_quality=0.85,
                phone_associated=False,
                phone_bbox=None,
                phone_confidence=0.0,
            )
            if alert:
                alerts.append(alert)

        self.assertEqual(len(alerts), 0, "Conflicting motion signals must prevent sleeping alerts")

    def test_11_repeated_frames_same_episode_no_duplicate_alerts(self):
        """11. Repeated frames for same continuous sleeping episode:
        Exactly ONE alert emitted; no duplicate alert spam on subsequent frames.
        """
        track_id = "trk_dedup_01"
        t0 = time.time() - 45.0
        self.tracker.update_or_create_track(track_id, [100, 100, 300, 400], t0)

        alerts = []
        for sec in range(0, 46, 1):
            _, alert = self.tracker.evaluate_behavior_evidence(
                track_id=track_id,
                timestamp=t0 + sec,
                posture_label="Head Resting on Desk",
                is_slumped=True,
                is_head_down=True,
                head_pitch=-32.0,
                head_yaw=0.0,
                head_roll=0.0,
                pose_quality=0.90,
                face_quality=0.85,
                phone_associated=False,
                phone_bbox=None,
                phone_confidence=0.0,
            )
            if alert:
                alerts.append(alert)

        self.assertEqual(len(alerts), 1, "Continuous episode must produce exactly 1 alert, not spam")

    def test_12_new_sleeping_episode_after_resolution_rearms(self):
        """12. New sleeping episode after a resolved event:
        Returns to normal posture, cooldown elapses, new sleeping episode triggers new alert.
        """
        track_id = "trk_rearm_01"
        t0 = time.time() - 150.0
        self.tracker.update_or_create_track(track_id, [100, 100, 300, 400], t0)

        # Episode 1: sleep 32 seconds -> alert 1
        alerts = []
        for sec in range(0, 33, 1):
            _, alert = self.tracker.evaluate_behavior_evidence(
                track_id=track_id,
                timestamp=t0 + sec,
                posture_label="Head Resting on Desk",
                is_slumped=True,
                is_head_down=True,
                head_pitch=-32.0,
                head_yaw=0.0,
                head_roll=0.0,
                pose_quality=0.90,
                face_quality=0.85,
                phone_associated=False,
                phone_bbox=None,
                phone_confidence=0.0,
            )
            if alert:
                alerts.append(alert)
        self.assertEqual(len(alerts), 1)

        # Resolution: student sits upright for 70 seconds (> 60s cooldown)
        for sec in range(33, 105, 2):
            person, _ = self.tracker.evaluate_behavior_evidence(
                track_id=track_id,
                timestamp=t0 + sec,
                posture_label="Upright",
                is_slumped=False,
                is_head_down=False,
                head_pitch=0.0,
                head_yaw=0.0,
                head_roll=0.0,
                pose_quality=0.90,
                face_quality=0.90,
                phone_associated=False,
                phone_bbox=None,
                phone_confidence=0.0,
            )
        self.assertEqual(person.current_state, BehaviorTemporalState.NORMAL_ACTIVITY)
        self.assertEqual(person.accumulated_sleeping_duration, 0.0)

        # Episode 2: student sleeps again for 32 seconds
        for sec in range(105, 140, 1):
            _, alert = self.tracker.evaluate_behavior_evidence(
                track_id=track_id,
                timestamp=t0 + sec,
                posture_label="Head Resting on Desk",
                is_slumped=True,
                is_head_down=True,
                head_pitch=-32.0,
                head_yaw=0.0,
                head_roll=0.0,
                pose_quality=0.90,
                face_quality=0.85,
                phone_associated=False,
                phone_bbox=None,
                phone_confidence=0.0,
            )
            if alert:
                alerts.append(alert)

        self.assertEqual(len(alerts), 2, "Second separate episode after resolution must re-arm cleanly and alert")


if __name__ == "__main__":
    unittest.main()
