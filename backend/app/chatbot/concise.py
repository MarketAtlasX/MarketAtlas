"""Shared conciseness rules for the MarketAtlas chatbot.

Every agent must answer directly and briefly. These helpers centralize the
instruction given to the LLM and a hard post-processing cap so users always
get a short, readable answer — never a long reasoning dump.
"""

import re

MAX_WORDS = 40

CONCISE_INSTRUCTION = (
    "CRITICAL OUTPUT RULE: Answer the user's question directly in at most "
    f"{MAX_WORDS} words. Do not show reasoning, analysis steps, bullet lists, "
    "markdown headers, or structured sections. Just state the answer in one or "
    "two plain sentences."
)


def trim_to_limit(text: str, max_words: int = MAX_WORDS) -> str:
    """Hard-cap a response at `max_words` words without cutting mid-word.

    Strips markdown formatting so the answer is plain, readable text, then
    preserves any trailing punctuation. Falls back to the first sentence if
    the text is mostly non-word content (e.g. an empty model response).
    """
    if not text:
        return text
    plain = _strip_markdown(text)
    words = plain.split()
    if len(words) <= max_words:
        return plain
    trimmed = " ".join(words[:max_words])
    if re.search(r"[.!?]$", plain.strip()):
        trimmed = trimmed.rstrip(" ,;:-") + "."
    return trimmed


def _strip_markdown(text: str) -> str:
    """Remove common markdown/LLM decoration while keeping citations like [3]."""
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)   # bold
    text = re.sub(r"\*(.+?)\*", r"\1", text)        # italic
    text = re.sub(r"`(.+?)`", r"\1", text)          # inline code
    text = re.sub(r"\[(https?://[^\s\]]+)\]", r"\1", text)  # bare link brackets
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)    # markdown links
    text = re.sub(r"^#{1,6}\s*", "", text, flags=re.M)      # headings
    text = re.sub(r"^\s*[-*+]\s+", "", text, flags=re.M)    # list bullets
    return text.strip()
