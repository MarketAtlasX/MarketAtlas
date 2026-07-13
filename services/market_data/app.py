"""FastAPI microservice for market data signals.

Provides a `/snapshot` endpoint that computes momentum, volatility,
and volume status from price and volume series.
"""
from typing import Optional
from fastapi import FastAPI, Body, HTTPException
from market_data.market_data_agent import MarketDataAgent

app = FastAPI(title="market-data-service")


@app.post("/snapshot")
def snapshot(payload: Optional[dict] = Body(None)):
    """Return a market snapshot (momentum, volatility, volume).

    Accepts optional JSON body with `prices` and optional `volumes`.
    Example body: {"prices": [100,101,102], "volumes": [1000,1100,900]}
    """
    if payload and isinstance(payload, dict) and "prices" in payload:
        prices = payload.get("prices", [])
        if not prices or not all(isinstance(p, (int, float)) for p in prices):
            raise HTTPException(status_code=422, detail="'prices' must be a non-empty list of numbers")
        volumes = payload.get("volumes")
    else:
        # deterministic fallback series when no input provided
        prices = [100, 101, 102, 103, 104, 103, 102, 101, 102, 103, 105, 106, 107, 108, 110]
        volumes = [1000 + i * 10 for i in range(len(prices))]

    agent = MarketDataAgent(prices, volumes)
    return agent.snapshot()
