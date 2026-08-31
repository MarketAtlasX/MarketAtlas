# Globe Feature

## Overview

The globe feature renders an interactive holographic 3D globe for geopolitical intelligence visualization. It is built on `globe.gl` and integrated into the React component tree via `CinematicGlobe`.

## Components

- `CinematicGlobe` — Main globe renderer with globe.gl. Handles country polygons, arcs, points, and labels.
- `HolographicGlobe` — Thin wrapper that delegates to `CinematicGlobe` and accepts an optional `intentOverride` prop.
- `SceneDirector` — Builds `SceneConfig` from a `VisualizationIntent` including routes, regions, and conflicts.
- `WorldCore` — Orchestrates globe.js layers (Particles, Atmosphere, Rings, Nodes, Labels, Arcs, Heatmap, RiskPropagation).

## Visualization Modes

| Mode | Description |
|------|-------------|
| `world` | Default globe view with all countries |
| `risk` | Focuses on high-risk zones with conflict routes |
| `supply` | Shows supply chain and trade routes |
| `map` | Planar map view of countries |
| `events` | Live event markers on the globe |

## Replay on Globe

World Memory analogues can be replayed on the globe via `replayOnGlobe.ts`. The replay intent is encoded into the URL and decoded by `WorldCommandCenter` on navigation.

## Color Semantics

- **Peaceful zones** — Soft gold cap (`rgba(255, 213, 74, 0.22)`)
- **Tension zones** — Warm amber cap (`rgba(245, 166, 35, 0.50)`)
- **War/conflict zones** — Crimson cap (`rgba(255, 59, 48, 0.65)`)
- **Selected country** — Bright gold (`rgba(255, 215, 0, 0.85)`)
