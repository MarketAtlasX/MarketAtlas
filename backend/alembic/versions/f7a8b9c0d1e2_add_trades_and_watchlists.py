"""add trades and watchlists tables plus user balance fields

Revision ID: f7a8b9c0d1e2
Revises: d6e7f8a9b0c1
Create Date: 2026-10-06 10:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f7a8b9c0d1e2"
down_revision: Union[str, Sequence[str], None] = "d6e7f8a9b0c1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Backfill-friendly: existing users receive a zero balance.
    op.add_column(
        "users",
        sa.Column("total_invested", sa.Float(), nullable=False, server_default="0.0"),
    )
    op.add_column(
        "users",
        sa.Column("total_earned", sa.Float(), nullable=False, server_default="0.0"),
    )
    op.add_column(
        "users",
        sa.Column("withdrawable_balance", sa.Float(), nullable=False, server_default="0.0"),
    )

    op.create_table(
        "trades",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer,
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("ticker", sa.String(20), nullable=False),
        sa.Column("company_name", sa.String(255), nullable=True),
        sa.Column("trade_type", sa.String(20), nullable=False),
        sa.Column("action", sa.String(10), nullable=False),
        sa.Column("quantity", sa.Float, nullable=False),
        sa.Column("price_per_share", sa.Float, nullable=False),
        sa.Column("total_amount", sa.Float, nullable=False),
        sa.Column("current_price", sa.Float, nullable=True, server_default="0.0"),
        sa.Column("current_value", sa.Float, nullable=True, server_default="0.0"),
        sa.Column("profit_loss", sa.Float, nullable=True, server_default="0.0"),
        sa.Column("profit_loss_percent", sa.Float, nullable=True, server_default="0.0"),
        sa.Column("status", sa.String(20), nullable=False, server_default="open"),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_trades_user_id", "trades", ["user_id"])
    op.create_index("ix_trades_ticker", "trades", ["ticker"])
    op.create_index("ix_trades_user_created", "trades", ["user_id", "created_at"])
    op.create_index("ix_trades_user_ticker", "trades", ["user_id", "ticker"])

    op.create_table(
        "watchlists",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer,
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("ticker", sa.String(20), nullable=False),
        sa.Column("company_name", sa.String(255), nullable=True),
        sa.Column("asset_type", sa.String(20), nullable=False, server_default="stock"),
        sa.Column("target_price", sa.Float, nullable=True),
        sa.Column("stop_loss", sa.Float, nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_watchlists_user_id", "watchlists", ["user_id"])
    op.create_index("ix_watchlists_ticker", "watchlists", ["ticker"])
    op.create_index("ix_watchlists_user_ticker", "watchlists", ["user_id", "ticker"])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_watchlists_user_ticker", table_name="watchlists")
    op.drop_index("ix_watchlists_ticker", table_name="watchlists")
    op.drop_index("ix_watchlists_user_id", table_name="watchlists")
    op.drop_table("watchlists")

    op.drop_index("ix_trades_user_ticker", table_name="trades")
    op.drop_index("ix_trades_user_created", table_name="trades")
    op.drop_index("ix_trades_ticker", table_name="trades")
    op.drop_index("ix_trades_user_id", table_name="trades")
    op.drop_table("trades")

    op.drop_column("users", "withdrawable_balance")
    op.drop_column("users", "total_earned")
    op.drop_column("users", "total_invested")
