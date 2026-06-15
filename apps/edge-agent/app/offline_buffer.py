"""SmartCampus AI — Edge Agent Offline Data Buffer.
Stores events locally when MQTT/network is unavailable and retries automatically.
Uses SQLite for reliable persistence.
"""
import asyncio
import json
import logging
import sqlite3
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from app.config import EdgeAgentSettings

logger = logging.getLogger(__name__)


class OfflineBuffer:
    """Thread-safe SQLite-backed offline event buffer with automatic retry."""

    def __init__(self, settings: EdgeAgentSettings):
        self.settings = settings
        self.db_path = Path(settings.offline_buffer_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._local = threading.local()
        self._lock = threading.Lock()
        self._running = False
        self._retry_task: Optional[asyncio.Task] = None
        self._on_retry: Optional[callable] = None

        self._init_db()

    def set_retry_callback(self, callback: callable):
        """Set callback for retrying buffered events."""
        self._on_retry = callback

    def _get_conn(self) -> sqlite3.Connection:
        """Get thread-local connection."""
        if not hasattr(self._local, "conn") or self._local.conn is None:
            self._local.conn = sqlite3.connect(str(self.db_path))
            self._local.conn.row_factory = sqlite3.Row
            self._local.conn.execute("PRAGMA journal_mode=WAL")
            self._local.conn.execute("PRAGMA synchronous=NORMAL")
        return self._local.conn

    def _init_db(self):
        """Initialize the SQLite schema."""
        with self._lock:
            conn = self._get_conn()
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS buffered_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    topic TEXT NOT NULL,
                    payload TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    retry_count INTEGER DEFAULT 0,
                    last_retry_at TEXT,
                    status TEXT DEFAULT 'PENDING'
                );
                CREATE INDEX IF NOT EXISTS idx_events_status ON buffered_events(status);
                CREATE INDEX IF NOT EXISTS idx_events_created ON buffered_events(created_at);
            """)
            conn.commit()

    def buffer_event(self, topic: str, payload: dict, event_type: str):
        """Store an event in the offline buffer."""
        with self._lock:
            conn = self._get_conn()
            conn.execute(
                """INSERT INTO buffered_events (topic, payload, event_type, created_at, status)
                   VALUES (?, ?, ?, ?, 'PENDING')""",
                (topic, json.dumps(payload), event_type, datetime.now(timezone.utc).isoformat()),
            )
            conn.commit()
            logger.debug(f"[BUFFER] Stored {event_type} event (buffer size: {self.count()})")

    def count(self) -> int:
        """Get number of pending events."""
        with self._lock:
            conn = self._get_conn()
            row = conn.execute("SELECT COUNT(*) as cnt FROM buffered_events WHERE status='PENDING'").fetchone()
            return row["cnt"] if row else 0

    def get_pending_events(self, limit: int = 50) -> list[dict]:
        """Get oldest pending events for retry."""
        with self._lock:
            conn = self._get_conn()
            rows = conn.execute(
                """SELECT * FROM buffered_events
                   WHERE status='PENDING'
                   ORDER BY created_at ASC
                   LIMIT ?""",
                (limit,),
            ).fetchall()
            return [dict(r) for r in rows]

    def mark_sent(self, event_id: int):
        """Mark an event as successfully sent."""
        with self._lock:
            conn = self._get_conn()
            conn.execute(
                "UPDATE buffered_events SET status='SENT' WHERE id=?",
                (event_id,),
            )
            conn.commit()

    def mark_failed(self, event_id: int):
        """Increment retry count for a failed event."""
        with self._lock:
            conn = self._get_conn()
            conn.execute(
                """UPDATE buffered_events
                   SET retry_count = retry_count + 1,
                       last_retry_at = ?,
                       status = CASE WHEN retry_count >= 10 THEN 'FAILED' ELSE 'PENDING' END
                   WHERE id=?""",
                (datetime.now(timezone.utc).isoformat(), event_id),
            )
            conn.commit()

    def get_stats(self) -> dict:
        """Get buffer statistics."""
        with self._lock:
            conn = self._get_conn()
            stats = conn.execute("""
                SELECT
                    COUNT(*) as total,
                    SUM(CASE WHEN status='PENDING' THEN 1 ELSE 0 END) as pending,
                    SUM(CASE WHEN status='SENT' THEN 1 ELSE 0 END) as sent,
                    SUM(CASE WHEN status='FAILED' THEN 1 ELSE 0 END) as failed
                FROM buffered_events
            """).fetchone()
            return dict(stats) if stats else {"total": 0, "pending": 0, "sent": 0, "failed": 0}

    async def start_retry_loop(self, interval: int = 10):
        """Start automatic retry loop."""
        self._running = True
        self._retry_task = asyncio.create_task(self._retry_loop(interval))
        logger.info(f"[BUFFER] Retry loop started (interval={interval}s, pending={self.count()})")

    async def stop_retry_loop(self):
        """Stop the retry loop."""
        self._running = False
        if self._retry_task:
            self._retry_task.cancel()
            try:
                await self._retry_task
            except asyncio.CancelledError:
                pass

    async def _retry_loop(self, interval: int):
        """Periodically retry sending buffered events."""
        while self._running:
            try:
                if self._on_retry and self.count() > 0:
                    events = self.get_pending_events(20)
                    for event in events:
                        try:
                            topic = event["topic"]
                            payload = json.loads(event["payload"])
                            await self._on_retry(topic, payload)
                            self.mark_sent(event["id"])
                            logger.debug(f"[BUFFER] Retry OK: event {event['id']}")
                        except Exception as e:
                            self.mark_failed(event["id"])
                            logger.debug(f"[BUFFER] Retry failed: event {event['id']}: {e}")
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"[BUFFER] Retry loop error: {e}")

            await asyncio.sleep(interval)
