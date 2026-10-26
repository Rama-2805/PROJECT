import unittest
from unittest.mock import MagicMock, patch
from app.services.attendance_engine import AttendanceEngine


class TestAttendancePersistenceOrdering(unittest.TestCase):
    def setUp(self):
        self.engine = AttendanceEngine()
        self.mock_db = MagicMock()
        # Mock student details lookup
        self.engine._get_student_details = MagicMock(return_value=("stu-001", "Rahul Sharma"))
        self.engine.active_sessions = {
            "cam-01": {"session_id": "SESS_CANONICAL_100"}
        }

    @patch("app.services.attendance_engine.websocket_manager")
    @patch("httpx.post")
    def test_attendance_marked_emitted_only_on_successful_backend_persistence(self, mock_httpx_post, mock_ws):
        # 1. Simulate successful NestJS backend persistence (200 OK)
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_httpx_post.return_value = mock_response

        persisted = self.engine._mark_student_attendance(
            db=self.mock_db,
            usn="1VI23CS058",
            class_id="CSE_7A",
            confidence=0.94,
            camera_id="cam-01"
        )

        self.assertTrue(persisted)
        # Verify httpx called with canonical session ID
        mock_httpx_post.assert_called_once()
        sent_payload = mock_httpx_post.call_args[1]["json"]
        self.assertEqual(sent_payload["sessionId"], "SESS_CANONICAL_100")
        self.assertEqual(sent_payload["studentId"], "1VI23CS058")

        # Verify ATTENDANCE_MARKED event was dispatched
        mock_ws.broadcast_sync.assert_called_once()
        event_name, event_data = mock_ws.broadcast_sync.call_args[0]
        self.assertEqual(event_name, "ATTENDANCE_MARKED")
        self.assertEqual(event_data["match_status"], "CONFIRMED")
        self.assertEqual(event_data["session_id"], "SESS_CANONICAL_100")

    @patch("app.services.attendance_engine.websocket_manager")
    @patch("httpx.post")
    def test_no_false_confirmation_event_on_database_failure(self, mock_httpx_post, mock_ws):
        # 2. Simulate NestJS database / persistence failure (500 Internal Server Error)
        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_response.text = "Internal Server Error: DB Connection Timeout"
        mock_httpx_post.return_value = mock_response

        persisted = self.engine._mark_student_attendance(
            db=self.mock_db,
            usn="1VI23CS058",
            class_id="CSE_7A",
            confidence=0.94,
            camera_id="cam-01"
        )

        # Persistence must fail
        self.assertFalse(persisted)
        # CRITICAL: No ATTENDANCE_MARKED event must be broadcast when persistence fails!
        mock_ws.broadcast_sync.assert_not_called()

    @patch("app.services.attendance_engine.websocket_manager")
    @patch("httpx.post")
    def test_no_false_confirmation_event_on_network_exception(self, mock_httpx_post, mock_ws):
        # 3. Simulate network error / timeout during backend call
        mock_httpx_post.side_effect = Exception("Connection refused to backend API")

        persisted = self.engine._mark_student_attendance(
            db=self.mock_db,
            usn="1VI23CS058",
            class_id="CSE_7A",
            confidence=0.94,
            camera_id="cam-01"
        )

        self.assertFalse(persisted)
        # No ATTENDANCE_MARKED event dispatched
        mock_ws.broadcast_sync.assert_not_called()


if __name__ == "__main__":
    unittest.main()
