"""add alert read state and scheduled-evaluation run log

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-10-09 14:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, Sequence[str], None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add in-app read state and the evaluation run log.

    Backfill-friendly: existing alert events default to unread.
    """
    op.add_column(
        "watchlist_alert_events",
        sa.Column("is_read", sa.Boolean, nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "watchlist_alert_events",
        sa.Column("read_at", sa.DateTime, nullable=True),
    )
    op.create_index(
        "ix_watchlist_alert_events_user_read", "watchlist_alert_events", ["user_id", "is_read"]
    )

    op.create_table(
        "watchlist_alert_eval_runs",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column("trigger", sa.String(20), nullable=False, server_default="scheduled"),
        sa.Column("status", sa.String(20), nullable=False, server_default="running"),
        sa.Column("started_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("finished_at", sa.DateTime, nullable=True),
        sa.Column("users_evaluated", sa.Integer, nullable=False, server_default="0"),
        sa.Column("rules_evaluated", sa.Integer, nullable=False, server_default="0"),
        sa.Column("triggered", sa.Integer, nullable=False, server_default="0"),
        sa.Column("unavailable_tickers", sa.Integer, nullable=False, server_default="0"),
        sa.Column("error", sa.Text, nullable=True),
    )
    op.create_index(
        "ix_watchlist_alert_eval_runs_started", "watchlist_alert_eval_runs", ["started_at"]
    )
    op.create_index(
        "ix_watchlist_alert_eval_runs_status", "watchlist_alert_eval_runs", ["status"]
    )
    # Partial unique index: at most one run may be in the 'running' state, which
    # serialises overlapping scheduler invocations.
    op.create_index(
        "uq_watchlist_alert_eval_running",
        "watchlist_alert_eval_runs",
        ["status"],
        unique=True,
        postgresql_where=sa.text("status = 'running'"),
    )


def downgrade() -> None:
    """Drop the evaluation run log and read-state columns."""
    op.drop_index("uq_watchlist_alert_eval_running", table_name="watchlist_alert_eval_runs")
    op.drop_index("ix_watchlist_alert_eval_runs_status", table_name="watchlist_alert_eval_runs")
    op.drop_index("ix_watchlist_alert_eval_runs_started", table_name="watchlist_alert_eval_runs")
    op.drop_table("watchlist_alert_eval_runs")

    op.drop_index("ix_watchlist_alert_events_user_read", table_name="watchlist_alert_events")
    op.drop_column("watchlist_alert_events", "read_at")
    op.drop_column("watchlist_alert_events", "is_read")
