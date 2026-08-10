"""RiskPropagator — propagate state changes through the knowledge graph hierarchy.

Country → Region → World
Commodity → Sector → Market
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from world_state.core.registry import StateRegistry
from world_state.core.types import NodeType, StateDelta

logger = logging.getLogger(__name__)

PROPAGATION_RULES = {
    "oil": {"sectors": ["energy", "transportation"], "decay": 0.6},
    "gas": {"sectors": ["energy"], "decay": 0.6},
    "gold": {"sectors": ["finance"], "decay": 0.4},
    "copper": {"sectors": ["technology", "energy"], "decay": 0.5},
    "lithium": {"sectors": ["technology", "energy"], "decay": 0.5},
    "wheat": {"sectors": ["agriculture"], "decay": 0.6},
}

REGION_COUNTRY_MAP: Dict[str, List[str]] = {
    "europe": ["germany", "france", "uk", "italy", "spain", "netherlands", "sweden", "norway", "poland"],
    "middle_east": ["iran", "israel", "saudi_arabia", "turkey", "syria", "iraq", "yemen"],
    "asia_pacific": ["china", "india", "japan", "south_korea", "australia", "taiwan", "indonesia", "malaysia", "philippines", "thailand", "vietnam"],
    "north_america": ["usa", "canada", "mexico"],
    "south_america": ["brazil", "argentina", "chile", "colombia"],
    "africa": ["nigeria", "south_africa", "somalia", "ethiopia", "sudan", "egypt"],
    "eurasia": ["russia", "ukraine"],
}

COUNTRY_TO_REGION: Dict[str, str] = {}
for region, countries in REGION_COUNTRY_MAP.items():
    for country in countries:
        COUNTRY_TO_REGION[country] = region


class RiskPropagator:
    """Propagate state changes through the hierarchy."""

    def __init__(self) -> None:
        self.registry = StateRegistry()

    def propagate(self, delta: StateDelta) -> List[StateDelta]:
        propagated: List[StateDelta] = []

        if delta.node_type == NodeType.COUNTRY:
            propagated.extend(self._propagate_country(delta))
        elif delta.node_type == NodeType.COMMODITY:
            propagated.extend(self._propagate_commodity(delta))
        elif delta.node_type == NodeType.SECTOR:
            propagated.extend(self._propagate_sector(delta))
        elif delta.node_type == NodeType.REGION:
            propagated.extend(self._propagate_region(delta))

        return propagated

    def _propagate_country(self, delta: StateDelta) -> List[StateDelta]:
        results: List[StateDelta] = []
        region = COUNTRY_TO_REGION.get(delta.node_id)

        if region:
            military_delta = delta.updates.get("military_activity", 0) * 0.5
            conflict_delta = delta.updates.get("conflict_level", 0) * 0.4

            if military_delta != 0 or conflict_delta != 0:
                results.append(StateDelta(
                    node_id=region,
                    node_type=NodeType.REGION,
                    updates={
                        "regional_conflict_level": conflict_delta,
                        "avg_military_risk": military_delta,
                    },
                    confidence=delta.confidence * 0.5,
                    source_event_id=delta.source_event_id,
                    source_event_title=delta.source_event_title,
                ))

            oil_delta = delta.updates.get("oil_production", 0)
            if oil_delta != 0:
                results.append(StateDelta(
                    node_id="oil",
                    node_type=NodeType.COMMODITY,
                    updates={"supply_risk": -oil_delta * 0.7, "price_pressure": -oil_delta * 0.5},
                    confidence=delta.confidence * 0.5,
                    source_event_id=delta.source_event_id,
                    source_event_title=delta.source_event_title,
                ))

        return results

    def _propagate_commodity(self, delta: StateDelta) -> List[StateDelta]:
        results: List[StateDelta] = []
        rules = PROPAGATION_RULES.get(delta.node_id)
        if not rules:
            return results

        for sector in rules["sectors"]:
            decay = rules["decay"]
            supply_delta = delta.updates.get("supply_risk", 0) * decay
            price_delta = delta.updates.get("price_pressure", 0) * decay

            if supply_delta != 0 or price_delta != 0:
                results.append(StateDelta(
                    node_id=sector,
                    node_type=NodeType.SECTOR,
                    updates={
                        "commodity_input_cost": price_delta,
                        "supply_chain_disruption": supply_delta,
                        "sector_risk": (supply_delta + price_delta) / 2,
                    },
                    confidence=delta.confidence * decay,
                    source_event_id=delta.source_event_id,
                    source_event_title=delta.source_event_title,
                ))

        return results

    def _propagate_sector(self, delta: StateDelta) -> List[StateDelta]:
        results: List[StateDelta] = []

        sector_risk = delta.updates.get("sector_risk", 0)
        if sector_risk != 0:
            results.append(StateDelta(
                node_id="world",
                node_type=NodeType.WORLD,
                updates={
                    "global_conflict_index": sector_risk * 0.1,
                    "global_market_sentiment": -sector_risk * 0.15,
                },
                confidence=delta.confidence * 0.3,
                source_event_id=delta.source_event_id,
                source_event_title=delta.source_event_title,
            ))

        return results

    def _propagate_region(self, delta: StateDelta) -> List[StateDelta]:
        results: List[StateDelta] = []

        conflict_level = delta.updates.get("regional_conflict_level", 0)
        trade_tension = delta.updates.get("trade_tension", 0)
        supply_risk = delta.updates.get("supply_chain_risk", 0)

        world_updates: Dict[str, float] = {}
        if conflict_level != 0:
            world_updates["global_conflict_index"] = conflict_level * 0.3
        if trade_tension != 0:
            world_updates["global_trade_volume"] = -trade_tension * 0.2
        if supply_risk != 0:
            world_updates["global_inflation_pressure"] = supply_risk * 0.15

        if world_updates:
            results.append(StateDelta(
                node_id="world",
                node_type=NodeType.WORLD,
                updates=world_updates,
                confidence=delta.confidence * 0.3,
                source_event_id=delta.source_event_id,
                source_event_title=delta.source_event_title,
            ))

        return results
