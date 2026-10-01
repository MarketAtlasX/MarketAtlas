"""Live event ingestion → WebSocket broadcast → evidence contract.

The frontend pipeline consumes exactly these envelopes from the existing
`/ws` broadcaster (channel `live_events`, plus `events`) and then re-reads the
same persisted rows through the canonical evidence observation. These tests
pin the broadcast shape, the evidence-search recovery, and ingestion-level
dedup / malformed handling — no new infrastructure.
"""

from datetime import datetime

from httpx import AsyncClient

from app.core.enums import LiveEventStatus, LiveEventType
from app.schemas.live_event import LiveEventCreate
from app.services.event_broadcaster import EventBroadcaster, get_broadcaster
from app.services.gdelt_stream_service import GDELTStreamService
from app.services.live_event_service import LiveEventService


async def test_live_event_create_broadcasts_canonical_envelope(db_session) -> None:
    """Creating a live event broadcasts a faithful copy of the persisted row."""
    broadcaster = get_broadcaster()
    queue = broadcaster.subscribe("live_events")
    try:
        service = LiveEventService(db_session)
        event = await service.create(LiveEventCreate(
            title="Naval drills reported near Taiwan",
            description="Air traffic rerouted during live-fire drills.",
            event_type=LiveEventType.GEOPOLITICAL,
            severity=5.0,
            status=LiveEventStatus.BREAKING,
            source="gdelt",
            lat=23.8,
            lng=121.0,
            country_code="TW",
            event_date=datetime(2026, 10, 1, 6, 0, 0),
        ))

        message = queue.get_nowait()
        assert message["type"] == "live_event_new"
        assert message["timestamp"]

        data = message["data"]
        # The envelope mirrors the stored record — nothing synthesized.
        assert data["id"] == event.id
        assert data["title"] == "Naval drills reported near Taiwan"
        assert data["description"] == "Air traffic rerouted during live-fire drills."
        assert data["lat"] == 23.8
        assert data["lng"] == 121.0
        assert data["country_code"] == "TW"
        assert data["source"] == "gdelt"
        assert data["event_date"].startswith("2026-10-01T06:00:00")
        assert data["status"] == "breaking"
        assert data["severity"] == 5.0
    finally:
        broadcaster.unsubscribe("live_events", queue)


async def test_broadcast_event_is_recoverable_by_evidence_keyword_search(db_session) -> None:
    """The record the WebSocket pushes is the one the evidence refresh finds.

    `useEvidenceSelection.refresh()` re-queries the observation endpoint with
    the selection as `query`, which lands in this same keyword search.
    """
    service = LiveEventService(db_session)
    created = await service.create(LiveEventCreate(
        title="Strait transit insurance premiums raised",
        event_type=LiveEventType.GEOPOLITICAL,
        severity=5.0,
        source="gdelt",
        lat=24.0,
        lng=120.0,
        country_code="TW",
    ))

    page = await service.search(keyword="insurance premiums")
    assert [item.id for item in page.items] == [created.id]


async def test_gdelt_ingestion_drops_malformed_and_duplicate_articles() -> None:
    """Malformed or already-ingested articles never reach the store or the
    broadcaster — duplicates cannot enter the pipeline twice."""
    service = GDELTStreamService(EventBroadcaster())
    try:
        # Malformed: missing url or missing title.
        assert await service._process_article({"url": "", "title": "A story"}) is None
        assert await service._process_article({"url": "https://example.test/a"}) is None

        # Duplicate: the source URL was already ingested.
        service._seen_urls.add("https://example.test/dup")
        assert await service._process_article({
            "url": "https://example.test/dup",
            "title": "Already ingested",
        }) is None
    finally:
        await service._http.aclose()


async def test_event_broadcaster_only_delivers_to_subscribed_channels() -> None:
    """Broadcasts are channel-scoped: the frontend subscribes to `live_events`
    and receives `live_event_new` envelopes only for that channel."""
    broadcaster = EventBroadcaster()
    live_queue = broadcaster.subscribe("live_events")

    await broadcaster.broadcast("live_events", {"type": "live_event_new", "data": {"id": "x"}, "timestamp": "t"})
    assert live_queue.get_nowait()["type"] == "live_event_new"

    # A message on another channel never leaks into `live_events`.
    await broadcaster.broadcast("events", {"type": "event", "data": {"id": 1}, "timestamp": "t"})
    assert live_queue.empty()
    broadcaster.unsubscribe("live_events", live_queue)
