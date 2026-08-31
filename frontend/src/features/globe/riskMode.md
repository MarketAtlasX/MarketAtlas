# Risk Mode

## Overview

Risk mode highlights geopolitical hot zones with enriched route visualization. It shows conflict zones, risk propagation paths, and dedicated risk routes between high-risk countries.

## Visual Semantics

- **High-risk (>= 70)** — Crimson red zones and routes
- **Elevated risk (>= 55)** — Warm amber zones and routes
- **Stable (< 55)** — Soft gold zones and routes

## Routes

Risk mode generates dedicated routes via `buildRiskFlows()`:
- Conflict and rivalry links from military relations
- Additional links between the top 14 highest-risk countries
- Routes sorted by severity with intensity-based sizing

## Arc Appearance

- **Altitude**: Larger and proportional to risk intensity
- **Stroke**: Thicker for higher-risk routes
- **Dash**: Tighter spacing for better visibility
- **Animation**: Slower dash animation for readability

## Map Legend

| Risk Level | Color | Zone Cap | Arc Style |
|-----------|-------|----------|-----------|
| Critical (>= 70) | Crimson | `rgba(255, 59, 48, 0.65)` | Thick, solid emphasis |
| Elevated (>= 55) | Amber | `rgba(245, 166, 35, 0.50)` | Medium, dashed |
| Stable (< 55) | Gold | `rgba(255, 213, 74, 0.22)` | Thin, subtle |
