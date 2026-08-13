# MarketAtlas Frontend

MarketAtlas is the visual operating system for the intelligence infrastructure: a holographic globe, causal graph, AI command console, scenario simulator and world memory — one living command center.

## Tech Stack
- **React 19** + TypeScript 6, **Vite 8** (dev server port 3000), **react-router-dom v7**
- **Tailwind CSS 4** — dark-only design system in `src/styles/index.css`
- **@react-three/fiber + three + drei** — custom holographic globe (`src/features/globe`, engine in `src/globe/`)
- **@react-three/postprocessing** — restrained bloom (only active intelligence glows)
- **@xyflow/react** (React Flow), **d3**, **recharts** — graph/market charts (reused from `src/graph`, `src/simulation`)
- **lucide-react** icons, **gsap** camera animations, **axios**
- **vitest** — unit tests in `src/utils/__tests__/geo.test.ts`

## Routes

| Route | Feature | File |
|---|---|---|
| `/dashboard` | World Command Center (default) | `src/features/world-command/WorldCommandCenter.tsx` |
| `/markets` | Stock forecasts, confidence, causal chain | `src/features/markets/MarketsPage.tsx` |
| `/graph` | Causal map + four-graph intelligence system | `src/features/graph-analysis/GraphPage.tsx` |
| `/simulator` | Scenario simulator (clone-simulate-destroy) | `src/features/scenario-simulator/SimulatorPage.tsx` |
| `/memory` | World memory / historical analogues | `src/features/world-memory/MemoryPage.tsx` |

`/` redirects to `/dashboard`.

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
  styles/index.css            # design system
  types/index.ts              # shared live types (LiveEvent, MarketSignal, RiskUpdate, GraphLink, AgentStatus, WorldRisk)
  stores/WorldStore.tsx       # live world state context (events, signals, risk, graph, agents, forecast)
  services/
    websocket/useLiveWorldSocket.ts   # RISK_UPDATE / MARKET_FORECAST / GRAPH_UPDATE consumers
  features/
    world-command/            # TopStatusBar, NavigationRail, IntelligencePanel,
                              #   AgentStatusMatrix, CommandConsole (tabs), CommandInput (AI console)
    globe/                    # HolographicGlobe (Canvas + bloom), globeData (arcs/nodes/heatmap builder)
    agents/agents.ts          # agent definitions + status
    markets/                  # MarketsPage, ForecastChart (SVG band chart)
    graph-analysis/           # GraphPage (causal map + IntelligenceGraphPanel)
    scenario-simulator/       # SimulatorPage (wraps SimulationView)
    world-memory/             # MemoryPage
  components/
    ui/                       # Panel, Badge, Tabs, Gauge, ProgressBar, Sparkline, StatusDot
  globe/                      # 3D engine (Earth, Atmosphere, Hologram, Grid, Stars, Rings,
                              #   Arcs, Nodes, Labels, Satellites, Heatmap, RiskPropagation)
  graph/                      # four-graph intelligence system (reused)
  simulation/                 # scenario simulator (reused)
  data/                       # offline-first country/event/world-state datasets
  api/                        # chat/country/geopolitical clients
  hooks/                      # useClock, useWebSocket, useWorldState
```

## Conventions
- No code comments; no emojis in code
- Tailwind + CSS-variable classes; components use `interface XxxProps`
- Offline-first: every external source has local fallback data (WebSocket/sim keeps the UI alive)
- WebSocket payloads handled: `RISK_UPDATE`, `MARKET_FORECAST`, `GRAPH_UPDATE`, live event titles

## Commands
- `npm run dev` — dev server (port 3000)
- `npm run build` — TypeScript check + Vite build
- `npm run preview` — preview production build
- `npx vitest` — unit tests

## API / Proxy (unchanged)
`/api` → backend 8000, `/api/world-state` → 8006, `/api/graph` → 8005, `/api/simulation/` → 8007; `/ws`, `/ws/graph`, `/ws/simulation` proxied websockets.
