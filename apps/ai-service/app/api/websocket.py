"""SmartCampus AI — WebSocket handlers for real-time enrollment progress."""

import json
from fastapi import WebSocket, WebSocketDisconnect
from ..models.enrollment import ProgressUpdate, JobStatus


class EnrollmentWebSocketManager:
    """Manages WebSocket connections for real-time enrollment updates."""

    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, job_id: str, websocket: WebSocket):
        await websocket.accept()
        if job_id not in self.active_connections:
            self.active_connections[job_id] = []
        self.active_connections[job_id].append(websocket)

    def disconnect(self, job_id: str, websocket: WebSocket):
        if job_id in self.active_connections:
            self.active_connections[job_id].remove(websocket)
            if not self.active_connections[job_id]:
                del self.active_connections[job_id]

    async def broadcast(self, job_id: str, update: ProgressUpdate):
        """Send progress update to all connected clients for a job."""
        if job_id not in self.active_connections:
            return

        message = update.model_dump_json()
        disconnected = []
        for connection in self.active_connections[job_id]:
            try:
                await connection.send_text(message)
            except WebSocketDisconnect:
                disconnected.append(connection)

        for conn in disconnected:
            self.disconnect(job_id, conn)


websocket_manager = EnrollmentWebSocketManager()
