# MarketAtlas — Backend

> *The intelligence core of MarketAtlas — FastAPI, Celery, PostgreSQL, Redis, and a LangGraph-orchestrated AI agent network that turns geopolitical events into trading signals and powers the JARVIS general intelligence.*

The backend is the primary service of the MarketAtlas monorepo. It ingests geopolitical and market events, links them to real-world entities, fetches live market data from Yahoo Finance, and runs a multi-agent AI pipeline to produce **Buy / Sell / Hold / Short** trading signals — enriched with knowledge-graph context, explainable reasoning, and world-state risk.

It also hosts the **chatbot subsystem** that powers **JARVIS**, the voice-first general intelligence. JARVIS classifies every query as either a MarketAtlas domain intent or a general-reasoning intent, routes it to the right specialist agent (or to the general-purpose `JarvisAgent`), and — when the query touches the world — returns a structured **`VisualizationIntent`** so the frontend globe can show the answer.

---

## Service Map

| Component | Port | Purpose |
|-----------|------|---------|
| FastAPI app (`app.main`) | 8000 | REST API + WebSocket + middleware (logging, metrics, rate limiting) |
| Celery workers | — | Background analysis tasks (feature-flagged) |
| PostgreSQL 16 | 5432 | Primary store (events, entities, signals, market prices) |
| Redis 7 | 6379 | Cache, Celery broker, rate-limit counters |
| Qdrant | 6333 | Vector store for RAG retrieval |
| Neo4j | 7687 | Knowledge graph (optional enrichment) |

All orchestration is handled by `./dev.sh` at the repo root or `docker-compose` in this directory.

---

## Architecture

```
External events (GDELT, news, market feeds)
        │
        ▼
┌──────────────────── FastAPI (port 8000) ────────────────────┐
│  Middleware: Logging │ Metrics │ Rate Limit                  │
│                                                             │
│  Routes → Services → Repositories → PostgreSQL / Redis      │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Chatbot Subsystem (JARVIS)                             │ │
│  │  ┌───────────┐   ┌──────────────┐   ┌───────────────┐  │ │
│  │  │Intent     │──►│ Specialist    │──►│ LLM providers  │  │ │
│  │  │Router     │   │ Agents (12)   │   │ (OpenAI/Gemini │  │ │
│  │  │           │   │ + JarvisAgent │   │  /Claude/Ollama)│ │ │
│  │  └───────────┘   └──────┬───────┘   └───────────────┘  │ │
│  │                         │                               │ │
│  │  ┌──────────────────────▼────────────────────────────┐  │ │
│  │  │ Visualization extractor (jarvis/visualization.py)  │  │ │
│  │  │ Query → VisualizationIntent (mode, focus, routes)  │  │ │
│  │  └────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
        │
        ▼
   Celery workers ──► yfinance / market_agents / world_state / graph_engine
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | Python 3.12+ |
| Framework | FastAPI |
| ASGI Server | Uvicorn |
| Database | PostgreSQL 16 (async via `asyncpg`) |
| ORM | SQLAlchemy 2.0 (async) |
| Migrations | Alembic |
| Validation | Pydantic v2 + Pydantic Settings |
| Market Data | `yfinance` (Yahoo Finance) with `pandas`/`numpy` |
| AI/ML | LangGraph, LangChain, spaCy, sentence-transformers, Qdrant |
| Task Queue | Celery (Redis broker) |
| Caching | Redis (async via `redis-py`) |
| Knowledge Graph | Neo4j client |
| HTTP Client | `httpx` |
| Observability | Prometheus metrics, structured logging (Loguru) |
| Rate Limiting | In-memory token bucket (200 req/min) |
| Testing | pytest + pytest-asyncio + httpx |
| Containerization | Docker multi-stage build (Python 3.12-slim) |
| Code Quality | Ruff (lint + format), mypy, pre-commit hooks |

---

## The Chatbot Subsystem (JARVIS)

JARVIS is the general intelligence layer. The chatbot subsystem classifies, reasons, and visualizes:

### Agent Ecosystem (13 agents)

| Agent | File | What It Does |
|-------|------|-------------|
| **Intent Router** | `intent_router.py` | Classifies queries into MARKETATLAS intents or the general JARVIS intent |
| **News Agent** | `news_agent.py` | Retrieves relevant news, extracts entities |
| **Market Agent** | `market_agent.py` | Analyzes market data with SHAP-style attribution |
| **Impact Agent** | `impact_agent.py` | Geopolitical risk scoring with entity extraction |
| **Graph Agent** | `graph_agent.py` | Knowledge-graph queries via BFS pathfinding |
| **Forecast Agent** | `forecast_agent.py` | Probability-weighted multi-scenario forecasts |
| **Recommendation Agent** | `recommendation_agent.py` | BUY/HOLD/SELL with confidence scoring |
| **Simulation Agent** | `simulation_agent.py` | What-if geopolitical scenario simulation |
| **Report Agent** | `report_agent.py` | Structured intelligence report generation |
| **Debate Agent** | `debate_agent.py` | Multi-analyst debate pipeline for consensus |
| **Event Similarity Agent** | `event_similarity_agent.py` | Historical-event similarity engine |
| **Risk Agent** | `risk_agent.py` | World-state risk interpretation |
| **JarvisAgent** | `jarvis_agent.py` | General-purpose reasoning for non-market questions |

### Intent Routing

`intent_router.py` decides between two worlds:

```
Query
  │
  ├─ MarketAtlas signal?  (market, geo, trade, conflict keywords)
  │     └─► specialist agents (News / Market / Impact / Graph / ...)
  │
  └─ General reasoning?   (science, math, code, philosophy, ...)
        └─► IntentType.JARVIS → JarvisAgent → LLM → natural answer
```

The LLM classification prompt includes a JARVIS category, and a heuristic
`_looks_general()` guard catches obvious general queries even without the LLM.

### Visualization Extraction

`jarvis/visualization.py` turns any query into a `VisualizationIntent`:

```
"Show me the route from India to Germany"
        └─► mode: route | origin: India | destination: Germany

"Explain general relativity"
        └─► mode: abstract | camera: orbit

"What is happening in Iran?"
        └─► mode: country | focus: [Iran] | camera: zoom_in
```

Priority order: **abstract → route → conflict → risk → network → country → region → globe.**
The same logic is mirrored in the frontend (`inferVisualization`) so the globe
responds instantly even when the backend is offline.

### The VisualizationIntent Contract

Every `ChatResponse` may carry an optional `visualization` field:

```json
{
  "mode": "route",
  "focus": ["India", "Germany"],
  "origin": "India",
  "destination": "Germany",
  "scale": "regional",
  "camera": "pullback",
  "transition": "particle_reform",
  "palette": "ultron",
  "caption": "Trade route from India to Germany"
}
```

| Field | Type | Meaning |
|-------|------|---------|
| `mode` | enum | `core`, `globe`, `country`, `region`, `route`, `network`, `risk`, `conflict`, `abstract` |
| `focus` | string[] | Countries/entities to highlight |
| `origin` | string | Route start (route/network modes) |
| `destination` | string | Route end (route/network modes) |
| `scale` | enum | `global`, `regional`, `country` |
| `camera` | enum | `pullback`, `zoom_in`, `orbit` |
| `transition` | enum | `particle_reform`, `disintegrate`, `reassemble` |
| `palette` | enum | `ultron`, `gold`, `risk`, `core` |
| `caption` | string | Human-readable summary |

These types live in `app/chatbot/models.py` (`VisualMode`, `VisualizationIntent`)
and are mirrored on the frontend in `src/api/chatApi.ts`.