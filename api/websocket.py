from __future__ import annotations

import asyncio
import json
import logging
from typing import Any, Dict, Set

from fastapi import WebSocket, WebSocketDisconnect

from graph_engine.builder.graph_builder import GraphBuilder

logger = logging.getLogger(__name__)


class GraphWebSocketManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        self.builder = GraphBuilder()

    async def connect(self, websocket: WebSocket, channel: str = "graph"):
        await websocket.accept()
        if channel not in self.active_connections:
            self.active_connections[channel] = set()
        self.active_connections[channel].add(websocket)
        logger.info(f"WebSocket connected to channel '{channel}'. Total: {len(self.active_connections[channel])}")

    def disconnect(self, websocket: WebSocket, channel: str = "graph"):
        if channel in self.active_connections:
            self.active_connections[channel].discard(websocket)

    async def broadcast(self, channel: str, message: Dict[str, Any]):
        if channel not in self.active_connections:
            return
        stale = set()
        for ws in self.active_connections[channel]:
            try:
                await ws.send_json(message)
            except Exception:
                stale.add(ws)
        self.active_connections[channel] -= stale

    async def handle_connection(self, websocket: WebSocket):
        channel = "graph"
        await self.connect(websocket, channel)
        try:
            async for message in websocket.iter_text():
                try:
                    data = json.loads(message)
                    await self._handle_message(websocket, data)
                except json.JSONDecodeError:
                    await websocket.send_json({"type": "error", "message": "Invalid JSON"})
        except WebSocketDisconnect:
            pass
        finally:
            self.disconnect(websocket, channel)

    async def _handle_message(self, websocket: WebSocket, data: Dict[str, Any]):
        msg_type = data.get("type", "")
        payload = data.get("payload", {})

        if msg_type == "subscribe":
            channel = payload.get("channel", "graph")
            self.active_connections.setdefault(channel, set()).add(websocket)
            await websocket.send_json({"type": "subscribed", "channel": channel})

        elif msg_type == "get_forecast":
            result = self.builder.build_forecast_graph(
                payload.get("symbol", "NVDA"),
                payload.get("company_name", "NVIDIA Corporation"),
                payload.get("current_price", 880.0),
            )
            await websocket.send_json({"type": "forecast_update", "data": result})

        elif msg_type == "get_causal":
            result = self.builder.build_causal_graph(
                payload.get("root_event", "Iran Conflict"),
                payload.get("target_asset", "NVIDIA"),
                payload.get("max_paths", 5),
            )
            await websocket.send_json({"type": "causal_update", "data": result})

        elif msg_type == "get_reasoning":
            result = self.builder.build_reasoning_graph(
                payload.get("target", "NVIDIA"),
            )
            await websocket.send_json({"type": "reasoning_update", "data": result})

        elif msg_type == "get_confidence":
            result = self.builder.build_confidence_graph(
                payload.get("target", "NVIDIA"),
                payload.get("prediction_value"),
                payload.get("prediction_direction", "bullish"),
            )
            await websocket.send_json({"type": "confidence_update", "data": result})

        elif msg_type == "get_all":
            result = self.builder.build_all(
                payload.get("symbol", "NVDA"),
                payload.get("company_name", "NVIDIA Corporation"),
                payload.get("current_price", 880.0),
                payload.get("root_event", "Iran Conflict"),
                payload.get("target_asset", "NVIDIA"),
            )
            await websocket.send_json({"type": "all_graphs_update", "data": result})

        else:
            await websocket.send_json({"type": "error", "message": f"Unknown message type: {msg_type}"})


manager = GraphWebSocketManager()
