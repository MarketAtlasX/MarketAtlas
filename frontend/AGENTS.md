# MarketAtlas Frontend

## Tech Stack
- **React 19** + TypeScript 6
- **Vite 8** dev server
- **Tailwind CSS 4** (dark mode via `.dark` class)
- **globe.gl** — 3D interactive globe
- **Leaflet** + react-leaflet — country-level maps
- **Recharts** — charts
- **lucide-react** — icons
- **Axios** — HTTP client

## Project Structure

```
src/
  main.tsx                        # Entry point
  App.tsx                         # Root layout, state, view switching
  index.css                       # Tailwind + custom styles
  api/
    client.ts                     # Axios client + analysis endpoint
    countryApi.ts                 # Country data API (backend + fallback)
  components/
    Header.tsx                    # Top bar
    CountryNav.tsx                # Region tabs + country selector
    GlobeView.tsx                 # 3D interactive globe
    MapView.tsx                   # Country detail view (map + info panels)
    CountryMap.tsx                # Leaflet map with ports, trade arcs, partners
    CountryMarkets.tsx            # Market indices & charts
    MarketCharts.tsx              # Price trends / sector performance
    SignalDashboard.tsx           # AI signals & risk
    EventTimeline.tsx             # Geopolitical events
  context/
    ThemeContext.tsx              # Dark/light theme
  data/
    countries.ts                  # Country interface + 50-country dataset
    relations.ts                  # Trade routes, military relations, ports
  utils/
    geo.ts                        # Haversine, bearing, destination helpers
```

## View Navigation

App state controls view switching (no URL router):

| State | Effect |
|---|---|
| `selectedCountry: Country` | Sets active country |
| `showMapView: boolean` | Toggles between GlobeView / MapView |

Flow: Click country on globe → globe zooms → after 800ms → MapView opens

## API Integration

The `countryApi.ts` service provides endpoints that:
1. Check backend health on `/api/health`
2. If backend available, fetch from `/api/countries/:code/...`
3. If backend unavailable, fall back to local data modules

### Available Endpoints (Backend)
- `GET /api/health` — backend health check
- `GET /api/countries` — all countries
- `GET /api/countries/:code` — single country
- `GET /api/countries/:code/relations/trade` — trade routes
- `GET /api/countries/:code/relations/military` — military relations
- `GET /api/countries/:code/ports` — ports

## Commands
- `npm run dev` — Start dev server (port 3000)
- `npm run build` — TypeScript check + Vite build
- `npm run preview` — Preview production build

## Conventions
- No comments in code
- Tailwind classes for styling (no CSS modules)
- Components use `interface XxxProps` for typing
- Dark mode via `dark:` Tailwind variants
