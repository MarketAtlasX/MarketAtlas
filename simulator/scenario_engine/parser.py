from __future__ import annotations

import logging
import re
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from simulator.models.scenario import (
    Assumption,
    AssumptionGraph,
    EventType,
    InjectedEvent,
    Scenario,
)
from simulator.scenario_engine.builder import ScenarioBuilder

logger = logging.getLogger(__name__)

EVENT_KEYWORDS: Dict[str, EventType] = {
    "invade": EventType.MILITARY_CONFLICT,
    "invasion": EventType.MILITARY_CONFLICT,
    "attack": EventType.MILITARY_CONFLICT,
    "war": EventType.MILITARY_CONFLICT,
    "sanction": EventType.SANCTIONS,
    "sanctions": EventType.SANCTIONS,
    "blockade": EventType.PORT_CLOSURE,
    "block": EventType.PORT_CLOSURE,
    "embargo": EventType.ENERGY_EMBARGO,
    "cyber": EventType.CYBER_ATTACK,
    "hack": EventType.CYBER_ATTACK,
    "tariff": EventType.TRADE_WAR,
    "ban": EventType.TECH_BAN,
    "export ban": EventType.CHIP_EXPORT_BAN,
    "mobilize": EventType.TROOP_MOBILIZATION,
    "troop": EventType.TROOP_MOBILIZATION,
    "treaty": EventType.TREATY_SIGNING,
    "stimulus": EventType.ECONOMIC_STIMULUS,
    "crisis": EventType.FINANCIAL_CRISIS,
    "disaster": EventType.NATURAL_DISASTER,
    "pandemic": EventType.PANDEMIC,
    "diplomatic": EventType.DIPLOMATIC_BREAK,
    "currency": EventType.CURRENCY_CRISIS,
}


class ScenarioParser:
    def parse_natural_language(self, text: str) -> Scenario:
        builder = ScenarioBuilder()
        title = self._extract_title(text)
        description = text
        builder.with_title(title).with_description(description)

        events = self._extract_events(text)
        for event in events:
            builder.add_event(event)

        assumptions = self._extract_assumptions(text)
        for assumption in assumptions:
            builder.add_assumption(assumption)

        duration = self._extract_duration(text)
        builder.with_duration(duration)

        return builder.build()

    def _extract_title(self, text: str) -> str:
        lines = text.strip().split("\n")
        first = lines[0].strip()
        if len(first) < 100 and first.endswith((".", "?", "!")):
            return first[:-1]
        words = text.split()[:12]
        return " ".join(words) + ("..." if len(words) >= 12 else "")

    def _extract_events(self, text: str) -> List[InjectedEvent]:
        events: List[InjectedEvent] = []
        text_lower = text.lower()

        found_types = set()
        for keyword, event_type in EVENT_KEYWORDS.items():
            if keyword in text_lower and event_type not in found_types:
                countries = self._extract_countries(text)
                events.append(InjectedEvent(
                    event_type=event_type,
                    title=f"{event_type.value.replace('_', ' ').title()} Event",
                    description=f"Detected from input: {keyword}",
                    countries=countries,
                    severity=0.6,
                ))
                found_types.add(event_type)

        if not events:
            events.append(InjectedEvent(
                event_type=EventType.DEFAULT,
                title="Generic Scenario Event",
                description=text[:200],
                countries=self._extract_countries(text),
                severity=0.5,
            ))

        return events

    def _extract_assumptions(self, text: str) -> List[Assumption]:
        assumptions: List[Assumption] = []
        lines = text.split("\n")
        for line in lines:
            line = line.strip()
            if not line:
                continue
            prob_match = re.search(r"(\d+)%", line)
            probability = int(prob_match.group(1)) / 100.0 if prob_match else 0.5
            if re.search(r"(assume|assuming|given that|if)", line.lower()):
                assumptions.append(Assumption(
                    id=str(uuid.uuid4()),
                    description=line[:200],
                    probability=probability,
                    category="parsed",
                ))
        return assumptions

    def _extract_countries(self, text: str) -> List[str]:
        known_countries = [
            "china", "taiwan", "usa", "us", "united states", "russia",
            "ukraine", "iran", "israel", "saudi arabia", "india", "japan",
            "south korea", "north korea", "germany", "france", "uk",
            "united kingdom", "australia", "brazil", "canada", "mexico",
            "turkey", "pakistan", "indonesia", "vietnam", "thailand",
        ]
        text_lower = text.lower()
        found = []
        for country in known_countries:
            if country in text_lower:
                found.append(country.title())
        return found

    def _extract_duration(self, text: str) -> int:
        patterns = [
            (r"(\d+)\s*years?", 365),
            (r"(\d+)\s*months?", 30),
            (r"(\d+)\s*weeks?", 7),
            (r"(\d+)\s*days?", 1),
        ]
        text_lower = text.lower()
        total_days = 365
        for pattern, multiplier in patterns:
            match = re.search(pattern, text_lower)
            if match:
                return int(match.group(1)) * multiplier
        return total_days
