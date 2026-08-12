"""Persistent chat history backed by Postgres (Conversation / ChatMessage).

The in-memory ShortTermMemory still exists for hot path reads, but every
turn is mirrored here so context survives restarts and is scoped per user.
"""

import json
import logging
from typing import Optional

from sqlalchemy import select

from app.database import ExecutorSessionLocal
from app.models.chat import ChatMessage, Conversation

logger = logging.getLogger(__name__)


def _resolve_user_id(user_id: str | int) -> int:
    """Conversation rows are keyed by int user_id; coerce string ids."""
    try:
        return int(user_id)
    except (TypeError, ValueError):
        return 0


async def _ensure_user(db, uid: int) -> None:
    """Create a placeholder user when the FK target does not exist.

    Chat endpoints accept an arbitrary user_id with no auth layer, so the
    users row is usually absent. Inserting a stub (best-effort, never raises)
    lets conversation/message persistence succeed without an existing user.
    """
    if uid <= 0:
        return
    try:
        from sqlalchemy import select

        from app.models.user import User

        exists = await db.execute(select(User.id).where(User.id == uid).limit(1))
        if exists.scalar_one_or_none() is not None:
            return
        db.add(
            User(
                id=uid,
                email=f"chat-user-{uid}@marketatlas.local",
                hashed_password="!",
                display_name=f"Chat User {uid}",
            )
        )
        await db.commit()
    except Exception as exc:
        logger.warning("Could not ensure user %s exists: %s", uid, exc)
        try:
            await db.rollback()
        except Exception:
            pass


async def get_or_create_conversation(
    conversation_id: str, user_id: str | int, title: str = "Chat"
) -> Optional[Conversation]:
    """Fetch an existing conversation or create one for the user."""
    uid = _resolve_user_id(user_id)
    async with ExecutorSessionLocal() as db:
        existing = await db.get(Conversation, conversation_id)
        if existing is not None:
            return existing
        await _ensure_user(db, uid)
        conv = Conversation(id=conversation_id, user_id=uid, title=title)
        db.add(conv)
        try:
            await db.commit()
        except Exception as exc:
            logger.warning("Failed to create conversation %s: %s", conversation_id, exc)
            await db.rollback()
            return None
        return conv


async def persist_turn(
    conversation_id: str,
    user_id: str | int,
    role: str,
    content: str,
    intent: Optional[str] = None,
    agents_used: Optional[list[str]] = None,
    sources: Optional[list[str]] = None,
) -> None:
    """Insert a single chat message into Postgres (best-effort, never raises)."""
    if not content:
        return
    try:
        await get_or_create_conversation(conversation_id, user_id)
    except Exception:
        logger.exception("Could not ensure conversation %s", conversation_id)
    try:
        async with ExecutorSessionLocal() as db:
            msg = ChatMessage(
                conversation_id=conversation_id,
                role=role,
                content=content,
                intent=intent,
                agents_used=json.dumps(agents_used) if agents_used else None,
                sources=json.dumps(sources) if sources else None,
            )
            db.add(msg)
            await db.commit()
    except Exception as exc:
        logger.warning("Failed to persist %s turn for %s: %s", role, conversation_id, exc)


async def get_recent_messages(
    conversation_id: str, limit: int = 20
) -> list[dict[str, str]]:
    """Return the last `limit` messages in chronological order."""
    try:
        async with ExecutorSessionLocal() as db:
            result = await db.execute(
                select(ChatMessage)
                .where(ChatMessage.conversation_id == conversation_id)
                .order_by(ChatMessage.created_at.desc())
                .limit(limit)
            )
            rows = list(result.scalars())
            return [
                {"role": m.role, "content": m.content}
                for m in reversed(rows)
            ]
    except Exception as exc:
        logger.warning("Failed to load history for %s: %s", conversation_id, exc)
        return []


async def format_history_context(conversation_id: str, max_turns: int = 5) -> str:
    """Render the last N turns as USER:/ASSISTANT: plain text for prompts."""
    messages = await get_recent_messages(conversation_id, limit=max_turns)
    if not messages:
        return ""
    return "\n".join(f"{m['role'].upper()}: {m['content']}" for m in messages)


async def list_conversations(user_id: str | int, limit: int = 50) -> list[Conversation]:
    uid = _resolve_user_id(user_id)
    async with ExecutorSessionLocal() as db:
        result = await db.execute(
            select(Conversation)
            .where(Conversation.user_id == uid)
            .order_by(Conversation.updated_at.desc())
            .limit(limit)
        )
        return list(result.scalars())
