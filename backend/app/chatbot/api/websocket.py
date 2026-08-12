import asyncio
import logging
import uuid
from datetime import datetime

from fastapi import WebSocket, WebSocketDisconnect

from ..workflow.graph import run_chat

logger = logging.getLogger(__name__)

connected_clients: dict[str, WebSocket] = {}
channel_subscriptions: dict[str, set[str]] = {}


async def _entity_market_stats(session, entity_id: int) -> tuple[float, float]:
    """Return (momentum, volatility) computed from the entity's recent closes."""
    from sqlalchemy import select

    from app.models.market_price import MarketPrice

    stmt = (
        select(MarketPrice.close_price)
        .where(MarketPrice.entity_id == entity_id)
        .order_by(MarketPrice.price_date.desc())
        .limit(30)
    )
    result = await session.execute(stmt)
    closes = [float(row[0]) for row in result.all() if row[0] is not None]
    closes.reverse()
    if len(closes) < 2:
        return 0.0, 0.0
    returns = [(b - a) / a for a, b in zip(closes, closes[1:]) if a]
    if not returns:
        return 0.0, 0.0
    momentum = returns[-1]
    volatility = (sum(r * r for r in returns) / len(returns)) ** 0.5
    return round(momentum, 4), round(volatility, 4)


async def _load_latest_signal() -> dict | None:
    """Load the most recent active signal from the DB as a live payload."""
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload

    from app.database import AsyncSessionLocal
    from app.models.signal import Signal

    async with AsyncSessionLocal() as session:
        stmt = (
            select(Signal)
            .options(selectinload(Signal.entity))
            .where(Signal.status == "active")
            .order_by(Signal.created_at.desc())
            .limit(5)
        )
        result = await session.execute(stmt)
        signals = list(result.scalars().all())
        if not signals:
            return None

        s = signals[0]
        ticker = (
            s.entity.ticker_symbols.split(",")[0].strip()
            if s.entity and s.entity.ticker_symbols
            else f"entity_{s.entity_id}"
        )
        momentum, volatility = await _entity_market_stats(session, s.entity_id)
        return {
            "type": "signal",
            "channel": "signals",
            "data": {
                "snapshot": {
                    "symbol": ticker,
                    "momentum": momentum,
                    "volatility": volatility,
                    "volume_status": "normal",
                },
                "impact": {
                    "composite_risk": round(float(s.confidence), 4),
                    "local_severity": 0.0,
                    "entity_count": 1,
                    "relations": [],
                },
                "recommendation": {
                    "action": s.signal_type.upper(),
                    "reason": (s.reasoning[:200] or "MarketAtlas signal"),
                    "confidence": float(s.confidence),
                },
            },
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }


async def _send_signal_updates(client_id: str, websocket: WebSocket):
    while True:
        await asyncio.sleep(10)
        if client_id not in connected_clients:
            break
        if not ("signals" in channel_subscriptions and client_id in channel_subscriptions["signals"]):
            continue
        try:
            payload = await _load_latest_signal()
            if payload is None:
                continue
            await websocket.send_json(payload)
        except Exception:
            break


async def handle_websocket(websocket: WebSocket):
    await websocket.accept()
    client_id = str(uuid.uuid4())
    connected_clients[client_id] = websocket

    signal_task: asyncio.Task | None = None

    try:
        await websocket.send_json({"type": "connected", "client_id": client_id})

        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type", "")

            if msg_type == "subscribe":
                channel = data.get("channel", "")
                if channel:
                    if channel not in channel_subscriptions:
                        channel_subscriptions[channel] = set()
                    channel_subscriptions[channel].add(client_id)
                    await websocket.send_json({
                        "type": "subscribed",
                        "channel": channel,
                    })
                    if channel == "signals" and signal_task is None:
                        signal_task = asyncio.create_task(_send_signal_updates(client_id, websocket))

            elif msg_type == "unsubscribe":
                channel = data.get("channel", "")
                if channel in channel_subscriptions:
                    channel_subscriptions[channel].discard(client_id)

            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})

            else:
                query = data.get("query", "")
                conversation_id = data.get("conversation_id", str(uuid.uuid4()))
                user_id = data.get("user_id", "default")
                stream = data.get("stream", False)

                if not query:
                    await websocket.send_json({"type": "error", "message": "Empty query"})
                    continue

                if stream:
                    await websocket.send_json({
                        "type": "stream_start",
                        "conversation_id": conversation_id,
                    })
                    response = await run_chat(query=query, conversation_id=conversation_id, user_id=user_id)
                    await websocket.send_json({
                        "type": "metadata",
                        "conversation_id": conversation_id,
                        "intent": response.intent.value,
                        "agents_used": response.agents_used,
                        "confidence": response.confidence,
                    })
                    for chunk in response.response.split(". "):
                        await websocket.send_json({"type": "chunk", "text": chunk + ". "})
                    await websocket.send_json({"type": "stream_end"})
                else:
                    response = await run_chat(query=query, conversation_id=conversation_id, user_id=user_id)
                    await websocket.send_json({
                        "type": "response",
                        "conversation_id": conversation_id,
                        "response": response.response,
                        "intent": response.intent.value,
                        "agents_used": response.agents_used,
                        "confidence": response.confidence,
                    })

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
    finally:
        connected_clients.pop(client_id, None)
        for ch in channel_subscriptions.values():
            ch.discard(client_id)
        if signal_task:
            signal_task.cancel()
