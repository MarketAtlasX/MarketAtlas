# Changelog

All notable changes to the frontend command center.

## [Unreleased] — Holographic Command Center

### Added
- Holographic design system (`src/styles/index.css`): dark palette, cyan accent, glow utilities, scanlines and HUD corners.
- World Command Center page (`/dashboard`) with top status bar, navigation rail, holographic globe, intelligence panel, agent status matrix and command console.
- Live world state store (`WorldStore`) seeding events, signals, risk updates, causal links, agents and world risk with periodic simulation ticks.
- WebSocket consumer (`useLiveWorldSocket`) applying `RISK_UPDATE`, `MARKET_FORECAST` and `GRAPH_UPDATE` payloads.
- Custom `@react-three/fiber` holographic globe with bloom, four modes (world / risk / supply / events) and clickable nodes.
- Command console tabs: live events, propagation, AI analysis, world memory, and an AI asking console.
- Markets page (`/markets`) with SVG confidence-band forecast charts.
- Graph analysis page (`/graph`) reusing the four-graph intelligence system.
- Scenario simulator page (`/simulator`) reusing the clone-simulate-destroy simulator.
- World memory page (`/memory`) with a searchable historical analogue archive.
- Shared UI primitives: `Panel`, `Badge`, `Tabs`, `Gauge`, `ProgressBar`, `Sparkline`, `StatusDot`.
- Unit and component test suite (Vitest + Testing Library, jsdom).
- Fail-safe offline texture loading for the globe; clickable globe nodes.

### Changed
- Replaced the legacy single-page globe dashboard with a route table (`/dashboard`, `/markets`, `/graph`, `/simulator`, `/memory`).
- Replaced `src/index.css` with the holographic design system.
- Bootstrap (`main.tsx`) now wires `BrowserRouter` and the world provider.
- Rewrote `README.md` and `AGENTS.md` for the command-center architecture.
- Updated document title and meta description.

### Removed
- Legacy components superseded by the command center (globe views, signal dashboard, chatbot, event timeline and related panels).
- Legacy globe scene, camera controller and event animation layers.
- Unused live-events and memory API clients and their hooks.
