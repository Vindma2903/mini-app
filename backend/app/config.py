from functools import lru_cache
from datetime import timedelta

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Bet Mini App API"
    api_prefix: str = "/api/v1"
    database_url: str = Field(
        default="postgresql+psycopg://betapp:betapp@localhost:5432/betapp",
        alias="DATABASE_URL",
    )
    jwt_secret_key: str = Field(default="change-me", alias="JWT_SECRET_KEY")
    telegram_bot_token: str = Field(default="", alias="TELEGRAM_BOT_TOKEN")
    telegram_auth_max_age_seconds: int = Field(
        default=int(timedelta(hours=24).total_seconds()),
        alias="TELEGRAM_AUTH_MAX_AGE_SECONDS",
    )
    pandascore_api_token: str = Field(default="", alias="PANDASCORE_API_TOKEN")
    api_football_base_url: str = Field(
        default="https://v3.football.api-sports.io",
        alias="API_FOOTBALL_BASE_URL",
    )
    api_football_api_key: str = Field(default="", alias="API_FOOTBALL_API_KEY")
    api_football_timeout_seconds: float = Field(default=8.0, alias="API_FOOTBALL_TIMEOUT_SECONDS")
    live_matches_cache_ttl_seconds: int = Field(default=20, alias="LIVE_MATCHES_CACHE_TTL_SECONDS")
    live_matches_rate_limit_per_minute: int = Field(
        default=10,
        alias="LIVE_MATCHES_RATE_LIMIT_PER_MINUTE",
    )
    auto_session_enabled: bool = Field(default=False, alias="AUTO_SESSION_ENABLED")
    auto_session_poll_seconds: int = Field(default=20, alias="AUTO_SESSION_POLL_SECONDS")
    auto_session_game: str = Field(default="cs2", alias="AUTO_SESSION_GAME")
    auto_session_prediction_window_ms: int = Field(
        default=30_000,
        alias="AUTO_SESSION_PREDICTION_WINDOW_MS",
    )
    auto_session_stream_delay_ms: int = Field(
        default=7_000,
        alias="AUTO_SESSION_STREAM_DELAY_MS",
    )
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24
    cors_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ],
        alias="CORS_ORIGINS",
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
