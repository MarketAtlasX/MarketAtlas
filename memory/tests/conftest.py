from datetime import datetime, timedelta
from typing import Any

import pytest

from episodic_memory.models import (
    Episode,
    Participant,
    ParticipantRole,
    ParticipantType,
    Outcome,
    OutcomeCategory,
    OutcomeSeverity,
    Timeline,
    TimelineEvent,
)


@pytest.fixture
def sample_articles() -> list[dict]:
    return [
        {
            "title": "Iran Launches Missiles at Military Base",
            "summary": "Iran launched a series of ballistic missiles targeting a military base in the region, escalating tensions significantly.",
            "url": "https://news.example.com/iran-missiles-1",
            "published_at": "2026-01-15T08:00:00Z",
            "locations": ["Iran", "Middle East"],
            "entities": ["Iran", "Military Base"],
            "sectors": ["energy", "defense"],
            "commodities": ["oil"],
            "source_type": "reuters",
        },
        {
            "title": "Oil Prices Surge After Iranian Missile Strike",
            "summary": "Global oil prices jumped more than 5% following Iran's missile attack on a military installation.",
            "url": "https://news.example.com/oil-surge-1",
            "published_at": "2026-01-15T10:00:00Z",
            "locations": ["Global"],
            "entities": ["Iran", "Oil", "Brent Crude"],
            "sectors": ["energy"],
            "commodities": ["oil"],
            "source_type": "bloomberg",
        },
        {
            "title": "UN Security Council Emergency Session Called",
            "summary": "The United Nations Security Council has called an emergency session to address the escalating situation in the Middle East.",
            "url": "https://news.example.com/un-session-1",
            "published_at": "2026-01-15T14:00:00Z",
            "locations": ["New York", "Middle East"],
            "entities": ["UN", "Iran", "Security Council"],
            "sectors": ["diplomatic"],
            "commodities": [],
            "source_type": "ap",
        },
    ]


@pytest.fixture
def sample_episode() -> Episode:
    return Episode(
        id="ep-test-001",
        title="Iran Missile Strike Crisis",
        summary="Iran launched missiles at a military base, causing oil prices to surge and triggering UN emergency session.",
        timeline=Timeline(
            events=[
                TimelineEvent(
                    date=datetime(2026, 1, 15, 8, 0),
                    title="Iran Launches Missiles",
                    description="Ballistic missile strike on military base",
                    event_type="military",
                ),
                TimelineEvent(
                    date=datetime(2026, 1, 15, 10, 0),
                    title="Oil Prices Surge",
                    description="Brent crude jumps 5%",
                    event_type="market",
                ),
            ]
        ),
        participants=[
            Participant(
                name="Iran",
                participant_type=ParticipantType.NATION,
                role=ParticipantRole.INITIATOR,
            ),
        ],
        locations=["Iran", "Middle East"],
        entities=["Iran", "Military Base", "Brent Crude"],
        commodities=["oil"],
        sectors=["energy", "defense", "diplomatic"],
        confidence=0.85,
        source_count=3,
    )


@pytest.fixture
def sample_episode_with_outcomes() -> Episode:
    ep = Episode(
        id="ep-test-002",
        title="Russia-Ukraine Conflict Escalation",
        summary="Russia escalated military operations in Ukraine, triggering sanctions and commodity price shocks.",
        timeline=Timeline(
            events=[
                TimelineEvent(
                    date=datetime(2026, 2, 1),
                    title="Troop Buildup",
                    description="Russian troops mass near border",
                    event_type="military",
                ),
                TimelineEvent(
                    date=datetime(2026, 2, 15),
                    title="Sanctions Imposed",
                    description="EU and US impose sweeping sanctions",
                    event_type="economic",
                ),
            ]
        ),
        participants=[
            Participant(name="Russia", participant_type=ParticipantType.NATION, role=ParticipantRole.INITIATOR),
            Participant(name="Ukraine", participant_type=ParticipantType.NATION, role=ParticipantRole.TARGET),
        ],
        locations=["Ukraine", "Russia", "Eastern Europe"],
        entities=["Russia", "Ukraine", "NATO", "EU"],
        commodities=["oil", "gas", "wheat"],
        sectors=["energy", "agriculture", "defense"],
        confidence=0.9,
        source_count=5,
    )
    ep.add_outcome(
        Outcome(
            category=OutcomeCategory.MARKET,
            metric="Brent Crude",
            value=18.0,
            unit="%",
            direction="up",
            severity=OutcomeSeverity.MAJOR,
            timestamp=datetime(2026, 3, 1),
            description="Oil surged 18% in 30 days",
        )
    )
    ep.add_outcome(
        Outcome(
            category=OutcomeCategory.ECONOMIC,
            metric="Inflation",
            value=4.0,
            unit="%",
            direction="up",
            severity=OutcomeSeverity.MODERATE,
            timestamp=datetime(2026, 4, 1),
            description="Global inflation increased by 4%",
        )
    )
    return ep
