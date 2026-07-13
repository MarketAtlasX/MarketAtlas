# Dynamic World State (DWS)

> *The central consciousness of MarketAtlas — a real-time geopolitical and economic state engine that lives, breathes, and evolves.*

**DWS** is the cognitive core that maintains a live, hierarchical model of the world's geopolitical, economic, and market state. It ingests events, computes risk, propagates impacts across countries → regions → sectors, and predicts future state vectors.

---

## Why Dynamic World State?

Markets don't react to news — they react to *change*. DWS quantifies how every event shifts the global state:

```
Event (e.g., "Iran launches missiles")
  ↓
State Delta computed (military_risk +0.15, oil_supply -0.08)
  ↓
Propagated up hierarchy: Country → Region → World
  ↓
Propagated across commodities: Oil → Energy Sector → Global Markets
  ↓
New World Snapshot captured
  ↓
Risk scores recomputed at every level
  ↓
Temporal memory learns the evolution pattern
  ↓
Frontend dashboard updates in real-time
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Dynamic World State                     │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │  Nodes   │  │ Pipeline │  │   Risk   │  │Temporal │ │
│  │(Hierarchy)│  │(Ingest→  │  │ (Scoring)│  │(Memory) │ │
│  │          │  │ Extract→ │  │          │  │         │ │
│  │ World    │  │ Propagate│  │ Global   │  │Sequence │ │
│  │ Region   │  │ →Update→ │  │ Country  │  │Predict  │ │
│  │ Country  │  │ Snapshot │  │ Sector   │  │Forecast │ │
│  │ Sector   │  │          │  │ Aggregate│  │Train    │ │
│  │ Company  │  │          │  │          │  │         │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │           StateRegistry (Singleton)              │   │
│  │  Central consciousness — all state lives here    │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │           FastAPI Server (port 8004)              │   │
│  │  11 REST endpoints for query, ingest, predict    │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## What's Inside

### Core (`core/`)
| Module | What it does |
|--------|-------------|
| `types.py` | Full type system: `StateVector`, `ConfidenceValue`, `StateDelta`, `MultiScaleState`, all sub-state models (Geopolitical, Economic, Market, Infrastructure), `Snapshot`, `WorldSnapshot` |
| `registry.py` | **StateRegistry** — the singleton that IS the world state. Manages all nodes (world, regions, countries, sectors, companies, commodities, markets). Applies deltas, takes snapshots, provides history. |
| `confidence.py` | **ConfidenceEngine** — assigns, decays, and merges confidence scores per data source. Weighted averaging across vectors. |

### Nodes (`nodes/`) — The Hierarchy
| Model | Fields | Purpose |
|-------|--------|---------|
| `WorldState` | 12 global indicators + multi-scale sub-state | The top-level aggregate view |
| `RegionState` | 10 fields (military_risk, trade_tension, energy_dependency, etc.) | Geographic regions |
| `CountryState` | 28 fields (geopolitical_risk, military_activity, oil_production, sanctions, etc.) | Individual nations |
| `SectorState` | 10 fields (sector_risk, supply_chain_disruption, volatility, etc.) | Industry sectors |
| `CompanyState` | 10 fields (operational_risk, financial_risk, sentiment_score, etc.) | Individual companies |

### Pipeline (`pipeline/`) — Event Processing
| Stage | What it does |
|-------|-------------|
| `EventExtractor` | Keyword-based entity extraction from event text. Maps 52 countries, 7 regions, 8 sectors, 6 commodities. Severity inference from 12 keywords (invasion=0.9, ceasefire=-0.6). |
| `RiskPropagator` | Propagates changes up the hierarchy: Country→Region, Commodity→Sector, Region→World, Sector→World. Configurable decay factors. |
| `StateUpdatePipeline` | Full async pipeline stage: normalize → extract → propagate → apply deltas → snapshot. Integrates with the `pipelines` framework. |
| `SnapshotManager` | Manages temporal snapshots (max 10,000, min 5-minute interval). Provides history, export for training. |

### Risk (`risk/`) — Scoring Engine
| Engine | Formula |
|--------|---------|
| `WorldRiskEngine` | Global = Geo(0.35) + Economic(0.25) + Market(0.25) + Infra(0.15). Levels: Critical≥0.8, High≥0.6, Moderate≥0.3, Low<0.3 |
| `RiskAggregator` | Aggregates country→region, country→world, sector summaries |

### Temporal (`temporal/`) — Memory & Prediction
| Mode | How it works |
|------|-------------|
| **Linear** | Averages deltas over recent window, extrapolates forward |
| **Trained LSTM** | 2-layer learned recurrent network with SGD backpropagation |

### Dashboard (`dashboard/`) — Frontend Models
| Model | What it provides |
|-------|-----------------|
| `DashboardState` | Risk gauges, country dashboards, region dashboards, world state vector, prediction. Built from the registry in one call. |

### API (`server.py`) — 11 Endpoints
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/api/world-state/summary` | Full state summary |
| `GET` | `/api/world-state/dashboard` | Dashboard state for frontend |
| `GET` | `/api/world-state/global-risk` | Global risk score + breakdown |
| `GET` | `/api/world-state/countries` | All country states |
| `GET` | `/api/world-state/country/{id}` | Single country state |
| `GET` | `/api/world-state/regions` | Region aggregations |
| `GET` | `/api/world-state/snapshots` | Snapshot history |
| `POST` | `/api/world-state/ingest` | Ingest an event → full pipeline |
| `GET` | `/api/world-state/prediction` | Next predicted state |
| `GET` | `/api/world-state/forecast` | Multi-step forecast |
| `POST` | `/api/world-state/seed` | Seed demo data |

---

## Data Flow Example

```
1. Event arrives: "Russia imposes grain export ban"
2. EventExtractor extracts:
   → Country: Russia
   → Commodity: wheat
   → Severity: 0.7
   → Sector: agriculture
3. StateDelta created: agriculture_risk +0.12, export_capacity -0.15
4. StateRegistry.apply_delta() updates Russia's state
5. RiskPropagator propagates:
   → Russia → Europe Region (wheat supply -0.05)
   → Wheat → Agriculture Sector (input_cost +0.08)
   → Europe Region → World (food_inflation +0.03)
6. SnapshotManager captures full world state
7. WorldRiskEngine recomputes all risk scores
8. TemporalMemory stores the new vector
9. Frontend dashboard refreshes
```

---

## Quick Start

```bash
# Run the server
python run_server.py

# Server starts on http://localhost:8004
# Docs at http://localhost:8004/docs

# Seed demo data
curl -X POST http://localhost:8004/api/world-state/seed

# Check health
curl http://localhost:8004/api/world-state/summary
```

---

## Tests

8 integration tests covering the full system:

```bash
pytest world_state/tests/
# or
python world_state/tests/test_integration.py
```

| Test | What it validates |
|------|------------------|
| `test_registry_basic` | State creation, delta application, vector conversion |
| `test_extraction` | Entity extraction, severity scoring, delta generation |
| `test_propagation` | Hierarchical propagation with decay |
| `test_risk_engine` | Multi-factor risk scoring |
| `test_aggregator` | Region and world aggregation |
| `test_dashboard` | Dashboard model building from registry |
| `test_temporal_memory` | Sequence storage, prediction, training |
| `test_full_pipeline` | End-to-end async event → state pipeline |

---

## Project Structure

```
world_state/
├── __init__.py          # Package exports
├── server.py            # FastAPI with 11 endpoints (port 8004)
├── run_server.py        # Quick launcher
│
├── core/
│   ├── types.py         # 295 lines — all data models
│   ├── registry.py      # StateRegistry singleton
│   └── confidence.py    # Confidence scoring engine
│
├── nodes/
│   ├── world.py         # WorldState (12 global indicators)
│   ├── region.py        # RegionState (10 fields)
│   ├── country.py       # CountryState (28 fields)
│   ├── sector.py        # SectorState (10 fields)
│   └── company.py       # CompanyState (10 fields)
│
├── pipeline/
│   ├── extract.py       # EventExtractor (52 countries, 7 regions, 8 sectors)
│   ├── propagate.py     # RiskPropagator with decay
│   ├── update.py        # StateUpdatePipeline
│   └── snapshot.py      # SnapshotManager (10K snapshots)
│
├── risk/
│   ├── engine.py        # WorldRiskEngine (4-factor composite)
│   └── aggregator.py    # Hierarchical aggregation
│
├── temporal/
│   └── memory.py        # TemporalMemory (linear + trained LSTM)
│
├── dashboard/
│   └── models.py        # DashboardState for frontend
│
└── tests/
    └── test_integration.py  # 8 integration tests
```

---

## Design Principles

1. **Hierarchical by nature** — Countries live in regions, sectors contain commodities, everything aggregates to the world
2. **Event-driven** — Every external event produces a quantifiable state delta
3. **Confidence-aware** — Every value carries a confidence score that decays over time
4. **Temporal by design** — Snapshots create a rich history for prediction and analysis
5. **Risk-first** — All state is reducible to actionable risk scores at every level
6. **Prediction-ready** — Temporal memory learns patterns and forecasts forward
7. **API-native** — Every capability is exposed through REST endpoints

---

## Integration

DWS is consumed by every MarketAtlas component:

```
World State API (port 8004)
├── Frontend (dashboard, risk gauges, country maps)
├── Chat Bot (context for geo-political queries)
├── Pipelines (state update after event processing)
├── Memory Service (world state context for episodes)
└── Market Agents (risk context for recommendations)
```
