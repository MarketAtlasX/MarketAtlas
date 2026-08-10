# MarketAtlas Market Agents

> *Intelligent agents that combine market signals with geopolitical impact to produce actionable trade recommendations.*

A lightweight, modular Python prototype that analyzes geopolitical events, computes market impact, and generates BUY/HOLD/SELL recommendations through a pipeline of specialized agents.

---

## The Triad of Agents

```
                    ┌──────────────────┐
                    │   User Query /   │
                    │   News Event     │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
     ┌────────────┐  ┌────────────┐  ┌────────────┐
     │   Impact   │  │   Market   │  │Recommend.  │
     │ Analysis  │  │    Data    │  │  Engine    │
     │   Agent   │  │   Agent    │  │   Agent    │
     ├────────────┤  ├────────────┤  ├────────────┤
     │ GDELT     │  │ Momentum   │  │ Heuristic  │
     │ ACLED     │  │ Volatility │  │ Rules:     │
     │ EIA       │  │ Volume     │  │ Risk+Moment│
     │ Entity    │  │ YFinance   │  │ → SELL     │
     │ Graph     │  │ AlphaV.    │  │ LowRisk+   │
     │ Severity  │  │ FRED       │  │ Up → BUY   │
     │ Risk      │  │ Cache      │  │ High Vol   │
     │ Score     │  │            │  │ → HOLD     │
     └─────┬──────┘  └─────┬──────┘  └──────┬─────┘
           │               │                │
           └───────────────┼────────────────┘
                           ▼
              ┌──────────────────────┐
              │  Recommendation:     │
              │  BUY / HOLD / SELL   │
              │  + Confidence Score  │
              └──────────────────────┘
```

---

## What Each Agent Does

### Impact Analysis Agent
```python
ImpactAgent()  # Full pipeline: ingest → extract → store → propagate → output
  ├── ingest()       # Fetch from GDELT, ACLED, EIA (with fallback data)
  ├── extract()      # Rule-based entity/relation extraction
  ├── store()        # Build NetworkX directed graph
  ├── propagate()    # Propagate severity across edges with decay
  └── output()       # Summarize graph, persist to Neo4j (optional)
```

### Market Data Agent
```python
MarketDataAgent()
  ├── momentum()           # Compute price momentum
  ├── rolling_volatility() # Compute rolling volatility
  ├── volume_status()      # Classify volume as surge/thin/unknown
  ├── snapshot()           # Full market snapshot
  ├── from_yfinance()      # Fetch live from Yahoo Finance
  └── ingest_from_alpha()  # Fetch from Alpha Vantage (with fallback)
```

### Recommendation Agent
```python
RecommendationAgent()
  └── decide(market_snapshot, impact_score)
      ├── risk > 0.7 AND momentum < 0  → SELL
      ├── risk < 0.3 AND momentum > 0   → BUY
      ├── volatility > 0.04             → HOLD
      └── otherwise                     → HOLD with hedge
```

---

## FastAPI Microservices

Three independent services + a Gateway orchestrator, all with OpenTelemetry tracing, Prometheus metrics, and circuit breakers:

```
┌──────────┐     ┌─────────────┐     ┌──────────────────┐
│  Client  │────►│   Gateway   │────►│  Market Data     │
│          │     │   Service   │     │  /snapshot       │
│          │     │             │────►│  Impact Analysis │
│          │     │  circuit    │     │  /impact         │
│          │     │  breakers   │────►│  Recommendation  │
│          │     │  rate limit │     │  /recommendation │
└──────────┘     └─────────────┘     └──────────────────┘
```

| Service | Port | Endpoint | What It Does |
|---------|------|----------|-------------|
| **Gateway** | Dynamic | `/analyze` | Orchestrates all 3 downstream services |
| **Market Data** | 8001 | `/snapshot` | Returns momentum, volatility, volume |
| **Impact** | 8002 | `/impact` | Runs full geopolitical impact pipeline |
| **Recommendation** | 8003 | `/recommendation` | Returns BUY/HOLD/SELL |
| All | — | `/health`, `/metrics` | Observability |

---

## Key Features

- **Deterministic fallbacks** — All external APIs return realistic mock data when unavailable
- **Best-effort architecture** — Pipeline never breaks if APIs, Neo4j, or databases are unreachable
- **Neo4j persistence** — Impact graphs optionally persist to Neo4j (graceful fallback)
- **OpenTelemetry tracing** — Distributed tracing across all services
- **Prometheus metrics** — Request counts, latency histograms, path-level timing
- **Pybreaker circuit breakers** — Prevent cascading failures in the gateway
- **Slowapi rate limiting** — Protect downstream services from overload
- **Docker Compose** — Full dev environment (Neo4j + RabbitMQ + 3 services)

---

## Quick Start

```bash
# Install with all extras
pip install -e .[dev,neo4j,messaging]

# Run the demo
python main.py

# Run tests
make test
# or
pytest tests/ -v

# Start microservices
make run
# or
uvicorn services.gateway:app --port 8000

# Full Docker environment
docker compose -f docker-compose.dev.yml up
```

---

## Tests (11 passing)

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `test_demo.py` | 1 | Demo runner produces expected keys |
| `test_market_data_agent.py` | 3 | Momentum, volatility, volume edge cases |
| `test_impact_and_recommendation.py` | 2 | Full impact pipeline + all 4 recommendation paths |
| `test_ingest_helpers.py` | 4 | API fallbacks + payload parsing |
| `test_services.py` | 3 | Service health, snapshot, impact, recommendation |
| `test_neo4j_persistence.py` | 1 | Neo4j persistence triggered correctly |
| `test_gateway_service.py` | 1 | Gateway orchestrates all downstream services |

---

## Project Structure

```
market_agents/
├── main.py                       # Demo entry point
├── contracts.py                  # Pydantic models for all APIs
├── types.py                      # Type aliases
├── observability.py              # OpenTelemetry, Prometheus, JSON logging
│
├── impact/
│   └── impact_agent.py           # 5-stage geopolitical impact pipeline
│
├── market_data/
│   └── market_data_agent.py      # Momentum, volatility, volume + 3 data sources
│
├── recommendation/
│   └── recommendation_agent.py   # Heuristic BUY/HOLD/SELL engine
│
├── ingest/
│   ├── market_api.py             # Alpha Vantage + FRED (with fallbacks)
│   ├── impact_api.py             # GDELT + ACLED + EIA (with fallbacks)
│   └── cache/                    # Cached JSON fallback data
│
├── persistence/
│   └── neo4j_client.py           # Optional graph persistence
│
├── graph/
│   └── workflow.py               # LangGraph placeholder
│
├── services/
│   ├── gateway.py                # Orchestrator with circuit breakers
│   ├── market_service.py         # Market snapshot API
│   ├── impact_service.py         # Impact analysis API
│   ├── recommendation_service.py # Recommendation API
│   └── common.py                 # Shared FastAPI app factory
│
├── tests/                        # 11 tests
├── api_specs/                    # OpenAPI 3.0 YAML specs
├── docs/                         # OpenAPI 3.1 JSON schemas + agent event schema
│
├── pyproject.toml
├── requirements.txt
├── Makefile
└── docker-compose*.yml
```

---

## Design Principles

1. **Resilient first** — Every external dependency has a deterministic fallback
2. **Agents as building blocks** — Each agent is independently testable and composable
3. **Observable by default** — OpenTelemetry + Prometheus on every service
4. **Graceful degradation** — No single point of failure takes down the pipeline
5. **Minimal dependencies** — Lightweight Python, no heavy ML frameworks required
6. **Container-native** — Docker Compose for local development and deployment
