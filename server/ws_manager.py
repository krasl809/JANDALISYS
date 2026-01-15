# --- START OF FILE server/ws_manager.py ---
import json
from typing import List, Dict, Set
from fastapi import WebSocket
import asyncio
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # List to store connected browsers
        self.active_connections: List[WebSocket] = []
        # Track which users are in which contract: {contract_id: {websocket: user_name}}
        self.contract_presence: Dict[str, Dict[WebSocket, str]] = {}
        # Lock for thread-safe operations
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            self.active_connections.append(websocket)
            logger.info(f"WebSocket connected from {websocket.client}. Total connections: {len(self.active_connections)}")

    async def disconnect(self, websocket: WebSocket):
        async with self._lock:
            try:
                if websocket in self.active_connections:
                    self.active_connections.remove(websocket)
                    logger.info(f"WebSocket removed from active connections. Remaining: {len(self.active_connections)}")
                else:
                    logger.warning(f"WebSocket {websocket.client} was not in active connections during disconnect")
                
                # Remove from presence tracking
                affected_contracts = []
                for contract_id, users in list(self.contract_presence.items()):
                    if websocket in users:
                        del users[websocket]
                        affected_contracts.append(contract_id)
                        if not users:
                            del self.contract_presence[contract_id]
                
                logger.info(f"Presence cleanup done for {websocket.client}. Affected contracts: {affected_contracts}")
                
                # Notify others about departure
                for contract_id in affected_contracts:
                    await self._broadcast_presence(contract_id)
                    
            except Exception as e:
                logger.error(f"Error during disconnect: {e}")

    async def update_presence(self, websocket: WebSocket, contract_id: str, user_name: str, action: str):
        """Update user presence in a contract"""
        async with self._lock:
            if action == "enter":
                if contract_id not in self.contract_presence:
                    self.contract_presence[contract_id] = {}
                self.contract_presence[contract_id][websocket] = user_name
            elif action == "leave":
                if contract_id in self.contract_presence and websocket in self.contract_presence[contract_id]:
                    del self.contract_presence[contract_id][websocket]
            
            await self._broadcast_presence(contract_id)

    async def _broadcast_presence(self, contract_id: str):
        """Broadcast current users in a contract to all users in that contract"""
        if contract_id not in self.contract_presence:
            return

        users = list(self.contract_presence[contract_id].values())
        message = json.dumps({
            "type": "presence_update",
            "contract_id": contract_id,
            "users": users
        })
        
        # We broadcast to everyone interested in this contract
        # Since we use a single WebSocket endpoint, we filter connections
        # that are actually viewing this contract to avoid unnecessary traffic
        async with self._lock:
            connections_to_notify = [
                ws for ws, cid in [(ws, cid) for cid, users_dict in self.contract_presence.items() for ws in users_dict]
                if cid == contract_id
            ]
        
        for websocket in connections_to_notify:
            try:
                await websocket.send_text(message)
            except Exception as e:
                logger.warning(f"Failed to send presence update to {websocket.client}: {e}")
                # Don't call disconnect here as it might dead-lock or be handled by the main loop

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
            # Note: disconnect handles its own lock
            pass
        
        if disconnected:
            for conn in disconnected:
                await self.disconnect(conn)

    @property
    def connection_count(self) -> int:
        """Get current number of active connections"""
        return len(self.active_connections)

# Create a single instance to use everywhere
manager = ConnectionManager()
