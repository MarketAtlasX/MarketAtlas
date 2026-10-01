"""Evidence-grounding rules for the structured Atlas agent prompt.

The provider must answer from the canonical EvidenceObservation the client
displays in the UI, cite provenance and uncertainty, and state gaps explicitly
instead of inventing an explanation.
"""

from app.chatbot.api.routes import ATLAS_EVIDENCE_GROUNDING_RULES, build_agent_system_prompt


def test_prompt_keeps_base_instructions_without_evidence_context():
    prompt = build_agent_system_prompt({})
    assert "You are Atlas" in prompt
    assert "Never invent prices, events, confidence, or sources." in prompt
    assert ATLAS_EVIDENCE_GROUNDING_RULES not in prompt


def test_prompt_appends_evidence_grounding_rules_when_evidence_is_present():
    context = {
        "evidence": {
            "selection": "Taiwan",
            "status": "ready",
            "observation": {
                "status": "live",
                "freshness": "current",
                "provenance": {"provider": "GDELT", "observed_at": "2026-10-01T00:00:00Z", "confidence": 0.81},
            },
            "briefing": "Selection: Taiwan\nWHAT HAPPENED\n- Naval drills reported",
        }
    }
    prompt = build_agent_system_prompt(context)

    # The provider is told to answer only from the canonical observation…
    assert "answer only" in prompt
    assert "freshness, confidence, and uncertainty" in prompt
    # …to cite provenance explicitly…
    assert "Cite provenance inline (provider, observed_at, freshness, confidence)" in prompt
    assert "repeat recorded uncertainty and limitations" in prompt
    # …and to state gaps instead of inventing facts.
    assert "state that the evidence does not establish it" in prompt
    assert "never invent sources, confidence, causal links, market values, or timestamps" in prompt
    assert "do not reuse evidence from a previous selection" in prompt

    # The canonical envelope and its deterministic briefing are inlined verbatim.
    assert '"selection": "Taiwan"' in prompt
    assert "GDELT" in prompt
    assert "Naval drills reported" in prompt


def test_prompt_requires_an_explicit_gap_statement_when_no_observation_is_loaded():
    context = {"evidence": {"selection": "Iran", "status": "loading", "observation": None, "briefing": None}}
    prompt = build_agent_system_prompt(context)
    assert ATLAS_EVIDENCE_GROUNDING_RULES in prompt
    assert "evidence is not currently loaded for the selection" in prompt
