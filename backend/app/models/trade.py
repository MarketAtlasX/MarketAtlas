import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Trade(Base):
    """Represents a stock purchase/sale by a user."""

    __tablename__ = "trades"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    ticker: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    company_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    trade_type: Mapped[str] = mapped_column(String(20), nullable=False)  # "intraday" or "normal"
    action: Mapped[str] = mapped_column(String(10), nullable=False)  # "buy" or "sell"
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    price_per_share: Mapped[float] = mapped_column(Float, nullable=False)
    total_amount: Mapped[float] = mapped_column(Float, nullable=False)
    current_price: Mapped[float] = mapped_column(Float, nullable=True, default=0.0)
    current_value: Mapped[float] = mapped_column(Float, nullable=True, default=0.0)
    profit_loss: Mapped[float] = mapped_column(Float, nullable=True, default=0.0)
    profit_loss_percent: Mapped[float] = mapped_column(Float, nullable=True, default=0.0)
    # "open", "closed", "pending"
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="open")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    __table_args__ = (
        Index("ix_trades_user_created", "user_id", "created_at"),
        Index("ix_trades_user_ticker", "user_id", "ticker"),
    )

    def __repr__(self) -> str:
        return (
            f"<Trade(id={self.id}, user={self.user_id}, "
            f"ticker={self.ticker}, type={self.trade_type})>"
        )


class Watchlist(Base):
    """User's watchlist of stocks they're interested in."""

    __tablename__ = "watchlists"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    ticker: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    company_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # stock, etf, commodity, index, currency, bond
    asset_type: Mapped[str] = mapped_column(String(20), nullable=False, default="stock")
    target_price: Mapped[float] = mapped_column(Float, nullable=True)
    stop_loss: Mapped[float] = mapped_column(Float, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    __table_args__ = (
        Index("ix_watchlists_user_ticker", "user_id", "ticker"),
    )

    def __repr__(self) -> str:
        return f"<Watchlist(id={self.id}, user={self.user_id}, ticker={self.ticker})>"
