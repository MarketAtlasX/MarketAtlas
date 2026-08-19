# MarketAtlas — Frontend

> *A holographic command center for geopolitical trading intelligence. Live risk globe. Causal reasoning. AI agents. Scenario simulation. World memory — and JARVIS, a voice-first general intelligence that drives the particle world core.*

Built with React 19, TypeScript 6, Vite 8, Tailwind CSS 4 and react-router-dom v7. MarketAtlas turns global political, economic and conflict events into actionable trading intelligence through a dark holographic interface, a real-time world state store, and a four-graph intelligence system that shows *why* predictions are made — not just *what* they are.

Above the command center floats **JARVIS** — a general intelligence you talk to. It answers anything, and when your question touches the world it drives the globe through structured **visualization intents**: particles reform into countries, golden streams trace trade routes, and hot zones pulse red.

---

## The Command Center

```
┌──────────────────────────────────────────────────────────────────┐
│  MARKETATLAS  Geopolitical Intelligence      ● LIVE  Risk 62.4  │
├──────┬───────────────────────────────────────────────────────────┤
│      │  Holographic Globe (world / risk / supply / events)        │
│  NAV │  • clickable nodes → focus + events console               │
│  RAIL│  • WebGL bloom, auto-rotate, damped orbit controls        │
│      ├───────────────────────────────────────────────────────────┤
│      │  Command Console                                          │
│      │  LIVE EVENTS │ PROPAGATION │ AI ANALYSIS │ MEMORY │ COMMAND│
│      └───────────────────────────────────────────────────────────┤
├──────┴───────────────────────────────────────────────────────────┤
│  Intelligence Panel (selected country risk, events, market impact)│
└──────────────────────────────────────────────────────────────────┘
```

The globe is the primary interface. Selecting a node focuses the camera and feeds the live event console; the side panel breaks down geopolitical risk, active events and market impact for the selected entity.

## Routes

| Route | Feature | Source |
|---|---|---|
| `/dashboard` | World Command Center (default) | `src/features/world-command/WorldCommandCenter.tsx` |
| `/markets` | Stock forecasts, confidence bands, causal chain | `src/features/markets/MarketsPage.tsx` |
| `/graph` | Causal mini-map + four-graph intelligence system | `src/features/graph-analysis/GraphPage.tsx` |
| `/simulator` | Scenario simulator (clone-simulate-destroy) | `src/features/scenario-simulator/SimulatorPage.tsx` |
| `/memory` | World memory / historical analogues | `src/features/world-memory/MemoryPage.tsx` |

`/` redirects to `/dashboard`.

## Key Features

### Holographic Globe
- Custom `@react-three/fiber` scene: Earth, atmosphere, hologram, grid, rings, satellites, stars
- Four modes — **world** (arcs + heatmap), **risk** (propagation paths), **supply** (arcs), **events** (pulsing event nodes)
- Restrained bloom via `@react-three/postprocessing` — only active intelligence glows
- Clickable nodes with GSAP camera fly-to and hover feedback
- Fail-safe offline texture loading

### Live World State
- `WorldStore` context seeds live events, market signals, risk updates, causal links, agent status and world risk
- Periodic simulation ticks keep agents and risk live in the browser
- WebSocket consumer (`useLiveWorldSocket`) applies `RISK_UPDATE`, `MARKET_FORECAST` and `GRAPH_UPDATE` payloads on top of the seeded state
- Offline-first: every external source has local fallback data

### Command Console
- **Live Events** — severity-coded event cards streaming from the world store
- **Propagation** — ranked causal chains and risk intensity feed
- **AI Analysis** — agent insight cards with confidence
- **World Memory** — searchable analogue archive
- **Command** — an AI asking console with step-by-step analysis timeline and deep links to reasoning graph / simulator / analogues

### Agent Network
- Roster of specialist agents (Risk, Conflict, Energy, Supply Chain, Market, Forecast, ...) with consensus scoring
- Live status matrix: active / analyzing / new insight

### Intelligence Graph System (reused from `src/graph`)
- **Forecast Graph** — D3 line chart with confidence bands (bull / base / bear)
- **Causal Graph** — React Flow knowledge graph with ranked causal paths
- **Reasoning Graph** — agent contribution flow with sentiment coloring and disagreement edges
- **Confidence Graph** — factor decomposition of prediction confidence

### Scenario Simulator (reused from `src/simulation`)
- Clone-simulate-destroy world twin with scenario editor, timeline, probability tree, agent reports, world map, portfolio impact, confidence panel and full report viewer.

## Design System

Tokens in `src/styles/index.css`:

- Background `#030507`, panels `#081018` with subtle radial gradients (`bg-command`)
- Primary accent: cyan `#38e8ff` (holographic)
- States: positive `#2ee6a8`, warning `#f5b941`, critical `#ff4d5e`, neutral `#5f7d99`
- Rule: **don't glow everything** — only active intelligence gets `glow-*` shadows
- Utilities: `panel`, `panel-title`, `hud-corners`, `scanline`, `pulse-dot`, `stream-in`, `shimmer-bar`

## Architecture

```
src/
  main.tsx                    # BrowserRouter + Theme + World providers
  App.tsx                     # Routes
  styles/index.css            # holographic design system
  types/index.ts              # shared live types (LiveEvent, MarketSignal, RiskUpdate, ...)
  stores/WorldStore.tsx       # live world state context + simulation ticks
  services/websocket/         # useLiveWorldSocket (RISK_UPDATE / MARKET_FORECAST / GRAPH_UPDATE)
  features/
    world-command/            # TopStatusBar, NavigationRail, IntelligencePanel,
                              #   AgentStatusMatrix, CommandConsole, CommandInput,
                              #   tabs (LiveEvents / Propagation / AIAnalysis / Memory)
    globe/                    # HolographicGlobe (Canvas + bloom), globeData builders
    agents/                   # agent definitions + status helpers
    markets/                  # MarketsPage, ForecastChart (SVG band chart)
    graph-analysis/           # GraphPage (causal map + IntelligenceGraphPanel)
    scenario-simulator/       # SimulatorPage (wraps SimulationView)
    world-memory/             # MemoryPage (searchable analogue archive)
  components/ui/              # Panel, Badge, Tabs, Gauge, ProgressBar, Sparkline, StatusDot
  globe/                      # 3D engine (Earth, Atmosphere, Hologram, Grid, Stars,
                              #   Rings, Arcs, Nodes, Labels, Satellites, Heatmap, RiskPropagation)
  graph/                      # four-graph intelligence system (reused)
  simulation/                 # scenario simulator (reused)
  data/                       # offline-first country/event/world-state datasets
  api/                        # chat/country/geopolitical clients
  hooks/                      # useClock, useWebSocket, useWorldState
  __tests__/                  # vitest unit + component tests
```

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | React 19 |
| **Language** | TypeScript 6 |
| **Build** | Vite 8 |
| **Routing** | react-router-dom v7 |
| **Styling** | Tailwind CSS 4 |
| **3D Globe** | @react-three/fiber + drei + three |
| **Postprocessing** | @react-three/postprocessing (Bloom) |
| **Graph Visualization** | @xyflow/react (React Flow), d3 |
| **Charts** | Recharts + d3 |
| **Icons** | Lucide React |
| **HTTP** | Axios |
| **Testing** | Vitest + @testing-library/react (jsdom) |

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server (port 3000)
npm run dev

# Build for production (tsc + vite)
npm run build

# Preview production build
npm run preview

# Run unit and component tests
npm test

# Backend services (separate terminals):
cd ../graph_engine && python main.py            # Graph Engine (8005)
cd ../world_state && python -m uvicorn server:app --port 8006
cd ../simulator   && python -m uvicorn main:app --port 8007 --reload
```

## API / Proxy

```
React App (localhost:3000)
  ├── /api                → backend (8000)
  ├── /api/world-state    → World State Engine (8006)
  ├── /api/graph          → Graph Engine (8005)
  ├── /api/simulation/    → Scenario Simulator (8007)
  ├── /ws                 → backend WebSocket
  ├── /ws/graph           → Graph Engine WebSocket (8005)
  └── /ws/simulation      → Simulator WebSocket
```

Every endpoint has an offline mock fallback so the command center stays alive without backends.

## Design Principles

1. **Offline-first** — every external source has realistic local fallback data
2. **Globe-native** — the holographic globe is the primary interface
3. **Dark holographic by default** — designed for professional traders
4. **Live awareness** — seeded world state + WebSocket/polling hybrid
5. **Causal clarity** — every insight is traceable through graph views
6. **Explainable AI** — the four-graph system shows *why* predictions are made
7. **Restrained glow** — only active intelligence emits light
8. **Clone-Simulate-Destroy** — the scenario simulator never mutates live state
