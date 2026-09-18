from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.canonical_causal_graph import canonical_causal_graph_service
from app.services.graph_engine_client import graph_engine_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/graph-engine", tags=["graph-engine"])


@router.get("/health")
async def get_health() -> dict[str, Any]:
    return await graph_engine_client.health()


@router.get("/forecast")
async def get_forecast(
    symbol: str = Query("NVDA"),
    company_name: str = Query("NVIDIA Corporation"),
    current_price: float = Query(880.0),
) -> dict[str, Any]:
    return await graph_engine_client.forecast(symbol, company_name, current_price)


@router.get("/causal")
async def get_causal(
    root_event: str = Query("Iran Conflict"),
    target_asset: str = Query("NVIDIA"),
    max_paths: int = Query(5, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    return await canonical_causal_graph_service.retrieve(db, ticker=target_asset, query=root_event, limit=max_paths)


@router.get("/reasoning")
async def get_reasoning(
    target: str = Query("NVIDIA"),
) -> dict[str, Any]:
    return await graph_engine_client.reasoning(target)


@router.get("/confidence")
async def get_confidence(
    target: str = Query("NVIDIA"),
    prediction_value: Optional[float] = None,
    prediction_direction: str = Query("bullish"),
) -> dict[str, Any]:
    return await graph_engine_client.confidence(target, prediction_value, prediction_direction)


@router.get("/all")
async def get_all(
    symbol: str = Query("NVDA"),
    company_name: str = Query("NVIDIA Corporation"),
    current_price: float = Query(880.0),
    root_event: str = Query("Iran Conflict"),
    target_asset: str = Query("NVIDIA"),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    forecast = await graph_engine_client.forecast(symbol, company_name, current_price)
    reasoning = await graph_engine_client.reasoning(target_asset)
    confidence = await graph_engine_client.confidence(target_asset)
    causal = await canonical_causal_graph_service.retrieve(db, ticker=symbol, query=root_event)
    return {"forecast": forecast, "reasoning": reasoning, "confidence": confidence, "causal": causal}
