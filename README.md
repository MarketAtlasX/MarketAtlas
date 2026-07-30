# MarketAtlas Scenario Simulator

> *A digital twin of the geopolitical-economic world. Create a hypothetical event — the simulator propagates it through countries, supply chains, sectors, markets, and portfolios. This is not an LLM answering a question. This is a simulation.*

```
Scenario
    │
    ▼
Scenario Builder
    │
    ▼
Dynamic World State Clone ─── Live world is NEVER modified
    │
    ▼
Knowledge Graph Update
    │
    ▼
Risk Propagation ─── Graph traversal with weighted influence decay
    │
    ▼
AI Agent Debate ─── 8 specialist agents + 1 chief intelligence agent
    │
    ▼
Market Impact
    │
    ▼
Confidence Analysis ─── Uncertainty quantification across horizons
    │
    ▼
Interactive Simulation Report
```

---

## Architecture

```
simulator/
│
├── scenario_engine/        # Scenario building & NLP parsing
├── simulation_engine/      # Runner, timeline, Monte Carlo
├── propagation_engine/     # Knowledge graph traversal & risk propagation
├── world_clone/            # Deep-copy world state (never mutates live data)
├── agents/                 # 9 AI specialist agents
├── market_engine/          # Sector beta estimation & volatility forecasting
├── portfolio_engine/       # Portfolio impact calculation
├── confidence/             # Confidence & uncertainty quantification
├── explainability/         # Causal chain & reasoning graph generation
├── counterfactual/         # Assumption modification & sensitivity analysis
├── reports/                # Structured simulation report generation
├── api/                    # REST endpoints & WebSocket handlers
├── models/                 # Core domain objects
└── tests/                  # 13 pytest tests
```

---

## Core Philosophy

### The Clone-Simulate-Destroy Cycle

The simulator **never** modifies the live world state. Every simulation operates on an isolated clone:

```
Live World State
    │
    ├── deepcopy()
    │
    ▼
Simulation World ─── Modify ─── Propagate ─── Forecast ─── Delete
```

When a simulation finishes, the clone is destroyed. Live operations are never corrupted.

### Assumption Graph

Every simulation depends on **explicit, editable assumptions** tied to downstream consequences:

```
China invades Taiwan
    │
    ├── Assumption: U.S. intervenes (70%)
    ├── Assumption: Chip exports stop (90%)
    ├── Assumption: Oil shipping unaffected (40%)
    └── Assumption: No secondary sanctions (30%)
```

Change one assumption → only affected branches are recomputed. This enables:
- **Transparency** — not a black box
- **Sensitivity analysis** — "Which assumption matters most?"
- **Explainability** — every forecast links to concrete assumptions
- **Research contribution** — modeling uncertainty and reasoning, not just predictions

---

## Core Objects

### Scenario
```python
Scenario(
    id="uuid",
    title="China invades Taiwan",
    description="...",
    assumptions=AssumptionGraph(),
    injected_events=[TroopMobilization(), PortClosure(), Sanctions(), ChipExportBan()],
    start_time=datetime(2027, 4, 1),
    duration=timedelta(days=365),
    expected_uncertainty=0.3,
)
```

### AssumptionGraph
```python
graph = AssumptionGraph()
graph.add_assumption(Assumption(id="us_intervention", description="US intervenes militarily", probability=0.7))
graph.toggle_assumption("us_intervention", False)           # Disable it
dependents = graph.get_dependents("us_intervention")         # Find downstream assumptions
ancestors  = graph.get_ancestors("chip_export_ban")           # Trace causal dependency chain
```

### SimulationWorld
```python
world_clone = WorldCloner().create_simulation_world()
world_clone.modify("global_indicators.oil_price", 110.0)     # Change a variable
state = world_clone.get_state()                                # Read current state
world_clone.destroy()                                          # Clean up
```

---

## AI Agent Architecture

The simulator uses **8 specialist agents** + a **Chief Intelligence Agent** that synthesizes their reports.

```
                    ┌─────────────────────┐
                    │     Scenario        │
                    └──────────┬──────────┘
                               │
          ┌────────────────────┼────────────────────┐
          ▼                    ▼                    ▼
   ┌──────────┐        ┌──────────────┐     ┌────────────┐
   │ Conflict │        │   Economic   │     │ SupplyChain│
   │  Agent   │        │    Agent     │     │   Agent    │
   └──────────┘        └──────────────┘     └────────────┘
   ┌──────────┐        ┌──────────────┐     ┌────────────┐
   │  Energy  │        │    Trade     │     │   Cyber    │
   │  Agent   │        │    Agent     │     │   Agent    │
   └──────────┘        └──────────────┘     └────────────┘
   ┌──────────┐        ┌──────────────┐
   │  Market  │        │  Portfolio   │
   │  Agent   │        │    Agent     │
   └──────────┘        └──────────────┘
          │                    │
          └──────────┬─────────┘
                     ▼
            ┌─────────────────┐
            │    Chief        │
            │ Intelligence    │
            │    Agent        │
            └─────────────────┘
                     │
                     ▼
            ┌─────────────────┐
            │ Consensus Report│
            └─────────────────┘
```

Each agent produces a structured assessment:

```python
EnergyAgent.analyze()
# Returns:
# {
#   "oil":  +18%,
#   "gas":   +9%,
#   "confidence": 0.82,
#   "key_risks": ["Strait of Hormuz disruption"],
#   "reasoning_graph": { ... }
# }
```

The **Chief Intelligence Agent** synthesizes all reports into:
- Consensus score
- Sector winners & losers
- Recommended actions
- Key uncertainties
- Overall outlook (Moderately Positive / Cautious / Bearish / Highly Uncertain)

---

## Propagation Engine

The propagation engine performs **graph traversal with weighted influence propagation**:

```
Taiwan → TSMC → Semiconductors → NVIDIA → NASDAQ
  0.9      0.95       0.8         0.6

impact(target) = impact(source) × weight × decay^depth
```

Key features:
- BFS traversal with configurable max depth (default: 10)
- Decay factor (default: 0.85) reduces influence over distance
- Lag days for each edge (e.g., sanctions → market impact takes 30 days)
- Built-in default graph: 13 nodes (countries, companies, sectors, commodities, chokepoints) with 13 edges
- `find_paths(source, target)` — enumerate all causal paths sorted by weight
- `propagate_from(source, impact)` — compute impact reach across the entire graph

---

## Monte Carlo Layer

Instead of a single deterministic simulation, runs **hundreds or thousands** of stochastic paths:

```
Scenario
    │
    ▼
1000 Simulations ── Each samples assumption probabilities & event severity noise
    │
    ▼
Probability Distribution ── p10 / p50 / p90 for each metric at each horizon
    │
    ▼
Confidence-Weighted Final Result
```

Outputs include:
- Mean, median, standard deviation
- 10th and 90th percentiles
- Per-horizon distribution statistics

---

## Simulation Timeline & Multi-Horizon

Simulate across multiple time horizons with calibrated uncertainty:

| Horizon | Typical Uncertainty |
|---------|-------------------|
| 24 hours | Very Low |
| 7 days | Low |
| 30 days | Moderate |
| 90 days | Elevated |
| 180 days | High |
| 365 days | Very High |

Each horizon produces a complete world state snapshot, risk assessment, and agent evaluation.

The timeline engine supports **interpolation** between any two checkpoints.

---

## Counterfactual Engine

One of the most powerful features: change one variable and rerun.

```python
# What if oil goes to $110 instead of $80?
engine.modify_variable(scenario, "global_indicators.oil_price", 110.0)

# What if sanctions are OFF instead of ON?
engine.toggle_assumption(scenario, "sanctions_active", False)

# Sensitivity analysis: which assumption most affects NASDAQ?
engine.sensitivity_analysis(scenario, target_metric="vix_forecast")
```

Returns deltas showing exactly what changed between the original and counterfactual runs.

---

## Explainability

Every prediction answers **why**.

Instead of:
```
Oil +12%
```

Show:
```
Taiwan Blockade
    │
    ▼
Semiconductor Supply
    │
    ▼
Manufacturing Delay
    │
    ▼
Inflation
    │
    ▼
Interest Rates
    │
    ▼
Technology Stocks
```

The causal chain is generated automatically by the `CausalChainBuilder`.

The `ReasoningGraph` builds a full directed graph of all causal relationships across all agent assessments.

---

## REST API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Service health check |
| `/api/simulation/config` | GET | Service configuration |
| `/api/simulation/parse` | POST | Parse natural language into a scenario |
| `/api/simulation/create` | POST | Create a scenario programmatically |
| `/api/simulation/run` | POST | Execute a simulation |
| `/api/simulation/{id}` | GET | Get simulation details |
| `/api/simulation/{id}/timeline` | GET | Timeline with all horizon steps |
| `/api/simulation/{id}/graph` | GET | Reasoning graph (causal chains) |
| `/api/simulation/{id}/agents` | GET | All agent reports |
| `/api/simulation/{id}/report` | GET | Full structured report |
| `/api/simulation/{id}/confidence` | GET | Confidence analysis |
| `/api/simulation/{id}/portfolio` | GET | Portfolio impact |
| `/api/simulation/{id}/branches` | GET | Scenario branching tree |
| `/api/simulation/{id}/counterfactual` | POST | Run counterfactual |
| `/api/simulation/{id}/sensitivity` | POST | Run sensitivity analysis |
| `/api/simulation/` | GET | List all simulations |
| `/api/simulation/{id}` | DELETE | Delete a simulation |

## WebSocket

**Endpoint:** `/ws/simulation`

### Client Messages
| Type | Payload | Description |
|------|---------|-------------|
| `subscribe` | `{ channel: "simulation" }` | Subscribe to simulation events |
| `unsubscribe` | `{ channel: "simulation" }` | Unsubscribe |
| `run_simulation` | `{ scenario_id }` | Trigger async simulation run |
| `ping` | `{}` | Keepalive |

### Server Messages
| Type | Payload | Description |
|------|---------|-------------|
| `connected` | `{ connection_id }` | Connection established |
| `subscribed` | `{ channel }` | Subscription confirmed |
| `progress` | `{ progress, horizon_days, step, total_steps }` | Simulation progress |
| `simulation_started` | `{ simulation_id }` | Simulation begun |
| `simulation_complete` | `{ simulation_id, run_id, summary }` | Simulation finished |
| `chief_report` | `{ simulation_id, report }` | Full chief agent report |

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| **Framework** | FastAPI |
| **Language** | Python 3.10+ |
| **Validation** | Pydantic v2 |
| **Server** | Uvicorn |
| **Randomization** | NumPy |
| **Testing** | Pytest |

---

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Start the server (port 8005)
python -m uvicorn main:app --port 8005 --reload

# Run tests
python -m pytest tests/ -v
```

### Example: Run a simulation via curl

```bash
# Parse a scenario from natural language
curl -X POST http://localhost:8005/api/simulation/parse \
  -H "Content-Type: application/json" \
  -d '{"text": "China invades Taiwan in Q2 2027. US intervenes (70% probability). Chip exports stop (90%). Oil shipping unaffected (40%)."}'

# Create a scenario programmatically
curl -X POST http://localhost:8005/api/simulation/create \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Taiwan Invasion",
    "description": "China invades Taiwan in Q2 2027",
    "events": [
      {"type": "military_conflict", "title": "Invasion", "description": "Amphibious invasion", "countries": ["China", "Taiwan"], "severity": 0.9},
      {"type": "chip_export_ban", "title": "Chip Ban", "description": "TSMC exports halted", "countries": ["Taiwan"], "severity": 0.8}
    ],
    "assumptions": [
      {"id": "us_intervention", "description": "US intervenes militarily", "probability": 0.7},
      {"id": "chip_stop", "description": "Chip exports stop", "probability": 0.9}
    ],
    "duration_days": 365
  }'

# Run the simulation
curl -X POST http://localhost:8005/api/simulation/run \
  -H "Content-Type: application/json" \
  -d '{"scenario_id": "<scenario_id>", "horizons": [0, 7, 30, 90, 180, 365], "monte_carlo_runs": 100}'

# Get the full report
curl http://localhost:8005/api/simulation/<simulation_id>/report
```

---

## Design Principles

1. **Clone-Simulate-Destroy** — The live world is never mutated
2. **Graph-native reasoning** — All propagation happens through knowledge graph traversal
3. **Multi-agent debate** — No single predictor; specialist agents produce structured assessments, synthesized by a chief agent
4. **Explicit assumptions** — Every forecast links to concrete, editable assumptions
5. **Uncertainty quantification** — Monte Carlo distributions, not point estimates
6. **Explainability by default** — Every result includes its causal chain
7. **Counterfactual-first** — "What if X changed?" is a first-class operation
8. **Multi-horizon** — Simulations produce results at 7 standard checkpoints (24h to 1yr)
9. **Episodic memory** — Simulations are stored as episodes for future comparison

---

## Project Structure

```
simulator/
│
├── main.py                         # FastAPI entry point (port 8005)
├── config.py                       # SimulatorConfig with defaults
├── requirements.txt                # Dependencies
│
├── models/                         # Core domain objects
│   ├── scenario.py                 # Scenario, InjectedEvent, AssumptionGraph, EventType
│   ├── simulation.py               # Simulation, SimulationRun, HorizonResult, SimulationEpisode
│   ├── world.py                    # SimulationWorld, WorldClone, WorldStateSnapshot
│   ├── agents.py                   # AgentReport, ChiefReport, ImpactMetric, AgentType
│   ├── timeline.py                 # TimelineStep, TimeHorizon, SimulationTimeline
│   └── propagation.py              # InfluenceEdge, RiskDelta, PropagationPath
│
├── scenario_engine/                # Scenario creation
│   ├── builder.py                  # Fluent ScenarioBuilder API
│   └── parser.py                   # NLP parser (keyword extraction, country/event/assumption detection)
│
├── simulation_engine/              # Simulation execution
│   ├── runner.py                   # Orchestrates agents, propagation, Monte Carlo
│   ├── timeline.py                 # Timeline construction & interpolation
│   └── monte_carlo.py              # Stochastic path sampling with distribution stats
│
├── world_clone/                    # World state isolation
│   ├── cloner.py                   # WorldCloner: fetch → deepcopy → destroy lifecycle
│   └── state.py                    # Simulated world state evolution
│
├── propagation_engine/             # Knowledge graph propagation
│   ├── graph.py                    # KnowledgeGraphTraverser (BFS, path finding, downstream/upstream)
│   └── propagator.py               # RiskPropagator (default graph with 13 nodes & 13 edges)
│
├── agents/                         # AI specialist agents
│   ├── base.py                     # Abstract BaseAgent
│   ├── conflict.py                 # Military escalation assessment
│   ├── economic.py                 # GDP, inflation impact
│   ├── supply_chain.py             # Supply chain disruption analysis
│   ├── energy.py                   # Oil, gas price forecasting
│   ├── trade.py                    # Trade flow disruption
│   ├── cyber.py                    # Cyber threat assessment
│   ├── market.py                   # Equity market, VIX, sector rotation
│   ├── portfolio.py                # Portfolio volatility, drawdown, allocation shifts
│   └── chief.py                    # ChiefIntelligenceAgent (synthesis & consensus)
│
├── market_engine/                  # Market analysis
│   └── estimator.py                # Sector beta estimation, VIX forecasting, correlation shifts
│
├── portfolio_engine/               # Portfolio analysis
│   └── impact.py                   # Allocation-weighted portfolio impact
│
├── confidence/                     # Confidence quantification
│   └── analyzer.py                 # Per-agent, per-horizon, overall confidence + uncertainty trend
│
├── explainability/                 # Causal reasoning
│   ├── graph.py                    # CausalChainBuilder, ReasoningGraph
│   └── causal.py                   # (reserved for advanced causal inference)
│
├── counterfactual/                 # What-if analysis
│   └── engine.py                   # Assumption modification, variable modification, sensitivity analysis
│
├── reports/                        # Report generation
│   └── generator.py                # Full structured report with historical analogues
│
├── api/                            # API layer
│   ├── routes.py                   # 16 REST endpoints
│   ├── schemas.py                  # Pydantic request/response schemas
│   └── websocket.py                # WebSocket connection manager with channel support
│
└── tests/                          # Test suite
    ├── test_scenario.py            # Builder, parser, assumption graph tests
    ├── test_propagation.py         # Graph traversal, propagator, edge/delta tests
    └── test_simulation.py          # Full simulation run, agent reports, horizon results
```

---

## Simulation Report Structure

Every simulation produces a structured report containing:

```
Scenario Summary
    ├── Title, description, duration
    ├── Event count & assumption count
    └── Tags
Timeline
    ├── All horizon checkpoints
    └── Confidence & uncertainty at each step
Agent Reports
    ├── 8 specialist agent assessments
    └── Chief Intelligence synthesis
Risk Evolution
    ├── Per-horizon risk scores
    └── Risk metric trajectories
Sector Winners & Losers
Portfolio Impact
    ├── Total impact percentage
    ├── Sector contribution breakdown
    └── Volatility & correlation estimates
Confidence Analysis
    ├── Overall, chief, Monte Carlo confidence
    ├── Per-agent breakdown
    └── Uncertainty trend (increasing/stable/decreasing)
Assumption Analysis
    ├── Sensitivity scores per assumption
    └── Most sensitive assumption identified
Reasoning Graph
    └── Full causal chain directed graph
Historical Analogues
    └── 4 curated historical events with similarity ratings
Recommended Actions
```
