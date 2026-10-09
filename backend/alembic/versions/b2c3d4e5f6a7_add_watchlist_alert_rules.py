"""add watchlist alert rules and triggered events

Revision ID: b2c3d4e5f6a7
Revises: f7a8b9c0d1e2
Create Date: 2026-10-09 12:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, Sequence[str], None] = "f7a8b9c0d1e2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create the watchlist alert rules and triggered-alert tables."""
    op.create_table(
        "watchlist_alert_rules",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer,
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "watchlist_id",
            UUID(as_uuid=False),
            sa.ForeignKey("watchlists.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("ticker", sa.String(20), nullable=False),
        sa.Column("kind", sa.String(20), nullable=False),
        sa.Column("threshold", sa.Float, nullable=True),
        sa.Column("percent_threshold", sa.Float, nullable=True),
        sa.Column("direction", sa.String(10), nullable=True),
        sa.Column("cooldown_seconds", sa.Integer, nullable=False, server_default="900"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("last_state", sa.String(20), nullable=True),
        sa.Column("last_triggered_at", sa.DateTime, nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_watchlist_alert_rules_user_id", "watchlist_alert_rules", ["user_id"])
    op.create_index("ix_watchlist_alert_rules_ticker", "watchlist_alert_rules", ["ticker"])
    op.create_index(
        "ix_watchlist_alert_rules_watchlist_id", "watchlist_alert_rules", ["watchlist_id"]
    )
    op.create_index(
        "ix_watchlist_alert_rules_user_watchlist",
        "watchlist_alert_rules",
        ["user_id", "watchlist_id"],
    )

    op.create_table(
        "watchlist_alert_events",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "rule_id",
            UUID(as_uuid=False),
            sa.ForeignKey("watchlist_alert_rules.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            sa.Integer,
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "watchlist_id",
            UUID(as_uuid=False),
            sa.ForeignKey("watchlists.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("ticker", sa.String(20), nullable=False),
        sa.Column("kind", sa.String(20), nullable=False),
        sa.Column("direction", sa.String(10), nullable=True),
        sa.Column("message", sa.Text, nullable=False),
        sa.Column("observed_price", sa.Float, nullable=True),
        sa.Column("threshold", sa.Float, nullable=True),
        sa.Column("delivered", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("dedupe_key", sa.String(160), nullable=False),
        sa.Column("triggered_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_watchlist_alert_events_rule_id", "watchlist_alert_events", ["rule_id"])
    op.create_index("ix_watchlist_alert_events_user_id", "watchlist_alert_events", ["user_id"])
    op.create_index(
        "ix_watchlist_alert_events_watchlist_id", "watchlist_alert_events", ["watchlist_id"]
    )
    op.create_index("ix_watchlist_alert_events_dedupe_key", "watchlist_alert_events", ["dedupe_key"])
    op.create_index(
        "ix_watchlist_alert_events_user_triggered",
        "watchlist_alert_events",
        ["user_id", "triggered_at"],
    )


def downgrade() -> None:
    """Drop the watchlist alert tables."""
    op.drop_index("ix_watchlist_alert_events_user_triggered", table_name="watchlist_alert_events")
    op.drop_index("ix_watchlist_alert_events_dedupe_key", table_name="watchlist_alert_events")
    op.drop_index("ix_watchlist_alert_events_watchlist_id", table_name="watchlist_alert_events")
    op.drop_index("ix_watchlist_alert_events_user_id", table_name="watchlist_alert_events")
    op.drop_index("ix_watchlist_alert_events_rule_id", table_name="watchlist_alert_events")
    op.drop_table("watchlist_alert_events")

    op.drop_index("ix_watchlist_alert_rules_user_watchlist", table_name="watchlist_alert_rules")
    op.drop_index("ix_watchlist_alert_rules_watchlist_id", table_name="watchlist_alert_rules")
    op.drop_index("ix_watchlist_alert_rules_ticker", table_name="watchlist_alert_rules")
    op.drop_index("ix_watchlist_alert_rules_user_id", table_name="watchlist_alert_rules")
    op.drop_table("watchlist_alert_rules")
