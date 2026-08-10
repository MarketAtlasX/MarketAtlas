# MarketAtlas — Graph Engine

> *The intelligence layer that explains **why** predictions are made, not just **what** they are. Four graph systems that make every insight traceable, inspectable, and actionable.*

A FastAPI service (port 8005) that constructs interactive graph visualizations from forecast results, knowledge graph paths, agent reasoning, and confidence decomposition. Serves data to the frontend via REST and WebSocket.

---

## Architecture

```
                    MarketAtlas Intelligence Graph System

                          Live Events
                              │
                    Dynamic World State
                              │
                  Knowledge Graph Engine
                              │
        ┌──────────────┬──────────────┬──────────────┐
        ▼              ▼              ▼              ▼
   Forecast      Causal        Reasoning     Confidence
   Graph         Graph         Graph         Graph
        │              │              │              │
        └──────────────┼──────────────┘              │
                       ▼                             │
                AI Decision Agent                    │
                       │                             │
                       └─────────────┬───────────────┘
                                     ▼
                         Interactive Dashboard
```

Instead of showing "NVIDIA goes up 5%", the Graph Engine shows: **why** (causal paths), **how** (agent reasoning), **how confident** (confidence factors), and **what assumptions matter**.

---

## The Four Graph Systems

### 1. Forecast Graph 📈

The normal stock chart — but with confidence intervals.

```
    Price
160 ┤                         ╭──── Forecast Upper
150 ┤──────────────╮──────────┤
140 ┤              ╰──────────┤ Forecast
130 ┤                         ╰──── Forecast Lower
      Past         Today         Future
```

- Historical price line (solid)
- Predicted price line (dashed)
- Confidence band shading (wider = less certain)
- Past / Today / Future visual separation

### 2. Causal Graph 🔗 ⭐⭐⭐⭐⭐

The biggest innovation. Displays *why* a prediction was made as an interactive knowledge graph.

```
Iran Conflict
    ↓ disrupts supply
Oil Price
    ↓ drives up
Inflation
    ↓ forces up
Interest Rates
    ↓ reduces
Technology Valuation
    ↓ drives
NVIDIA
```

- BFS pathfinding through a 40+ rule knowledge base
- Multiple causal paths ranked by strength
- Every node is interactive — click to inspect
- Color-coded by type (event, country, commodity, sector, company, asset, concept)
- Powered by React Flow on the frontend

### 3. Reasoning Graph 🧠 ⭐⭐⭐⭐⭐

Every AI agent's contribution is visible and inspectable.

```
News Agent          ──→
    (bullish 94%)       │
Conflict Agent      ──→ │
    (neutral 73%)       ├──→ Forecast: NVIDIA
Energy Agent        ──→ │    Consensus: BUY 77%
    (bullish 86%)       │
Market Agent        ──→ │
    (bearish 69%)   ──→ ┘
```

- 10 specialized agents (News, Conflict, Energy, Economic, Supply Chain, Market, Risk, Forecast, Geo-Political, Sentiment)
- Color-coded by sentiment: bullish (green), bearish (red), neutral (gray)
- Disagreement edges between agents (red dashed lines)
- Consensus computation with confidence score
- Confidence bars with percentages

### 4. Confidence Graph 🎯

Factor decomposition instead of a single number.

```
    Confidence: 76%
    │
    ├── Data Quality . . . . . . . . . . . 63%
    ├── Historical Similarity . . . . . . . 84%
    ├── Agent Agreement . . . . . . . . . . 55%
    ├── World State Stability . . . . . . . 93%
    └── Market Volatility . . . . . . . . . 74%
```

- 5 factors with weighted contributions
- Each factor has a natural language description explaining *why* the system is confident or uncertain
- Overall confidence bar with color gradient (red → amber → green)

---

## Data Flow

```
Live Events
    ↓
Data Agents (News, Conflict, Energy, Supply Chain, Market)
    ↓
Dynamic World State (World → Region → Country → Sector → Company)
    ↓
Forecast Agent
    ↓
Graph Engine (this service)
    │
    ├── REST API (port 8005)
    └── WebSocket (port 8005/ws/graph)
         │
         └── Frontend (React Flow + D3.js)
```

## Causal Knowledge Base

The Graph Engine includes a built-in knowledge base of 40+ causal rules spanning:

| Domain | Rules |
|--------|-------|
| Geopolitical Conflicts | Iran Conflict → Oil Price, Strait of Hormuz, Middle East Instability, Defense Spending |
| Energy Economics | Oil Price → Inflation, Energy Sector, Transportation, Oil Producers Revenue |
| Monetary Policy | Inflation → Interest Rates, Consumer Spending, Central Bank Policy, Bond Yields |
| Technology Markets | Interest Rates → Technology Valuation, USD Strength, Housing Market |
| Supply Chains | China → Foxconn → iPhone Production → Apple Supply Chain → Apple |
| Semiconductors | Taiwan Stability → TSMC Production → Semiconductors → Tech Sector → NVIDIA |
| Trade & Sanctions | Sanctions → Oil Price, Global Trade, Energy Sector |

---

## API Endpoints

### REST

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/graph/health` | Health check |
| `GET` | `/api/graph/forecast` | Forecast graph (params: symbol, company_name, current_price) |
| `GET` | `/api/graph/causal` | Causal graph (params: root_event, target_asset, max_paths) |
| `GET` | `/api/graph/reasoning` | Agent reasoning graph (params: target) |
| `GET` | `/api/graph/confidence` | Confidence decomposition (params: target, prediction_value, prediction_direction) |
| `GET` | `/api/graph/all` | All four graphs at once (params: symbol, company_name, current_price, root_event, target_asset) |

### WebSocket

| Endpoint | Description |
|----------|-------------|
| `ws://host:8005/ws/graph` | Real-time graph updates |

**WebSocket Message Types:**
| Type | Payload | Response |
|------|---------|----------|
| `get_forecast` | `{ symbol, company_name, current_price }` | `forecast_update` |
| `get_causal` | `{ root_event, target_asset, max_paths }` | `causal_update` |
| `get_reasoning` | `{ target }` | `reasoning_update` |
| `get_confidence` | `{ target, prediction_value, prediction_direction }` | `confidence_update` |
| `get_all` | `{ symbol, company_name, current_price, root_event, target_asset }` | `all_graphs_update` |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | FastAPI |
| **Server** | Uvicorn |
| **Validation** | Pydantic v2 |
| **Graph Algorithms** | Custom BFS + DFS pathfinding, 4 layout engines (hierarchical, radial, force-directed, tree) |
| **WebSocket** | FastAPI WebSocket + custom manager |
| **Testing** | pytest (8 tests, all passing) |
| **Configuration** | Pydantic Settings (env prefix: `GRAPH_ENGINE_`) |

---

## Project Structure

```
graph_engine/
├── __init__.py              # Package init
├── main.py                  # FastAPI app entry point (port 8005)
├── config.py                # Pydantic Settings
├── requirements.txt         # Python dependencies
│
├── models/
│   └── graph_models.py      # Pydantic models for all graph types (16+ models)
│
├── builder/                  # ★ Graph construction logic
│   ├── graph_builder.py     # Orchestrator — builds all 4 graphs
│   ├── forecast_builder.py  # Forecast time series with confidence bands
│   ├── causal_builder.py    # Knowledge-base causal path finding (BFS, 40+ rules)
│   ├── reasoning_builder.py # Agent reasoning graph (10 agents, consensus)
│   └── confidence_builder.py # Confidence factor decomposition (5 factors)
│
├── api/
│   ├── routes.py            # REST endpoints (6 routes)
│   └── websocket.py         # WebSocket manager (7 message types)
│
├── layouts/
│   └── layout_engine.py     # 4 layout algorithms (hierarchical, radial, force, tree)
│
└── tests/
    └── test_graph_engine.py  # 8 smoke tests (all passing)
```

---

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Start server (port 8005)
python main.py

# Verify
curl http://localhost:8005/api/graph/health
```

### Test All Endpoints

```bash
# Forecast Graph
curl "http://localhost:8005/api/graph/forecast?symbol=NVDA&company_name=NVIDIA&current_price=880"

# Causal Graph (the key innovation)
curl "http://localhost:8005/api/graph/causal?root_event=Iran%20Conflict&target_asset=NVIDIA&max_paths=5"

# Reasoning Graph
curl "http://localhost:8005/api/graph/reasoning?target=NVIDIA"

# Confidence Graph
curl "http://localhost:8005/api/graph/confidence?target=NVIDIA&prediction_value=900&prediction_direction=bullish"

# All Four Graphs At Once
curl "http://localhost:8005/api/graph/all?symbol=AAPL&company_name=Apple&current_price=210&root_event=China&target_asset=Apple"
```

### Run Tests

```bash
pytest tests/ -v
```

---

## Integration with Frontend

The Graph Engine is designed to work with the MarketAtlas frontend (port 3000):

```
Frontend (Vite proxy)
  │
  ├── /api/graph/*       → http://localhost:8005
  │
  └── /ws/graph          → ws://localhost:8005
```

The frontend's `IntelligenceGraphPanel` component (in `frontend/src/graph/`) shows all four graph views in a tabbed interface with real-time WebSocket updates.

---

## Design Principles

1. **Explainable by default** — Every prediction is a graph you can inspect, not a number you trust blindly
2. **World-state-first** — Predict the evolution of the world state, then derive stock forecasts from it
3. **Causal transparency** — Show the causal chain from event to asset, ranked by strength
4. **Multi-agent visibility** — Every AI agent's reasoning is visible, including disagreements
5. **Confidence decomposition** — Break confidence into factors so users understand uncertainty
6. **Real-time by default** — WebSocket push for live graph updates
7. **Offline-capable** — Built-in knowledge base with 40+ causal rules works without external databases
