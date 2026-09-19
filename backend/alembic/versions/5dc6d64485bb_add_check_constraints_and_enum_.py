"""add_check_constraints_and_enum_validation

Revision ID: 5dc6d64485bb
Revises: a3468edd5ab1
Create Date: 2026-06-02

Adds DB-level CHECK constraints for all categorical string columns:
  - events.event_type
  - events.severity
  - events.status
  - entities.entity_type
  - signals.signal_type
  - signals.status
  - signals.confidence (range guard: 0 <= confidence <= 1)

These constraints enforce the same enum values as app/core/enums.py at the
database level, providing a second line of defence if data is inserted outside
the FastAPI application (e.g., direct SQL, scripts, migrations).
"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '5dc6d64485bb'
down_revision: Union[str, Sequence[str], None] = 'a3468edd5ab1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add CHECK constraints to enforce categorical field values if not already present."""
    constraints = [
        ('ck_events_event_type', 'events', "event_type IN ('sanction', 'election', 'trade_policy', 'military_conflict', 'diplomatic', 'economic_data', 'regulatory', 'natural_disaster', 'other')"),
        ('ck_events_severity', 'events', "severity IN ('low', 'medium', 'high', 'critical')"),
        ('ck_events_status', 'events', "status IN ('reported', 'confirmed', 'resolved')"),
        ('ck_entities_entity_type', 'entities', "entity_type IN ('country', 'company', 'person', 'region', 'index', 'commodity')"),
        ('ck_signals_signal_type', 'signals', "signal_type IN ('buy', 'sell', 'hold', 'short')"),
        ('ck_signals_status', 'signals', "status IN ('active', 'closed', 'expired')"),
        ('ck_signals_confidence_range', 'signals', "confidence >= 0 AND confidence <= 1"),
    ]
    for name, table, condition in constraints:
        op.execute(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints
                    WHERE constraint_name = '{name}' AND table_name = '{table}'
                ) THEN
                    ALTER TABLE {table} ADD CONSTRAINT {name} CHECK ({condition});
                END IF;
            END $$;
        """)


def downgrade() -> None:
    """Remove CHECK constraints."""
    op.drop_constraint('ck_signals_confidence_range', 'signals', type_='check')
    op.drop_constraint('ck_signals_status', 'signals', type_='check')
    op.drop_constraint('ck_signals_signal_type', 'signals', type_='check')
    op.drop_constraint('ck_entities_entity_type', 'entities', type_='check')
    op.drop_constraint('ck_events_status', 'events', type_='check')
    op.drop_constraint('ck_events_severity', 'events', type_='check')
    op.drop_constraint('ck_events_event_type', 'events', type_='check')
