# World Command Center

## Overview

The World Command Center is the main dashboard of MarketAtlas. It provides geopolitical intelligence through an interactive globe, analytics panels, and an AI command console.

## Layout

```
┌──────────────────────────────────────────────┐
│  TopStatusBar (brand, back, risk, clock)     │
├─────┬──────────────────────────┬─────────────┤
│     │                          │             │
│ Nav │  HolographicGlobe        │ Intelligence│
│ Rail│  + tabs                  │   Panel     │
│     │                          │             │
│     ├──────────────────────────┤             │
│     │  CommandConsole          │             │
│     │  (tabs: events, analysis)│             │
│     └──────────────────────────┴─────────────┘
│           AppLayout shell
└──────────────────────────────────────────────┘
```

## Components

- `TopStatusBar` — Header with brand, back navigation, risk score, and clock
- `NavigationRail` — Vertical nav with WORLD, MARKETS, EVENTS, GRAPH, SIMULATOR, MEMORY, AGENTS, ATLAS
- `IntelligencePanel` — Geopolitical risk and market impact panel
- `AgentStatusMatrix` — AI agent roster and consensus display
- `CommandConsole` — Tabbed console with LIVE EVENTS, PROPAGATION, AI ANALYSIS, WORLD MEMORY, COMMAND
- `CommandInput` — AI command input with category navigation buttons

## Navigation

- Click the **MARKETATLAS** logo to return to the dashboard
- A **Back** button appears on all non-dashboard pages
- Back uses browser history when available, falling back to `/dashboard`

## Globe Modes

The globe supports modes: `world`, `risk`, `supply`, `map`, `events`

Switch modes via the tabs in the top-right of the globe area.
