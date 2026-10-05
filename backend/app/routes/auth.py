from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.schemas.user import (
    APIKeyResponse,
    CaptchaChallenge,
    MessageResponse,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserRead,
)
from app.services.auth_service import (
    create_access_token,
    generate_api_key,
    get_current_user,
    hash_api_key,
    hash_password,
    verify_password,
)
from app.services.captcha_service import CAPTCHA_TTL_SECONDS, generate_captcha, verify_captcha

router = APIRouter(prefix="/auth", tags=["auth"])


async def _enforce_captcha(body: UserCreate | UserLogin) -> None:
    """Consume a captcha when the auth gate is enabled.

    Runs before any credential work so brute-force attempts pay the captcha
    cost first. Verification is single-use: a failed attempt consumes the
    challenge and the client must fetch a fresh one.
    """
    if not settings.auth_captcha_enabled:
        return
    if not body.captcha_id or not body.captcha_answer:
        raise HTTPException(
            status_code=400,
            detail="Captcha required — fetch GET /auth/captcha and submit captcha_id + captcha_answer",
        )
    if not await verify_captcha(body.captcha_id, body.captcha_answer):
        raise HTTPException(status_code=400, detail="Captcha verification failed — request a new challenge")


@router.get("/captcha", response_model=CaptchaChallenge)
async def get_captcha():
    """Issue a one-time captcha challenge (distorted SVG + server-side answer)."""
    challenge = await generate_captcha()
    return CaptchaChallenge(
        captcha_id=challenge.captcha_id,
        svg=challenge.svg,
        kind=challenge.kind,
        expires_in=CAPTCHA_TTL_SECONDS,
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: UserCreate, db: AsyncSession = Depends(get_db)):
    await _enforce_captcha(body)

    result = await db.execute(select(User).where(User.email == body.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        display_name=body.display_name,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token(user.id)
    return TokenResponse(access_token=token, user=UserRead.model_validate(user))


@router.post("/login", response_model=TokenResponse)
async def login(body: UserLogin, db: AsyncSession = Depends(get_db)):
    await _enforce_captcha(body)

    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    token = create_access_token(user.id)
    return TokenResponse(access_token=token, user=UserRead.model_validate(user))


@router.post("/logout", response_model=MessageResponse)
async def logout(current_user: User = Depends(get_current_user)):
    """Stateless JWT logout — exists so clients get an authenticated 200 and
    future token revocation (e.g. a denylist) has a home."""
    return MessageResponse(message=f"{current_user.display_name} signed out")


@router.post("/api-key", response_model=APIKeyResponse)
async def generate_key(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    new_key = generate_api_key()
    current_user.api_key = hash_api_key(new_key)
    await db.commit()
    return APIKeyResponse(api_key=new_key)


@router.get("/me", response_model=UserRead)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserRead.model_validate(current_user)
