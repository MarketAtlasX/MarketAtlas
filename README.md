# MarketAtlas — Frontend

> *An AI-powered geopolitical trading intelligence command center. Interactive globe. Real-time signals. Causal reasoning. Four-graph intelligence system. All in one dashboard.*

Built with React 19, TypeScript 6, Vite 8, and Tailwind CSS v4 — MarketAtlas transforms global political, economic, and conflict events into actionable trading intelligence through a stunning 3D interface and a four-graph Intelligence System that reveals *why* predictions are made, not just *what* the predictions are.

---

## What's New: Scenario Simulator ⚡

The frontend now includes a full **Scenario Simulator** — a digital twin of the geopolitical-economic world accessed via the **Simulator** button in the header.

```
┌────────────────────────────────────────────────┐
│           Scenario Simulator View              │
├──────────┬─────────────────────────────────────┤
│  Sidebar │          Main Panel                 │
│          │                                     │
│  ▸ Scenario│  ┌─────────────────────────────┐  │
│    Editor │  │   Scenario Builder           │  │
│          │  │   ┌─────────────────────┐   │  │
│  ▸ Simul- │  │   │ Title, Description │   │  │
│    ation  │  │   │ Events, Assumptions│   │  │
│          │  │   │ Duration,Uncertainty│   │  │
│  ▸ Report │  │   └─────────────────────┘   │  │
│          │  │                             │  │
│  Refresh │  │   [▶ Run Simulation]        │  │
│          │  └─────────────────────────────┘  │
│          │                                     │
│          │  ┌─────────────────────────────┐  │
│          │  │   Simulation Results        │  │
│          │  │   • Horizon overview        │  │
│          │  │   • Confidence breakdown    │  │
│          │  │   • Agent reports           │  │
│          │  │   • Timeline chart          │  │
│          │  │   • Scenario tree           │  │
│          │  │   • Portfolio impact        │  │
│          │  │   • Full report             │  │
│          │  └─────────────────────────────┘  │
└──────────┴─────────────────────────────────────┘
```

### 9 Simulation Components

| Component | What It Does |
|-----------|-------------|
| **ScenarioEditor** | Build scenarios with events, assumptions, duration, uncertainty; NLP text parsing |
| **Timeline** | Line chart (confidence/uncertainty/risk over 7 horizons) + interactive step indicators |
| **ProbabilityTree** | Branch visualization with optimistic/pessimistic alternatives for each assumption |
| **ImpactGraph** | Sortable impact metrics with direction color-coding and confidence bars |
| **AgentPanel** | Accordion-style specialist agent reports with impact lists, risks, opportunities |
| **WorldMap** | Country severity grid showing affected nations with risk score overlays |
| **PortfolioImpact** | Pie chart (sector allocation) + bar chart (sector impact) + risk/opportunity lists |
| **ConfidencePanel** | Radar chart (agent distribution) + bar chart (confidence vs uncertainty by horizon) |
| **ReportViewer** | Collapsible full simulation report: summary, timeline, agents, confidence, portfolio, reasoning graph, historical analogues, recommended actions |

### API Integration

```
/api/simulation/*   → proxy → Scenario Simulator (localhost:8005)
/ws/simulation      → proxy → Simulator WebSocket (localhost:8005)
```

---

## The Command Center

```
                    ┌──────────────────────────────────────────┐
                    │           MarketAtlas Dashboard            │
                    ├──────────┬──────────┬─────────────────────┤
                    │  Header  │ Country  │  Theme              │
                    │  Logo    │   Nav    │  Toggle             │
                    ├──────────┴──────────┴─────────────────────┤
                    │                                            │
                    │  ┌──────────────────────┐  ┌───────────┐  │
                    │  │                      │  │ Country   │  │
                    │  │   3D Interactive     │  │ Markets   │  │
                    │  │      Globe.gl        │  ├───────────┤  │
                    │  │                      │  │ Signal    │  │
                    │  │  10 Visualization    │  │ Dashboard │  │
                    │  │      Modes           │  ├───────────┤  │
                    │  │                      │  │ Events    │  │
                    │  │  Default / Events /  │  │ Timeline  │  │
                    │  │  Graph / Supply /    │  ├───────────┤  │
                    │  │  Risk / Similar /    │  │ Market    │  │
                    │  │  Agents / World /    │  │ Charts    │  │
                    │  │  Forecast /          │  └───────────┘  │
                    │  │  Intelligence        │                 │
                    │  └──────────────────────┘                 │
                    │                                            │
                    │  ┌──────────────────────────────────────┐  │
                    │  │        GlobeControls (bottom bar)    │  │
                    │  │  Mode buttons / Sub-menus / Layers   │  │
                    │  └──────────────────────────────────────┘  │
                    │                                            │
                    │           ┌──────────────┐                │
                    │           │  AI ChatBot   │                │
                    │           │  (Floating)   │                │
                    │           └──────────────┘                │
                    └──────────────────────────────────────────┘
```

---

## 10 Visualization Modes

| Mode | What You See |
|------|-------------|
| **Default** | Hexbin population heatmap + trade/military arcs between nations |
| **Events** | Live geopolitical events as pulsing rings on the globe |
| **Graph** | Neo4j-style knowledge graph — country → commodity → sector → asset chains |
| **Supply Chain** | 5 major global supply chain paths (semiconductors, oil, manufacturing, resources, agriculture) |
| **Risk** | Risk propagation arcs — how instability flows across borders |
| **Similar** | Event similarity connections — historical analog matching |
| **Agents** | AI agent activity visualization (conflict, energy, supply chain, market) |
| **World** | Risk choropleth — color-coded country risk scores |
| **Forecast** | Time-projected scenarios at +7d, +30d, +90d |
| **Intelligence** | Four-graph Intelligence System — see below |

---

## Key Features

### 3D Interactive Globe
- Powered by **globe.gl** (Three.js/WebGL)
- Night sky texture with star field
- City-level hexbin heatmap (60+ cities)
- Financial hub markers with ring animations
- Country labels with dynamic size
- Click any country → zoom animation → detailed map view

### Country-Level Intelligence
- **CountryMarkets**: Stock indices, tickers, market cap, currency, mini charts
- **CountryMap**: Leaflet map with trade routes, ports, trade partners
- **SupplyChainPanel**: 5 major supply chain paths with risk/criticality
- **ExplainabilityPanel**: Causal reasoning chains (country → commodity → sector → asset)

### Real-Time Signals
- **SignalDashboard**: BUY/HOLD/SELL recommendations, momentum/volatility/volume
- **Geopolitical risk meter** with gradient severity bar
- **WebSocket-connected** live updates (with polling fallback)
- **Agent mode** selectors (Conflict, Energy, Supply Chain, Market)

### Event Intelligence
- **EventTimeline**: Real-time event feed with type/region filtering
- **EventEvolutionPanel**: Event evolution chains connecting current events to historical precedents
- **EventDetailPanel**: Severity gauge, sentiment, affected sectors/commodities, similar events
- **Historical analogs**: 7 curated historical events with similarity matching

### AI ChatBot
- Floating assistant with animated glow ring
- 6 pre-built query suggestions
- Structured responses with source citations
- Full offline fallback with keyword-aware mock responses

### Intelligence Graph System ⭐⭐⭐⭐⭐

The most innovative feature — instead of showing raw predictions, the system shows **why, how, how confident, and what assumptions matter** through four interconnected graph views powered by the Graph Engine (port 8005).

#### 1. Forecast Graph 📈
D3.js-powered time series with confidence bands:
- Historical price line (solid, indigo)
- Predicted price line (dashed, amber)
- Confidence interval shading (wider = less certain)
- Past / Today / Future visual separation

#### 2. Causal Graph 🔗 ⭐⭐⭐⭐⭐
React Flow interactive knowledge graph — the biggest innovation:
- **Iran Conflict → Oil Price → Inflation → Interest Rates → Technology Valuation → NVIDIA**
- Ranked causal paths with confidence scores
- Every node is color-coded by type (event=red, country=blue, commodity=amber, sector=purple, company=green, asset=cyan)
- Drag to explore, zoom to inspect, MiniMap for overview
- Ranked path badges (Path #1, #2, #3)

#### 3. Reasoning Graph 🧠 ⭐⭐⭐⭐⭐
AI agent contribution flow — every agent's reasoning is visible:
- 10 specialized agents (News, Conflict, Energy, Economic, Supply Chain, Market, Risk, Forecast, Geo-Political, Sentiment)
- Color-coded by sentiment: bullish (green), bearish (red), neutral (gray)
- Confidence bars with percentages
- Disagreement edges between agents (red dashed)
- Consensus verdict: BUY / SELL / neutral

#### 4. Confidence Graph 🎯
Factor decomposition instead of a single number:
- Data Quality
- Historical Similarity
- Agent Agreement
- World State Stability
- Market Volatility
- Each factor has a description explaining *why* the system is confident or uncertain
- Overall confidence bar with color gradient (red → amber → green)

#### Real-Time WebSocket
- Graph Engine on port 8005
- Auto-reconnect with 5s backoff
- Live graph updates every 30s
- Connection indicator (green pulsing dot)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | React 19 |
| **Language** | TypeScript 6 |
| **Build** | Vite 8 |
| **Styling** | Tailwind CSS v4 |
| **3D Globe** | globe.gl / Three.js / @react-three/fiber + drei |
| **Maps** | Leaflet + React-Leaflet |
| **Charts** | Recharts + D3.js |
| **Graph Visualization** | @xyflow/react (React Flow v12) |
| **Animations** | GSAP (camera fly-to, event animations) |
| **Icons** | Lucide React |
| **HTTP** | Axios |
| **Testing** | Vitest |
| **State** | React hooks + Context |

---

## API Integration

```
React App (localhost:3000)
  │
  ├── /api/*              → proxy → backend (localhost:8000)
  │   ├── POST /chat           → ChatBot API
  │   ├── GET  /health         → Backend health
  │   ├── POST /analyze        → Market analysis
  │   └── GET  /events         → Geopolitical events
  │
  ├── /ws               → proxy → backend WebSocket (localhost:8000)
  │
  ├── /api/world-state/* → proxy → World State Engine (localhost:8004)
  │
  ├── /api/graph/*       → proxy → Graph Engine (localhost:8005)
  │   ├── GET /forecast        → Forecast graph
  │   ├── GET /causal          → Causal graph (KG path finding)
  │   ├── GET /reasoning       → Agent reasoning graph
  │   ├── GET /confidence      → Confidence decomposition
  │   └── GET /all             → All four graphs at once
  │
  ├── /ws/graph          → proxy → Graph Engine WebSocket (localhost:8005)
  │
  ├── /api/simulation/*  → proxy → Scenario Simulator (localhost:8005)
  │   ├── POST /parse          → Parse natural language into scenario
  │   ├── POST /create         → Create scenario programmatically
  │   ├── POST /run            → Execute simulation
  │   ├── GET  /{id}           → Get simulation details
  │   ├── GET  /{id}/timeline  → Timeline with all horizon steps
  │   ├── GET  /{id}/graph     → Reasoning graph (causal chains)
  │   ├── GET  /{id}/agents    → All agent reports
  │   ├── GET  /{id}/report    → Full structured report
  │   ├── GET  /{id}/confidence→ Confidence analysis
  │   ├── GET  /{id}/portfolio → Portfolio impact
  │   ├── GET  /{id}/branches  → Scenario branching tree
  │   ├── POST /{id}/counterfactual → Run counterfactual
  │   └── POST /{id}/sensitivity    → Run sensitivity analysis
  │
  ├── /ws/simulation     → proxy → Simulator WebSocket (localhost:8005)
  │   ├── progress            → Real-time simulation progress (0-100%)
  │   ├── simulation_complete → Final results delivered
  │   └── chief_report        → Full chief agent report
  │
  └── Offline fallback → Built-in mock data for every API
```

---

## Project Structure

```
frontend/
├── src/
│   ├── main.tsx                   # Entry point
│   ├── App.tsx                    # Root layout (270 lines, incl. simulation toggle)
│   ├── index.css                  # Tailwind + custom styles + animations
│   │
│   ├── api/                       # API clients
│   │   ├── client.ts              # Axios + health check + mock fallback
│   │   ├── chatApi.ts             # Chat API + keyword-aware mock
│   │   ├── countryApi.ts          # Country data (trade, military, ports)
│   │   ├── endpoints.ts           # URL constants
│   │   └── geopoliticalApi.ts     # Events + market prices
│   │
│   ├── graph/                      # ★ Intelligence Graph System
│   │   ├── index.ts                 # Barrel exports
│   │   ├── types/
│   │   │   └── graphTypes.ts        # Graph data TypeScript interfaces
│   │   ├── hooks/
│   │   │   ├── useGraphData.ts      # REST polling for graph data
│   │   │   └── useGraphSocket.ts    # WebSocket for real-time graphs
│   │   ├── layouts/
│   │   │   └── graphLayouts.ts      # Hierarchical layout + React Flow converters
│   │   └── components/
│   │       ├── IntelligenceGraphPanel.tsx  # Tabbed panel (4 graph views)
│   │       ├── ForecastGraph.tsx          # D3.js line chart with confidence bands
│   │       ├── CausalGraph.tsx            # React Flow interactive causal KG
│   │       ├── ReasoningGraph.tsx         # React Flow agent reasoning flow
│   │       └── ConfidenceGraph.tsx        # D3.js confidence factor bars
│   │
│   ├── components/                # 21 React components
│   │   ├── GlobeView.tsx          # 3D globe (732 lines, 10 modes)
│   │   ├── GlobeControls.tsx      # Bottom toolbar (incl. Intelligence mode)
│   │   ├── MapView.tsx            # Country detail container
│   │   ├── CountryMap.tsx         # Leaflet map with routes + ports
│   │   ├── CountryMarkets.tsx     # Market dashboard (22 indices)
│   │   ├── CountryNav.tsx         # Region-tabbed country navigation
│   │   ├── SignalDashboard.tsx    # Real-time signals + WebSocket
│   │   ├── MarketCharts.tsx       # Price trends + sector performance
│   │   ├── EventTimeline.tsx      # Event feed sidebar
│   │   ├── EventEvolutionPanel.tsx # Event evolution chains
│   │   ├── EventDetailPanel.tsx   # Floating event detail
│   │   ├── SupplyChainPanel.tsx   # Supply chain details
│   │   ├── ExplainabilityPanel.tsx # Causal reasoning chains
│   │   ├── ChatBot.tsx            # Floating AI assistant
│   │   ├── Header.tsx             # Top bar (incl. Simulator toggle button)
│   │   ├── ErrorBoundary.tsx      # Error boundary
│   │   ├── EmptyState.tsx         # Empty state placeholder
│   │   └── Skeleton.tsx           # Loading skeletons
│   │
│   ├── simulation/                # ★ Scenario Simulator (9 components)
│   │   ├── index.ts               # Barrel exports
│   │   ├── types.ts               # Full TypeScript interfaces (30+ types)
│   │   ├── api.ts                 # Axios client (120s timeout) + WebSocket factory
│   │   ├── SimulationView.tsx     # Main view with sidebar: Editor / Simulation / Report
│   │   ├── ScenarioEditor/        # Scenario builder with NLP parsing
│   │   ├── Timeline/              # Line chart + interactive step indicators
│   │   ├── ProbabilityTree/       # Scenario branching tree with alternatives
│   │   ├── ImpactGraph/           # Sortable impact metrics with direction colors
│   │   ├── AgentPanel/            # Accordion AI agent reports (8 specialists + chief)
│   │   ├── WorldMap/              # Geographic impact grid with risk scores
│   │   ├── PortfolioImpact/       # Pie chart + bar chart + risk/opportunity lists
│   │   ├── ConfidencePanel/       # Radar chart + bar chart + uncertainty analysis
│   │   └── ReportViewer/          # Collapsible full report (8 sections)
│   │
│   ├── data/                      # Static data (full offline support)
│   │   ├── countries.ts           # 53 countries across 4 regions
│   │   ├── relations.ts           # 40 trade routes, 23 military relations, 69 ports
│   │   ├── events.ts              # 12 real-time + 7 historical events
│   │   ├── supplyChains.ts        # 5 global supply chain paths
│   │   ├── graphData.ts           # 27-node knowledge graph
│   │   ├── worldState.ts          # 50-country world state data
│   │   └── forecasts.ts           # 18-country forecast scenarios
│   │
│   ├── hooks/
│   │   ├── useWebSocket.ts        # WebSocket with auto-reconnect
│   │   ├── useWorldState.ts       # World state polling
│   │   ├── useGraphData.ts        # Graph REST polling
│   │   └── useGraphSocket.ts      # Graph WebSocket
│   │
│   ├── context/
│   │   └── ThemeContext.tsx        # Dark/light theme
│   │
│   ├── utils/
│   │   └── geo.ts                 # Haversine, bearing, zoom
│   │
│   └── __tests__/
│       └── geo.test.ts            # Vitest tests
│
├── vite.config.ts                 # Vite + React + Tailwind + proxy config
├── tsconfig.json
├── package.json
├── eslint.config.js
└── index.html
```

---

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server (port 3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Backend services (separate terminals):

# Start Graph Engine (port 8005)
cd ../graph_engine && python main.py

# Start World State Engine (port 8004)
cd ../world_state && python -m uvicorn server:app --port 8004

# Start Scenario Simulator (port 8005 — share with graph engine or use separate port)
cd ../simulator && python -m uvicorn main:app --port 8005 --reload
```

---

## Design Principles

1. **Offline-first** — Every API has realistic mock fallback data
2. **3D-native** — The globe is the primary interface, not an afterthought
3. **Dark mode by default** — Designed for professional traders
4. **Real-time awareness** — WebSocket + polling hybrid for live updates
5. **Causal clarity** — Every insight is traceable through explainability panels
6. **Country-centric** — All data orbits around the selected country
7. **Performance-conscious** — Memoized components, optimized renders, lazy data loading
8. **Explainable AI** — The four-graph intelligence system shows *why* predictions are made, not just *what* they are. Every causal path, agent reasoning step, and confidence factor is inspectable.
9. **Graph-native reasoning** — Instead of predicting stocks directly, the system predicts the evolution of the world state and derives stock forecasts from it. News → Dynamic World State → Risk Propagation → Sector State → Company State → Stock Forecast.
10. **Clone-Simulate-Destroy** — The Scenario Simulator deep-copies the live world state, runs simulations in isolation, and destroys the clone when done. Live data is never mutated.
11. **Assumption-first simulation** — Every forecast links to explicit, editable assumptions with probability scores. Change one assumption → only affected branches are recomputed.
