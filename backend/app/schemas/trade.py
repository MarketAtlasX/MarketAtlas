from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class TradeBase(BaseModel):
    ticker: str = Field(..., min_length=1, max_length=20)
    company_name: Optional[str] = None
    trade_type: str = Field(..., description="intraday or normal")
    action: str = Field(..., description="buy or sell")
    quantity: float = Field(..., gt=0)
    price_per_share: float = Field(..., ge=0)
    total_amount: float = Field(..., ge=0)
    notes: Optional[str] = None


class TradeCreate(TradeBase):
    pass


class TradeUpdate(BaseModel):
    current_price: Optional[float] = None
    current_value: Optional[float] = None
    profit_loss: Optional[float] = None
    profit_loss_percent: Optional[float] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class TradeRead(TradeBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: int
    current_price: Optional[float] = None
    current_value: Optional[float] = None
    profit_loss: Optional[float] = None
    profit_loss_percent: Optional[float] = None
    status: str
    created_at: datetime
    updated_at: datetime


class WatchlistBase(BaseModel):
    ticker: str = Field(..., min_length=1, max_length=20)
    company_name: Optional[str] = None
    asset_type: str = Field(default="stock", description="stock, etf, commodity, etc.")
    target_price: Optional[float] = None
    stop_loss: Optional[float] = None
    notes: Optional[str] = None


class WatchlistCreate(WatchlistBase):
    pass


class WatchlistUpdate(BaseModel):
    company_name: Optional[str] = None
    asset_type: Optional[str] = None
    target_price: Optional[float] = None
    stop_loss: Optional[float] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class WatchlistRead(WatchlistBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: int
    current_price: Optional[float] = None
    price_change: Optional[float] = None
    price_change_percent: Optional[float] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class ProfileUpdate(BaseModel):
    display_name: Optional[str] = Field(default=None, min_length=1, max_length=100)


class PortfolioSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total_invested: float = 0.0
    total_earned: float = 0.0
    total_value: float = 0.0
    total_profit_loss: float = 0.0
    total_profit_loss_percent: float = 0.0
    realised_profit_loss: float = 0.0
    withdrawable_balance: float = 0.0
    open_trades_count: int = 0
    closed_trades_count: int = 0


class ProfileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    display_name: str
    is_active: bool
    total_invested: float = 0.0
    total_earned: float = 0.0
    withdrawable_balance: float = 0.0
    created_at: datetime
    updated_at: Optional[datetime] = None
