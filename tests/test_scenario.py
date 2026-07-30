from __future__ import annotations

from datetime import datetime, timedelta
from simulator.models.scenario import (
    Assumption,
    AssumptionGraph,
    EventType,
    InjectedEvent,
    Scenario,
)
from simulator.scenario_engine.builder import ScenarioBuilder
from simulator.scenario_engine.parser import ScenarioParser


def test_scenario_builder():
    builder = ScenarioBuilder()
    scenario = (
        builder
        .with_title("Taiwan Invasion")
        .with_description("China invades Taiwan in Q2 2027")
        .with_duration(365)
        .with_uncertainty(0.4)
        .add_event(InjectedEvent(
            event_type=EventType.MILITARY_CONFLICT,
            title="Invasion of Taiwan",
            description="China launches amphibious invasion",
            countries=["China", "Taiwan"],
            severity=0.9,
        ))
        .add_assumption(Assumption(
            id="us_intervention",
            description="US intervenes militarily",
            probability=0.7,
            category="military",
        ))
        .build()
    )

    assert scenario.title == "Taiwan Invasion"
    assert len(scenario.injected_events) == 1
    assert len(scenario.assumptions.assumptions) == 1
    assert scenario.duration.days == 365
    assert scenario.expected_uncertainty == 0.4


def test_assumption_graph():
    graph = AssumptionGraph()
    a1 = Assumption(id="a1", description="US intervenes", probability=0.7, category="military")
    a2 = Assumption(id="a2", description="Chip exports stop", probability=0.9, category="tech", depends_on=["a1"])
    a3 = Assumption(id="a3", description="Oil shipping affected", probability=0.4, category="energy")

    graph.add_assumption(a1)
    graph.add_assumption(a2)
    graph.add_assumption(a3)

    assert len(graph.get_active_assumptions()) == 3
    graph.toggle_assumption("a3", False)
    assert len(graph.get_active_assumptions()) == 2

    dependents = graph.get_dependents("a1")
    assert len(dependents) == 1
    assert dependents[0].id == "a2"


def test_scenario_parser():
    parser = ScenarioParser()
    text = "China invades Taiwan in Q2 2027. The US is expected to intervene (70% probability). Chip exports will stop (90%)."
    scenario = parser.parse_natural_language(text)

    assert scenario.title is not None
    assert len(scenario.injected_events) > 0
    assert len(scenario.assumptions.assumptions) >= 0


def test_to_dict():
    scenario = Scenario(
        id="test-1",
        title="Test",
        description="A test scenario",
        assumptions=AssumptionGraph(),
        injected_events=[
            InjectedEvent(
                event_type=EventType.SANCTIONS,
                title="Sanctions",
                description="Test sanctions",
                countries=["US", "China"],
                severity=0.6,
            )
        ],
        start_time=datetime.utcnow(),
        duration=timedelta(days=180),
    )
    d = scenario.to_dict()
    assert d["id"] == "test-1"
    assert d["title"] == "Test"
    assert len(d["injected_events"]) == 1
