# --- START OF FILE server/ws_manager.py ---
from typing import List
from fastapi import WebSocket
import asyncio
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # List to store connected browsers
        self.active_connections: List[WebSocket] = []
        # Lock for thread-safe operations
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            self.active_connections.append(websocket)
            logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")

    async def disconnect(self, websocket: WebSocket):
        async with self._lock:
            try:
                if websocket in self.active_connections:
                    self.active_connections.remove(websocket)
                    logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")
            except ValueError:
                pass

    async def broadcast(self, message: str):
        """Send message to all connected clients"""
        async with self._lock:
            connections = self.active_connections[:]
        
        disconnected = []
        for connection in connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.warning(f"Failed to send message to WebSocket: {e}")
                disconnected.append(connection)
        
        # Clean up disconnected clients
        for conn in disconnected:
            await self.disconnect(conn)

    @property
    def connection_count(self) -> int:
        """Get current number of active connections"""
        return len(self.active_connections)

# Create a single instance to use everywhere
manager = ConnectionManager()
