"""Tests for entity CRUD endpoints."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.services.auth_service import create_access_token


async def _auth_head(db_session: AsyncSession) -> dict:
    """Create a test user and return a valid Bearer auth header."""
    user = User(email="entity@test.com", hashed_password="unused-in-tests", display_name="entity")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return {"Authorization": f"Bearer {create_access_token(user.id)}"}


@pytest.mark.asyncio
async def test_create_entity(client: AsyncClient, db_session: AsyncSession):
    payload = {
        "name": "Test Corp",
        "entity_type": "company",
        "country_code": "US",
        "ticker_symbols": "TSTC",
    }
    auth = await _auth_head(db_session)
    response = await client.post("/api/v1/entities", json=payload, headers=auth)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == payload["name"]
    assert data["entity_type"] == "company"
    assert "id" in data


@pytest.mark.asyncio
async def test_create_duplicate_entity_returns_409(
    client: AsyncClient, db_session: AsyncSession, sample_entity: dict
):
    payload = {
        "name": sample_entity["name"],
        "entity_type": "company",
    }
    auth = await _auth_head(db_session)
    response = await client.post("/api/v1/entities", json=payload, headers=auth)
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_get_entity_by_id(client: AsyncClient, sample_entity: dict):
    response = await client.get(f"/api/v1/entities/{sample_entity['id']}")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == sample_entity["name"]


@pytest.mark.asyncio
async def test_get_entity_not_found(client: AsyncClient):
    response = await client.get("/api/v1/entities/9999")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_list_entities(client: AsyncClient, sample_entity: dict):
    response = await client.get("/api/v1/entities")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_filter_entities_by_type(client: AsyncClient, sample_entity: dict):
    response = await client.get("/api/v1/entities/filter/type/company")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_search_entity_by_ticker(client: AsyncClient, sample_entity: dict):
    response = await client.get("/api/v1/entities/search/ticker/AAPL")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == sample_entity["name"]
