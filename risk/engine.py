"""WorldRiskEngine — aggregate risk across all scales.

Computes composite risk scores from the Dynamic World State.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

import numpy as np

from world_state.core.registry import StateRegistry
from world_state.core.types import NodeType

logger = logging.getLogger(__name__)


class WorldRiskEngine:
    """Aggregate everything. Computes risk from the world state."""

    def __init__(self, registry: Optional[StateRegistry] = None) -> None:
        self.registry = registry or StateRegistry()

        self.risk_weights: Dict[str, float] = {
            "geopolitical": 0.35,
            "economic": 0.25,
            "market": 0.25,
            "infrastructure": 0.15,
        }

        self.thresholds: Dict[str, Dict[str, float]] = {
            "geopolitical": {"low": 0.3, "medium": 0.6, "high": 0.8},
            "economic": {"low": 0.3, "medium": 0.6, "high": 0.8},
            "market": {"low": 0.3, "medium": 0.6, "high": 0.8},
            "infrastructure": {"low": 0.3, "medium": 0.6, "high": 0.8},
        }

    def compute_global_risk(self) -> Dict[str, Any]:
        world = self.registry.world

        geopolitical_risk = self._score_geopolitical()
        economic_risk = self._score_economic()
        market_risk = self._score_market()
        infrastructure_risk = self._score_infrastructure()

        composite = (
            geopolitical_risk * self.risk_weights["geopolitical"]
            + economic_risk * self.risk_weights["economic"]
            + market_risk * self.risk_weights["market"]
            + infrastructure_risk * self.risk_weights["infrastructure"]
        )

        return {
            "composite_risk": round(composite, 4),
            "geopolitical_risk": round(geopolitical_risk, 4),
            "economic_risk": round(economic_risk, 4),
            "market_risk": round(market_risk, 4),
            "infrastructure_risk": round(infrastructure_risk, 4),
            "level": self._risk_level(composite),
            "confidence": round(self.registry.world.to_vector().avg_confidence, 4),
        }

    def compute_country_risk(self, country_id: str) -> Dict[str, Any]:
        country = self.registry.countries.get(country_id)
        if not country:
            return {"error": f"Country '{country_id}' not found"}

        geo = abs(country.geopolitical_risk) * 0.3 + abs(country.military_activity) * 0.3 + (1 - country.political_stability) * 0.4
        eco = abs(country.inflation) * 0.3 + (1 - country.economic_strength) * 0.4 + abs(country.export_capacity - 0.5) * 0.3
        infra = abs(country.shipping - 0.5) * 0.4 + abs(country.cyber_risk) * 0.3

        composite = geo * 0.4 + eco * 0.35 + infra * 0.25

        return {
            "country": country.name,
            "composite_risk": round(composite, 4),
            "geopolitical_risk": round(geo, 4),
            "economic_risk": round(eco, 4),
            "infrastructure_risk": round(infra, 4),
            "level": self._risk_level(composite),
        }

    def compute_sector_risk(self, sector_id: str) -> Dict[str, Any]:
        sector = self.registry.sectors.get(sector_id)
        if not sector:
            return {"error": f"Sector '{sector_id}' not found"}

        risk = (
            sector.sector_risk * 0.3
            + sector.supply_chain_disruption * 0.2
            + sector.regulatory_pressure * 0.15
            + abs(sector.market_sentiment) * 0.2
            + sector.volatility * 0.15
        )

        return {
            "sector": sector.name,
            "composite_risk": round(risk, 4),
            "level": self._risk_level(risk),
        }

    def _score_geopolitical(self) -> float:
        w = self.registry.world
        score = (
            abs(w.global_conflict_index) * 0.4
            + abs(w.global_cyber_risk) * 0.2
            + (1.0 - sum(c.political_stability for c in self.registry.countries.values()) / max(len(self.registry.countries), 1)) * 0.4
        )
        return float(np.clip(score, 0, 1))

    def _score_economic(self) -> float:
        w = self.registry.world
        score = (
            abs(w.global_inflation_pressure) * 0.3
            + abs(1.0 - w.global_economic_index) * 0.3
            + abs(1.0 - w.global_trade_volume) * 0.2
            + abs(w.global_energy_price_index - 0.5) * 0.2
        )
        return float(np.clip(score, 0, 1))

    def _score_market(self) -> float:
        w = self.registry.world
        score = (
            abs(w.global_market_sentiment) * 0.4
            + abs(w.global_volatility) * 0.3
            + (1.0 - w.global_confidence) * 0.3
        )
        return float(np.clip(score, 0, 1))

    def _score_infrastructure(self) -> float:
        w = self.registry.world
        score = (
            abs(w.global_climate_risk) * 0.3
            + abs(w.global_pandemic_risk) * 0.3
            + abs(w.global_cyber_risk) * 0.4
        )
        return float(np.clip(score, 0, 1))

    def _risk_level(self, score: float) -> str:
        if score >= 0.8:
            return "critical"
        elif score >= 0.6:
            return "high"
        elif score >= 0.3:
            return "moderate"
        else:
            return "low"

    def compute_all_country_risks(self) -> Dict[str, Dict[str, Any]]:
        return {
            cid: self.compute_country_risk(cid)
            for cid in self.registry.countries
        }

    def compute_all_sector_risks(self) -> Dict[str, Dict[str, Any]]:
        return {
            sid: self.compute_sector_risk(sid)
            for sid in self.registry.sectors
        }

    def risk_summary(self) -> Dict[str, Any]:
        global_risk = self.compute_global_risk()
        return {
            "global": global_risk,
            "top_risks": {
                "countries": dict(
                    sorted(
                        self.compute_all_country_risks().items(),
                        key=lambda x: x[1].get("composite_risk", 0),
                        reverse=True,
                    )[:10]
                ),
                "sectors": dict(
                    sorted(
                        self.compute_all_sector_risks().items(),
                        key=lambda x: x[1].get("composite_risk", 0),
                        reverse=True,
                    )[:5]
                ),
            },
            "timestamp": __import__("datetime").datetime.utcnow().isoformat(),
        }
