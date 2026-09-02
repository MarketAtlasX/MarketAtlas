# MarketAtlas Frontend

## Overview

MarketAtlas is the visual operating system for geopolitical intelligence: a holographic globe, causal graph, AI command console, scenario simulator, world memory, and AI-powered prediction space — all in one living command center.

## Tech Stack

- **React 19** + **TypeScript**
- **Vite 8** (dev server port 3000)
- **react-router-dom v7**
- **Tailwind CSS 4**
- **@react-three/fiber + three + drei** — holographic globe
- **globe.gl** — interactive country polygons and routes
- **@xyflow/react**, **d3**, **recharts** — graph and market charts
- **lucide-react** icons, **gsap** animations
- **vitest** — unit tests

## Routes

| Route | Feature |
|-------|---------|
| `/dashboard` | World Command Center (default) |
| `/markets` | Market forecasts and confidence |
| `/graph` | Causal map and intelligence |
| `/simulator` | Scenario simulator |
| `/memory` | World memory and analogues |
| `/atlas` | Atlas assistant page |

## Quick Start

```bash
npm run dev      # Start dev server
npm run build    # Type check + build
npx vitest       # Run tests
```

## Architecture

```
src/
  main.tsx                    # BrowserRouter + providers
  App.tsx                     # Route definitions
  styles/index.css            # Design system tokens
  components/                 # Shared UI components
  features/
    world-command/            # Dashboard, top bar, nav rail, panels
    prediction-space/         # AI-powered stock prediction panel
    globe/                    # Globe rendering and scene director
    markets/                  # Market data and forecasts
    graph-analysis/           # Causal graph
    scenario-simulator/       # Scenario simulator
    world-memory/             # Historical analogues
  __tests__/                  # Unit tests
```

## Navigation

- Click the **MARKETATLAS** logo to return to the dashboard
- Use the **Back** button on non-dashboard pages
- The navigation rail provides quick access to all sections

## Globe Modes

- **WORLD** — Default globe view
- **RISK** — High-risk zones with conflict routes
- **SUPPLY** — Supply chain and trade routes
- **MAP** — Planar map view
- **EVENTS** — Live event markers

## Prediction Space

The Prediction Space sits in the right rail and provides AI-powered stock predictions
using the backend's 3-agent pipeline (Historical, Geopolitical, Final Synthesis).

Features:
- Ticker search and quick-access chips
- Direction badge and confidence gauge
- Agent consensus bars
- Scenario tree (Base, Bull, Bear, Tail-Risk)
- Prediction narrative and collapsible factors
- Globe integration and offline fallback

## Replay on Globe

From World Memory, click **REPLAY ON GLOBE** to replay a historical analogue on the interactive globe.
