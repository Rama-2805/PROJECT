"""Pytest configuration and test isolation fixtures for AI service tests."""

import pytest
from app.services.attendance_engine import attendance_engine

@pytest.fixture(autouse=True)
def clean_attendance_engine_state():
    """Ensure attendance_engine singleton state does not leak across tests."""
    attendance_engine.active_sessions.clear()
    attendance_engine.broadcast_cooldowns.clear()
    attendance_engine.session_recognized_students.clear()
    if hasattr(attendance_engine, "_section_usn_cache"):
        attendance_engine._section_usn_cache.clear()
    if hasattr(attendance_engine, "_student_prototypes"):
        attendance_engine._student_prototypes.clear()
    yield
    attendance_engine.active_sessions.clear()
    attendance_engine.broadcast_cooldowns.clear()
    attendance_engine.session_recognized_students.clear()
    if hasattr(attendance_engine, "_section_usn_cache"):
        attendance_engine._section_usn_cache.clear()
    if hasattr(attendance_engine, "_student_prototypes"):
        attendance_engine._student_prototypes.clear()
