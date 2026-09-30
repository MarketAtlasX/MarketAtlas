# MarketAtlas API Reference

All backend API endpoints are rooted under `/api/v1` or `/api`.

## Endpoints

### 1. Market Data
- `GET /api/market/quote/{symbol}`: Returns latest quote, price change, and telemetry status.
- `GET /api/market/history/{symbol}?period=1mo`: Returns historical candlestick series.

### 2. Predictions & Forecasting
- `GET /api/predict/{symbol}`: Triggers multi-agent forecast deliberation and outputs scenario tree (Bull, Base, Bear).
- `GET /api/predict/causal-graph/{symbol}`: Returns multi-hop causal reasoning chain connecting geopolitical flashpoints, supply chains, company HQ, and indices.
- `GET /api/predict/causal-subgraph/{symbol}`: Canonical format subgraph with confidence scores and evidence provenance.

### 3. Geopolitical Intelligence
- `GET /api/events/live`: Real-time streaming geopolitical alerts with risk scores and affected tickers.
- `GET /api/health`: System health status and subsystem latency metrics.
