# MarketAtlas Chat Bot

> *AI-powered geopolitical trading intelligence backend — 13 specialized agents (incl. JARVIS general intelligence), 25 REST endpoints, full offline capability.*

A multi-agent conversational AI system that transforms geopolitical events into actionable trading intelligence — and, through the **JARVIS** intent, answers any general question (science, code, math, history) with the same orchestration. Powered by LangGraph, GeoRAG retrieval, and an explainable AI layer — with every external dependency being fully optional.

---

## The Agent Ecosystem

```
                    ┌─────────────────────────────────────┐
                    │         Intent Router Agent          │
                    │  Classifies query → 1 of 8 intents  │
                    └──────────┬──────────┬───────────────┘
                               │          │
          ┌────────────────────┼──────────┼────────────────────┐
          ▼                    ▼          ▼                    ▼
   ┌────────────┐     ┌────────────┐  ┌────────────┐    ┌───────────┐
   │   News     │     │   Market   │  │   Impact   │    │   Graph   │
   │   Agent    │     │   Agent    │  │   Agent    │    │   Agent   │
   ├────────────┤     ├────────────┤  ├────────────┤    ├───────────┤
   │ Retrieve   │     │ Momentum   │  │ Risk       │    │ KG Query  │
   │ news +     │     │ Volatility │  │ Scoring    │    │ BFS Paths │
   │ entities   │     │ SHAP       │  │ Entities   │    │ Relations │
   └────────────┘     └────────────┘  └────────────┘    └───────────┘
          │                  │               │                 │
          ├──────────────────┼───────────────┼─────────────────┘
          │                  ▼               │
          │       ┌────────────────────┐     │
          │       │ Forecast Agent     │     │
          │       │ Probabilistic      │     │
          │       │ Scenarios          │     │
          │       └────────────────────┘     │
          │                  │               │
          ▼                  ▼               ▼
   ┌────────────┐     ┌────────────┐    ┌───────────┐
   │Recommend.  │     │Simulation  │    │  Report   │
   │   Agent    │     │   Agent    │    │   Agent   │
   │ BUY/HOLD/  │     │ What-If    │    │Intell.    │
   │ SELL       │     │ Scenarios  │    │ Report    │
   └────────────┘     └────────────┘    └───────────┘
          │                  │               │
          └──────────────────┼───────────────┘
                             ▼
                    ┌────────────────────┐
                    │    Debate Agent    │
                    │ Multi-analyst      │
                    │ consensus pipeline │
                    └────────────────────┘
                             │
                             ▼
                    ┌────────────────────┐
                    │ Event Similarity   │
                    │ Agent              │
                    │ Historical analogs │
                    └────────────────────┘
```

---

## 13 AI Agents

| Agent | File | What It Does |
|-------|------|-------------|
| **Intent Router** | `intent_router.py` | Classifies queries into 8 intents: NEWS, MARKET, IMPACT, RECOMMENDATION, SIMULATION, GRAPH, REPORT, SIMILARITY — or the general JARVIS intent |
| **News Agent** | `news_agent.py` | Retrieves relevant news, extracts entities |
| **Market Agent** | `market_agent.py` | Analyzes market data with SHAP-style feature attribution |
| **Impact Agent** | `impact_agent.py` | Geopolitical risk scoring with entity extraction |
| **Graph Agent** | `graph_agent.py` | Knowledge graph queries via BFS pathfinding |
| **Forecast Agent** | `forecast_agent.py` | Probability-weighted multi-scenario forecasts |
| **Recommendation Agent** | `recommendation_agent.py` | BUY/HOLD/SELL with confidence scoring |
| **Simulation Agent** | `simulation_agent.py` | What-if geopolitical scenario simulation |
| **Report Agent** | `report_agent.py` | Structured intelligence report generation |
| **Debate Agent** | `debate_agent.py` | Multi-analyst debate pipeline for consensus |
| **Event Similarity Agent** | `event_similarity_agent.py` | 26-event historical similarity engine |
| **Risk Agent** | `risk_agent.py` | World-state risk interpretation |
| **JarvisAgent** | `jarvis_agent.py` | General-purpose reasoning for non-market questions; returns a `VisualizationIntent` when the answer touches the world |

---

## LangGraph Workflow

```
User Query
  │
  ▼
Intent Router (14-node StateGraph)
  │
  ├── NEWS          → News Agent → LLM → Response
  ├── MARKET         → Market Agent + GeoRAG → LLM → Response
  ├── IMPACT        → Impact Agent + GeoRAG + KG → LLM → Response
  ├── RECOMMENDATION → Rec Agent + Market + Impact → LLM → Response
  ├── SIMULATION    → Simulation Agent → LLM → Response
  ├── GRAPH         → Graph Agent + KG → LLM → Response
  ├── REPORT        → Report Agent + Debate Agent → LLM → Response
  ├── SIMILARITY    → Event Similarity Agent → LLM → Response
  └── JARVIS        → JarvisAgent (general LLM reasoning) → LLM → Response
        │
        ▼
  Explainability Layer (SHAP + Attention + Graph Paths)
        │
        ▼
  Confidence Calculation
        │
        ▼
  Visualization Extractor → VisualizationIntent (drives the frontend globe)
        │
        ▼
  Memory Store (Short-term + Long-term)
        │
        ▼
  Structured ChatResponse
```

---

## GeoRAG: Geographic Retrieval-Augmented Generation

Beyond simple vector search — a multi-dimensional geopolitical retrieval system:

```
Query
  │
  ▼
Intent Classifier → Extracts: entities, sectors, regions, commodities
  │
  ├── News Retriever        → Vector search over news articles
  ├── Market Retriever      → 10 curated market reactions
  ├── Historical Retriever  → 26 curated geopolitical events
  ├── Graph Retriever       → 13-entity knowledge graph with 60+ relationships
  └── Multi Retriever       → Parallel orchestration of all retrievers
        │
        ▼
  Context Builder → Assembles multi-source context
        │
        ▼
  BGE Reranker → Cross-encoder reranking (with keyword fallback)
        │
        ▼
  LLM → Structured Response
```

---

## API Reference — 25 Endpoints

### Chat & Analysis
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/chat` | Main chat endpoint — routes through LangGraph |
| `POST` | `/api/v1/analyze` | Direct analysis without conversation |
| `POST` | `/api/v1/analyze/impact` | Geopolitical impact analysis |
| `POST` | `/api/v1/analyze/market` | Market sentiment analysis |
| `POST` | `/api/v1/analyze/recommendation` | BUY/HOLD/SELL recommendation |
| `POST` | `/api/v1/analyze/forecast` | Scenario forecasting |
| `POST` | `/api/v1/analyze/simulation` | What-if simulation |
| `POST` | `/api/v1/analyze/report` | Intelligence report |
| `POST` | `/api/v1/analyze/debate` | Multi-analyst debate |

### Knowledge & Memory
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/knowledge/entities` | List knowledge graph entities |
| `GET` | `/api/v1/knowledge/entity/{name}` | Entity details with relationships |
| `GET` | `/api/v1/knowledge/path/{source}/{target}` | Multi-hop causal path |
| `GET` | `/api/v1/knowledge/graph` | Full knowledge graph |
| `GET` | `/api/v1/events` | List historical events |
| `GET` | `/api/v1/events/similar/{event_id}` | Find similar events |
| `GET` | `/api/v1/events/compare/{id1}/{id2}` | Compare two events |
| `GET` | `/api/v1/memory/conversations` | Conversation history |
| `DELETE` | `/api/v1/memory/conversations/{id}` | Delete conversation |
| `DELETE` | `/api/v1/memory/conversations` | Clear all conversations |

### Event Memory
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/event-memory/events` | List all stored events |
| `GET` | `/api/v1/event-memory/events/{id}` | Get event details |
| `GET` | `/api/v1/event-memory/similar` | Find similar events to query |
| `POST` | `/api/v1/event-memory/store` | Store a new event |

### System
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Service health |
| `GET` | `/api/v1/analytics` | Usage analytics |

### WebSocket
| Path | Description |
|------|-------------|
| `/ws` | Bidirectional real-time communication |

---

## Explainable AI Layer

| Explainer | Method | What It Produces |
|-----------|--------|-----------------|
| **SHAP Explainer** | `shap_explainer.py` | Feature-level attribution scores for market analysis |
| **Attention Explainer** | `attention_explainer.py` | Token-level attention weights for LLM reasoning |
| **Graph Explainer** | `graph_explainer.py` | BFS-based causal reasoning paths through the knowledge graph |

---

## Historical Event Similarity Engine

| Component | What It Does |
|-----------|-------------|
| `event_data.py` | 26 curated historical events (Iran, Russia-Ukraine, COVID, etc.) |
| `event_embeddings.py` | Pre-computed embeddings for all events |
| `event_similarity.py` | Multi-factor scoring: text 40%, entity 30%, sector 20%, market 10% |
| `event_store.py` | Qdrant synchronization + in-memory fallback |

---

## External Dependencies (All Optional)

| Service | Purpose | Fallback |
|---------|---------|----------|
| **Ollama** (localhost:11434) | LLM inference | MockLLM — full offline capability |
| **Qdrant** (localhost:6333) | Vector search | In-memory vector store |
| **Neo4j** (localhost:7687) | Knowledge graph | In-memory graph (13 entities, 60+ relationships) |
| **PostgreSQL** (localhost:5432) | Conversation persistence | In-memory conversation buffer |

---

## Quick Start

```bash
# Install
pip install -r requirements.txt

# Run the server
python main.py

# Or on Windows
run.bat

# Server starts on http://localhost:8000
# Docs at http://localhost:8000/docs
# WebSocket at ws://localhost:8000/ws
```

---

## Tests (40+ tests)

```bash
pytest tests/ -v
```

| Test File | Tests | What It Validates |
|-----------|-------|------------------|
| `test_chatbot.py` | 19 | All 11 agents + intent router |
| `test_rag_pipelines.py` | 9 | Chunking, embeddings, retrievers, classifiers |
| `test_rag_advanced.py` | 4 | End-to-end pipeline execution |
| `quick_test_rag.py` | 8 | Offline-compatible smoke tests |

---

## Project Structure

```
chat-bot/
├── main.py                       # FastAPI entry point
├── app/
│   ├── agents/                   # 13 AI agents
│   │   ├── intent_router.py      # 8-intent classifier + JARVIS general intent
│   │   ├── news_agent.py         # News retrieval
│   │   ├── market_agent.py       # Market analysis + SHAP
│   │   ├── impact_agent.py       # Geopolitical risk
│   │   ├── graph_agent.py        # KG queries
│   │   ├── forecast_agent.py     # Scenario forecasting
│   │   ├── recommendation_agent.py # BUY/HOLD/SELL
│   │   ├── simulation_agent.py   # What-if scenarios
│   │   ├── report_agent.py       # Intelligence reports
│   │   ├── debate_agent.py       # Multi-analyst debate
│   │   ├── event_similarity_agent.py # Historical analogs
│   │   ├── risk_agent.py         # World-state risk interpretation
│   │   └── jarvis_agent.py       # General-purpose reasoning
│   │
│   ├── jarvis/                   # Visualization intent extraction
│   │   └── visualization.py      # Query → VisualizationIntent
│   │
│   ├── api/                      # 25 REST endpoints + WebSocket
│   ├── event_memory/             # 26-event similarity engine
│   ├── explain/                  # SHAP + Attention + Graph explainers
│   ├── knowledge/                # PostgreSQL + Neo4j clients
│   ├── llm/                      # Ollama + MockLLM
│   ├── memory/                   # Short-term + long-term memory
│   ├── rag/                      # GeoRAG pipeline system
│   ├── workflow/                 # LangGraph StateGraph (14 nodes)
│   └── utils/                    # Constants + metrics
│
├── rag/                          # Full RAG pipeline (7 sub-packages)
│   ├── chunking/                 # 5 text splitting strategies
│   ├── embeddings/               # BGE-M3 encoder
│   ├── ingestion/                # Document ingestion
│   ├── vectorstore/              # Qdrant client
│   ├── retrievers/               # 5 specialized retrievers
│   ├── rerankers/                # BGE cross-encoder
│   ├── historical_memory/        # Event similarity
│   ├── graph_retrieval/          # Neo4j graph queries
│   ├── geo_rag/                  # Intent classifier + context builder
│   └── pipelines/                # 6 production pipelines
│
├── tests/                        # 40+ tests
└── memory_store/                 # Long-term persistence
```

---

## Design Principles

1. **All dependencies are optional** — Works fully offline with realistic MockLLM
2. **Agent-native** — Each agent is a specialized expert, independently testable
3. **Explainable by design** — Every decision traces back through SHAP, attention, and graph paths
4. **Multi-dimensional retrieval** — GeoRAG goes beyond vector search to entity, sector, region, and graph dimensions
5. **LangGraph orchestration** — Stateful, conditional, and debuggable agent workflows
6. **Event memory** — 26 curated historical events for pattern matching and analogies
7. **Conversation-aware** — Short-term buffer + long-term JSON persistence for context maintenance
