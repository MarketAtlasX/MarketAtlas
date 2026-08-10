"""EventExtractor — extract entities and state impacts from raw events."""

from __future__ import annotations

import logging
import re
from typing import Any, Dict, List, Optional, Tuple

from world_state.core.registry import StateRegistry
from world_state.core.types import NodeType, StateDelta

logger = logging.getLogger(__name__)

COUNTRY_KEYWORDS = [
    "USA", "United States", "China", "Russia", "Ukraine", "Iran", "Israel",
    "India", "Germany", "France", "UK", "Japan", "Saudi Arabia", "Turkey",
    "North Korea", "Syria", "Afghanistan", "Venezuela", "Brazil", "Pakistan",
    "Somalia", "Ethiopia", "Myanmar", "Sudan", "Yemen", "Iraq", "Afghanistan",
    "Australia", "Canada", "Mexico", "South Korea", "Italy", "Spain",
    "Netherlands", "Sweden", "Norway", "Poland", "Egypt", "Nigeria",
    "South Africa", "Argentina", "Chile", "Colombia", "Indonesia", "Malaysia",
    "Taiwan", "Philippines", "Thailand", "Vietnam", "Bangladesh",
]

REGION_MAP: Dict[str, List[str]] = {
    "europe": ["Germany", "France", "UK", "Italy", "Spain", "Netherlands", "Sweden", "Norway", "Poland"],
    "middle_east": ["Iran", "Israel", "Saudi Arabia", "Turkey", "Syria", "Iraq", "Yemen", "Afghanistan"],
    "asia_pacific": ["China", "India", "Japan", "South Korea", "Australia", "Taiwan", "Indonesia", "Malaysia", "Philippines", "Thailand", "Vietnam"],
    "north_america": ["USA", "Canada", "Mexico"],
    "south_america": ["Brazil", "Argentina", "Chile", "Colombia"],
    "africa": ["Nigeria", "South Africa", "Somalia", "Ethiopia", "Sudan", "Egypt"],
    "eurasia": ["Russia", "Ukraine"],
}

SECTOR_KEYWORDS: Dict[str, List[str]] = {
    "energy": ["oil", "gas", "energy", "petroleum", "renewable", "OPEC", "crude", "refinery"],
    "technology": ["tech", "AI", "semiconductor", "software", "cyber", "chip", "quantum", "cloud"],
    "finance": ["bank", "finance", "insurance", "fintech", "lending", "central bank", "fed", "ECB"],
    "healthcare": ["health", "pharma", "biotech", "medical", "hospital", "vaccine"],
    "defense": ["defense", "military", "aerospace", "arms", "weapon", "missile"],
    "transportation": ["shipping", "airline", "logistics", "port", "cargo", "supply chain"],
    "agriculture": ["agriculture", "farming", "crop", "food", "grain", "wheat", "corn"],
    "commodities": ["gold", "silver", "copper", "lithium", "rare earth", "mining"],
}

COMMODITY_KEYWORDS: Dict[str, List[str]] = {
    "oil": ["oil", "crude", "petroleum", "brent", "wti"],
    "gas": ["gas", "lng", "natural gas"],
    "gold": ["gold", "precious metal"],
    "copper": ["copper", "industrial metal"],
    "lithium": ["lithium", "battery", "ev"],
    "wheat": ["wheat", "grain", "corn", "soybean"],
}

SEVERITY_MAP: Dict[str, float] = {
    "invasion": 0.9, "war": 0.85, "attack": 0.8, "bombing": 0.8,
    "sanctions": 0.6, "protest": 0.5, "election": 0.3, "diplomatic": 0.2,
    "summit": 0.15, "agreement": -0.2, "ceasefire": -0.6, "peace": -0.7,
}


class EventExtractor:
    """Extract entities, affected state variables, and delta values from events."""

    def __init__(self) -> None:
        self.registry = StateRegistry()

    def extract(self, event_data: Dict[str, Any]) -> List[StateDelta]:
        deltas: List[StateDelta] = []
        title = event_data.get("title", "")
        content = event_data.get("content", "") or event_data.get("summary", "")
        text = f"{title} {content}".lower()
        source = event_data.get("source", "unknown")
        event_id = event_data.get("id")
        severity = self._infer_severity(text)

        countries = self._extract_countries(text)
        regions = self._extract_regions(countries)
        sectors = self._extract_sectors(text)
        commodities = self._extract_commodities(text)

        event_delta: Dict[str, float] = {
            "geopolitical_risk": 0.05 * severity,
            "military_activity": 0.08 * severity,
            "confidence": 0.15,
        }

        for country in countries:
            cid = country.lower().replace(" ", "_")
            deltas.append(StateDelta(
                node_id=cid,
                node_type=NodeType.COUNTRY,
                updates={
                    **event_delta,
                    "political_risk": 0.06 * severity,
                    "sanctions": 0.04 * severity if any(kw in text for kw in ["sanctions", "embargo", "tariff"]) else 0,
                    "shipping_activity": -0.1 * severity if any(kw in text for kw in ["block", "strait", "port", "shipping", "cargo"]) else 0,
                    "oil_production": -0.08 * severity if "oil" in text else 0,
                },
                confidence=0.6,
                source_event_id=event_id,
                source_event_title=title,
            ))

        for region in regions:
            rid = region.lower().replace(" ", "_")
            deltas.append(StateDelta(
                node_id=rid,
                node_type=NodeType.REGION,
                updates={
                    "regional_conflict_level": 0.04 * severity,
                    "trade_tension": 0.03 * severity,
                    "supply_chain_risk": 0.05 * severity,
                },
                confidence=0.5,
                source_event_id=event_id,
                source_event_title=title,
            ))

        for sector in sectors:
            sid = sector.lower().replace(" ", "_")
            deltas.append(StateDelta(
                node_id=sid,
                node_type=NodeType.SECTOR,
                updates={
                    "sector_risk": 0.05 * severity,
                    "supply_chain_disruption": 0.06 * severity,
                    "market_sentiment": -0.04 * severity,
                },
                confidence=0.55,
                source_event_id=event_id,
                source_event_title=title,
            ))

        for commodity in commodities:
            cid = commodity.lower().replace(" ", "_")
            direction = 1.0 if any(kw in text for kw in ["shortage", "disruption", "cut", "block"]) else -0.5
            deltas.append(StateDelta(
                node_id=cid,
                node_type=NodeType.COMMODITY,
                updates={
                    "price_pressure": 0.1 * severity * direction,
                    "supply_risk": 0.08 * severity,
                    "demand_pressure": 0.04 * severity,
                },
                confidence=0.6,
                source_event_id=event_id,
                source_event_title=title,
            ))

        world_updates: Dict[str, float] = {
            "global_conflict_index": 0.02 * severity,
            "global_market_sentiment": -0.02 * severity,
        }
        if countries:
            world_updates["global_trade_volume"] = -0.01 * severity

        deltas.append(StateDelta(
            node_id="world",
            node_type=NodeType.WORLD,
            updates=world_updates,
            confidence=0.4,
            source_event_id=event_id,
            source_event_title=title,
        ))

        logger.debug(
            "Extracted %d deltas from event '%s': %d countries, %d regions, %d sectors, %d commodities",
            len(deltas), title[:50], len(countries), len(regions), len(sectors), len(commodities),
        )

        return deltas

    def _extract_countries(self, text: str) -> List[str]:
        return [c for c in COUNTRY_KEYWORDS if c.lower() in text]

    def _extract_regions(self, countries: List[str]) -> List[str]:
        regions = set()
        country_set = set(c.lower() for c in countries)
        for region, members in REGION_MAP.items():
            if any(m.lower() in country_set for m in members):
                regions.add(region)
        return list(regions)

    def _extract_sectors(self, text: str) -> List[str]:
        sectors = set()
        for sector, keywords in SECTOR_KEYWORDS.items():
            if any(kw.lower() in text for kw in keywords):
                sectors.add(sector)
        return list(sectors)

    def _extract_commodities(self, text: str) -> List[str]:
        commodities = set()
        for commodity, keywords in COMMODITY_KEYWORDS.items():
            if any(kw.lower() in text for kw in keywords):
                commodities.add(commodity)
        return list(commodities)

    def _infer_severity(self, text: str) -> float:
        for word, sev in SEVERITY_MAP.items():
            if word in text:
                return sev
        return 0.3
