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