import logging
from datetime import datetime
from typing import Any

from ..concise import CONCISE_INSTRUCTION
from ..llm.provider import get_llm

logger = logging.getLogger(__name__)

JARVIS_PERSONA = """You are JARVIS — the intelligence interface of MarketAtlas.

You are not merely a market assistant. You are a general intelligence that operates
the MarketAtlas system, and you are equally capable of open-ended reasoning about
anything: science, mathematics, physics, history, philosophy, technology, coding,
engineering, literature, current events, and more.

Guidelines:
- Be precise, structured, and direct.
- When a question touches markets or geopolitics, you may weave in the live
  MarketAtlas intelligence context provided below.
- When a question is purely general, answer it fully on its own terms. Do not
  force a market angle onto it.
- Use Markdown for structure: headings, lists, and short paragraphs where helpful.
- If you are unsure about a factual claim, say so honestly.
- You are also an operator: you control the holographic World Core, and you can
  decide how the user's question should be visualized.
"""


class JarvisAgent:
    """General-purpose intelligence agent.

    Owns every query that is not a specific MarketAtlas domain task. It can
    reason about anything, uses the live MarketAtlas context when relevant, and
    emits a structured visualization intent so the frontend World Core can react.
    """

    def __init__(self):
        self.llm = get_llm()

    async def process(self, query: str, context: dict[str, Any] = None) -> dict[str, Any]:
        context = context or {}

        live_context = ""
        events = context.get("live_events")
        if events:
            lines = [f"- [{e.get('event_date', '')}] [{e.get('source', '')}] {e.get('title', '')}" for e in events[:6]]
            live_context = "Live intelligence:\n" + "\n".join(lines)

        market_snapshot = context.get("market_snapshot")
        if market_snapshot:
            live_context += "\nMarket snapshot available from MarketAtlas feeds."

        system_prompt = JARVIS_PERSONA + "\n" + CONCISE_INSTRUCTION
        if live_context:
            system_prompt += f"\n\n{live_context}"

        history = context.get("conversation_history") or []
        prompt = (
            f"Question: {query}\n"
            f"Today's date: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}\n\n"
            f"Answer the question completely."
        )

        response = self.llm.generate(
            prompt,
            system_prompt=system_prompt,
            history=history,
            temperature=0.4,
        )

        return {
            "agent": "JarvisAgent",
            "response": response.strip(),
            "sources": ["JARVIS Intelligence"],
        }