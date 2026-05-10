import json
from typing import List
from datetime import datetime, timezone
from fastapi import WebSocket


class EventBus:
    """
    Production-grade Event Bus with server-authoritative timestamps
    and dead connection cleanup.
    """

    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def publish(self, event_type: str, engine: str, detail: str, severity: str = "INFO"):
        event = {
            "type": event_type,
            "engine": engine,
            "detail": detail,
            "severity": severity,
            "timestamp": datetime.now(timezone.utc).isoformat()  # C-07: Server-authoritative timestamp
        }

        dead_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_json(event)
            except Exception:
                # M-03: Track dead connections for cleanup instead of silently ignoring
                dead_connections.append(connection)

        # Remove dead connections after iteration
        for dead in dead_connections:
            if dead in self.active_connections:
                self.active_connections.remove(dead)


event_bus = EventBus()
