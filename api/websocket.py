import json
from datetime import datetime

from fastapi import WebSocket, WebSocketDisconnect, Depends
from typing import Any

from .memory_service import MemoryService


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, channel: str = "global"):
        await websocket.accept()
        if channel not in self.active_connections:
            self.active_connections[channel] = []
        self.active_connections[channel].append(websocket)

    def disconnect(self, websocket: WebSocket, channel: str = "global"):
        if channel in self.active_connections:
            self.active_connections[channel] = [
                w for w in self.active_connections[channel] if w != websocket
            ]

    async def broadcast(self, message: dict, channel: str = "global"):
        if channel not in self.active_connections:
            return
        dead = []
        for conn in self.active_connections[channel]:
            try:
                await conn.send_json(message)
            except Exception:
                dead.append(conn)
        for conn in dead:
            self.disconnect(conn, channel)

    async def send_to(self, message: dict, websocket: WebSocket):
        try:
            await websocket.send_json(message)
        except Exception:
            pass


manager = ConnectionManager()


async def websocket_handler(websocket: WebSocket):
    memory: MemoryService = websocket.app.state.memory_service
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            action = data.get("action", "")
            response = await _handle_action(action, data, memory)
            if response:
                await manager.send_to(response, websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket)


async def _handle_action(
    action: str, data: dict, memory: MemoryService
) -> dict | None:
    try:
        if action == "search":
            results = await memory.search(
                query=data.get("query", ""),
                top_k=data.get("top_k", 10),
                filters=data.get("filters"),
            )
            return {
                "type": "search_result",
                "results": [
                    {"episode": ep.dict_summary(), "score": score}
                    for ep, score in results
                ],
                "query": data.get("query", ""),
            }

        elif action == "find_similar":
            results = await memory.find_similar(
                episode_id=data.get("episode_id", ""),
                top_k=data.get("top_k", 5),
            )
            return {
                "type": "similar_result",
                "results": [
                    {
                        "episode": ep.dict_summary(),
                        "score": score,
                        "breakdown": breakdown,
                    }
                    for ep, score, breakdown in results
                ],
            }

        elif action == "get_episode":
            episode = await memory.get_episode(data.get("episode_id", ""))
            if episode:
                return {"type": "episode", "episode": episode.model_dump()}
            return {"type": "error", "message": "Episode not found"}

        elif action == "get_timeline":
            timeline = await memory.get_timeline(data.get("episode_id", ""))
            if timeline:
                return {"type": "timeline", "timeline": timeline}
            return {"type": "error", "message": "Episode not found"}

        elif action == "get_outcomes":
            outcomes = await memory.get_outcomes(data.get("episode_id", ""))
            if outcomes:
                return {"type": "outcomes", "outcomes": outcomes}
            return {"type": "error", "message": "Episode not found"}

        elif action == "generate_lessons":
            lessons = await memory.generate_lessons(
                data.get("episode_id", "")
            )
            if lessons is not None:
                return {"type": "lessons", "lessons": lessons}
            return {"type": "error", "message": "Episode not found"}

        elif action == "analogous":
            results = await memory.find_analogous(
                episode_id=data.get("episode_id", ""),
                top_k=data.get("top_k", 5),
            )
            return {"type": "analogous_result", "results": results}

        elif action == "hybrid_search":
            results = await memory.hybrid_search(
                query=data.get("query", ""),
                top_k=data.get("top_k", 10),
            )
            return {
                "type": "hybrid_search_result",
                "results": [
                    {
                        "episode": ep.dict_summary(),
                        "score": score,
                        "details": details,
                    }
                    for ep, score, details in results
                ],
            }

        elif action == "ping":
            return {
                "type": "pong",
                "timestamp": datetime.utcnow().isoformat(),
            }

        else:
            return {
                "type": "error",
                "message": f"Unknown action: {action}",
            }

    except Exception as e:
        return {"type": "error", "message": str(e)}
