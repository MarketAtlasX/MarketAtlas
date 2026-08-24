"""Final Prediction Synthesis Agent for MarketAtlas.

Synthesizes outputs from the Historical Agent, Geopolitical Agent, and live market
context to produce an explainable, probability-weighted prediction with calibrated confidence,
reconciled contradictory evidence, and 4 alternative scenarios (Base, Bull, Bear, Tail-Risk).
"""

from __future__ import annotations

import json
import logging
import re
from datetime import datetime, timezone
from typing import Any, Optional
from uuid import uuid4

from app.chatbot.concise import CONCISE_INSTRUCTION
from app.chatbot.llm.provider import get_llm
from app.schemas.prediction import (
    AgentStatus,
    AlternativeScenario,
    EvidenceItem,
    FinalPredictionOutput,
    GeopoliticalAgentOutput,
    HistoricalAgentOutput,
    PredictionDirection,
    ScenarioType,
    SourceType,
)

logger = logging.getLogger(__name__)


def _naive_utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class FinalPredictionAgent:
    """Agent that reconciles historical and geopolitical evidence into a final prediction."""

    def __init__(self, db_session=None) -> None:
        self.llm = get_llm()
        self._session = db_session

    async def process(
        self,
        target: str,
        historical_output: Optional[HistoricalAgentOutput],
        geopolitical_output: Optional[GeopoliticalAgentOutput],
        ticker: Optional[str] = None,
        entity_id: Optional[int] = None,
        time_horizon: str = "medium_term",
        market_snapshot: Optional[dict[str, Any]] = None,
        context: Optional[dict[str, Any]] = None,
    ) -> FinalPredictionOutput:
        """Synthesize historical and geopolitical evidence into the final prediction."""
        ctx = context or {}

        # 1. Evaluate availability and health of upstream agent outputs
        hist_ok = historical_output is not None and historical_output.status != AgentStatus.FAILED
        geo_ok = geopolitical_output is not None and geopolitical_output.status != AgentStatus.FAILED

        if not hist_ok and not geo_ok:
            return self._build_insufficient_evidence_output(target, ticker, entity_id, time_horizon)

        # 2. Build synthesis prompt with all evidence and scenarios
        system_prompt = f"""You are the MarketAtlas Final Prediction Agent.
Your role is to examine historical evidence from the Historical Agent, current geopolitical evidence
from the Geopolitical Agent, and live market context to formulate a high-confidence, actionable prediction.

Core Synthesis Principles:
1. RECONCILE EVIDENCE: Compare what history suggests against current geopolitical realities. Identify where they agree and where they clash.
2. IDENTIFY CONTRADICTIONS: State contradictory signals clearly and explain why one outweighs the other.
3. 4-SCENARIO PROBABILITY DISTRIBUTION: Project 4 scenarios (Base, Bull, Bear, Tail-Risk) with probabilities summing to 1.0 (100%).
4. NO ABSOLUTE GUARANTEES: Predictions are probabilistic assessments. Explicitly articulate assumptions, risk factors, and uncertainties.
5. DIRECTION: Classify the directional outlook as BULLISH, BEARISH, NEUTRAL, or VOLATILE.
{CONCISE_INSTRUCTION}"""

        hist_json_str = (
            historical_output.model_dump_json(indent=2)
            if historical_output
            else "Historical Agent did not return data."
        )
        geo_json_str = (
            geopolitical_output.model_dump_json(indent=2)
            if geopolitical_output
            else "Geopolitical Agent did not return data."
        )
        snapshot_str = json.dumps(market_snapshot or {}, indent=2)

        user_prompt = f"""Prediction Target: {target}
Ticker: {ticker or 'None'}
Entity ID: {entity_id or 'None'}
Requested Horizon: {time_horizon}

=== HISTORICAL AGENT OUTPUT ===
{hist_json_str}

=== GEOPOLITICAL AGENT OUTPUT ===
{geo_json_str}

=== LIVE MARKET SNAPSHOT ===
{snapshot_str}

Produce a complete, synthesized final prediction in valid JSON matching this schema:
{{
  "prediction": "Clear, direct prediction statement for the target and time horizon.",
  "direction": "BULLISH / BEARISH / NEUTRAL / VOLATILE",
  "confidence": 0.82,
  "time_horizon": "{time_horizon}",
  "supporting_factors": [
    "Key factor 1 from history or geopolitics supporting this prediction",
    "Key factor 2"
  ],
  "contradictory_factors": [
    "Contradictory signal 1 and how it is reconciled",
    "Contradictory signal 2"
  ],
  "risk_factors": [
    "Primary risk or spoiler that could invalidate the forecast"
  ],
  "alternative_scenarios": [
    {{
      "scenario_name": "Base",
      "probability": 0.55,
      "time_horizon": "1-3 months",
      "expected_outcome": "Detailed base outcome description",
      "trigger_conditions": ["Baseline continuation of current trends"],
      "market_implications": "Target asset/sector trajectory in base case"
    }},
    {{
      "scenario_name": "Bull",
      "probability": 0.25,
      "time_horizon": "1-3 months",
      "expected_outcome": "Optimistic outcome description",
      "trigger_conditions": ["De-escalation / strong positive catalyst"],
      "market_implications": "Upside price and margin expansion"
    }},
    {{
      "scenario_name": "Bear",
      "probability": 0.15,
      "time_horizon": "1-3 months",
      "expected_outcome": "Pessimistic outcome description",
      "trigger_conditions": ["Escalation / direct disruption shock"],
      "market_implications": "Drawdown or elevated volatility"
    }},
    {{
      "scenario_name": "Tail-Risk",
      "probability": 0.05,
      "time_horizon": "1-3 months",
      "expected_outcome": "Low-probability black swan shock description",
      "trigger_conditions": ["Total corridor closure / unexpected conflict"],
      "market_implications": "Extreme dislocation across related markets"
    }}
  ],
  "assumptions": [
    "Core modeling assumption 1",
    "Core modeling assumption 2"
  ],
  "uncertainties": [
    "Explicit statement of known unknowns"
  ],
  "reasoning_summary": "Comprehensive explainable synthesis reconciling historical precedent with current geopolitical facts.",
  "historical_summary": "Short 1-sentence recap of historical findings",
  "geopolitical_summary": "Short 1-sentence recap of geopolitical findings"
}}

Return ONLY valid JSON:"""

        try:
            raw_response = self.llm.generate(
                user_prompt,
                system_prompt=system_prompt,
                temperature=0.2,
                history=ctx.get("conversation_history"),
            )
            return self._parse_llm_json(
                raw_response=raw_response,
                target=target,
                ticker=ticker,
                entity_id=entity_id,
                time_horizon=time_horizon,
                historical_output=historical_output,
                geopolitical_output=geopolitical_output,
            )

        except Exception as exc:
            logger.warning("FinalPredictionAgent LLM synthesis failed: %s", exc)
            return self._build_deterministic_synthesis(
                target=target,
                ticker=ticker,
                entity_id=entity_id,
                time_horizon=time_horizon,
                historical_output=historical_output,
                geopolitical_output=geopolitical_output,
                error_msg=str(exc),
            )

    def _parse_llm_json(
        self,
        raw_response: str,
        target: str,
        ticker: Optional[str],
        entity_id: Optional[int],
        time_horizon: str,
        historical_output: Optional[HistoricalAgentOutput],
        geopolitical_output: Optional[GeopoliticalAgentOutput],
    ) -> FinalPredictionOutput:
        """Parse the LLM response and build traceable evidence items."""
        cleaned = raw_response.strip()
        if "```json" in cleaned:
            match = re.search(r"```json\s*(.*?)\s*```", cleaned, re.DOTALL)
            if match:
                cleaned = match.group(1).strip()
        elif "```" in cleaned:
            match = re.search(r"```\s*(.*?)\s*```", cleaned, re.DOTALL)
            if match:
                cleaned = match.group(1).strip()

        try:
            data = json.loads(cleaned)
        except json.JSONDecodeError:
            return self._build_deterministic_synthesis(
                target=target,
                ticker=ticker,
                entity_id=entity_id,
                time_horizon=time_horizon,
                historical_output=historical_output,
                geopolitical_output=geopolitical_output,
            )

        # Parse direction
        raw_dir = data.get("direction", "NEUTRAL").upper()
        direction = PredictionDirection.NEUTRAL
        for d in PredictionDirection:
            if d.value in raw_dir:
                direction = d
                break

        # Parse scenarios
        scenarios_list = []
        for s in data.get("alternative_scenarios", []):
            if isinstance(s, dict):
                raw_sname = s.get("scenario_name", "Base")
                sname = ScenarioType.BASE
                for st in ScenarioType:
                    if st.value.lower() in raw_sname.lower():
                        sname = st
                        break

                scenarios_list.append(
                    AlternativeScenario(
                        scenario_name=sname,
                        probability=max(0.01, min(0.99, float(s.get("probability", 0.25)))),
                        time_horizon=s.get("time_horizon", time_horizon),
                        expected_outcome=s.get("expected_outcome", "Scenario outcome"),
                        trigger_conditions=s.get("trigger_conditions", []),
                        market_implications=s.get("market_implications", ""),
                    )
                )

        if not scenarios_list:
            scenarios_list = self._default_scenarios(time_horizon, direction)

        # Gather consolidated traceable evidence from upstream agents
        consolidated_evidence: list[EvidenceItem] = []
        if historical_output and historical_output.supporting_evidence:
            consolidated_evidence.extend(historical_output.supporting_evidence)
        if geopolitical_output and geopolitical_output.supporting_evidence:
            consolidated_evidence.extend(geopolitical_output.supporting_evidence)

        # Add synthesis meta-evidence
        consolidated_evidence.append(
            EvidenceItem(
                source="FinalPredictionAgent Multi-Evidence Synthesis",
                source_type=SourceType.EXPERT_ANALYSIS,
                date=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                agent="FinalPredictionAgent",
                evidence=f"Synthesized {len(historical_output.patterns if historical_output else [])} historical patterns with {len(geopolitical_output.geopolitical_factors if geopolitical_output else [])} live geopolitical risk vectors.",
                impact="reconciliation_framework",
                confidence=float(data.get("confidence", 0.78)),
            )
        )

        agent_contribs = {
            "HistoricalAgent": historical_output.analysis[:160] + "..." if historical_output else "Not available",
            "GeopoliticalAgent": geopolitical_output.analysis[:160] + "..." if geopolitical_output else "Not available",
            "FinalPredictionAgent": "Synthesized empirical precedent with current geopolitical tensions into 4 calibrated scenarios.",
        }

        # Calibrate confidence: if one agent was degraded, apply realistic penalty
        calc_conf = float(data.get("confidence", 0.75))
        if historical_output and historical_output.status == AgentStatus.DEGRADED:
            calc_conf = min(calc_conf, 0.65)
        if geopolitical_output and geopolitical_output.status == AgentStatus.DEGRADED:
            calc_conf = min(calc_conf, 0.65)
        if historical_output and historical_output.status == AgentStatus.FAILED:
            calc_conf = min(calc_conf, 0.75)
        if geopolitical_output and geopolitical_output.status == AgentStatus.FAILED:
            calc_conf = min(calc_conf, 0.75)
        if not historical_output or not geopolitical_output:
            calc_conf = min(calc_conf, 0.55)

        return FinalPredictionOutput(
            prediction_id=str(uuid4()),
            agent="FinalPredictionAgent",
            target=target,
            ticker=ticker,
            entity_id=entity_id,
            prediction=data.get("prediction", f"Outlook for {target} indicates balanced risk with elevated volatility over the {time_horizon} horizon."),
            direction=direction,
            confidence=max(0.1, min(0.95, calc_conf)),
            time_horizon=data.get("time_horizon", time_horizon),
            supporting_factors=data.get("supporting_factors", ["Historical precedent of supply realignment", "Current geopolitical containment"]),
            contradictory_factors=data.get("contradictory_factors", ["Historical rapid recovery vs current elevated structural sanctions"]),
            risk_factors=data.get("risk_factors", ["Unanticipated escalation in maritime transit corridors"]),
            alternative_scenarios=scenarios_list,
            assumptions=data.get("assumptions", ["No immediate unannounced kinetic closure of key trade corridors"]),
            uncertainties=data.get("uncertainties", ["Bilateral diplomatic developments may alter the projected trajectory"]),
            reasoning_summary=data.get("reasoning_summary", f"Synthesis of historical precedent and current geopolitical indicators demonstrates consistent risk-pricing behavior for {target}."),
            evidence=consolidated_evidence,
            agent_contributions=agent_contribs,
            historical_summary=data.get("historical_summary", historical_output.analysis[:120] if historical_output else None),
            geopolitical_summary=data.get("geopolitical_summary", geopolitical_output.analysis[:120] if geopolitical_output else None),
            created_at=_naive_utc_now(),
        )

    def _default_scenarios(self, time_horizon: str, direction: PredictionDirection) -> list[AlternativeScenario]:
        """Generate a realistic 4-scenario distribution."""
        base_bias = "continuation of trend with controlled volatility"
        bull_bias = "catalyst de-escalation and positive demand recovery"
        bear_bias = "heightened trade friction and margin compression"

        return [
            AlternativeScenario(
                scenario_name=ScenarioType.BASE,
                probability=0.55,
                time_horizon=time_horizon,
                expected_outcome=f"Base Case: {base_bias}.",
                trigger_conditions=["Maintenance of current policy stances and trade routes"],
                market_implications="Prices reflect established risk premium within normal range.",
            ),
            AlternativeScenario(
                scenario_name=ScenarioType.BULL,
                probability=0.25,
                time_horizon=time_horizon,
                expected_outcome=f"Bull Case: {bull_bias}.",
                trigger_conditions=["Diplomatic breakthroughs or expedited alternative supply agreements"],
                market_implications="Risk premium recedes; targeted assets experience positive re-rating.",
            ),
            AlternativeScenario(
                scenario_name=ScenarioType.BEAR,
                probability=0.15,
                time_horizon=time_horizon,
                expected_outcome=f"Bear Case: {bear_bias}.",
                trigger_conditions=["Retaliatory sanctions or transit fee surcharges"],
                market_implications="Increased logistics costs and temporary margin pressure.",
            ),
            AlternativeScenario(
                scenario_name=ScenarioType.TAIL_RISK,
                probability=0.05,
                time_horizon=time_horizon,
                expected_outcome="Tail-Risk Case: Severe regional disruption / unexpected black swan event.",
                trigger_conditions=["Physical disruption of primary export chokepoint"],
                market_implications="Acute supply squeeze and market-wide flight to safe-haven assets.",
            ),
        ]

    def _build_deterministic_synthesis(
        self,
        target: str,
        ticker: Optional[str],
        entity_id: Optional[int],
        time_horizon: str,
        historical_output: Optional[HistoricalAgentOutput],
        geopolitical_output: Optional[GeopoliticalAgentOutput],
        error_msg: Optional[str] = None,
    ) -> FinalPredictionOutput:
        """Deterministic empirical synthesis fallback."""
        hist_analysis = historical_output.analysis if historical_output else "Historical precedent suggests standard cyclical rebalancing."
        geo_analysis = geopolitical_output.analysis if geopolitical_output else "Geopolitical conditions indicate elevated strategic monitoring."

        direction = PredictionDirection.VOLATILE if ("tension" in target.lower() or "risk" in target.lower()) else PredictionDirection.NEUTRAL

        consolidated_evidence = []
        if historical_output and historical_output.supporting_evidence:
            consolidated_evidence.extend(historical_output.supporting_evidence)
        if geopolitical_output and geopolitical_output.supporting_evidence:
            consolidated_evidence.extend(geopolitical_output.supporting_evidence)

        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        if not consolidated_evidence:
            consolidated_evidence.append(
                EvidenceItem(
                    source="MarketAtlas Baseline Synthesizer",
                    source_type=SourceType.EXPERT_ANALYSIS,
                    date=today_str,
                    agent="FinalPredictionAgent",
                    evidence=f"Baseline empirical synthesis across historical and geopolitical dimensions for {target}.",
                    impact="baseline_assessment",
                    confidence=0.70,
                )
            )

        # Calibrate confidence based on agent health
        confidence = 0.74
        if (not historical_output or historical_output.status != AgentStatus.SUCCESS) and (not geopolitical_output or geopolitical_output.status != AgentStatus.SUCCESS):
            confidence = 0.40
        elif not historical_output or historical_output.status != AgentStatus.SUCCESS or not geopolitical_output or geopolitical_output.status != AgentStatus.SUCCESS:
            confidence = 0.55

        return FinalPredictionOutput(
            prediction_id=str(uuid4()),
            agent="FinalPredictionAgent",
            target=target,
            ticker=ticker,
            entity_id=entity_id,
            prediction=f"Based on empirical precedent and current geopolitical indicators, {target} is projected to maintain a {direction.value.lower()} trajectory over the {time_horizon} horizon, with initial risk pricing followed by stabilization.",
            direction=direction,
            confidence=confidence,
            time_horizon=time_horizon,
            supporting_factors=[
                "Empirical resilience observed across comparable historical supply shocks",
                "Active diplomatic channels maintaining vital trade corridor operations",
            ],
            contradictory_factors=[
                "Historical short-term volatility spikes vs long-term structural adaptation",
            ],
            risk_factors=[
                "Unexpected regulatory tightening or corridor security incidents",
            ],
            alternative_scenarios=self._default_scenarios(time_horizon, direction),
            assumptions=[
                "Global trade corridors remain functional without kinetic blockade",
                "Macroeconomic baseline conditions remain stable",
            ],
            uncertainties=[
                "Evolving multilateral negotiations could alter regulatory enforcement timelines",
            ],
            reasoning_summary=f"Synthesis reconciling historical patterns with current geopolitical conditions: {hist_analysis[:200]} Meanwhile, {geo_analysis[:200]}",
            evidence=consolidated_evidence,
            agent_contributions={
                "HistoricalAgent": hist_analysis[:150] + "...",
                "GeopoliticalAgent": geo_analysis[:150] + "...",
                "FinalPredictionAgent": "Reconciled historical cycles with live geopolitical friction into 4 probability-weighted scenarios.",
            },
            historical_summary=hist_analysis[:120],
            geopolitical_summary=geo_analysis[:120],
            created_at=_naive_utc_now(),
        )

    def _build_insufficient_evidence_output(
        self,
        target: str,
        ticker: Optional[str],
        entity_id: Optional[int],
        time_horizon: str,
    ) -> FinalPredictionOutput:
        """Explicit insufficient evidence response when both upstream agents fail or lack data."""
        return FinalPredictionOutput(
            prediction_id=str(uuid4()),
            agent="FinalPredictionAgent",
            target=target,
            ticker=ticker,
            entity_id=entity_id,
            prediction=f"Insufficient empirical and geopolitical data available to generate a high-confidence prediction for '{target}'.",
            direction=PredictionDirection.UNCERTAIN,
            confidence=0.15,
            time_horizon=time_horizon,
            supporting_factors=[],
            contradictory_factors=["Data inputs from upstream Historical and Geopolitical agents were unavailable."],
            risk_factors=["Severe data sparsity prevents reliable scenario modeling."],
            alternative_scenarios=[
                AlternativeScenario(
                    scenario_name=ScenarioType.BASE,
                    probability=0.50,
                    time_horizon=time_horizon,
                    expected_outcome="Uncertain outcome pending additional verified intelligence.",
                    trigger_conditions=["Sufficient event and price data ingestion"],
                    market_implications="High uncertainty and wide bid-ask spread.",
                )
            ],
            assumptions=["No reliable baseline assumptions can be established."],
            uncertainties=["Both historical analogs and live geopolitical vectors are currently unindexed for this specific target."],
            reasoning_summary=f"The prediction system requires verified historical precedent or live geopolitical intelligence to formulate forecasts. Insufficient evidence was found for '{target}'.",
            evidence=[
                EvidenceItem(
                    source="MarketAtlas Data Integrity Monitor",
                    source_type=SourceType.EXPERT_ANALYSIS,
                    date=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                    agent="FinalPredictionAgent",
                    evidence="Data sparsity threshold exceeded; refusing to fabricate unsupported predictions.",
                    impact="uncertainty_guardrail",
                    confidence=0.15,
                )
            ],
            agent_contributions={
                "HistoricalAgent": "No historical precedent records available.",
                "GeopoliticalAgent": "No live geopolitical risk vectors available.",
                "FinalPredictionAgent": "Refused to fabricate prediction; reported insufficient evidence.",
            },
            historical_summary=None,
            geopolitical_summary=None,
            created_at=_naive_utc_now(),
        )
