import asyncio
import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, Path, Query, Request
from fastapi.responses import StreamingResponse

from app.core.enums import LiveEventStatus
from app.models.user import User
from app.schemas.live_event import (
    EventImpactCreate,
    EventNewsArticleCreate,
    LiveEventCreate,
    LiveEventFullRead,
    LiveEventRead,
    LiveEventStats,
    LiveEventTimelineItem,
    LiveEventUpdate,
    UserEventFilterCreate,
)
from app.schemas.pagination import PaginatedResponse
from app.services.auth_service import get_current_user
from app.services.live_event_service import LiveEventService, get_live_event_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/live-events", tags=["live-events"])


@router.get("/alerts")
async def list_alerts(
    current_user: User = Depends(get_current_user),
    service: LiveEventService = Depends(get_live_event_service),
):
    alerts = await service.get_all_alerts(current_user.id)
    return {"items": alerts, "total": len(alerts)}


@router.get("/alerts/unread-count")
async def alert_unread_count(
    current_user: User = Depends(get_current_user),
    service: LiveEventService = Depends(get_live_event_service),
):
    count = await service.alert_unread_count(current_user.id)
    return {"count": count}


@router.post("/alerts/{alert_id}/read", status_code=204)
async def mark_alert_read(
    alert_id: str = Path(...),
    current_user: User = Depends(get_current_user),
    service: LiveEventService = Depends(get_live_event_service),
):
    await service.mark_alert_read(alert_id)


@router.post("/alerts/read-all", status_code=204)
async def mark_all_alerts_read(
    current_user: User = Depends(get_current_user),
    service: LiveEventService = Depends(get_live_event_service),
):
    await service.mark_all_alerts_read(current_user.id)


@router.get("/filters")
async def list_filters(
    current_user: User = Depends(get_current_user),
    service: LiveEventService = Depends(get_live_event_service),
):
    filters = await service.get_filters(current_user.id)
    return {"items": filters, "total": len(filters)}


@router.post("/filters", status_code=201)
async def create_filter(
    filter_in: UserEventFilterCreate,
    current_user: User = Depends(get_current_user),
    service: LiveEventService = Depends(get_live_event_service),
):
    return await service.create_filter(
        user_id=current_user.id,
        name=filter_in.name,
        filter_config=filter_in.filter_config,
        is_default=filter_in.is_default,
    )


@router.post("", response_model=LiveEventRead, status_code=201)
async def create_live_event(
    event_in: LiveEventCreate,
    current_user: User = Depends(get_current_user),
    service: LiveEventService = Depends(get_live_event_service),
):
    return await service.create(event_in)


@router.get("", response_model=PaginatedResponse)
async def list_live_events(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    event_type: Optional[str] = Query(None, alias="type"),
    sub_type: Optional[str] = Query(None, alias="subType"),
    status: Optional[str] = Query(None),
    severity_min: Optional[float] = Query(None, alias="severityMin", ge=0, le=10),
    severity_max: Optional[float] = Query(None, alias="severityMax", ge=0, le=10),
    country_code: Optional[str] = Query(None, alias="countryCode", max_length=2),
    region: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    keyword: Optional[str] = Query(None),
    sector: Optional[str] = Query(None),
    sort_by: str = Query("first_seen_at", alias="sortBy"),
    sort_desc: bool = Query(True, alias="sortDesc"),
    service: LiveEventService = Depends(get_live_event_service),
):
    page = await service.search(
        skip=skip, limit=limit,
        event_type=event_type, sub_type=sub_type,
        status=status, severity_min=severity_min,
        severity_max=severity_max, country_code=country_code,
        region=region, source=source, keyword=keyword,
        sector=sector, sort_by=sort_by, sort_desc=sort_desc,
    )
    return page.to_dict(LiveEventRead)


@router.get("/stats", response_model=LiveEventStats)
async def live_event_stats(
    service: LiveEventService = Depends(get_live_event_service),
):
    return await service.get_stats()


@router.get("/timeline", response_model=list[LiveEventTimelineItem])
async def live_event_timeline(
    hours: int = Query(24, ge=1, le=168),
    service: LiveEventService = Depends(get_live_event_service),
):
    return await service.get_timeline(hours=hours)


@router.get("/observation")
async def live_event_observation(
    query: Optional[str] = Query(None, min_length=1, max_length=200),
    country_code: Optional[str] = Query(None, alias="countryCode", max_length=2),
    ticker: Optional[str] = Query(None, max_length=20),
    service: LiveEventService = Depends(get_live_event_service),
):
    """Return an evidence bundle for Atlas intelligence tools.

    This endpoint composes persisted provider-backed event, impact, and source
    article records. It intentionally returns an unavailable envelope when the
    database has no matching evidence instead of inventing an observation.
    """
    page = await service.search(
        skip=0,
        limit=10,
        country_code=country_code,
        keyword=query or ticker,
        sort_by="first_seen_at",
        sort_desc=True,
    )
    if not page.items:
        return {
            "status": "unavailable",
            "freshness": "unknown",
            "query": query or ticker or country_code,
            "evidence": [],
            "limitations": ["No persisted provider-backed event matched the request."],
        }

    event = await service.get(page.items[0].id)
    impacts = await service.get_impacts(event.id)
    articles = await service.get_news(event.id)
    causal_edges = []
    geography = event.region or event.country_code
    for impact in impacts:
        if geography:
            causal_edges.append({
                "source": event.title,
                "source_type": "event",
                "target": geography,
                "target_type": "geography",
                "confidence": impact.confidence,
                "evidence_ref": str(impact.id),
            })
        causal_edges.append({
            "source": geography or event.title,
            "source_type": "geography" if geography else "event",
            "target": impact.entity_name,
            "target_type": impact.entity_type,
            "confidence": impact.confidence,
            "evidence_ref": str(impact.id),
        })
        for asset in impact.affected_assets:
            causal_edges.append({
                "source": impact.entity_name,
                "source_type": impact.entity_type,
                "target": asset.ticker or asset.name,
                "target_type": asset.asset_type,
                "confidence": impact.confidence,
                "evidence_ref": str(impact.id),
            })
    return {
        "status": "live" if event.status in {"breaking", "ongoing"} else "historical",
        "freshness": "current" if event.status in {"breaking", "ongoing"} else "historical",
        "event": LiveEventFullRead.model_validate(event).model_dump(mode="json"),
        "impacts": [
            {
                "entity_id": impact.entity_id,
                "entity_name": impact.entity_name,
                "entity_type": impact.entity_type,
                "impact_direction": impact.impact_direction,
                "impact_score": impact.impact_score,
                "confidence": impact.confidence,
                "impact_type": impact.impact_type,
                "analysis_summary": impact.analysis_summary,
                "reasoning_factors": impact.reasoning_factors,
                "generated_by": impact.generated_by,
                "id": impact.id,
                "event_id": impact.event_id,
                "created_at": impact.created_at.isoformat(),
                "affected_assets": [
                    {
                        "id": asset.id,
                        "impact_id": asset.impact_id,
                        "asset_type": asset.asset_type,
                        "ticker": asset.ticker,
                        "name": asset.name,
                        "estimated_move": asset.estimated_move,
                        "volatility_impact": asset.volatility_impact,
                        "time_horizon": asset.time_horizon,
                        "current_price": asset.current_price,
                        "price_direction": asset.price_direction,
                    }
                    for asset in impact.affected_assets
                ],
            }
            for impact in impacts
        ],
        "sources": [
            {
                "url": article.url,
                "title": article.title,
                "source": article.source,
                "published_at": article.published_at.isoformat() if article.published_at else None,
                "fetched_at": article.fetched_at.isoformat(),
                "relevance": article.relevance_score,
            }
            for article in articles
        ],
        "causal_chain": causal_edges,
        "provenance": {
            "provider": event.source,
            "observed_at": event.updated_at.isoformat(),
            "confidence": event.confidence,
        },
        "limitations": ["Impact relationships are analytical interpretations and may be incomplete."],
    }


@router.get("/{event_id}", response_model=LiveEventFullRead)
async def get_live_event(
    event_id: str = Path(...),
    service: LiveEventService = Depends(get_live_event_service),
):
    return await service.get(event_id)


@router.put("/{event_id}", response_model=LiveEventRead)
async def update_live_event(
    event_id: str = Path(...),
    event_in: LiveEventUpdate = ...,
    current_user: User = Depends(get_current_user),
    service: LiveEventService = Depends(get_live_event_service),
):
    return await service.update(event_id, event_in)


@router.patch("/{event_id}/status", response_model=LiveEventRead)
async def change_live_event_status(
    event_id: str = Path(...),
    status: LiveEventStatus = ...,
    current_user: User = Depends(get_current_user),
    service: LiveEventService = Depends(get_live_event_service),
):
    return await service.change_status(event_id, status)


@router.delete("/{event_id}", status_code=204)
async def delete_live_event(
    event_id: str = Path(...),
    current_user: User = Depends(get_current_user),
    service: LiveEventService = Depends(get_live_event_service),
):
    await service.delete(event_id)


@router.post("/{event_id}/analyze", response_model=LiveEventFullRead)
async def analyze_live_event(
    event_id: str = Path(...),
    current_user: User = Depends(get_current_user),
    service: LiveEventService = Depends(get_live_event_service),
):
    event = await service.get(event_id)
    return event


@router.get("/{event_id}/impacts")
async def get_event_impacts(
    event_id: str = Path(...),
    service: LiveEventService = Depends(get_live_event_service),
):
    impacts = await service.get_impacts(event_id)
    return {"items": impacts, "total": len(impacts)}


@router.post("/{event_id}/impacts", status_code=201)
async def add_event_impact(
    event_id: str = Path(...),
    impact_in: EventImpactCreate = ...,
    current_user: User = Depends(get_current_user),
    service: LiveEventService = Depends(get_live_event_service),
):
    return await service.add_impact(event_id, impact_in)


@router.get("/{event_id}/news")
async def get_event_news(
    event_id: str = Path(...),
    service: LiveEventService = Depends(get_live_event_service),
):
    articles = await service.get_news(event_id)
    return {"items": articles, "total": len(articles)}


@router.post("/{event_id}/news", status_code=201)
async def add_event_news(
    event_id: str = Path(...),
    news_in: EventNewsArticleCreate = ...,
    current_user: User = Depends(get_current_user),
    service: LiveEventService = Depends(get_live_event_service),
):
    return await service.add_news_article(event_id, news_in)


@router.get("/feed")
async def live_event_feed(
    request: Request,
    service: LiveEventService = Depends(get_live_event_service),
):
    async def event_generator():
        last_id = None
        while True:
            try:
                page = await service.search(
                    skip=0, limit=20,
                    sort_by="first_seen_at", sort_desc=True,
                )
                items = [LiveEventRead.model_validate(e) for e in page.items]
                if items:
                    current_id = items[0].id
                    if current_id != last_id:
                        last_id = current_id
                        for item in items:
                            yield f"data: {json.dumps(item.model_dump())}\n\n"
                await asyncio.sleep(10)
            except asyncio.CancelledError:
                break

    return StreamingResponse(event_generator(), media_type="text/event-stream")



