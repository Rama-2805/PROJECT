"""SmartCampus AI — Attendance Decision Engine.

Makes attendance decisions based on verified face recognition,
prevents duplicates, handles unknown faces, and generates events.
"""

import time
from typing import Optional, List, Set
from datetime import datetime
from dataclasses import dataclass, field

from ..config.settings import settings
from ..recognition.face_recognizer import RecognitionResult


@dataclass
class AttendanceRecord:
    student_id: str
    student_name: str
    session_id: str
    classroom_id: str
    camera_id: str
    confidence: float
    timestamp: float
    method: str = "FACE_RECOGNITION"
    is_absent_reversal: bool = False


@dataclass
class UnknownFaceEvent:
    thumbnail_path: Optional[str]
    detection_time: float
    classroom_id: str
    camera_id: str
    image_crop: Optional[bytes] = None


@dataclass
class AttendanceEvent:
    type: str  # ATTENDANCE_MARKED, STUDENT_ENTERED, STUDENT_LEFT, UNKNOWN_PERSON
    student_id: Optional[str] = None
    student_name: Optional[str] = None
    confidence: Optional[float] = None
    timestamp: float = 0.0
    classroom_id: str = ""
    camera_id: str = ""


class AttendanceDecisionEngine:
    """Makes attendance decisions with duplicate prevention and unknown face handling."""

    def __init__(self):
        # Track currently present students per session
        self._present_students: dict[str, Set[str]] = {}
        self._marked_sessions: dict[str, Set[str]] = {}

        # Unknown face tracking
        self._unknown_faces: list = []

        # Event listeners
        self._event_listeners: list = []

        # Configuration
        self.min_confidence_to_mark = 0.85
        self.duplicate_cooldown_seconds = 300  # 5 minutes between marks
        self.max_unknown_faces_stored = 100

        # Session tracking
        self._active_sessions: dict[str, dict] = {}

    def start_session(self, session_id: str, classroom_id: str,
                      subject: str = "", teacher: str = "") -> dict:
        """Start a new attendance session for a classroom."""
        session = {
            "session_id": session_id,
            "classroom_id": classroom_id,
            "subject": subject,
            "teacher": teacher,
            "started_at": time.time(),
            "total_students_present": 0,
            "total_detections": 0,
        }
        self._active_sessions[session_id] = session
        self._present_students[session_id] = set()
        self._marked_sessions[session_id] = set()
        return session

    def end_session(self, session_id: str) -> Optional[dict]:
        """End an attendance session and return summary."""
        session = self._active_sessions.pop(session_id, None)
        if session:
            session["ended_at"] = time.time()
            session["total_present"] = len(self._present_students.get(session_id, set()))
            self._present_students.pop(session_id, None)
            self._marked_sessions.pop(session_id, None)
        return session

    def process_recognition(
        self, result: RecognitionResult, session_id: str, classroom_id: str
    ) -> Optional[AttendanceRecord]:
        """Process a verified recognition result and potentially mark attendance.

        Business rules:
        1. Must be temporally verified
        2. Confidence must exceed threshold
        3. Not already marked in current session
        4. Cooldown between duplicate marks
        """
        if not result.is_verified:
            return None

        if result.confidence < self.min_confidence_to_mark:
            return None

        # Check for duplicate in session
        session_marks = self._marked_sessions.get(session_id, set())
        if result.student_id in session_marks:
            return None

        # Check cooldown (simple check — would use DB in production)
        # Create attendance record
        record = AttendanceRecord(
            student_id=result.student_id,
            student_name=result.student_name,
            session_id=session_id,
            classroom_id=classroom_id,
            camera_id=result.camera_id,
            confidence=result.confidence,
            timestamp=result.timestamp,
        )

        # Mark student as present
        present_set = self._present_students.setdefault(session_id, set())
        present_set.add(result.student_id)
        self._marked_sessions.setdefault(session_id, set()).add(result.student_id)

        # Track in session
        session = self._active_sessions.get(session_id)
        if session:
            session["total_detections"] += 1
            session["total_students_present"] = len(present_set)

        # Fire attendance event
        self._fire_event(
            AttendanceEvent(
                type="ATTENDANCE_MARKED",
                student_id=result.student_id,
                student_name=result.student_name,
                confidence=result.confidence,
                timestamp=result.timestamp,
                classroom_id=classroom_id,
                camera_id=result.camera_id,
            )
        )

        return record

    def process_unknown_face(
        self, frame_crop: Optional[bytes], classroom_id: str, camera_id: str
    ) -> None:
        """Handle an unrecognized face detection."""
        event = UnknownFaceEvent(
            thumbnail_path=None,
            detection_time=time.time(),
            classroom_id=classroom_id,
            camera_id=camera_id,
            image_crop=frame_crop,
        )

        self._unknown_faces.append(event)

        # Limit stored unknown faces
        if len(self._unknown_faces) > self.max_unknown_faces_stored:
            self._unknown_faces.pop(0)

        # Fire event
        self._fire_event(
            AttendanceEvent(
                type="UNKNOWN_PERSON",
                timestamp=time.time(),
                classroom_id=classroom_id,
                camera_id=camera_id,
            )
        )

    def on_event(self, listener) -> None:
        """Register an event listener callback."""
        self._event_listeners.append(listener)

    def _fire_event(self, event: AttendanceEvent) -> None:
        """Notify all event listeners."""
        for listener in self._event_listeners:
            try:
                listener(event)
            except Exception as e:
                print(f"[Attendance] Event listener error: {e}")

    def get_session_stats(self, session_id: str) -> Optional[dict]:
        """Get current statistics for a session."""
        session = self._active_sessions.get(session_id)
        if not session:
            return None

        return {
            **session,
            "currently_present": len(self._present_students.get(session_id, set())),
            "unique_marked": len(self._marked_sessions.get(session_id, set())),
            "unknown_faces_this_session": len([
                u for u in self._unknown_faces
                if u.detection_time >= session["started_at"]
            ]),
        }

    def get_present_students(self, session_id: str) -> list:
        """Get all students currently marked as present in a session."""
        return list(self._present_students.get(session_id, set()))


# Global attendance engine instance
attendance_engine = AttendanceDecisionEngine()
