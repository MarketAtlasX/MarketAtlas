"""Watchlist alert rules and triggered-alert records.

These are distinct from the live-event ``EventAlert`` table: watchlist alerts
are threshold rules evaluated against *provider-backed market data* for a
watched asset, and each trigger is recorded once (cooldown + state dedupe).
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class WatchlistAlertRule(Base):
    """A user-configured alert threshold for one watched asset."""

    __tablename__ = "watchlist_alert_rules"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    watchlist_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("watchlists.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Denormalized symbol so rule listings never require a join.
    ticker: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    # target_price | stop_loss | percent_move | event_severity
    kind: Mapped[str] = mapped_column(String(20), nullable=False)
    threshold: Mapped[float | None] = mapped_column(Float, nullable=True)
    percent_threshold: Mapped[float | None] = mapped_column(Float, nullable=True)
    # above | below | None (None => both directions)
    direction: Mapped[str | None] = mapped_column(String(10), nullable=True)
    cooldown_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=900)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    # Last observed side ('above'/'below'/'up'/'down') used to fire only on a
    # genuine crossing rather than on every evaluation tick.
    last_state: Mapped[str | None] = mapped_column(String(20), nullable=True)
    last_triggered_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    trigger_events = relationship(
        "WatchlistAlertEvent", back_populates="rule", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_watchlist_alert_rules_user_watchlist", "user_id", "watchlist_id"),
    )

    def __repr__(self) -> str:
        return f"<WatchlistAlertRule(id={self.id}, kind={self.kind}, watchlist={self.watchlist_id})>"


class WatchlistAlertEvent(Base):
    """A single, de-duplicated alert trigger record."""

    __tablename__ = "watchlist_alert_events"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    rule_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("watchlist_alert_rules.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    watchlist_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("watchlists.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    ticker: Mapped[str] = mapped_column(String(20), nullable=False)
    kind: Mapped[str] = mapped_column(String(20), nullable=False)
    direction: Mapped[str | None] = mapped_column(String(10), nullable=True)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    observed_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    threshold: Mapped[float | None] = mapped_column(Float, nullable=True)
    delivered: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    # In-app read state. Delivery to external channels is out of scope.
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    dedupe_key: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    triggered_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    rule = relationship("WatchlistAlertRule", back_populates="trigger_events")

    __table_args__ = (
        Index("ix_watchlist_alert_events_user_triggered", "user_id", "triggered_at"),
        Index("ix_watchlist_alert_events_user_read", "user_id", "is_read"),
    )

    def __repr__(self) -> str:
        return f"<WatchlistAlertEvent(id={self.id}, rule={self.rule_id}, ticker={self.ticker})>"


class WatchlistAlertEvalRun(Base):
    """Observability log for one scheduled/manual alert-evaluation run.

    A single row per run lets operators answer "is the scheduler healthy and
    when did it last succeed?" without inspecting worker logs.
    """

    __tablename__ = "watchlist_alert_eval_runs"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    # scheduled | manual
    trigger: Mapped[str] = mapped_column(String(20), nullable=False, default="scheduled")
    # running | success | skipped_locked | failed
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="running")
    started_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    users_evaluated: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    rules_evaluated: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    triggered: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    unavailable_tickers: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)

    __table_args__ = (
        Index("ix_watchlist_alert_eval_runs_started", "started_at"),
        Index("ix_watchlist_alert_eval_runs_status", "status"),
        # At most one in-flight run: the partial unique index makes concurrent
        # schedulers contend on the same row, so overlapping runs are skipped.
        Index(
            "uq_watchlist_alert_eval_running",
            "status",
            unique=True,
            postgresql_where=text("status = 'running'"),
        ),
    )

    def __repr__(self) -> str:
        return f"<WatchlistAlertEvalRun(id={self.id}, status={self.status}, triggered={self.triggered})>"
