from __future__ import annotations

from typing import Any, Dict, List

from simulator.agents.base import BaseAgent
from simulator.models.agents import AgentReport, AgentType, ImpactMetric
from simulator.models.scenario import EventType, Scenario
from simulator.models.world import SimulationWorld


class MarketAgent(BaseAgent):
    def __init__(self):
        super().__init__(AgentType.MARKET, "Market Impact Agent")

    def analyze(
        self,
        scenario: Scenario,
        world_state: SimulationWorld,
        horizon_days: int,
    ) -> AgentReport:
        impacts: List[ImpactMetric] = []
        risks: List[str] = []
        opportunities: List[str] = []
        assumption_ids = [a.id for a in scenario.assumptions.get_active_assumptions()]

        base_vix = world_state.global_indicators.get("vix", 18.5)
        severity_sum = sum(e.severity for e in scenario.injected_events)
        event_count = len(scenario.injected_events)

        vix_multiplier = 1.0 + (severity_sum / max(event_count, 1)) * (horizon_days / 90.0)
        vix_forecast = base_vix * vix_multiplier
        vix_forecast = min(80.0, max(10.0, vix_forecast))

        sector_impacts: Dict[str, float] = {
            "technology": -0.05 * severity_sum,
            "energy": 0.03 * severity_sum,
            "defense": 0.04 * severity_sum,
            "financials": -0.02 * severity_sum,
            "healthcare": -0.01 * severity_sum,
            "consumer": -0.03 * severity_sum,
            "materials": -0.02 * severity_sum,
            "utilities": 0.01 * severity_sum,
        }

        has_chip_ban = any(e.event_type == EventType.CHIP_EXPORT_BAN for e in scenario.injected_events)
        if has_chip_ban:
            sector_impacts["technology"] -= 0.1
            sector_impacts["semiconductors"] = -0.15

        impacts.append(self._build_impact(
            "vix_forecast",
            round(vix_forecast, 1),
            "up" if vix_forecast > base_vix else "down",
            confidence=0.75,
            reasoning=f"VIX projected at {vix_forecast:.1f} from {base_vix:.1f}",
        ))

        impacts.append(self._build_impact(
            "market_correlation_shift",
            round(min(1.0, severity_sum * 0.1), 4),
            "up",
            confidence=0.65,
            reasoning="Increased cross-asset correlation during crisis",
        ))

        for sector, impact in sorted(sector_impacts.items(), key=lambda x: abs(x[1]), reverse=True)[:5]:
            impacts.append(self._build_impact(
                f"sector_{sector}",
                round(impact, 4),
                "down" if impact < 0 else "up",
                confidence=0.6,
                reasoning=f"Sector {sector} impact {impact:+.1%} from scenario",
            ))

        worst_sectors = sorted(sector_impacts.items(), key=lambda x: x[1])[:3]
        best_sectors = sorted(sector_impacts.items(), key=lambda x: x[1], reverse=True)[:3]

        for sector, impact in worst_sectors:
            risks.append(f"Severe downside for {sector} sector ({impact:.0%})")
        for sector, impact in best_sectors:
            if impact > 0.02:
                opportunities.append(f"{sector.title()} sector benefits ({impact:+.0%})")

        if vix_forecast > 30:
            risks.append("Elevated volatility regime likely")
        if vix_forecast > 45:
            risks.append("Potential market stress / liquidity crunch")

        confidence = (0.7 - severity_sum * 0.05) * self._assumption_confidence_penalty(scenario.assumptions)

        return AgentReport(
            agent_type=self.agent_type,
            agent_name=self.name,
            summary=f"VIX {vix_forecast:.1f} ({vix_forecast - base_vix:+.1f}), tech {sector_impacts.get('technology', 0):+.0%}",
            impacts=impacts,
            confidence=round(confidence, 4),
            key_risks=risks,
            key_opportunities=opportunities,
            assumptions_used=assumption_ids,
            reasoning_graph={
                "vix_forecast": vix_forecast,
                "base_vix": base_vix,
                "sector_impacts": sector_impacts,
                "severity_sum": severity_sum,
            },
        )
