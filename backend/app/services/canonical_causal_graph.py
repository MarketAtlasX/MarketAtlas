"""Evidence-backed causal subgraphs for Atlas and globe consumers.

This service deliberately builds only relationships represented by persisted
LiveEvent, EventImpact, and EventAffectedAsset records. Missing hops remain
missing instead of being filled with ticker-specific assumptions.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Iterable

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.live_event import EventAffectedAsset, EventImpact, LiveEvent


class CanonicalCausalGraphService:
    async def retrieve(self, db: AsyncSession, *, ticker: str | None = None, query: str | None = None, limit: int = 10) -> dict[str, Any]:
        clean_ticker = ticker.strip().upper() if ticker else None
        terms = [term for term in (clean_ticker, query.strip() if query else None) if term]
        conditions = []
        for term in terms:
            pattern = f"%{term}%"
            conditions.extend([
                LiveEvent.title.ilike(pattern),
                LiveEvent.description.ilike(pattern),
                EventImpact.entity_name.ilike(pattern),
                EventAffectedAsset.ticker.ilike(pattern),
                EventAffectedAsset.name.ilike(pattern),
            ])

        statement = (
            select(LiveEvent)
            .join(EventImpact, EventImpact.event_id == LiveEvent.id, isouter=True)
            .join(EventAffectedAsset, EventAffectedAsset.impact_id == EventImpact.id, isouter=True)
            .options(
                selectinload(LiveEvent.impacts).selectinload(EventImpact.affected_assets),
                selectinload(LiveEvent.news_articles),
            )
            .order_by(LiveEvent.first_seen_at.desc())
            .limit(limit)
        )
        if conditions:
            statement = statement.where(or_(*conditions))
        result = await db.execute(statement)
        events = list(result.unique().scalars().all())
        return self.build(events, ticker=clean_ticker, query=query)

    def build(self, events: Iterable[LiveEvent], *, ticker: str | None = None, query: str | None = None) -> dict[str, Any]:
        nodes: dict[str, dict[str, Any]] = {}
        edges: list[dict[str, Any]] = []
        evidence: list[dict[str, Any]] = []

        def add_node(node_id: str, label: str, node_type: str, **extra: Any) -> None:
            if node_id not in nodes:
                nodes[node_id] = {"id": node_id, "label": label, "type": node_type, **extra}

        def add_edge(source: str, target: str, relationship: str, *, evidence_class: str, confidence: float | None, provider: str | None, observed_at: datetime | None, evidence_reference: str | None, status: str = "supported") -> None:
            edges.append({
                "source": source,
                "target": target,
                "relationship": relationship,
                "confidence": confidence,
                "provenance": evidence_class,
                "provider": provider,
                "observed_at": observed_at.isoformat() if observed_at else None,
                "evidence_reference": evidence_reference,
                "status": status,
            })

        for event in events:
            event_id = f"event:{event.id}"
            add_node(event_id, event.title, "event", country_code=event.country_code, lat=event.lat, lng=event.lng)
            provider = event.source
            observed_at = event.updated_at or event.event_date
            for article in event.news_articles:
                evidence.append({
                    "reference": str(article.id),
                    "type": "direct",
                    "source": article.source,
                    "url": article.url,
                    "title": article.title,
                    "published_at": article.published_at.isoformat() if article.published_at else None,
                    "fetched_at": article.fetched_at.isoformat(),
                })

            geography = event.region or event.country_code
            if geography:
                geography_id = f"geography:{geography}"
                add_node(geography_id, geography, "geography", country_code=event.country_code)
                add_edge(event_id, geography_id, "occurs_in", evidence_class="direct_evidence", confidence=event.confidence, provider=provider, observed_at=observed_at, evidence_reference=str(event.id))

            for impact in event.impacts:
                entity_id = f"entity:{impact.entity_id or impact.entity_name.lower().replace(' ', '-') }"
                add_node(entity_id, impact.entity_name, impact.entity_type, confidence=impact.confidence)
                source_id = f"geography:{geography}" if geography else event_id
                add_edge(source_id, entity_id, impact.impact_type, evidence_class="model_inference", confidence=impact.confidence, provider=impact.generated_by, observed_at=impact.created_at, evidence_reference=str(impact.id), status="inferred")
                for asset in impact.affected_assets:
                    asset_key = asset.ticker or asset.name
                    asset_id = f"asset:{asset_key.upper()}"
                    add_node(asset_id, asset.name, asset.asset_type, ticker=asset.ticker, current_price=asset.current_price)
                    add_edge(entity_id, asset_id, "affects", evidence_class="derived_relationship", confidence=impact.confidence, provider=impact.generated_by, observed_at=impact.created_at, evidence_reference=str(impact.id), status="derived")

        if not nodes:
            return {
                "status": "insufficient_evidence",
                "ticker": ticker,
                "query": query,
                "nodes": [],
                "edges": [],
                "evidence": [],
                "limitations": ["No persisted event, impact, or asset relationship matched the request."],
            }
        return {
            "status": "supported",
            "ticker": ticker,
            "query": query,
            "nodes": list(nodes.values()),
            "edges": edges,
            "evidence": evidence,
            "limitations": ["Only persisted event-impact-asset hops are included; unsupported supply-chain hops are omitted."],
        }


canonical_causal_graph_service = CanonicalCausalGraphService()
