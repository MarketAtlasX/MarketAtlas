# MarketAtlas — Frontend

> *An AI-powered geopolitical trading intelligence command center. Interactive globe. Real-time signals. Causal reasoning. All in one dashboard.*

Built with React 19, TypeScript 6, Vite 8, and Tailwind CSS v4 — MarketAtlas transforms global political, economic, and conflict events into actionable trading intelligence through a stunning 3D interface.

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
                    │  │  9 Visualization     │  │ Dashboard │  │
                    │  │      Modes           │  ├───────────┤  │
                    │  │                      │  │ Events    │  │
                    │  │  Default / Events /  │  │ Timeline  │  │
                    │  │  Graph / Supply /    │  ├───────────┤  │
                    │  │  Risk / Similar /    │  │ Market    │  │
                    │  │  Agents / World /    │  │ Charts    │  │
                    │  │  Forecast            │  └───────────┘  │
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

## 9 Visualization Modes

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

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | React 19 |
| **Language** | TypeScript 6 |
| **Build** | Vite 8 |
| **Styling** | Tailwind CSS v4 |
| **3D Globe** | globe.gl / Three.js |
| **Maps** | Leaflet + React-Leaflet |
| **Charts** | Recharts |
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
  ├── /api/world-state/* → proxy → World State (localhost:8004)
  │
  └── Offline fallback → Built-in mock data for every API
```

---

## Project Structure

```
frontend/
├── src/
│   ├── main.tsx                   # Entry point
│   ├── App.tsx                    # Root layout (237 lines)
│   ├── index.css                  # Tailwind + custom styles + animations
│   │
│   ├── api/                       # API clients
│   │   ├── client.ts              # Axios + health check + mock fallback
│   │   ├── chatApi.ts             # Chat API + keyword-aware mock
│   │   ├── countryApi.ts          # Country data (trade, military, ports)
│   │   ├── endpoints.ts           # URL constants
│   │   └── geopoliticalApi.ts     # Events + market prices
│   │
│   ├── components/                # 20 React components
│   │   ├── GlobeView.tsx          # 3D globe (732 lines, 9 modes)
│   │   ├── GlobeControls.tsx      # Bottom toolbar with mode selectors
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
│   │   ├── Header.tsx             # Top bar
│   │   ├── ErrorBoundary.tsx      # Error boundary
│   │   ├── EmptyState.tsx         # Empty state placeholder
│   │   └── Skeleton.tsx           # Loading skeletons
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
│   │   └── useWorldState.ts       # World state polling
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
