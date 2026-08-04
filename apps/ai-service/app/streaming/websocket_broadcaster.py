"""SmartCampus AI — Live WebSocket Broadcaster.

Broadcasts real-time events:
- NEW_RECOGNITION
- ATTENDANCE_CONFIRMED
- UNKNOWN_FACE_DETECTED
- TRACKING_UPDATED
- ATTENDANCE_SUMMARY
"""

import json
import logging
import asyncio
from typing import List, Dict, Any
from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger("smartcampus.websocket")

class WebSocketBroadcaster:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Total active connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Remaining connections: {len(self.active_connections)}")

    async def broadcast_event(self, event_type: str, data: Dict[str, Any]):
        message = json.dumps({
            "type": event_type,
            "timestamp": data.get("timestamp"),
            "payload": data
        })

        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.warning(f"Error broadcasting to WebSocket client: {e}")
                disconnected.append(connection)

        for conn in disconnected:
            self.disconnect(conn)

broadcaster = WebSocketBroadcaster()
