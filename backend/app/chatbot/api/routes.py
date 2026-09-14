import json
import logging
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from fastapi.responses import StreamingResponse

from ...services.financial_data_service import FinancialDataService
from ..event_memory.event_schema import HistoricalEvent
from ..event_memory.event_store import event_store
from ..explain.attention_explainer import AttentionExplainer
from ..explain.graph_explainer import GraphExplainer
from ..explain.shap_explainer import SHAPExplainer
from ..knowledge.neo4j_client import Neo4jClient
from ..memory.short_term import short_term_memory
from ..models import ChatRequest, RiskIndexRequest, SimilarityRequest
from ..rag.vector_store import search_knowledge
from ..workflow.graph import run_chat
from .data import COUNTRIES, COUNTRIES_BY_CODE, MILITARY_RELATIONS, PORTS, TRADE_ROUTES
from app.config import settings
from app.models.user import User
from app.services.auth_service import get_current_user

logger = logging.getLogger(__name__)

chat_router = APIRouter(prefix="/api/v1/chat")
_financial_service = FinancialDataService()


class AgentTurnRequest(BaseModel):
    messages: list[dict[str, Any]] = Field(default_factory=list, max_length=24)
    tools: list[dict[str, Any]] = Field(default_factory=list, max_length=64)
    context: dict[str, Any] = Field(default_factory=dict)


# Canonical Atlas tool allow-list. The provider may only choose from these —
# clients cannot register arbitrary tools through the API.
ATLAS_TOOL_ALLOW_LIST = frozenset({
    "rotate_to_location", "zoom_to_location", "focus_country", "focus_city",
    "focus_region", "select_country", "select_event", "select_company",
    "highlight_entities", "clear_highlights", "show_globe_layer", "hide_globe_layer",
    "trace_route", "show_connections", "reset_globe",
    "show_stock", "show_stock_chart", "compare_stocks", "show_index",
    "show_sector", "show_commodity", "show_currency", "show_market", "show_watchlist",
    "open_panel", "close_panel", "focus_panel", "switch_tab", "set_timeframe",
    "search_market", "change_view",
    "analyze_event", "analyze_geopolitical_risk", "trace_market_impact",
    "trace_supply_chain", "analyze_company_exposure", "compare_scenarios",
    "summarize_market",
})


def _filter_allowed_tools(tools: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Keep only tools whose function name is on the canonical allow-list."""
    allowed: list[dict[str, Any]] = []
    for tool in tools:
        fn = tool.get("function") if isinstance(tool, dict) else None
        name = fn.get("name") if isinstance(fn, dict) else None
        if (
            isinstance(name, str)
            and name in ATLAS_TOOL_ALLOW_LIST
            and name.isidentifier()
        ):
            allowed.append(tool)
    return allowed


@chat_router.post("/agent/turn")
async def agent_turn(request: AgentTurnRequest, current_user: User = Depends(get_current_user)):
    """Execute one structured Atlas agent turn using the configured provider.

    Tool execution remains client-side because the tools control the browser and
    globe. The provider only chooses from the canonical server-side allow-list and
    receives structured results on subsequent turns.
    """
    if not settings.openai_api_key:
        raise HTTPException(status_code=503, detail="Structured Atlas provider unavailable")

    tools = _filter_allowed_tools(request.tools)
    if not tools:
        raise HTTPException(
            status_code=400,
            detail="No tools from the canonical allow-list were supplied",
        )

    system = (
        "You are Atlas, the operator of a globe-first financial intelligence application. "
        "Use tools when visual action or evidence retrieval helps answer the user. "
        "You may only call supplied tools. Never invent prices, events, confidence, or sources. "
        "After tool results, continue selecting tools until the request is complete. "
        "Give concise user-facing narration, never hidden chain-of-thought. "
        f"Current application context: {json.dumps(request.context, default=str)}"
    )
    messages = [
        {"role": "system", "content": system},
        *[
            {
                "role": message.get("role"),
                "content": message.get("content"),
                **({"tool_call_id": message["tool_call_id"]} if message.get("tool_call_id") else {}),
                **({"tool_calls": message["tool_calls"]} if message.get("tool_calls") else {}),
            }
            for message in request.messages
            if message.get("role") in {"user", "assistant", "tool"} and (message.get("content") is not None or message.get("tool_calls"))
        ],
    ]
    payload = {
        "model": "gpt-4o-mini",
        "messages": messages,
        "tools": tools,
        "tool_choice": "auto",
        "temperature": 0.2,
        "max_tokens": 700,
    }
    try:
        async with httpx.AsyncClient(timeout=35) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.openai_api_key}", "Content-Type": "application/json"},
                json=payload,
            )
        response.raise_for_status()
        message = response.json().get("choices", [{}])[0].get("message", {})
        return {"message": message, "provider": "openai"}
    except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError) as exc:
        logger.warning("Structured Atlas provider failed: %s", exc)
        raise HTTPException(status_code=502, detail="Structured Atlas provider unavailable") from exc


@chat_router.post("")
async def chat(request: ChatRequest):
    from ..llm.provider import mock_fallback_used, reset_mock_fallback_flag

    reset_mock_fallback_flag()
    try:
        response = await run_chat(
            query=request.query,
            conversation_id=request.conversation_id,
            user_id=request.user_id,
        )
        if mock_fallback_used():
            response.response += (
                "\n\n[Simulated response — no intelligence provider was available, "
                "so this is placeholder text, not real analysis.]"
            )
            response.data_status = "unavailable"
            response.limitations = [
                "No real intelligence provider produced this response; it is a placeholder fallback."
            ]
        return response
    except Exception as e:
        logger.error(f"Chat error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@chat_router.post("/stream")
async def chat_stream(request: ChatRequest):
    response = await run_chat(
        query=request.query,
        conversation_id=request.conversation_id,
        user_id=request.user_id,
    )

    async def generate():
        yield json.dumps({
            "conversation_id": response.conversation_id,
            "intent": response.intent.value,
            "agents_used": response.agents_used,
            "confidence": response.confidence,
            "sources": response.sources,
        }) + "\n"
        words = response.response.split(" ")
        for i in range(0, len(words), 4):
            yield json.dumps({"chunk": " ".join(words[i:i + 4]) + " "}) + "\n"
        yield json.dumps({"done": True}) + "\n"

    return StreamingResponse(generate(), media_type="application/x-ndjson")


@chat_router.get("/history")
async def history(limit: int = 20, user_id: str = "1"):
    try:
        from app.services.chat_history import get_recent_messages, list_conversations

        convs = await list_conversations(user_id, limit=limit)
        return [
            {
                "id": c.id,
                "query": c.title,
                "intent": None,
                "confidence": None,
                "created_at": c.created_at.isoformat(),
            }
            for c in convs
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@chat_router.get("/history/{conversation_id}")
async def conversation_messages(conversation_id: str, limit: int = 20):
    try:
        from app.services.chat_history import get_recent_messages

        messages = await get_recent_messages(conversation_id, limit=limit)
        return {"conversation_id": conversation_id, "messages": messages}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@chat_router.get("/memory/{conversation_id}")
async def get_memory(conversation_id: str):
    history = short_term_memory.get_history(conversation_id)
    return {"conversation_id": conversation_id, "turns": len(history), "history": history}


@chat_router.get("/knowledge/search")
async def knowledge_search(q: str, limit: int = 5):
    results = search_knowledge(q, limit)
    return {"query": q, "results": results}


@chat_router.get("/graph/{entity}")
async def graph_query(entity: str):
    client = Neo4jClient()
    if not client.available:
        return {"entity": entity, "error": "Neo4j not available", "relations": []}
    relations = client.get_relations(entity)
    return {"entity": entity, "relations": relations}


@chat_router.get("/events")
async def list_events(
    skip: int = Query(0, description="Number of events to skip"),
    limit: int = Query(20, description="Max events to return"),
    type: str = Query(None, description="Filter by event type"),
    severity: str = Query(None, description="Filter by severity"),
):
    from sqlalchemy import select

    from app.database import AsyncSessionLocal
    from app.models.live_event import LiveEvent

    async with AsyncSessionLocal() as db:
        query = select(LiveEvent).order_by(LiveEvent.first_seen_at.desc())
        if type:
            query = query.where(LiveEvent.event_type == type)
        if severity:
            buckets = {"critical": (9.0, 10.1), "high": (7.0, 9.0), "medium": (4.0, 7.0), "low": (0.0, 4.0)}
            lo, hi = buckets.get(severity.lower(), (None, None))
            if lo is not None:
                query = query.where(LiveEvent.severity >= lo, LiveEvent.severity < hi)
        total = len((await db.execute(query)).scalars().all())
        items = (await db.execute(query.offset(skip).limit(limit))).scalars().all()

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": [
            {
                "id": ev.id,
                "title": ev.title,
                "description": ev.description,
                "event_type": ev.event_type,
                "severity": str(ev.severity),
                "status": ev.status,
                "event_date": ev.event_date.isoformat() if ev.event_date else None,
                "source": ev.source,
                "lat": ev.lat,
                "lng": ev.lng,
                "country_code": ev.country_code,
            }
            for ev in items
        ],
    }


@chat_router.get("/events/{event_id}")
async def get_event(event_id: str):
    from sqlalchemy import select

    from app.database import AsyncSessionLocal
    from app.models.live_event import LiveEvent

    async with AsyncSessionLocal() as db:
        ev = (await db.execute(select(LiveEvent).where(LiveEvent.id == event_id))).scalar_one_or_none()
    if ev is not None:
        return {
            "id": ev.id,
            "title": ev.title,
            "description": ev.description,
            "event_type": ev.event_type,
            "severity": str(ev.severity),
            "status": ev.status,
            "event_date": ev.event_date.isoformat() if ev.event_date else None,
            "source": ev.source,
            "lat": ev.lat,
            "lng": ev.lng,
            "country_code": ev.country_code,
        }
    event = event_store.get_event_by_id(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@chat_router.post("/events")
async def add_event(event: HistoricalEvent):
    event_store.add_event(event)
    return {"status": "added", "event_id": event.id, "name": event.name}


@chat_router.post("/similarity")
async def find_similar_events(request: SimilarityRequest):
    result = event_store.find_similar(
        query=request.query,
        top_k=request.top_k,
        min_score=request.min_score,
        sector_filter=request.sector_filter,
        event_type_filter=request.event_type_filter,
    )
    return result


@chat_router.get("/similarity/events")
async def list_historical_events():
    return {"events": [e.model_dump() for e in event_store.events]}


@chat_router.post("/explain/shap")
async def explain_shap(query: str, prediction: str = ""):
    explainer = SHAPExplainer()
    result = explainer.explain(prediction=prediction, context={"query": query})
    shap = result.shap
    if shap:
        return shap.model_dump()
    return {"prediction": prediction, "contributions": []}


@chat_router.post("/explain/attention")
async def explain_attention(query: str = "", entities: str = "", sectors: str = ""):
    explainer = AttentionExplainer()
    entity_list = [e.strip() for e in entities.split(",") if e.strip()] if entities else []
    sector_list = [s.strip() for s in sectors.split(",") if s.strip()] if sectors else []
    result = explainer.explain(context={"query": query, "entities": entity_list, "sectors": sector_list})
    attn = result.attention
    if attn:
        return attn.model_dump()
    return {"query": query, "top_events": [], "top_features": []}


@chat_router.post("/explain/graph")
async def explain_graph(query: str = "", entities: str = ""):
    explainer = GraphExplainer()
    entity_list = [e.strip() for e in entities.split(",") if e.strip()] if entities else []
    result = explainer.explain(context={"query": query, "entities": entity_list})
    graph = result.graph
    if graph:
        return graph.model_dump()
    return {"start_entity": "", "path": []}


@chat_router.get("/intelligence/market")
async def market_intelligence(
    ticker: str = Query("SPY"),
    include_profile: bool = Query(True),
    include_news: bool = Query(True),
    days: int = Query(30),
):
    result: dict = {}
    try:
        if include_profile:
            profile = _financial_service.get_company_profile(ticker)
            if profile:
                result["profile"] = profile
        if include_news:
            news = _financial_service.get_market_news(ticker, limit=5)
            if news:
                result["news"] = news
        quote = _financial_service.get_stock_quote(ticker)
        if quote:
            result["quote"] = quote
        history = _financial_service.get_price_history(ticker, days=days)
        if history:
            result["price_history"] = history
    except Exception as e:
        logger.error(f"Market intelligence error: {e}")
    if not result:
        raise HTTPException(status_code=503, detail="Financial data service unavailable")
    return {"ticker": ticker.upper(), "data": result}


@chat_router.get("/intelligence/country")
async def country_brief(
    country: str = Query(..., description="Country name"),
    include_tickers: bool = Query(True),
    days: int = Query(30),
):
    country_map = {
        "usa": {"name": "United States", "tickers": ["SPY", "QQQ", "DIA"]},
        "us": {"name": "United States", "tickers": ["SPY", "QQQ", "DIA"]},
        "india": {"name": "India", "tickers": ["INDA", "IFN"]},
        "china": {"name": "China", "tickers": ["FXI", "MCHI", "KWEB"]},
        "japan": {"name": "Japan", "tickers": ["EWJ", "DXJ"]},
        "uk": {"name": "United Kingdom", "tickers": ["EWU", "FKU"]},
        "germany": {"name": "Germany", "tickers": ["EWG", "DXGE"]},
        "france": {"name": "France", "tickers": ["EWQ"]},
        "russia": {"name": "Russia", "tickers": ["RSX"]},
        "brazil": {"name": "Brazil", "tickers": ["EWZ", "BRZU"]},
        "canada": {"name": "Canada", "tickers": ["EWC"]},
        "australia": {"name": "Australia", "tickers": ["EWA"]},
        "saudi arabia": {"name": "Saudi Arabia", "tickers": ["KSA"]},
        "south korea": {"name": "South Korea", "tickers": ["EWY"]},
        "taiwan": {"name": "Taiwan", "tickers": ["EWT"]},
    }
    key = country.lower().strip()
    info = country_map.get(key, {"name": country.title(), "tickers": []})
    result = {"country": info["name"]}
    if include_tickers and info["tickers"]:
        quotes = []
        for t in info["tickers"]:
            try:
                q = _financial_service.get_stock_quote(t)
                if q:
                    quotes.append({"ticker": t, "quote": q})
            except Exception:
                pass
        if quotes:
            result["market_data"] = quotes
    return result


@chat_router.get("/countries")
async def list_countries():
    return COUNTRIES


@chat_router.get("/countries/{code}")
async def get_country(code: str):
    c = COUNTRIES_BY_CODE.get(code.upper())
    if not c:
        raise HTTPException(status_code=404, detail="Country not found")
    return c


@chat_router.get("/countries/{code}/relations/trade")
async def country_trade_routes(code: str):
    upper = code.upper()
    return [r for r in TRADE_ROUTES if r["from"] == upper or r["to"] == upper]


@chat_router.get("/countries/{code}/relations/military")
async def country_military_relations(code: str):
    upper = code.upper()
    return [r for r in MILITARY_RELATIONS if r["countryA"] == upper or r["countryB"] == upper]


@chat_router.get("/countries/{code}/ports")
async def country_ports(code: str):
    upper = code.upper()
    return [p for p in PORTS if p["countryCode"] == upper]


@chat_router.get("/relations/trade")
async def all_trade_routes():
    return TRADE_ROUTES


@chat_router.get("/relations/military")
async def all_military_relations():
    return MILITARY_RELATIONS


@chat_router.get("/ports")
async def all_ports():
    return PORTS


@chat_router.get("/risk/{ticker}")
async def get_risk_index(ticker: str):
    from ..agents.risk_agent import RiskAgent
    agent = RiskAgent()
    risk = await agent._compute_risk_index(ticker.upper())
    return risk.model_dump()


@chat_router.post("/risk")
async def risk_index(body: RiskIndexRequest):
    from ..agents.risk_agent import RiskAgent
    agent = RiskAgent()
    risk = await agent._compute_risk_index(body.ticker.upper())
    return risk.model_dump()


@chat_router.get("/health")
async def health():
    return {"status": "ok", "service": "MarketAtlas Chat"}
