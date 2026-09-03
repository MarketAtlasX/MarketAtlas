"""Prediction Ledger Model — Tracks forecasts, horizons, and realized outcomes."""

from datetime import datetime
from decimal import Decimal
from typing import Any, Optional

from sqlalchemy import Boolean, DateTime, Float, Index, Integer, JSON, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class PredictionLedgerRecord(Base):
    """Represents a recorded multi-agent market forecast in the evaluation ledger."""

    __tablename__ = "prediction_ledger"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    prediction_id: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    ticker: Mapped[str] = mapped_column(String(16), index=True, nullable=False)
    target: Mapped[str] = mapped_column(Text, nullable=False)
    time_horizon: Mapped[str] = mapped_column(String(32), default="medium_term", nullable=False)  # 7d, 30d, 90d, etc.

    # Predicted variables
    predicted_direction: Mapped[str] = mapped_column(String(16), nullable=False)  # BULLISH, BEARISH, NEUTRAL
    probability: Mapped[float] = mapped_column(Float, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    expected_return_pct: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Scenarios and evidence snapshot
    scenario_distribution: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON, nullable=True)
    agents_used: Mapped[Optional[list[str]]] = mapped_column(JSON, nullable=True)
    features_snapshot: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON, nullable=True)
    key_drivers: Mapped[Optional[list[dict[str, Any]]]] = mapped_column(JSON, nullable=True)

    # Pricing at inception
    entry_price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    entry_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Maturity and outcome evaluation
    maturity_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="PENDING", index=True, nullable=False)  # PENDING, EVALUATED

    exit_price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    evaluation_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    actual_direction: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    realized_return_pct: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    directional_accurate: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    brier_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("ix_ledger_ticker_status", "ticker", "status"),
        Index("ix_ledger_maturity_status", "maturity_date", "status"),
    )
