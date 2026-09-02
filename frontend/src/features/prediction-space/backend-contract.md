# Backend Contract - Prediction Space

## Endpoint

`GET /api/predict/ticker/{ticker}`

## Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ticker` | string | yes | Stock or asset ticker symbol (e.g. NVDA, AAPL, XOM) |

## Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `time_horizon` | string | `medium_term` | `short_term` (1-7d), `medium_term` (1-3mo), or `long_term` (6-12mo) |
| `include_raw` | boolean | `false` | Include full Historical and Geopolitical agent outputs |

## Response Schema (PredictionResponse)

| Field | Type | Description |
|-------|------|-------------|
| `prediction_id` | string | Unique prediction identifier |
| `ticker` | string | Ticker symbol |
| `direction` | enum | BULLISH, BEARISH, NEUTRAL, VOLATILE, UNCERTAIN |
| `confidence` | float | Calibrated score 0.00 to 1.00 |
| `time_horizon` | string | Forecast time horizon |
| `prediction` | string | Core actionable prediction statement |
| `reasoning_summary` | string | Explainable reasoning |
| `alternative_scenarios` | array | Base, Bull, Bear, Tail-Risk with probabilities |
| `supporting_factors` | array | Factors supporting the prediction |
| `risk_factors` | array | Principal downside risks |
| `agent_contributions` | object | Each agent's contribution summary |
| `historical_output` | object | Full Historical Agent output (when include_raw=true) |
| `geopolitical_output` | object | Full Geopolitical Agent output (when include_raw=true) |
| `evidence` | array | Traceable evidence items |
| `created_at` | datetime | UTC timestamp |

## Agent Pipeline

```
Historical Agent ---+
                    +--> Final Prediction Agent --> PredictionResponse
Geopolitical Agent -+
```

## Caching

Predictions are cached in Redis with a 300-second TTL.
