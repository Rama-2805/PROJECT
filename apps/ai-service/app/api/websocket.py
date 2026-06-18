"""SmartCampus AI — WebSocket Manager.

Manages live client WebSocket connections and broadcasts events for real-time updates:
NEW_UNKNOWN_FACE, CLUSTER_CREATED, STUDENT_ENROLLED, FAISS_UPDATED.
"""

import json
import logging
from typing import List, Dict, Any, Optional
from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger("smartcampus.websocket")


class WebSocketManager:
    """Manages WebSocket connections and handles broadcasting real-time system events."""

    def __init__(self):
        # List of globally connected WebSockets
        self.global_connections: List[WebSocket] = []
        # Grouped connections (by job_id, camera_id, etc. if needed)
        self.groups: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, group_id: Optional[str] = None):
        """Accept connection and register it in the appropriate pool."""
        await websocket.accept()
        if group_id:
            if group_id not in self.groups:
                self.groups[group_id] = []
            self.groups[group_id].append(websocket)
            logger.info(f"WebSocket client connected to group '{group_id}'")
        else:
            self.global_connections.append(websocket)
            logger.info("WebSocket client connected to global channel")

    def disconnect(self, websocket: WebSocket, group_id: Optional[str] = None):
        """Remove connection from pools."""
        if group_id and group_id in self.groups:
            if websocket in self.groups[group_id]:
                self.groups[group_id].remove(websocket)
            if not self.groups[group_id]:
                del self.groups[group_id]
            logger.info(f"WebSocket client disconnected from group '{group_id}'")
        else:
            if websocket in self.global_connections:
                self.global_connections.remove(websocket)
            logger.info("WebSocket client disconnected from global channel")

    async def broadcast(self, event_type: str, data: Any, group_id: Optional[str] = None):
        """Broadcast a message event to all active connections in a group or globally.

        Event format:
            {
                "event": "NEW_UNKNOWN_FACE" | "CLUSTER_CREATED" | "STUDENT_ENROLLED" | "FAISS_UPDATED",
                "data": {...}
            }
        """
        payload = {
            "event": event_type,
            "data": data
        }
        message = json.dumps(payload)
        
        targets = self.groups.get(group_id, []) if group_id else self.global_connections
        if not targets:
            return

        logger.info(f"Broadcasting event '{event_type}' to {len(targets)} clients.")
        
        disconnected = []
        for connection in targets:
            try:
                await connection.send_text(message)
            except WebSocketDisconnect:
                disconnected.append(connection)
            except Exception as e:
                logger.warning(f"Error sending WebSocket frame: {e}")
                disconnected.append(connection)

        # Cleanup inactive connections
        for conn in disconnected:
            self.disconnect(conn, group_id)

    def broadcast_sync(self, event_type: str, data: Any, group_id: Optional[str] = None):
        """Synchronous wrapper to broadcast messages from synchronous context/threads."""
        import asyncio
        try:
            loop = asyncio.get_running_loop()
            if loop.is_running():
                # Schedule the async broadcast in the running event loop
                loop.create_task(self.broadcast(event_type, data, group_id))
                return
        except RuntimeError:
            # No running event loop in this thread
            pass

        try:
            # Run in a temporary event loop
            asyncio.run(self.broadcast(event_type, data, group_id))
        except Exception as e:
            logger.warning(f"Failed to broadcast synchronously: {e}")


# Singleton instance
websocket_manager = WebSocketManager()
