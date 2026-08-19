# MarketAtlas — Backend

> *The intelligence core of MarketAtlas — FastAPI, Celery, PostgreSQL, Redis, and a LangGraph-orchestrated AI agent network that turns geopolitical events into trading signals and powers the ATLAS general intelligence.*

The backend is the primary service of the MarketAtlas monorepo. It ingests geopolitical and market events, links them to real-world entities, fetches live market data from Yahoo Finance, and runs a multi-agent AI pipeline to produce **Buy / Sell / Hold / Short** trading signals — enriched with knowledge-graph context, explainable reasoning, and world-state risk.

It also hosts the **chatbot subsystem** that powers **ATLAS**, the voice-first general intelligence. ATLAS classifies every query as either a MarketAtlas domain intent or a general-reasoning intent, routes it to the right specialist agent (or to the general-purpose `AtlasAgent`), and — when the query touches the world — returns a structured **`VisualizationIntent`** so the frontend globe can show the answer.

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
│  │  Chatbot Subsystem (ATLAS)                             │ │
│  │  ┌───────────┐   ┌──────────────┐   ┌───────────────┐  │ │
│  │  │Intent     │──►│ Specialist    │──►│ LLM providers  │  │ │
│  │  │Router     │   │ Agents (12)   │   │ (OpenAI/Gemini │  │ │
│  │  │           │   │ + AtlasAgent │   │  /Claude/Ollama)│ │ │
│  │  └───────────┘   └──────┬───────┘   └───────────────┘  │ │
│  │                         │                               │ │
│  │  ┌──────────────────────▼────────────────────────────┐  │ │
│  │  │ Visualization extractor (atlas/visualization.py)  │  │ │
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

## The Chatbot Subsystem (ATLAS)

ATLAS is the general intelligence layer. The chatbot subsystem classifies, reasons, and visualizes:

### Agent Ecosystem (13 agents)

| Agent | File | What It Does |
|-------|------|-------------|
| **Intent Router** | `intent_router.py` | Classifies queries into MARKETATLAS intents or the general ATLAS intent |
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
| **AtlasAgent** | `atlas_agent.py` | General-purpose reasoning for non-market questions |

### Intent Routing

`intent_router.py` decides between two worlds:

```
Query
  │
  ├─ MarketAtlas signal?  (market, geo, trade, conflict keywords)
  │     └─► specialist agents (News / Market / Impact / Graph / ...)
  │
  └─ General reasoning?   (science, math, code, philosophy, ...)
        └─► IntentType.ATLAS → AtlasAgent → LLM → natural answer
```

The LLM classification prompt includes a ATLAS category, and a heuristic
`_looks_general()` guard catches obvious general queries even without the LLM.

### Visualization Extraction

`atlas/visualization.py` turns any query into a `VisualizationIntent`:

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

---

## API Overview

| Route Group | Prefix | Key Endpoints |
|------------|--------|---------------|
| Events | `/events` | CRUD, filter, link/unlink entities |
| Entities | `/entities` | CRUD, filter by type/country, search |
| Market Prices | `/market-prices` | CRUD, yfinance fetch, latest/range queries |
| Signals | `/signals` | CRUD, filter by type/status/confidence |
| AI Analysis | `/events/{id}/analyze` | Run AI pipeline → generate signals |
| Free-text | `/analyze` | Ad-hoc sentiment analysis |
| Knowledge Graph | `/events/{id}/knowledge-graph` | KG enrichment |
| Countries | `/countries/{id}` | Overview + news dashboard |
| Dashboard | `/dashboard/summary` | Aggregated platform statistics |
| Globe | `/globe` | Entity relations for globe visualization |
| Auth | `/auth` | Authentication endpoints |
| Backtest | `/backtest` | Backtesting engine |
| AI Chat | `/api/chat` | Chatbot + WebSocket streaming (ATLAS) |
| WebSocket | `/ws` | Real-time event streaming |
| Health | `/health` | Deep health check (DB, Redis) |
| Metrics | `/metrics` | Prometheus metrics endpoint |

Full API documentation at `http://localhost:8000/docs` (Swagger UI).

---

## Quick Start

```bash
# Create and activate virtual environment
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env              # edit with your PostgreSQL credentials

# Run migrations
alembic upgrade head

# (Optional) Seed 32 real-world entities
python seed_real.py

# Start the server
uvicorn app.main:app --reload --port 8000
```

### Background Workers

```bash
# Start Celery worker (separate terminal)
celery -A app.workers.celery_app worker --loglevel=info
# Analysis tasks require ENABLE_WORKERS=True
```

### Testing

```bash
pytest                      # run all tests
pytest --cov=app            # with coverage
pytest tests/test_routes/test_events.py   # single file
```

---

## Project Structure

```
backend/
├── app/
│   ├── main.py                    # FastAPI app + middleware + lifespan
│   ├── config.py                  # Pydantic settings (env-based)
│   ├── database.py                # Async SQLAlchemy engine + session
│   ├── cache.py                   # Redis caching layer
│   ├── serializers.py             # Serialization utilities
│   ├── core/
│   │   └── enums.py               # StrEnum for all categorical fields
│   ├── models/                    # SQLAlchemy ORM models
│   ├── schemas/                   # Pydantic request/response models
│   ├── repositories/              # Data access layer
│   ├── services/                  # Business logic (ai_service, kg_service, ...)
│   ├── routes/                    # API route handlers
│   ├── middleware/                # Logging, metrics, rate limiting
│   ├── workers/                   # Celery background tasks
│   ├── chatbot/                   # ATLAS chatbot subsystem
│   │   ├── agents/                # 13 agents incl. AtlasAgent + intent_router
│   │   ├── atlas/                # visualization.py → VisualizationIntent
│   │   ├── api/                   # Chat REST + WebSocket routes
│   │   ├── llm/                   # LLM provider abstraction
│   │   ├── rag/                   # RAG pipeline (embeddings, vector store)
│   │   ├── knowledge/             # Neo4j knowledge graph client
│   │   ├── memory/                # Short/long-term conversation memory
│   │   └── workflow/              # LangGraph workflow orchestration
│   ├── backtesting/               # Backtesting engine
│   └── geopolitical/              # Geopolitical data pipeline
├── alembic/                       # Database migrations
├── tests/                         # pytest test suite
├── scripts/                       # Utility scripts
├── Dockerfile                     # Production Docker image
├── docker-compose.yml             # Postgres 16 + Redis 7 + app
├── pyproject.toml                 # Build config, ruff, mypy, pytest
└── requirements.txt               # Python dependencies
```