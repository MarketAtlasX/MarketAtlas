from __future__ import annotations

import asyncio
import json
import logging
import uuid
from datetime import datetime
from typing import Any, Dict, Optional, Set

from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self.active: Dict[str, WebSocket] = {}
        self.channels: Dict[str, Set[str]] = {}
        self.simulations: Dict[str, Dict[str, Any]] = {}

    async def handle_connection(self, websocket: WebSocket):
        await websocket.accept()
        conn_id = str(uuid.uuid4())
        self.active[conn_id] = websocket
        logger.info(f"WebSocket connected: {conn_id}")

        try:
            await self._send(conn_id, {
                "type": "connected",
                "connection_id": conn_id,
                "timestamp": datetime.utcnow().isoformat(),
                "channels": ["simulation", "progress", "agents", "report"],
            })

            while True:
                data = await websocket.receive_text()
                await self._handle_message(conn_id, data)
        except WebSocketDisconnect:
            logger.info(f"WebSocket disconnected: {conn_id}")
        except Exception as e:
            logger.error(f"WebSocket error {conn_id}: {e}")
        finally:
            self._cleanup(conn_id)

    async def broadcast(self, channel: str, message: Dict[str, Any]):
        if channel not in self.channels:
            return
        for conn_id in list(self.channels.get(channel, set())):
            if conn_id in self.active:
                await self._send(conn_id, message)

    async def send_to(self, conn_id: str, message: Dict[str, Any]):
        if conn_id in self.active:
            await self._send(conn_id, message)

    async def _send(self, conn_id: str, message: Dict[str, Any]):
        try:
            ws = self.active.get(conn_id)
            if ws:
                await ws.send_text(json.dumps(message, default=str))
        except Exception as e:
            logger.error(f"Send failed to {conn_id}: {e}")
            self._cleanup(conn_id)

    async def _handle_message(self, conn_id: str, data: str):
        try:
            msg = json.loads(data)
            msg_type = msg.get("type", "")

            if msg_type == "subscribe":
                channel = msg.get("channel", "")
                if channel:
                    if channel not in self.channels:
                        self.channels[channel] = set()
                    self.channels[channel].add(conn_id)
                    await self._send(conn_id, {
                        "type": "subscribed",
                        "channel": channel,
                    })

            elif msg_type == "unsubscribe":
                channel = msg.get("channel", "")
                if channel in self.channels:
                    self.channels[channel].discard(conn_id)

            elif msg_type == "run_simulation":
                scenario_id = msg.get("scenario_id", "")
                await self._handle_run_simulation(conn_id, scenario_id)

            elif msg_type == "ping":
                await self._send(conn_id, {"type": "pong", "timestamp": datetime.utcnow().isoformat()})

        except json.JSONDecodeError:
            await self._send(conn_id, {"type": "error", "message": "Invalid JSON"})

    async def _handle_run_simulation(self, conn_id: str, scenario_id: str):
        from simulator.api.routes import _runner, _scenario_store, _store
        from simulator.models.simulation import Simulation

        scenario = _scenario_store.get(scenario_id)
        if not scenario:
            await self._send(conn_id, {"type": "error", "message": f"Scenario {scenario_id} not found"})
            return

        sim = Simulation(id=str(uuid.uuid4()), scenario=scenario)
        _store[sim.id] = sim

        await self._send(conn_id, {
            "type": "simulation_started",
            "simulation_id": sim.id,
            "scenario_title": scenario.title,
        })

        horizons = [0, 1, 7, 30, 90, 180, 365]
        total_steps = len(horizons)

        for i, h_days in enumerate(horizons):
            progress = int((i + 1) / total_steps * 100)
            await self._send(conn_id, {
                "type": "progress",
                "progress": progress,
                "horizon_days": h_days,
                "step": i + 1,
                "total_steps": total_steps,
                "status": f"Simulating horizon T+{h_days}d ({progress}%)",
            })

        run = _runner.run(scenario=scenario, horizons=horizons, monte_carlo_runs=100)
        sim.add_run(run)

        await self._send(conn_id, {
            "type": "simulation_complete",
            "simulation_id": sim.id,
            "run_id": run.run_id,
            "summary": {
                "total_horizons": len(run.horizon_results),
                "total_paths": run.total_paths,
                "average_confidence": run.average_confidence,
                "outlook": run.chief_report.scenario_outlook,
            },
        })

        await self._send(conn_id, {
            "type": "chief_report",
            "simulation_id": sim.id,
            "report": run.chief_report.to_dict(),
        })

    def _cleanup(self, conn_id: str):
        self.active.pop(conn_id, None)
        for channel, members in self.channels.items():
            members.discard(conn_id)


manager = ConnectionManager()


async def ws_handler(websocket: WebSocket):
    await manager.handle_connection(websocket)
