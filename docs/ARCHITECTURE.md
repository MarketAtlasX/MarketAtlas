# MarketAtlas Architecture Overview

MarketAtlas is an AI-powered global geopolitical and financial intelligence terminal combining real-time market data, interactive 3D globe visualization, multi-agent AI prediction orchestration, and causal reasoning chains.

## System Topology

```
                  +-----------------------------------+
                  |         Vite + React UI           |
                  |  - Cinematic 3D Globe (Three.js)  |
                  |  - Interactive Markets & Forecasts|
                  |  - Live Event Feed & Memory Replay|
                  +-----------------+-----------------+
                                    |
                         REST / WebSocket Events
                                    |
                  +-----------------v-----------------+
                  |       FastAPI Backend Core        |
                  |  - Auth & Rate Limiting           |
                  |  - Causal Graph Engine            |
                  |  - Multi-Agent Orchestrator       |
                  |  - In-Memory & Redis Cache        |
                  +-----------------+-----------------+
                                    |
          +-------------------------+-------------------------+
          |                         |                         |
+---------v---------+     +---------v---------+     +---------v---------+
| Market Data Feeds |     | Geopolitical News |     | Causal Knowledge  |
| (Quotes, History) |     | (Events, Signals) |     | (Chains, Graphs)  |
+-------------------+     +-------------------+     +-------------------+
```

## Core Modules
1. **Frontend**: Vite, React 19, TypeScript, Tailwind CSS, Lucide icons, Three.js globe.
2. **Backend**: FastAPI, Pydantic, SQLAlchemy/PostgreSQL, yfinance, LLM agents.
3. **Intelligence Bus**: Client-side pub/sub event bus coordinating views across tabs.
