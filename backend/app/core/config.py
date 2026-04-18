"""Application settings."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from pydantic import field_validator
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    app_name: str = "Portfolio Backend API"
    app_version: str = "1.0.0"
    app_description: str = (
        "REST API for user portfolio management with profile, courses and achievements."
    )

    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False

    database_url: str = f"sqlite+aiosqlite:///{BASE_DIR / 'portfolio.db'}"

    cors_origins: list[str] = ["*"]
    cors_allow_credentials: bool = True
    cors_allow_methods: list[str] = ["*"]
    cors_allow_headers: list[str] = ["*"]

    default_page_size: int = 10
    max_page_size: int = 100

    access_token_ttl_minutes: int = 15
    refresh_token_ttl_days: int = 7
    refresh_token_ttl_days_remember_me: int = 30
    password_pepper: str = "portfolio-pepper"

    @field_validator("debug", mode="before")
    @classmethod
    def parse_debug_value(cls, value: Any) -> bool:
        if isinstance(value, bool):
            return value

        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"1", "true", "yes", "on", "debug", "dev", "development"}:
                return True
            if normalized in {"0", "false", "no", "off", "release", "prod", "production"}:
                return False

        return bool(value)

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
