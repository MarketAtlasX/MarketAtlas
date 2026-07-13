from datetime import datetime

from episodic_memory.models import (
    Episode,
    Outcome,
    OutcomeCategory,
    OutcomeSeverity,
    Participant,
    ParticipantRole,
    ParticipantType,
    Timeline,
    TimelineEvent,
)


def test_episode_creation():
    ep = Episode(
        id="ep-test-1",
        title="Test Event",
        summary="A test geopolitical event",
        locations=["Testland"],
        entities=["EntityA"],
        commodities=["oil"],
        sectors=["energy"],
    )
    assert ep.id == "ep-test-1"
    assert ep.title == "Test Event"
    assert len(ep.outcomes) == 0
    assert len(ep.lessons) == 0
    assert ep.confidence == 0.0


def test_episode_add_timeline_event():
    ep = Episode(id="ep-timeline", title="Timeline Test", summary="")
    event = TimelineEvent(
        date=datetime(2026, 1, 1),
        title="Event 1",
        description="Description",
        event_type="military",
    )
    ep.add_timeline_event(event)
    assert len(ep.timeline.events) == 1
    assert ep.timeline.events[0].title == "Event 1"


def test_episode_add_outcome():
    ep = Episode(id="ep-outcome", title="Outcome Test", summary="")
    outcome = Outcome(
        category=OutcomeCategory.MARKET,
        metric="Oil",
        value=5.0,
        unit="%",
        direction="up",
    )
    ep.add_outcome(outcome)
    assert len(ep.outcomes) == 1
    assert ep.outcomes[0].value == 5.0


def test_episode_add_lesson():
    ep = Episode(id="ep-lesson", title="Lesson Test", summary="")
    ep.add_lesson("Sanctions cause inflation")
    ep.add_lesson("Sanctions cause inflation")
    assert len(ep.lessons) == 1
    ep.add_lesson("Military action affects oil")
    assert len(ep.lessons) == 2


def test_episode_add_participant():
    ep = Episode(id="ep-part", title="Participant Test", summary="")
    p1 = Participant(
        name="Iran",
        participant_type=ParticipantType.NATION,
        role=ParticipantRole.INITIATOR,
    )
    p2 = Participant(
        name="Iran",
        participant_type=ParticipantType.NATION,
        role=ParticipantRole.TARGET,
    )
    ep.add_participant(p1)
    assert len(ep.participants) == 1
    ep.add_participant(p2)
    assert len(ep.participants) == 1


def test_episode_to_embedding_text():
    ep = Episode(
        id="ep-emb",
        title="Iran Crisis",
        summary="Iran launched missiles",
        entities=["Iran", "Missile"],
        sectors=["energy"],
        locations=["Middle East"],
        commodities=["oil"],
    )
    text = ep.to_embedding_text()
    assert "Iran Crisis" in text
    assert "Iran" in text
    assert "energy" in text


def test_episode_dict_summary():
    ep = Episode(
        id="ep-summary",
        title="Summary Test",
        summary="A long summary that should be truncated in the dict_summary output",
        locations=["A"],
    )
    summary = ep.dict_summary()
    assert summary["id"] == "ep-summary"
    assert summary["title"] == "Summary Test"
    assert isinstance(summary["participants"], list)


def test_timeline_duration():
    tl = Timeline()
    tl.add_event(
        TimelineEvent(
            date=datetime(2026, 1, 1),
            title="Start",
            description="",
            event_type="general",
        )
    )
    tl.add_event(
        TimelineEvent(
            date=datetime(2026, 1, 10),
            title="End",
            description="",
            event_type="general",
        )
    )
    assert tl.duration_days() == 9


def test_timeline_filter():
    tl = Timeline()
    tl.add_event(
        TimelineEvent(
            date=datetime(2026, 1, 1),
            title="Mil",
            description="",
            event_type="military",
        )
    )
    tl.add_event(
        TimelineEvent(
            date=datetime(2026, 1, 2),
            title="Mkt",
            description="",
            event_type="market",
        )
    )
    military = tl.filter_by_type("military")
    assert len(military) == 1
    assert military[0].title == "Mil"
