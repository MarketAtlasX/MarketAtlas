"""Prediction Routes — Architecture-Aware 3-Agent Prediction API.

Exposes REST endpoints for:
- POST /predict              -> Generate comprehensive 3-agent prediction
- GET  /predict/ticker/{t}   -> Generate / retrieve prediction for ticker
- GET  /predict/entity/{id}  -> Generate / retrieve prediction for entity
- POST /predict/event/{id}   -> Generate prediction for event
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.repositories.entity import EntityRepository
from app.repositories.event import EventRepository
from app.schemas.prediction import PredictionRequest, PredictionResponse
from app.services.prediction_service import prediction_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/predict", tags=["prediction"])


@router.post("", response_model=PredictionResponse)
async def generate_prediction(
    body: PredictionRequest,
    db: AsyncSession = Depends(get_db),
) -> PredictionResponse:
    """Generate an explainable 3-agent prediction for a target query, entity, or event.

    Executes HistoricalAgent and GeopoliticalAgent in parallel, synthesizing their
    outputs with FinalPredictionAgent into 4 calibrated scenarios with full evidence traceability.
    """
    try:
        response = await prediction_service.predict(body, db=db)
        return response
    except Exception as exc:
        logger.error("Error generating prediction: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Prediction generation failed: {exc}")


@router.get("/ticker/{ticker}", response_model=PredictionResponse)
async def predict_for_ticker(
    ticker: str = Path(..., min_length=1, max_length=15, description="Stock or asset ticker"),
    time_horizon: str = Query("medium_term", description="short_term (1-7d), medium_term (1-3mo), or long_term (6-12mo)"),
    include_raw: bool = Query(False, description="Include raw Historical and Geopolitical agent outputs"),
    db: AsyncSession = Depends(get_db),
) -> PredictionResponse:
    """Generate a 3-agent prediction for a specific stock ticker."""
    clean_ticker = ticker.strip().upper()
    req = PredictionRequest(
        target=f"Market and geopolitical outlook for {clean_ticker}",
        ticker=clean_ticker,
        time_horizon=time_horizon,
        include_raw_agent_outputs=include_raw,
    )
    return await prediction_service.predict(req, db=db)


@router.get("/entity/{entity_id}", response_model=PredictionResponse)
async def predict_for_entity(
    entity_id: int = Path(..., gt=0, description="MarketAtlas Entity ID"),
    time_horizon: str = Query("medium_term", description="Prediction time horizon"),
    include_raw: bool = Query(False, description="Include raw agent outputs"),
    db: AsyncSession = Depends(get_db),
) -> PredictionResponse:
    """Generate a 3-agent prediction for a registered entity."""
    entity_repo = EntityRepository(db)
    entity = await entity_repo.get_by_id(entity_id)
    if not entity:
        raise HTTPException(status_code=404, detail=f"Entity {entity_id} not found")

    ticker = entity.ticker_symbols.split(",")[0].strip() if entity.ticker_symbols else None
    req = PredictionRequest(
        target=f"Strategic and market forecast for {entity.name} ({entity.entity_type})",
        ticker=ticker,
        entity_id=entity.id,
        time_horizon=time_horizon,
        include_raw_agent_outputs=include_raw,
    )
    return await prediction_service.predict(req, db=db)


@router.post("/event/{event_id}", response_model=PredictionResponse)
async def predict_for_event(
    event_id: int = Path(..., gt=0, description="MarketAtlas Event ID"),
    time_horizon: str = Query("medium_term", description="Prediction time horizon"),
    include_raw: bool = Query(False, description="Include raw agent outputs"),
    db: AsyncSession = Depends(get_db),
) -> PredictionResponse:
    """Generate a 3-agent prediction analyzing the market & geopolitical impact of an event."""
    event_repo = EventRepository(db)
    event = await event_repo.get_by_id(event_id)
    if not event:
        raise HTTPException(status_code=404, detail=f"Event {event_id} not found")

    req = PredictionRequest(
        target=f"{event.title}: {event.description[:200]}",
        event_id=event.id,
        time_horizon=time_horizon,
        include_raw_agent_outputs=include_raw,
    )
    return await prediction_service.predict(req, db=db)
