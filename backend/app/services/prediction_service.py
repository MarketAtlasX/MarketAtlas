"""Prediction Service — 3-Agent Intelligence Orchestrator.

Orchestrates the concurrent execution of:
1. HistoricalAgent (historical precedents & patterns)
2. GeopoliticalAgent (live geopolitical conditions & risk vectors)
3. FinalPredictionAgent (synthesis, scenario modeling, calibrated confidence)

Reuses Redis caching, database entities/events, financial services, and signal creation.
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.cache import cache
from app.chatbot.agents.final_prediction_agent import FinalPredictionAgent
from app.chatbot.agents.geopolitical_agent import GeopoliticalAgent
from app.chatbot.agents.historical_agent import HistoricalAgent
from app.core.enums import SignalStatus, SignalType
from app.schemas.prediction import (
    AgentStatus,
    FinalPredictionOutput,
    GeopoliticalAgentOutput,
    HistoricalAgentOutput,
    PredictionDirection,
    PredictionRequest,
    PredictionResponse,
)
from app.schemas.signal import SignalCreate
from app.services.financial_data_service import FinancialDataService
from app.services.signal_service import SignalService

logger = logging.getLogger(__name__)


class PredictionService:
    """Orchestration service for the 3-Agent Prediction System."""

    def __init__(self, db: Optional[AsyncSession] = None) -> None:
        self.db = db
        self.historical_agent = HistoricalAgent(db_session=db)
        self.geopolitical_agent = GeopoliticalAgent(db_session=db)
        self.final_prediction_agent = FinalPredictionAgent(db_session=db)
        self.financial_service = FinancialDataService()

    async def predict(
        self,
        request: PredictionRequest,
        db: Optional[AsyncSession] = None,
    ) -> PredictionResponse:
        """Run the full 3-agent prediction pipeline."""
        session = db or self.db
        target = request.target.strip()
        ticker = (request.ticker.strip().upper() if request.ticker else None) or self._detect_ticker(target)
        entity_id = request.entity_id
        event_id = request.event_id
        time_horizon = request.time_horizon or "medium_term"

        # 1. Attempt cache lookup
        cache_key = self._generate_cache_key(target, ticker, entity_id, event_id, time_horizon)
        try:
            cached_data = await cache.get(cache_key)
            if cached_data and isinstance(cached_data, dict):
                logger.info("Serving prediction from Redis cache for '%s'", target)
                return PredictionResponse(**cached_data)
        except Exception as cache_err:
            logger.debug("Redis cache read skipped: %s", cache_err)

        # 2. Enrich entity_id if missing and ticker/name is recognized
        if not entity_id and session:
            entity_id = await self._resolve_entity_id(session, ticker=ticker, name=target)

        # 3. Fetch live market snapshot if ticker is present
        market_snapshot = {}
        if ticker:
            try:
                quote = await self.financial_service.get_stock_quote(ticker)
                if quote:
                    market_snapshot = quote
            except Exception as quote_err:
                logger.debug("Could not fetch quote for ticker %s: %s", ticker, quote_err)

        # 4. Concurrently execute Historical Agent and Geopolitical Agent
        hist_task = self.historical_agent.process(
            query=target,
            ticker=ticker,
            entity_id=entity_id,
            event_id=event_id,
        )
        geo_task = self.geopolitical_agent.process(
            query=target,
            ticker=ticker,
            entity_id=entity_id,
            event_id=event_id,
        )

        results = await asyncio.gather(hist_task, geo_task, return_exceptions=True)
        hist_res: Optional[HistoricalAgentOutput] = None
        geo_res: Optional[GeopoliticalAgentOutput] = None

        if isinstance(results[0], Exception):
            logger.warning("HistoricalAgent encountered error: %s", results[0])
            hist_res = HistoricalAgentOutput(
                agent="HistoricalAgent",
                status=AgentStatus.DEGRADED,
                target=target,
                analysis=f"Historical precedent extraction partially degraded: {results[0]}",
                confidence=0.4,
                error=str(results[0]),
            )
        else:
            hist_res = results[0]

        if isinstance(results[1], Exception):
            logger.warning("GeopoliticalAgent encountered error: %s", results[1])
            geo_res = GeopoliticalAgentOutput(
                agent="GeopoliticalAgent",
                status=AgentStatus.DEGRADED,
                target=target,
                analysis=f"Geopolitical risk extraction partially degraded: {results[1]}",
                confidence=0.4,
                error=str(results[1]),
            )
        else:
            geo_res = results[1]

        # 5. Synthesize in Final Prediction Agent
        prediction_output: FinalPredictionOutput = await self.final_prediction_agent.process(
            target=target,
            historical_output=hist_res,
            geopolitical_output=geo_res,
            ticker=ticker,
            entity_id=entity_id,
            time_horizon=time_horizon,
            market_snapshot=market_snapshot,
        )

        # 6. Optionally persist trading Signal if entity and event are linked
        if session and entity_id and event_id:
            await self._persist_signal_if_applicable(session, prediction_output, entity_id, event_id, market_snapshot)

        # 7. Construct Response
        response = PredictionResponse(
            prediction_id=prediction_output.prediction_id,
            target=prediction_output.target,
            ticker=prediction_output.ticker,
            entity_id=prediction_output.entity_id,
            prediction=prediction_output.prediction,
            direction=prediction_output.direction,
            confidence=prediction_output.confidence,
            time_horizon=prediction_output.time_horizon,
            supporting_factors=prediction_output.supporting_factors,
            contradictory_factors=prediction_output.contradictory_factors,
            risk_factors=prediction_output.risk_factors,
            alternative_scenarios=prediction_output.alternative_scenarios,
            assumptions=prediction_output.assumptions,
            uncertainties=prediction_output.uncertainties,
            reasoning_summary=prediction_output.reasoning_summary,
            evidence=prediction_output.evidence,
            agent_contributions=prediction_output.agent_contributions,
            historical_output=hist_res if request.include_raw_agent_outputs else None,
            geopolitical_output=geo_res if request.include_raw_agent_outputs else None,
            created_at=prediction_output.created_at,
        )

        # 8. Cache response (TTL 300 seconds = 5 min)
        try:
            await cache.set(cache_key, response.model_dump(mode="json"), ttl=300)
        except Exception as cache_set_err:
            logger.debug("Redis cache write skipped: %s", cache_set_err)

        return response

    def _generate_cache_key(
        self, target: str, ticker: Optional[str], entity_id: Optional[int], event_id: Optional[int], horizon: str
    ) -> str:
        raw_key = f"{target.lower()}:{ticker or ''}:{entity_id or ''}:{event_id or ''}:{horizon}"
        hashed = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()[:16]
        return f"pred:{hashed}"

    def _detect_ticker(self, text: str) -> Optional[str]:
        known = [
            "NVDA", "AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "META", "XOM",
            "CVX", "SHEL", "JPM", "V", "SPY", "QQQ", "GLD", "GC", "OIL",
            "TSMC", "TSM", "BABA", "ASML", "INTC", "AMD", "BA", "LMT",
        ]
        for token in text.upper().split():
            clean = token.strip(".,;:!?$()[]{}")
            if clean in known:
                return clean
        return None

    async def _resolve_entity_id(
        self, session: AsyncSession, ticker: Optional[str] = None, name: str = ""
    ) -> Optional[int]:
        """Lookup entity ID from PostgreSQL database."""
        try:
            from app.models.entity import Entity

            if ticker:
                stmt = select(Entity).where(Entity.ticker_symbols.ilike(f"%{ticker}%"))
                result = await session.execute(stmt)
                ent = result.scalars().first()
                if ent:
                    return ent.id

            if name:
                words = name.split()
                if words:
                    first_word = words[0].strip(".,;:!?")
                    stmt = select(Entity).where(Entity.name.ilike(f"%{first_word}%"))
                    result = await session.execute(stmt)
                    ent = result.scalars().first()
                    if ent:
                        return ent.id
        except Exception as exc:
            logger.debug("Entity ID resolution failed: %s", exc)
        return None

    async def _persist_signal_if_applicable(
        self,
        session: AsyncSession,
        pred: FinalPredictionOutput,
        entity_id: int,
        event_id: int,
        market_snapshot: dict[str, Any],
    ) -> None:
        """Create a corresponding Signal record if directional conviction exists."""
        try:
            signal_type = SignalType.HOLD
            if pred.direction == PredictionDirection.BULLISH:
                signal_type = SignalType.BUY
            elif pred.direction == PredictionDirection.BEARISH:
                signal_type = SignalType.SELL
            elif pred.direction == PredictionDirection.VOLATILE:
                signal_type = SignalType.HOLD

            current_price = market_snapshot.get("price")
            target_price = None
            stop_loss = None
            if current_price and isinstance(current_price, (int, float)) and current_price > 0:
                cp = Decimal(str(current_price))
                if signal_type == SignalType.BUY:
                    target_price = cp * Decimal("1.12")
                    stop_loss = cp * Decimal("0.94")
                elif signal_type == SignalType.SELL:
                    target_price = cp * Decimal("0.88")
                    stop_loss = cp * Decimal("1.06")

            signal_create = SignalCreate(
                event_id=event_id,
                entity_id=entity_id,
                signal_type=signal_type,
                confidence=Decimal(f"{pred.confidence:.2f}"),
                target_price=target_price,
                stop_loss=stop_loss,
                reasoning=pred.prediction[:500],
                status=SignalStatus.ACTIVE,
            )
            signal_service = SignalService(session)
            await signal_service.create(signal_create)
            logger.info("Persisted trading signal for entity %d based on 3-agent prediction", entity_id)
        except Exception as exc:
            logger.warning("Could not persist signal from prediction: %s", exc)


prediction_service = PredictionService()
