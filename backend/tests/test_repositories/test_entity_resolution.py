"""Tests for explicit asset→entity mapping and repository resolution.

These guard against the fragile keyword/substring matching that the mapping was
introduced to replace, and preserve the recorded-vs-candidate distinction by
resolving only to entities that actually exist.
"""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entity import Entity
from app.repositories.entity import EntityRepository
from app.utils.asset_entity_map import get_asset_mapping, mapping_ticker_tokens


def test_mapping_covers_commodities_indices_currencies():
    gold = get_asset_mapping("gc")
    assert gold is not None
    assert gold.asset_type == "commodity"
    assert "Gold" in gold.entity_names

    spx = get_asset_mapping("SPX")
    assert spx is not None and spx.asset_type == "index"
    assert "^GSPC" in mapping_ticker_tokens(spx)

    eurusd = get_asset_mapping("EURUSD")
    assert eurusd is not None and eurusd.asset_type == "currency"
    # Currencies intentionally map to no entity aliases (no false positives).
    assert eurusd.entity_names == ()


@pytest.mark.asyncio
async def test_resolve_by_explicit_mapping(db_session: AsyncSession):
    db_session.add(Entity(name="Gold", entity_type="commodity", country_code="US"))
    await db_session.commit()

    resolution = await EntityRepository(db_session).resolve_asset("GC")
    assert resolution.entity is not None
    assert resolution.entity.name == "Gold"
    assert resolution.method == "explicit_mapping"


@pytest.mark.asyncio
async def test_resolve_by_exact_ticker_token(db_session: AsyncSession):
    db_session.add(Entity(name="Acme Corp", entity_type="company", ticker_symbols="ACME"))
    await db_session.commit()

    resolution = await EntityRepository(db_session).resolve_asset("acme")
    assert resolution.entity is not None
    assert resolution.method == "ticker_symbol"


@pytest.mark.asyncio
async def test_no_substring_false_positives(db_session: AsyncSession):
    db_session.add(Entity(name="Alphabet", entity_type="company", ticker_symbols="GOOGL"))
    db_session.add(Entity(name="Long Gold Corp", entity_type="company", ticker_symbols="LGC"))
    await db_session.commit()

    repo = EntityRepository(db_session)
    # 'GO' must not match 'GOOGL'; 'GC' must not match 'LGC'.
    assert (await repo.resolve_asset("GO")).entity is None
    assert (await repo.resolve_asset("GO")).method is None
    assert (await repo.get_by_ticker("GC")) is None
    # Exact tokens still resolve.
    assert (await repo.get_by_ticker("GOOGL")) is not None


@pytest.mark.asyncio
async def test_unmapped_symbol_resolves_to_none(db_session: AsyncSession):
    resolution = await EntityRepository(db_session).resolve_asset("ZZZZ")
    assert resolution.entity is None
    assert resolution.method is None
