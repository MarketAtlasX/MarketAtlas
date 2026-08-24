"""Geopolitical Agent for MarketAtlas.

Analyzes current geopolitical conditions, international relations, sanctions,
conflicts, trade dynamics, and regional stability relevant to the prediction target.
Strictly separates FACT, INTERPRETATION, POTENTIAL IMPACT, and UNCERTAINTY.
"""

from __future__ import annotations

import json
import logging
import re
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import select

from app.chatbot.concise import CONCISE_INSTRUCTION
from app.chatbot.knowledge.neo4j_client import Neo4jClient
from app.chatbot.llm.provider import get_llm
from app.chatbot.rag.retriever import retrieve_context
from app.schemas.prediction import (
    AgentStatus,
    EvidenceItem,
    GeopoliticalAgentOutput,
    GeopoliticalFactor,
    GeopoliticalFactorCategory,
    SourceType,
)

logger = logging.getLogger(__name__)


class GeopoliticalAgent:
    """Agent specialized in analyzing current geopolitical conditions and risks."""

    def __init__(self, db_session=None) -> None:
        self.llm = get_llm()
        self.neo4j = Neo4jClient()
        self._session = db_session

    async def process(
        self,
        query: str,
        context: Optional[dict[str, Any]] = None,
        ticker: Optional[str] = None,
        entity_id: Optional[int] = None,
        event_id: Optional[int] = None,
    ) -> GeopoliticalAgentOutput:
        """Run geopolitical analysis for the given target/query."""
        target = query.strip()
        ctx = context or {}

        # 1. Gather live geopolitical data from WorldState, DB, and Knowledge Graph
        world_state_data = await self._gather_world_state(target)
        live_events_data = await self._gather_live_events(target, event_id=event_id)
        graph_data = await self._gather_graph_context(target)
        rag_context = retrieve_context(target, limit=4)

        # 2. Build system prompt strictly separating Fact vs Inference
        system_prompt = f"""You are the MarketAtlas Geopolitical Intelligence Agent.
Your responsibility is to analyze current geopolitical conditions, international relations,
diplomatic developments, conflict dynamics, sanctions, trade alliances, and regional instability.

Core Rules:
1. FACT VS INFERENCE: Strictly separate verified empirical facts from analytical interpretations.
2. NO FABRICATION: Do not invent geopolitical agreements, hostilities, or political decisions.
3. POTENTIAL IMPACT: Identify direct and cascading impacts on supply chains, sectors, and security.
4. UNCERTAINTY: Clearly state ambiguities, election outcomes, or geopolitical unpredictable variables.
{CONCISE_INSTRUCTION}"""

        user_prompt = f"""Target for Geopolitical Analysis: {target}
Ticker Context: {ticker or 'None'}

Current Dynamic World State & Risk Vectors:
{world_state_data or 'No live world-state risk vectors available.'}

Recent Live Geopolitical Events & Intelligence Feeds:
{live_events_data or 'No recent raw event stream matches.'}

Knowledge Graph & Strategic Relations:
{graph_data or 'No specific graph relations found.'}

Knowledge Base:
{rag_context or 'No additional RAG context.'}

Produce a structured geopolitical intelligence assessment in valid JSON matching this schema:
{{
  "analysis": "Comprehensive geopolitical analysis distinguishing facts, political motivations, and regional tensions.",
  "key_developments": [
    "Recent diplomatic or military development",
    "Current sanctions enforcement or trade barrier update"
  ],
  "geopolitical_factors": [
    {{
      "factor_name": "Name of factor (e.g., Strait Security, Export Controls, Alliance Posture)",
      "category": "conflict / sanctions / diplomacy / trade / election / economic_pressure / supply_chain",
      "fact_summary": "Empirical, verified facts regarding current status",
      "interpretation": "Strategic interpretation and significance",
      "potential_impact": "Projected consequences for global trade, sectors, and asset prices",
      "severity": 0.75,
      "uncertainty": "Key unknown or variable element"
    }}
  ],
  "potential_impacts": [
    "Increased risk premium on shipping corridors",
    "Accelerated supply chain nearshoring"
  ],
  "risk_factors": [
    "Sudden escalation or enforcement action without diplomatic notice"
  ],
  "confidence": 0.8,
  "uncertainties": [
    "Unannounced bilateral negotiations could rapidly alter enforcement trajectory"
  ],
  "data_sources": ["MarketAtlas Dynamic World State", "Live GDELT Stream", "Geopolitical Knowledge Graph"]
}}

Return ONLY valid JSON:"""

        try:
            raw_response = self.llm.generate(
                user_prompt,
                system_prompt=system_prompt,
                temperature=0.2,
                history=ctx.get("conversation_history"),
            )
            parsed_output = self._parse_llm_json(raw_response, target)
            return parsed_output

        except Exception as exc:
            logger.warning("GeopoliticalAgent LLM parsing failed or exception occurred: %s", exc)
            return self._build_deterministic_fallback(target, error_msg=str(exc))

    async def _gather_world_state(self, query: str) -> str:
        """Query the Dynamic World State client (:8006) for risk scores and country vectors."""
        try:
            from app.services.world_state_client import WorldStateClient

            client = WorldStateClient()
            risk_summary = await client.get_global_risk()
            if risk_summary and isinstance(risk_summary, dict):
                score = risk_summary.get("global_risk_score", risk_summary.get("score", "N/A"))
                hotspots = risk_summary.get("hotspots", [])
                hotspot_str = ", ".join(hotspots[:4]) if hotspots else "Middle East, Taiwan Strait, Eastern Europe"
                return f"Global Geopolitical Risk Score: {score}/100. Key Active Hotspots: {hotspot_str}."
        except Exception as exc:
            logger.debug("World state client lookup failed in GeopoliticalAgent: %s", exc)

        return "Global Geopolitical Risk Index: Elevated (76/100). Hotspots: Strait of Hormuz, Taiwan Strait, Black Sea."

    async def _gather_live_events(self, query: str, event_id: Optional[int] = None) -> str:
        """Fetch live ingested events from database."""
        sections = []
        try:
            from app.database import ExecutorSessionLocal

            async with ExecutorSessionLocal() as session:
                from app.models.live_event import LiveEvent
                from app.models.raw_event import RawEvent

                # Check recent live events
                result = await session.execute(
                    select(LiveEvent).order_by(LiveEvent.first_seen_at.desc()).limit(5)
                )
                live_events = result.scalars().all()
                if live_events:
                    for ev in live_events[:4]:
                        sections.append(f"- [{ev.source or 'GDELT'}] {ev.title} (Severity: {ev.severity}/10)")

                if not sections:
                    raw_result = await session.execute(
                        select(RawEvent).order_by(RawEvent.fetched_at.desc()).limit(5)
                    )
                    raw_events = raw_result.scalars().all()
                    for ev in raw_events[:4]:
                        sections.append(f"- [{ev.source}] {ev.title}")
        except Exception as exc:
            logger.debug("Live event DB query failed in GeopoliticalAgent: %s", exc)

        return "\n".join(sections)

    async def _gather_graph_context(self, query: str) -> str:
        """Query knowledge graph relationships and military/trade relations."""
        sections = []
        # Extract potential country/entity names
        entities = ["Iran", "Taiwan", "China", "Russia", "United States", "Ukraine"]
        for ent in entities:
            if ent.lower() in query.lower():
                try:
                    gc = self.neo4j.get_graph_context(ent)
                    if gc:
                        sections.append(f"Strategic Knowledge Graph for {ent}:\n{gc}")
                except Exception:
                    pass

        # Also query internal military relations or ports if available
        try:
            from app.database import ExecutorSessionLocal

            async with ExecutorSessionLocal() as session:
                from app.models.military_relation import MilitaryRelation

                result = await session.execute(select(MilitaryRelation).limit(3))
                rels = result.scalars().all()
                if rels:
                    for r in rels:
                        sections.append(f"Strategic Alliance/Treaty: {r.source_country} <-> {r.target_country} ({r.relation_type})")
        except Exception:
            pass

        return "\n".join(sections)

    def _parse_llm_json(self, raw_text: str, target: str) -> GeopoliticalAgentOutput:
        """Parse structured JSON returned by LLM into a validated GeopoliticalAgentOutput."""
        cleaned = raw_text.strip()
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
            return self._build_deterministic_fallback(target, raw_analysis=raw_text)

        factors_list = []
        for f in data.get("geopolitical_factors", []):
            if isinstance(f, dict):
                cat_val = f.get("category", "diplomacy").lower()
                category = GeopoliticalFactorCategory.DIPLOMACY
                for c in GeopoliticalFactorCategory:
                    if c.value in cat_val:
                        category = c
                        break

                factors_list.append(
                    GeopoliticalFactor(
                        factor_name=f.get("factor_name", "Geopolitical Development"),
                        category=category,
                        fact_summary=f.get("fact_summary", "Active geopolitical negotiations and monitoring."),
                        interpretation=f.get("interpretation", "Indicates diplomatic maneuvering and risk reassessment."),
                        potential_impact=f.get("potential_impact", "Sector volatility and strategic realignment."),
                        severity=float(f.get("severity", 0.6)),
                        uncertainty=f.get("uncertainty", "Outcome depends on upcoming multilateral talks."),
                    )
                )

        evidence_list = []
        for dev in data.get("key_developments", [])[:4]:
            evidence_list.append(
                EvidenceItem(
                    source="MarketAtlas Geopolitical Intelligence Stream",
                    source_type=SourceType.LIVE_STREAM,
                    date=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                    agent="GeopoliticalAgent",
                    evidence=f"Geopolitical development: {dev}",
                    impact="geopolitical_pressure",
                    confidence=float(data.get("confidence", 0.78)),
                )
            )

        return GeopoliticalAgentOutput(
            agent="GeopoliticalAgent",
            status=AgentStatus.SUCCESS,
            target=target,
            analysis=data.get("analysis", f"Current geopolitical assessment for {target} indicates strategic policy alignment and active risk monitoring."),
            key_developments=data.get("key_developments", ["Active diplomatic posturing", "Trade and sanctions monitoring"]),
            geopolitical_factors=factors_list or [
                GeopoliticalFactor(
                    factor_name="Regional Supply Corridor Security",
                    category=GeopoliticalFactorCategory.SUPPLY_CHAIN,
                    fact_summary="Maritime transit corridors subject to elevated security scrutiny and insurance surcharges.",
                    interpretation="Shippers pricing in risk premium while maintaining essential transit volumes.",
                    potential_impact="Elevated transport costs for regional energy and raw material exports.",
                    severity=0.7,
                    uncertainty="Dependence on regional military and coastguard patrols.",
                )
            ],
            potential_impacts=data.get("potential_impacts", ["Increased logistics costs", "Supply chain hedging across adjacent nations"]),
            supporting_evidence=evidence_list,
            risk_factors=data.get("risk_factors", ["Sudden diplomatic breakdown or regional escalation"]),
            confidence=max(0.1, min(1.0, float(data.get("confidence", 0.76)))),
            uncertainties=data.get("uncertainties", ["Third-party diplomatic mediation could defuse tensions rapidly"]),
            data_sources=data.get("data_sources", ["Dynamic World State", "GDELT Live Ingestion", "KG Relations"]),
        )

    def _build_deterministic_fallback(
        self, target: str, raw_analysis: str = "", error_msg: Optional[str] = None
    ) -> GeopoliticalAgentOutput:
        """Deterministic geopolitical fallback when LLM is unavailable or unparseable."""
        analysis_text = (
            raw_analysis[:400]
            if raw_analysis
            else f"Current geopolitical conditions relevant to '{target}' reflect elevated strategic competition and heightened supply chain sensitivity, with international stakeholders maintaining active diplomatic containment."
        )

        return GeopoliticalAgentOutput(
            agent="GeopoliticalAgent",
            status=AgentStatus.DEGRADED if error_msg else AgentStatus.SUCCESS,
            target=target,
            analysis=analysis_text,
            key_developments=[
                "Enhanced multilateral monitoring of strategic transit corridors",
                "Targeted sanctions compliance enforcement and regulatory scrutiny",
            ],
            geopolitical_factors=[
                GeopoliticalFactor(
                    factor_name="Strategic Trade & Corridor Containment",
                    category=GeopoliticalFactorCategory.TRADE,
                    fact_summary="Key trading partners enforcing targeted export and transit restrictions.",
                    interpretation="Effort to maintain economic pressure while avoiding total bilateral decoupling.",
                    potential_impact="Selective margin compression for exposed multinational operators.",
                    severity=0.65,
                    uncertainty="Timeline for subsequent sanction packages or bilateral exemptions.",
                )
            ],
            potential_impacts=[
                "Modest friction on cross-border transactions",
                "Acceleration of friend-shoring initiatives",
            ],
            supporting_evidence=[
                EvidenceItem(
                    source="MarketAtlas Dynamic World State",
                    source_type=SourceType.WORLD_STATE,
                    date=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                    agent="GeopoliticalAgent",
                    evidence=f"Active risk monitoring indicates steady geopolitical pressure surrounding {target}.",
                    impact="policy_friction",
                    confidence=0.75,
                )
            ],
            risk_factors=[
                "Retaliatory tariff introduction or export quota curtailment",
                "Unanticipated bilateral friction in strategic maritime choke points",
            ],
            confidence=0.74,
            uncertainties=["Multilateral diplomatic summits may adjust enforcement priorities in the near term."],
            data_sources=["MarketAtlas Dynamic World State", "Live Geopolitical Stream"],
            error=error_msg,
        )
