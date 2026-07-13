import uuid
from typing import Any

from .models import Procedure, ProcedureStep


class ProcedureExtractor:
    def extract_sanctions_procedure(self) -> Procedure:
        return Procedure(
            id=f"proc-{uuid.uuid4().hex[:10]}",
            name="Sanctions Impact Assessment",
            description="Process for assessing how sanctions affect supply chains and markets",
            category="geopolitical_response",
            steps=[
                ProcedureStep(
                    order=1,
                    name="Identify Sanctioned Entities",
                    description="Identify all entities subject to sanctions",
                    inputs=["sanction_list", "target_nation"],
                    outputs=["sanctioned_entities"],
                ),
                ProcedureStep(
                    order=2,
                    name="Map Supply Chain Exposure",
                    description="Map how sanctioned entities connect to global supply chains",
                    inputs=["sanctioned_entities", "trade_flows"],
                    outputs=["exposure_map"],
                ),
                ProcedureStep(
                    order=3,
                    name="Calculate Price Impact",
                    description="Calculate price impact on affected commodities and sectors",
                    inputs=["exposure_map", "historical_data"],
                    outputs=["price_estimates"],
                ),
                ProcedureStep(
                    order=4,
                    name="Assess Secondary Effects",
                    description="Assess secondary effects including inflation and substitution",
                    inputs=["price_estimates", "economic_indicators"],
                    outputs=["secondary_effects"],
                ),
                ProcedureStep(
                    order=5,
                    name="Generate Recommendations",
                    description="Generate actionable recommendations",
                    inputs=["secondary_effects", "risk_tolerance"],
                    outputs=["recommendations"],
                ),
            ],
            triggers=["sanctions_announced", "sanctions_escalated"],
            preconditions=["sanction_target_identified"],
            postconditions=["impact_assessment_complete"],
        )

    def extract_conflict_procedure(self) -> Procedure:
        return Procedure(
            id=f"proc-{uuid.uuid4().hex[:10]}",
            name="Conflict Impact Analysis",
            description="Process for analyzing how armed conflicts affect markets",
            category="geopolitical_response",
            steps=[
                ProcedureStep(
                    order=1,
                    name="Assess Conflict Intensity",
                    description="Assess the intensity and scope of the conflict",
                    inputs=["conflict_reports", "casualty_data"],
                    outputs=["intensity_score"],
                ),
                ProcedureStep(
                    order=2,
                    name="Identify Affected Regions",
                    description="Identify geographic regions directly and indirectly affected",
                    inputs=["conflict_reports", "geographic_data"],
                    outputs=["affected_regions"],
                ),
                ProcedureStep(
                    order=3,
                    name="Evaluate Commodity Exposure",
                    description="Evaluate commodity production and transit exposure",
                    inputs=["affected_regions", "commodity_flows"],
                    outputs=["commodity_risk"],
                ),
                ProcedureStep(
                    order=4,
                    name="Model Market Scenarios",
                    description="Model various market scenarios based on conflict evolution",
                    inputs=["commodity_risk", "historical_patterns"],
                    outputs=["scenarios"],
                ),
            ],
            triggers=["conflict_outbreak", "conflict_escalation"],
            preconditions=["conflict_identified"],
            postconditions=["scenario_analysis_complete"],
        )
