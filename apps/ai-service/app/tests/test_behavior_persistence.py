"""SmartCampus AI — Behavioral Persistence & Resolution Unit Tests.

Verifies:
1. Active episode creation and lifecycle tracking.
2. Snapshot serialization matching NestJS DTO contract.
3. Event resolution with correct URL endpoint (/api/behavior/resolve) and headers.
4. Idempotent resolution handling (closing already-resolved episode).
5. Network resilience and HTTP error status handling (200, 404, 500, timeouts).
6. resolve_all() batch closure.
"""

from unittest.mock import MagicMock, patch
import pytest
import httpx

from app.behavior.persistence import (
    BehaviorEventStore,
    STATUS_EVIDENCE_CONFIRMED,
    STATUS_ALERT_ACTIVE,
    STATUS_RESOLVED,
)


@pytest.fixture
def store():
    """Create a fresh isolated BehaviorEventStore instance for testing."""
    return BehaviorEventStore()


def test_record_alert_initializes_active_episode(store):
    """Test that record_alert sets up an active episode correctly."""
    ev = store.record_alert(
        event_type="PHONE_USAGE",
        track_id="trk-101",
        class_id="cls-a",
        session_id="ses-1",
        camera_id="cam-front",
        timestamp=100.0,
        duration=5.0,
        confidence=0.88,
        student_id="1VI23CS058",
        student_name="Manjunatha R",
        identified=True,
        metadata={"title": "Phone Alert"},
    )

    assert ev.event_id.startswith("bev_")
    assert ev.event_type == "PHONE_USAGE"
    assert ev.track_id == "trk-101"
    assert ev.duration == 5.0
    assert ev.confidence == 0.88
    assert ev.identified is True
    assert ev.student_id == "1VI23CS058"
    assert ev.status in (STATUS_EVIDENCE_CONFIRMED, STATUS_ALERT_ACTIVE)
    assert not ev.resolved
    assert len(store.active_events()) == 1


def test_snapshot_schema_contract(store):
    """Verify that _snapshot produces a dictionary matching the NestJS DTO contract."""
    ev = store.record_alert(
        event_type="POSSIBLE_SLEEPING_POSTURE",
        track_id="trk-202",
        class_id="cls-b",
        session_id="ses-2",
        camera_id="cam-back",
        timestamp=200.0,
        duration=10.0,
        confidence=0.92,
    )

    snap = store._snapshot(ev)

    assert snap["eventId"] == ev.event_id
    assert snap["eventType"] == "POSSIBLE_SLEEPING_POSTURE"
    assert snap["trackId"] == "trk-202"
    assert snap["classroomId"] == "cls-b"
    assert snap["sessionId"] == "ses-2"
    assert snap["cameraId"] == "cam-back"
    assert snap["duration"] == 10.0
    assert snap["confidence"] == 0.92
    assert "status" in snap


def test_resolve_event_calls_resolve_endpoint(store):
    """Verify that resolve_event marks event as RESOLVED and calls POST /api/behavior/resolve."""
    store.record_alert(
        event_type="PHONE_USAGE",
        track_id="trk-303",
        class_id="cls-c",
        session_id="ses-3",
        camera_id="cam-1",
        timestamp=300.0,
        duration=6.0,
        confidence=0.95,
    )

    mock_resp = MagicMock()
    mock_resp.status_code = 200

    with patch("httpx.Client.post", return_value=mock_resp) as mock_post:
        resolved_ev = store.resolve_event(
            event_type="PHONE_USAGE",
            track_id="trk-303",
            reason="evidence_cleared",
            timestamp=315.0,
        )

        assert resolved_ev is not None
        assert resolved_ev.resolved is True
        assert resolved_ev.status == STATUS_RESOLVED
        assert resolved_ev.duration >= 15.0  # 315.0 - (300.0 - 6.0)

        # Verify correct URL was hit with resolve=True
        mock_post.assert_called_once()
        called_url = mock_post.call_args[0][0]
        called_payload = mock_post.call_args[1]["json"]
        called_headers = mock_post.call_args[1]["headers"]

        assert called_url.endswith("/api/behavior/resolve")
        assert called_payload["status"] == STATUS_RESOLVED
        assert called_payload["eventId"] == resolved_ev.event_id
        assert called_payload["metadata"]["resolution"] == "evidence_cleared"
        assert "x-api-key" in called_headers


def test_resolve_event_is_idempotent(store):
    """Verify that resolving an already-resolved event returns None and does not re-push."""
    store.record_alert(
        event_type="PHONE_USAGE",
        track_id="trk-404",
        class_id="cls-d",
        session_id="ses-4",
        camera_id="cam-1",
        timestamp=400.0,
        duration=5.0,
        confidence=0.9,
    )

    mock_resp = MagicMock()
    mock_resp.status_code = 200

    with patch("httpx.Client.post", return_value=mock_resp) as mock_post:
        # First resolution
        first_call = store.resolve_event("PHONE_USAGE", "trk-404", "evidence_cleared")
        assert first_call is not None
        assert mock_post.call_count == 1

        # Second resolution attempt (should be a no-op)
        second_call = store.resolve_event("PHONE_USAGE", "trk-404", "evidence_cleared")
        assert second_call is None
        assert mock_post.call_count == 1  # No additional push


def test_push_handles_api_failure_gracefully(store):
    """Verify that HTTP 500 or network exceptions do not crash the service and record errors."""
    store.record_alert(
        event_type="PHONE_USAGE",
        track_id="trk-505",
        class_id="cls-e",
        session_id="ses-5",
        camera_id="cam-1",
        timestamp=500.0,
        duration=5.0,
        confidence=0.9,
    )

    # 1. Test HTTP error response
    mock_err_resp = MagicMock()
    mock_err_resp.status_code = 500
    mock_err_resp.text = "Internal Server Error"

    with patch("httpx.Client.post", return_value=mock_err_resp):
        store.resolve_event("PHONE_USAGE", "trk-505", "evidence_cleared")
        assert store.failed_pushes >= 1
        assert "HTTP 500" in (store.last_error or "")

    # 2. Test network timeout / connection error
    store._active[("PHONE_USAGE", "trk-505")].resolved = False  # Reset for testing
    with patch("httpx.Client.post", side_effect=httpx.ConnectError("Connection refused")):
        store.resolve_event("PHONE_USAGE", "trk-505", "evidence_cleared")
        assert store.failed_pushes >= 2
        assert "Connection refused" in (store.last_error or "")


def test_resolve_all_closes_all_open_episodes(store):
    """Verify that resolve_all closes every active episode upon session stop."""
    store.record_alert("PHONE_USAGE", "t-1", "c-1", "s-1", "cam-1", 10.0, 5.0, 0.9)
    store.record_alert("POSSIBLE_SLEEPING_POSTURE", "t-2", "c-1", "s-1", "cam-1", 10.0, 10.0, 0.95)

    assert len(store.active_events()) == 2

    mock_resp = MagicMock()
    mock_resp.status_code = 200

    with patch("httpx.Client.post", return_value=mock_resp):
        count = store.resolve_all(reason="session_stopped")
        assert count == 2
        assert len(store.active_events()) == 0
