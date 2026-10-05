from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class CaptchaChallenge(BaseModel):
    """A captcha issued by `GET /auth/captcha`.

    `svg` is a self-contained, server-rendered SVG of the challenge; the
    expected answer is stored server-side only.
    """

    captcha_id: str
    svg: str
    kind: str
    expires_in: int


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    display_name: str = Field(min_length=1, max_length=100)
    captcha_id: str | None = None
    captcha_answer: str | None = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str
    captcha_id: str | None = None
    captcha_answer: str | None = None


class UserRead(BaseModel):
    id: int
    email: str
    display_name: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class MessageResponse(BaseModel):
    message: str


class APIKeyResponse(BaseModel):
    api_key: str
    message: str = "Save this key — it will not be shown again."
