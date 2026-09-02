# Prediction Space

Agent-powered stock prediction panel for the MarketAtlas World Command Center right rail.

## Overview

The Prediction Space sits in the right rail of the dashboard, above the Intelligence Panel.
It calls the backend's 3-agent prediction pipeline and displays direction, confidence,
agent consensus, scenario tree, and prediction narrative.

## Files

| File | Purpose |
|------|---------|
| `PredictionSpace.tsx` | Main component with search, chips, loading, results, and error states |
| `predictionApi.ts` | API wrapper with `include_raw=true` and offline mock fallback |
| `backend-contract.md` | API contract documentation |
| `README.md` | This file |

## Agents

1. **Historical Agent** - Analyzes historical patterns and comparable events
2. **Geopolitical Agent** - Assesses geopolitical developments and risk factors
3. **Final Prediction Agent** - Reconciles both into a calibrated directional forecast

## Scenarios

- **Base** - Most likely outcome (typically 40-60%)
- **Bull** - Optimistic upside scenario (typically 15-30%)
- **Bear** - Pessimistic downside scenario (typically 10-25%)
- **Tail-Risk** - Low-probability black swan (typically 2-10%)

## Globe Integration

| Globe Entity | Auto-suggested Ticker |
|-------------|----------------------|
| Taiwan | TSMC |
| China | NVDA |
| US | AAPL |
| Iran | XOM |
| Russia | SHEL |
