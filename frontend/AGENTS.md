# MarketAtlas Frontend

## Tech Stack
- **React 19** + TypeScript 6
- **Vite 8** dev server (port 3000)
- **Tailwind CSS 4** (dark mode via `.dark` class)
- **@react-three/fiber** + **three** — 3D interactive globe (custom shaders in `src/shaders/`)
- **@react-three/drei** — R3F helpers (camera controls, etc.)
- **react-leaflet** + **Leaflet** — country-level maps
- **@xyflow/react** (React Flow) — causal/reasoning graph views
- **d3** — forecast/confidence charts and graph layouts
- **recharts** — market charts
- **@react-spring/three**, **gsap** — animations
- **lucide-react** — icons
- **Axios** — HTTP client
- **vitest** — unit tests (only `src/utils/__tests__/geo.test.ts`)

## Project Structure

```
src/
  main.tsx                        # Entry point
  App.tsx                         # Root state: view mode, country, event, globe mode
  index.css                       # Tailwind + custom styles
  api/
    client.ts                     # Axios client + analysis endpoint
    endpoints.ts                  # API path constants
    chatApi.ts                    # Chat REST/streaming + conversation persistence
    countryApi.ts                 # Country data API (backend + fallback)
    geopoliticalApi.ts            # Events / market prices / analysis
    liveEventsApi.ts              # Live event feed types + API
    memoryApi.ts                  # Episodic memory episodes/lessons
  components/
    Header.tsx                    # Top bar + simulator toggle
    CountryNav.tsx                # Region tabs + country selector
    GlobeView.tsx                 # 3D interactive globe (mode-driven)
    GlobeControls.tsx             # Globe/agent mode switching
    MapView.tsx                   # Country detail view (map + info panels)
    CountryMap.tsx                # Leaflet map with ports, trade arcs, partners
    CountryMarkets.tsx            # Market indices & charts
    MarketCharts.tsx              # Price trends / sector performance
    SignalDashboard.tsx           # AI signals & risk
    EventTimeline.tsx             # Geopolitical events
    LiveEventFeed.tsx             # Real-time live event feed + toolbar
    EventEvolutionPanel.tsx       # Similar events / historical analogy / lessons
    ChatBot.tsx                   # Chat assistant panel
    ...                           # ~24 view/panel/feed components
  globe/                          # 16 R3F components (GlobeScene, Earth, Atmosphere,
                                  #   Hologram, Stars, Arcs, Nodes, Heatmap, ...)
  shaders/                        # holographic.ts custom shaderMaterial
  graph/                          # Intelligence graph: types, hooks, layouts, panels
                                  #   (Forecast/Causal/Reasoning/Confidence graphs)
  simulation/                     # Scenario simulator: editor, timeline, probability
                                  #   tree, impact graph, agent panel, reports
  context/
    ThemeContext.tsx              # Dark/light theme
  hooks/
    useWorldState.ts              # Polls world-state service every 30s
    useWebSocket.ts               # /ws client (signals + events channels)
    useLiveEvents.ts              # Live event filtering/sorting/WS
    useEventAlerts.ts             # WS alerts channel
  data/
    countries.ts                  # Country interface + 50-country dataset
    relations.ts                  # Trade routes, military relations, ports
    graphData.ts                  # Fallback graph datasets
    worldState.ts                 # Fallback world-state data
  utils/
    geo.ts                        # Haversine, bearing, destination helpers
```

## View Navigation

App state controls view switching (no URL router):

| State | Effect |
|---|---|
| `selectedCountry: Country` | Sets active country |
| `showMapView: boolean` | Toggles between GlobeView / MapView |
| `showSimulation: boolean` | Toggles the scenario simulator |
| `globeMode: string` | Globe data mode (liveEvents, supplyChain, risk, forecast, intelligence, ...) |
| `agentMode: string` | Agent overlay mode (conflict, energy, supplyChain, market) |

Flow: Click country on globe → camera flies in → after 800ms → MapView opens

## API Integration

Most services follow a `checkBackend()` → fetch → local-fallback pattern:

1. Check backend health on `/api/health` (1s abort)
2. If backend available, fetch from the proxied API
3. If backend unavailable, fall back to local `src/data/` modules

### Vite Proxy Routes (dev)
- `/api` → `http://localhost:8000` (rewritten to `/api/v1/...`)
- `/api/world-state` → `http://localhost:8006`
- `/api/graph` → `http://localhost:8005`
- `/api/simulation/` → `http://localhost:8007`
- `/ws` → backend websocket
- `/ws/graph` → `ws://localhost:8005`
- `/ws/simulation` → `ws://localhost:8000`

### Key Endpoints (Backend)
- `GET /api/health` — backend health check
- `GET /api/v1/countries`, `/api/v1/countries/:code`, `/relations/trade`, `/relations/military`, `/ports`
- `GET /api/v1/events`, `GET /api/v1/entities?limit=1000`
- `GET /api/v1/market-prices/entity/:id/recent`
- `POST /api/v1/analyze` — ad-hoc analysis (signal dashboard)
- `GET /api/v1/dashboard/summary`
- Chat: `POST /api/v1/chat/send` + WebSocket stream

## Commands
- `npm run dev` — Start dev server (port 3000)
- `npm run build` — TypeScript check + Vite build
- `npm run preview` — Preview production build
- `npx vitest` — Run unit tests

## Conventions
- No comments in code
- Tailwind classes for styling (no CSS modules)
- Components use `interface XxxProps` for typing
- Dark mode via `dark:` Tailwind variants
- `checkBackend()`-gated fallbacks for all external data (offline-safe by design)
