import hashlib
import hmac
import json
import time
from urllib.parse import parse_qsl

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas import LoginRequest, TelegramAuthRequest, TokenResponse, UserProfile
from app.security import create_access_token, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


def _validate_telegram_init_data(init_data: str) -> dict:
    """
    Проверяет подпись Telegram WebApp initData.
    Алгоритм: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
    """
    if not settings.telegram_bot_token:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Telegram bot token not configured")

    try:
        parsed = dict(parse_qsl(init_data, strict_parsing=True))
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid init_data format") from None

    received_hash = parsed.pop("hash", None)

    if not received_hash:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing hash in init_data")

    data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(parsed.items()))

    secret_key = hmac.new(b"WebAppData", settings.telegram_bot_token.encode(), hashlib.sha256).digest()
    expected_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(expected_hash, received_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Telegram signature")

    try:
        auth_date = int(parsed["auth_date"])
    except (KeyError, ValueError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid auth_date in init_data")

    now = int(time.time())
    if now - auth_date > settings.telegram_auth_max_age_seconds:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Telegram auth data is expired")

    return parsed


def build_user_profile(user: User) -> UserProfile:
    display_name = user.display_name or user.email.split("@", maxsplit=1)[0]
    username = user.telegram_username or f"@{display_name.replace(' ', '').lower()}"
    return UserProfile(
        id=user.id,
        email=user.email,
        display_name=display_name,
        username=username,
        is_vip=user.is_vip,
        created_at=user.created_at,
    )


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    stmt = select(User).where(func.lower(User.email) == payload.email.lower())
    user = db.scalar(stmt)

    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is inactive",
        )

    token, expires_in = create_access_token(str(user.id))
    return TokenResponse(
        access_token=token,
        expires_in=expires_in,
        user=build_user_profile(user),
    )


@router.post("/telegram", response_model=TokenResponse)
def telegram_auth(payload: TelegramAuthRequest, db: Session = Depends(get_db)) -> TokenResponse:
    parsed = _validate_telegram_init_data(payload.init_data)

    try:
        tg_user = json.loads(parsed["user"])
        telegram_id: int = tg_user["id"]
    except (KeyError, json.JSONDecodeError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user data in init_data")

    user = db.scalar(select(User).where(User.telegram_id == telegram_id))

    if user is None:
        first_name = tg_user.get("first_name", "")
        last_name = tg_user.get("last_name", "")
        username = tg_user.get("username")
        display_name = f"{first_name} {last_name}".strip() or username or str(telegram_id)

        user = User(
            email=f"tg_{telegram_id}@telegram.local",
            password_hash="",
            telegram_id=telegram_id,
            telegram_username=username,
            display_name=display_name,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is inactive")

    token, expires_in = create_access_token(str(user.id))
    return TokenResponse(
        access_token=token,
        expires_in=expires_in,
        user=build_user_profile(user),
    )


@router.get("/me", response_model=UserProfile)
def me(current_user: User = Depends(get_current_user)) -> UserProfile:
    return build_user_profile(current_user)
