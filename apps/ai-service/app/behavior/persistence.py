"""SmartCampus AI — Behavioral Event Lifecycle & Persistence.

One continuous behavioural episode maps to exactly ONE persisted event:

    OBSERVING -> EVIDENCE_CONFIRMED -> ALERT_ACTIVE -> RESOLVED

The store generates a stable ``event_id`` per (session, camera, track, event_type)
episode and pushes it to the backend API with idempotent upsert semantics, so
repeated pushes, retries or duplicate API requests can never create duplicate rows.

Only the data required by the Behavioral Monitoring interface is transmitted:
event type, timestamps, duration, evidence quality, track id and the student id
when — and only when — face recognition identified the person confidently.
No face embeddings or other biometric templates are ever sent.
"""

import time
import uuid
import logging
import threading
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import httpx

from ..config.settings import settings

logger = logging.getLogger("smartcampus.behavior.persistence")


# Event lifecycle statuses
STATUS_EVIDENCE_CONFIRMED = "EVIDENCE_CONFIRMED"
STATUS_ALERT_ACTIVE = "ALERT_ACTIVE"
STATUS_RESOLVED = "RESOLVED"


@dataclass
class ActiveBehaviorEvent:
    """In-memory record of one continuous behavioural episode."""

    event_id: str
    event_type: str                 # PHONE_USAGE | POSSIBLE_SLEEPING_POSTURE
    track_id: str
    class_id: str
    session_id: str
    camera_id: str
    start_ts: float
    last_ts: float
    duration: float
    confidence: float
    status: str = STATUS_EVIDENCE_CONFIRMED
    student_id: Optional[str] = None
    student_name: Optional[str] = None
    identified: bool = False
    pushed: bool = False
    last_push_ts: float = 0.0
    resolved: bool = False
    metadata: Dict[str, Any] = field(default_factory=dict)


class BehaviorEventStore:
    """Creates, updates and resolves behavioural events with duplicate protection."""

    # Minimum seconds between update pushes for the same open event
    update_interval_sec: float = 10.0

    def __init__(self):
        self._lock = threading.Lock()
        # key: (event_type, track_id) -> ActiveBehaviorEvent
        self._active: Dict[tuple, ActiveBehaviorEvent] = {}
        self._persisted_count = 0
        self._failed_pushes = 0
        self._last_error: Optional[str] = None

    # ── helpers ────────────────────────────────────────────────────────────
    @property
    def last_error(self) -> Optional[str]:
        return self._last_error

    @property
    def persisted_count(self) -> int:
        return self._persisted_count

    @property
    def failed_pushes(self) -> int:
        return self._failed_pushes

    def active_events(self) -> List[ActiveBehaviorEvent]:
        with self._lock:
            return [e for e in self._active.values() if not e.resolved]

    def stats(self) -> Dict[str, Any]:
        with self._lock:
            return {
                "open_events": len([e for e in self._active.values() if not e.resolved]),
                "persisted_events": self._persisted_count,
                "failed_pushes": self._failed_pushes,
                "last_error": self._last_error,
            }

    # ── API ────────────────────────────────────────────────────────────────
    def record_alert(
        self,
        event_type: str,
        track_id: str,
        class_id: str,
        session_id: str,
        camera_id: str,
        timestamp: float,
        duration: float,
        confidence: float,
        student_id: Optional[str] = None,
        student_name: Optional[str] = None,
        identified: bool = False,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> ActiveBehaviorEvent:
        """Register a confirmed behaviour observation (create or refresh the open event)."""
        key = (event_type, track_id)
        with self._lock:
            ev = self._active.get(key)
            if ev is None or ev.resolved:
                ev = ActiveBehaviorEvent(
                    event_id=f"bev_{uuid.uuid4().hex}",
                    event_type=event_type,
                    track_id=track_id,
                    class_id=class_id,
                    session_id=session_id,
                    camera_id=camera_id,
                    start_ts=timestamp - max(0.0, duration),
                    last_ts=timestamp,
                    duration=duration,
                    confidence=confidence,
                    student_id=student_id if identified else None,
                    student_name=student_name if identified else None,
                    identified=identified,
                    metadata=dict(metadata or {}),
                )
                self._active[key] = ev
                ev.status = STATUS_EVIDENCE_CONFIRMED
            else:
                ev.last_ts = timestamp
                ev.duration = max(ev.duration, duration)
                ev.confidence = max(ev.confidence, confidence)
                if metadata:
                    ev.metadata.update(metadata)
                # identity may be confirmed later in the episode
                if identified and not ev.identified:
                    ev.identified = True
                    ev.student_id = student_id
                    ev.student_name = student_name

            ev.duration = max(ev.duration, duration)

            should_push = (
                not ev.pushed
                or (timestamp - ev.last_push_ts) >= self.update_interval_sec
            )
            snapshot = self._snapshot(ev)
            push_now = should_push

        if push_now:
            ok = self._push(snapshot)
            with self._lock:
                if ok:
                    ev.pushed = True
                    ev.status = STATUS_ALERT_ACTIVE
                ev.last_push_ts = timestamp
                ev.confidence = max(ev.confidence, confidence)
        return ev

    def resolve_event(self, event_type: str, track_id: str, reason: str, timestamp: Optional[float] = None) -> Optional[ActiveBehaviorEvent]:
        """Close an open episode and persist its final state (idempotent)."""
        key = (event_type, track_id)
        with self._lock:
            ev = self._active.get(key)
            if ev is None or ev.resolved:
                return None
            ev.resolved = True
            ev.status = STATUS_RESOLVED
            ev.last_ts = timestamp if timestamp is not None else ev.last_ts
            ev.duration = max(ev.duration, ev.last_ts - ev.start_ts)
            ev.metadata["resolution"] = reason
            snapshot = self._snapshot(ev)
        self._push(snapshot, resolve=True)
        return ev

    def resolve_all(self, reason: str, timestamp: Optional[float] = None) -> int:
        """Resolve every open episode (session stop / pipeline shutdown)."""
        with self._lock:
            keys = [k for k, ev in self._active.items() if not ev.resolved]
        count = 0
        for key in keys:
            if self.resolve_event(key[0], key[1], reason, timestamp):
                count += 1
        return count

    # ── internals ──────────────────────────────────────────────────────────
    @staticmethod
    def _snapshot(ev: ActiveBehaviorEvent) -> Dict[str, Any]:
        return {
            "eventId": ev.event_id,
            "eventType": ev.event_type,
            "trackId": ev.track_id,
            "classroomId": ev.class_id,
            "sessionId": ev.session_id,
            "cameraId": ev.camera_id,
            "studentId": ev.student_id,
            "studentName": ev.student_name,
            "identified": ev.identified,
            "startTime": ev.start_ts,
            "endTime": ev.last_ts if ev.resolved else None,
            "duration": round(ev.duration, 1),
            "confidence": round(ev.confidence, 3),
            "status": ev.status,
            "metadata": dict(ev.metadata) if ev.metadata else None,
        }

    def _push(self, payload: Dict[str, Any], resolve: bool = False) -> bool:
        """Persist one event state to the backend API (idempotent upsert)."""
        base = settings.backend_api_url.rstrip("/")
        url = f"{base}/api/behavior/resolve" if resolve else f"{base}/api/behavior/ingest"
        headers = {"Content-Type": "application/json", "x-api-key": settings.internal_api_key}
        try:
            with httpx.Client(timeout=4.0) as client:
                resp = client.post(url, json=payload, headers=headers)
            if resp.status_code in (200, 201):
                with self._lock:
                    self._persisted_count += 1
                    self._last_error = None
                return True
            with self._lock:
                self._failed_pushes += 1
                self._last_error = f"{url} -> HTTP {resp.status_code}"
            logger.warning("Behavioral event persistence failed (%s): %s", resp.status_code, resp.text[:200])
        except Exception as exc:  # network / backend down
            with self._lock:
                self._failed_pushes += 1
                self._last_error = str(exc)
            logger.error("Error persisting behavioral event: %s", exc)
        return False


# Singleton
behavior_event_store = BehaviorEventStore()
