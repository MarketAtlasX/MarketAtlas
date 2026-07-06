"""RiskAggregator — multi-scale risk aggregation across the hierarchy.

Aggregates risk from countries → regions → world and from
companies → sectors → world.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

import numpy as np

from world_state.core.registry import StateRegistry
from world_state.risk.engine import WorldRiskEngine

logger = logging.getLogger(__name__)


class RiskAggregator:
    """Multi-scale risk aggregation."""

    def __init__(self, registry: Optional[StateRegistry] = None) -> None:
        self.registry = registry or StateRegistry()
        self.engine = WorldRiskEngine(registry)

    def aggregate_by_region(self) -> Dict[str, Dict[str, Any]]:
        regions: Dict[str, Dict[str, Any]] = {}

        for cid, country in self.registry.countries.items():
            region_name = self._find_region(cid)
            if region_name not in regions:
                regions[region_name] = {
                    "countries": [],
                    "risk_scores": [],
                    "economic_scores": [],
                    "conflict_scores": [],
                }
            cr = self.engine.compute_country_risk(cid)
            regions[region_name]["countries"].append(cid)
            regions[region_name]["risk_scores"].append(cr.get("composite_risk", 0))
            regions[region_name]["economic_scores"].append(cr.get("economic_risk", 0))
            regions[region_name]["conflict_scores"].append(cr.get("geopolitical_risk", 0))

        result = {}
        for region, data in regions.items():
            if data["risk_scores"]:
                result[region] = {
                    "countries": data["countries"],
                    "avg_risk": float(np.mean(data["risk_scores"])),
                    "max_risk": float(np.max(data["risk_scores"])),
                    "avg_economic": float(np.mean(data["economic_scores"])),
                    "avg_conflict": float(np.mean(data["conflict_scores"])),
                    "country_count": len(data["countries"]),
                    "level": self.engine._risk_level(float(np.mean(data["risk_scores"]))),
                }

        return result

    def aggregate_by_sector(self) -> Dict[str, Dict[str, Any]]:
        sectors: Dict[str, Dict[str, Any]] = {}

        for sid, sector in self.registry.sectors.items():
            sr = self.engine.compute_sector_risk(sid)
            sectors[sid] = {
                "risk": sr.get("composite_risk", 0),
                "level": sr.get("level", "low"),
                "company_count": len(sector.companies),
            }

        return sectors

    def aggregate_countries_to_world(self) -> Dict[str, float]:
        if not self.registry.countries:
            return {"world_aggregate_risk": 0.0, "world_aggregate_confidence": 0.0}

        risks = []
        confidences = []
        for cid, country in self.registry.countries.items():
            cr = self.engine.compute_country_risk(cid)
            risks.append(cr.get("composite_risk", 0))
            confidences.append(country.confidence)

        return {
            "world_aggregate_risk": float(np.mean(risks)),
            "world_max_country_risk": float(np.max(risks)),
            "world_aggregate_confidence": float(np.mean(confidences)),
            "countries_assessed": len(risks),
        }

    def full_aggregation(self) -> Dict[str, Any]:
        return {
            "global": self.engine.compute_global_risk(),
            "world_aggregate": self.aggregate_countries_to_world(),
            "regions": self.aggregate_by_region(),
            "sectors": self.aggregate_by_sector(),
            "timestamp": __import__("datetime").datetime.utcnow().isoformat(),
        }

    def _find_region(self, country_id: str) -> str:
        from world_state.pipeline.propagate import COUNTRY_TO_REGION
        return COUNTRY_TO_REGION.get(country_id, "other")
