from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: "UserProfile"


class UserProfile(BaseModel):
    id: int
    email: EmailStr
    display_name: str
    username: str
    is_vip: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TelegramAuthRequest(BaseModel):
    init_data: str


class TokenPayload(BaseModel):
    sub: str
