from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.trade import Trade, Watchlist
from app.models.user import User
from app.schemas.trade import (
    PortfolioSummary,
    ProfileRead,
    ProfileUpdate,
    TradeCreate,
    TradeRead,
    TradeUpdate,
    WatchlistCreate,
    WatchlistRead,
    WatchlistUpdate,
)
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/profile", tags=["profile"])


# ---------------------------------------------------------------------------
# Profile endpoints
# ---------------------------------------------------------------------------

@router.get("/me", response_model=ProfileRead)
async def get_profile(current_user: User = Depends(get_current_user)) -> ProfileRead:
    """Get current user's profile with its running financial totals."""
    return ProfileRead.model_validate(current_user)


@router.patch("/me", response_model=ProfileRead)
async def update_profile(
    body: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProfileRead:
    """Update the current user's editable profile fields."""
    if body.display_name is not None:
        current_user.display_name = body.display_name
        await db.commit()
        await db.refresh(current_user)
    return ProfileRead.model_validate(current_user)


# ---------------------------------------------------------------------------
# Portfolio summary
# ---------------------------------------------------------------------------

@router.get("/summary", response_model=PortfolioSummary)
async def get_portfolio_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PortfolioSummary:
    """Get the money picture for the signed-in user.

    Every figure is derived from the trades table so that it can never drift
    from the recorded history. The terms are deliberately distinct:

    * ``total_invested`` — lifetime money spent buying (sum of buy amounts).
    * ``total_earned``   — lifetime sale proceeds received (sum of sell amounts).
    * ``total_value``    — current market value of the still-open positions.
    * ``total_profit_loss`` — unrealised P&L across open positions.
    * ``withdrawable_balance`` — realised P&L sitting in the account, available
      to take out (the user's cash ledger plus closed-trade gains).
    """
    user_id = current_user.id

    invested_result = await db.execute(
        select(func.coalesce(func.sum(Trade.total_amount), 0.0)).where(
            Trade.user_id == user_id,
            Trade.action == "buy",
        )
    )
    total_invested = float(invested_result.scalar() or 0.0)

    earned_result = await db.execute(
        select(func.coalesce(func.sum(Trade.total_amount), 0.0)).where(
            Trade.user_id == user_id,
            Trade.action == "sell",
        )
    )
    total_earned = float(earned_result.scalar() or 0.0)

    # Only bought positions are holdings; an open sell trade is not capital at work.
    open_result = await db.execute(
        select(
            func.coalesce(func.sum(Trade.current_value), 0.0),
            func.coalesce(func.sum(Trade.total_amount), 0.0),
            func.coalesce(func.sum(Trade.profit_loss), 0.0),
            func.coalesce(func.count(Trade.id), 0),
        ).where(
            Trade.user_id == user_id,
            Trade.status == "open",
            Trade.action == "buy",
        )
    )
    open_row = open_result.one()
    total_value = float(open_row[0] or 0.0)
    open_cost = float(open_row[1] or 0.0)
    total_pnl = float(open_row[2] or 0.0)
    open_count = int(open_row[3] or 0)

    closed_result = await db.execute(
        select(
            func.coalesce(func.sum(Trade.profit_loss), 0.0),
            func.coalesce(func.count(Trade.id), 0),
        ).where(
            Trade.user_id == user_id,
            Trade.status == "closed",
        )
    )
    closed_row = closed_result.one()
    realised_pnl = float(closed_row[0] or 0.0)
    closed_count = int(closed_row[1] or 0)

    total_pnl_percent = (total_pnl / open_cost) * 100 if open_cost > 0 else 0.0

    return PortfolioSummary(
        total_invested=total_invested,
        total_earned=total_earned,
        total_value=total_value,
        total_profit_loss=total_pnl,
        total_profit_loss_percent=total_pnl_percent,
        realised_profit_loss=realised_pnl,
        withdrawable_balance=current_user.withdrawable_balance + realised_pnl,
        open_trades_count=open_count,
        closed_trades_count=closed_count,
    )


# ---------------------------------------------------------------------------
# Trade endpoints
# ---------------------------------------------------------------------------

@router.post("/trades", response_model=TradeRead, status_code=status.HTTP_201_CREATED)
async def create_trade(
    body: TradeCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TradeRead:
    """Create a new trade (stock purchase/sale)."""
    trade = Trade(
        user_id=current_user.id,
        ticker=body.ticker.upper(),
        company_name=body.company_name,
        trade_type=body.trade_type,
        action=body.action,
        quantity=body.quantity,
        price_per_share=body.price_per_share,
        total_amount=body.total_amount,
        notes=body.notes,
        status="open",
        current_price=body.price_per_share,
        current_value=body.total_amount,
    )
    db.add(trade)

    # Update user's total invested
    if body.action == "buy":
        current_user.total_invested += body.total_amount
    elif body.action == "sell":
        current_user.total_earned += body.total_amount
    await db.commit()
    await db.refresh(trade)
    return TradeRead.model_validate(trade)


@router.get("/trades", response_model=list[TradeRead])
async def list_trades(
    trade_type: str | None = None,
    status: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[TradeRead]:
    """List user's trades with optional filtering."""
    query = select(Trade).where(Trade.user_id == current_user.id)

    if trade_type:
        query = query.where(Trade.trade_type == trade_type)
    if status:
        query = query.where(Trade.status == status)

    query = query.order_by(Trade.created_at.desc())
    result = await db.execute(query)
    return [TradeRead.model_validate(t) for t in result.scalars().all()]


@router.get("/trades/{trade_id}", response_model=TradeRead)
async def get_trade(
    trade_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TradeRead:
    """Get a specific trade."""
    result = await db.execute(
        select(Trade).where(Trade.id == trade_id, Trade.user_id == current_user.id)
    )
    trade = result.scalar_one_or_none()
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    return TradeRead.model_validate(trade)


@router.patch("/trades/{trade_id}", response_model=TradeRead)
async def update_trade(
    trade_id: str,
    body: TradeUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TradeRead:
    """Update a trade (e.g., update current price, close trade)."""
    result = await db.execute(
        select(Trade).where(Trade.id == trade_id, Trade.user_id == current_user.id)
    )
    trade = result.scalar_one_or_none()
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")

    update_data = body.model_dump(exclude_unset=True)

    # Update other fields
    if "current_price" in update_data:
        trade.current_price = update_data["current_price"]
        if trade.quantity and trade.current_price:
            trade.current_value = trade.quantity * trade.current_price
            if trade.total_amount > 0:
                trade.profit_loss = trade.current_value - trade.total_amount
                trade.profit_loss_percent = (trade.profit_loss / trade.total_amount) * 100

    if "current_value" in update_data:
        trade.current_value = update_data["current_value"]
    if "profit_loss" in update_data:
        trade.profit_loss = update_data["profit_loss"]
    if "profit_loss_percent" in update_data:
        trade.profit_loss_percent = update_data["profit_loss_percent"]
    if "notes" in update_data:
        trade.notes = update_data["notes"]

    # Status is applied last so that closing a position locks in the final P&L
    # computed from the price/value supplied in the same request.
    if "status" in update_data:
        trade.status = update_data["status"]
        if trade.status == "closed" and trade.action == "buy" and trade.current_value:
            trade.profit_loss = trade.current_value - trade.total_amount
            if trade.total_amount > 0:
                trade.profit_loss_percent = (trade.profit_loss / trade.total_amount) * 100

    await db.commit()
    await db.refresh(trade)
    return TradeRead.model_validate(trade)


@router.delete("/trades/{trade_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_trade(
    trade_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a trade."""
    result = await db.execute(
        select(Trade).where(Trade.id == trade_id, Trade.user_id == current_user.id)
    )
    trade = result.scalar_one_or_none()
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")

    # Reverse the investment/earning
    if trade.action == "buy":
        current_user.total_invested -= trade.total_amount
    elif trade.action == "sell":
        current_user.total_earned -= trade.total_amount

    await db.delete(trade)
    await db.commit()


# ---------------------------------------------------------------------------
# Watchlist endpoints
# ---------------------------------------------------------------------------

@router.post("/watchlist", response_model=WatchlistRead, status_code=status.HTTP_201_CREATED)
async def add_to_watchlist(
    body: WatchlistCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WatchlistRead:
    """Add a stock to user's watchlist.

    Duplicate active entries are rejected. A previously deactivated entry for
    the same ticker is reactivated (with the new values) rather than creating a
    duplicate row, so the watchlist never holds two rows for one symbol.
    """
    ticker = body.ticker.upper()
    existing = await db.execute(
        select(Watchlist).where(
            Watchlist.user_id == current_user.id,
            Watchlist.ticker == ticker,
            Watchlist.is_active.is_(True),
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Ticker already in watchlist")

    inactive = await db.execute(
        select(Watchlist)
        .where(
            Watchlist.user_id == current_user.id,
            Watchlist.ticker == ticker,
            Watchlist.is_active.is_(False),
        )
        .order_by(Watchlist.created_at.desc())
    )
    reactivated = inactive.scalars().first()
    if reactivated is not None:
        reactivated.company_name = body.company_name
        reactivated.asset_type = body.asset_type
        reactivated.target_price = body.target_price
        reactivated.stop_loss = body.stop_loss
        reactivated.notes = body.notes
        reactivated.is_active = True
        await db.commit()
        await db.refresh(reactivated)
        return WatchlistRead.model_validate(reactivated)

    watchlist_item = Watchlist(
        user_id=current_user.id,
        ticker=ticker,
        company_name=body.company_name,
        asset_type=body.asset_type,
        target_price=body.target_price,
        stop_loss=body.stop_loss,
        notes=body.notes,
        is_active=True,
    )
    db.add(watchlist_item)
    await db.commit()
    await db.refresh(watchlist_item)
    return WatchlistRead.model_validate(watchlist_item)


@router.get("/watchlist", response_model=list[WatchlistRead])
async def list_watchlist(
    active_only: bool = True,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[WatchlistRead]:
    """List user's watchlist."""
    query = select(Watchlist).where(Watchlist.user_id == current_user.id)

    if active_only:
        query = query.where(Watchlist.is_active.is_(True))

    query = query.order_by(Watchlist.created_at.desc())
    result = await db.execute(query)
    return [WatchlistRead.model_validate(w) for w in result.scalars().all()]


@router.get("/watchlist/{watchlist_id}", response_model=WatchlistRead)
async def get_watchlist_item(
    watchlist_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WatchlistRead:
    """Get a specific watchlist item."""
    result = await db.execute(
        select(Watchlist).where(
            Watchlist.id == watchlist_id,
            Watchlist.user_id == current_user.id,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Watchlist item not found")
    return WatchlistRead.model_validate(item)


@router.patch("/watchlist/{watchlist_id}", response_model=WatchlistRead)
async def update_watchlist_item(
    watchlist_id: str,
    body: WatchlistUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WatchlistRead:
    """Update a watchlist item."""
    result = await db.execute(
        select(Watchlist).where(
            Watchlist.id == watchlist_id,
            Watchlist.user_id == current_user.id,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Watchlist item not found")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)

    await db.commit()
    await db.refresh(item)
    return WatchlistRead.model_validate(item)


@router.delete("/watchlist/{watchlist_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_from_watchlist(
    watchlist_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Remove an item from watchlist."""
    result = await db.execute(
        select(Watchlist).where(
            Watchlist.id == watchlist_id,
            Watchlist.user_id == current_user.id,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Watchlist item not found")

    await db.delete(item)
    await db.commit()
