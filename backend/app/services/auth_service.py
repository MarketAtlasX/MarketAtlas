import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.user import User

bearer_scheme = HTTPBearer()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.jwt_expiry_hours)
    payload = {"sub": str(user_id), "exp": expire, "iat": datetime.now(timezone.utc)}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> Optional[int]:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        return int(payload["sub"])
    except (JWTError, ValueError, KeyError):
        return None


def generate_api_key() -> str:
    return secrets.token_hex(32)


def hash_api_key(api_key: str) -> str:
    """Hash an API key for storage (bcrypt)."""
    return bcrypt.hashpw(api_key.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_api_key(plain: str, stored: str) -> bool:
    """Verify a plain API key against its stored representation.

    Supports both bcrypt-hashed keys (current) and legacy plaintext keys so
    existing rows keep working until migrated.

    bcrypt raises ValueError for inputs longer than 72 bytes, so a bearer
    token longer than that must never reach ``checkpw`` (it would turn an
    unauthenticated request into a 500). Generated keys are 64 hex chars,
    so truncating at 72 bytes is a safe guard.
    """
    if not plain or not stored:
        return False
    if stored.startswith("$2"):
        truncated = plain.encode("utf-8")[:72]
        return bcrypt.checkpw(truncated, stored.encode("utf-8"))
    return secrets.compare_digest(plain, stored)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = credentials.credentials

    # Try as JWT first
    user_id = decode_access_token(token)
    if user_id is not None:
        result = await db.execute(select(User).where(User.id == user_id, User.is_active))
        user = result.scalar_one_or_none()
        if user:
            return user

    # Try as API key (keys are stored hashed at rest, so scan + verify)
    result = await db.execute(
        select(User).where(User.api_key.is_not(None), User.is_active)
    )
    for user in result.scalars():
        if verify_api_key(token, user.api_key):
            return user

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
