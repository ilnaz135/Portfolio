"""Application settings."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from pydantic import field_validator
from pydantic_settings import BaseSettings
from pydantic_settings.sources import (
    DotEnvSettingsSource,
    EnvSettingsSource,
    PydanticBaseSettingsSource,
)

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class _CorsOriginsSourceMixin:
    """Keep `cors_origins` as a raw string so a field validator can parse it."""

    def decode_complex_value(self, field_name: str, field: Any, value: Any) -> Any:
        if field_name == "cors_origins" and isinstance(value, str):
            return value
        return super().decode_complex_value(field_name, field, value)


class CorsOriginsEnvSettingsSource(_CorsOriginsSourceMixin, EnvSettingsSource):
    """Allow comma-separated CORS origins from environment variables."""


class CorsOriginsDotEnvSettingsSource(_CorsOriginsSourceMixin, DotEnvSettingsSource):
    """Allow comma-separated CORS origins from `.env` files."""


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    app_name: str = "Portfolio Backend API"
    app_version: str = "1.0.0"
    app_description: str = (
        "REST API for user portfolio management with profile, courses and achievements."
    )

    host: str = "0.0.0.0"
    port: int = 8001
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

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: Any) -> list[str]:
        if isinstance(value, str):
            normalized = value.strip()
            if not normalized:
                return []

            if normalized.startswith("["):
                parsed = json.loads(normalized)
                if isinstance(parsed, list):
                    return [str(item).strip() for item in parsed if str(item).strip()]

            return [item.strip() for item in normalized.split(",") if item.strip()]

        if isinstance(value, (list, tuple, set)):
            return [str(item).strip() for item in value if str(item).strip()]

        return value

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: type[BaseSettings],
        init_settings: PydanticBaseSettingsSource,
        env_settings: PydanticBaseSettingsSource,
        dotenv_settings: PydanticBaseSettingsSource,
        file_secret_settings: PydanticBaseSettingsSource,
    ) -> tuple[PydanticBaseSettingsSource, ...]:
        model_config = settings_cls.model_config

        return (
            init_settings,
            CorsOriginsEnvSettingsSource(
                settings_cls,
                case_sensitive=model_config.get("case_sensitive"),
                env_prefix=model_config.get("env_prefix"),
                env_nested_delimiter=model_config.get("env_nested_delimiter"),
                env_ignore_empty=model_config.get("env_ignore_empty"),
                env_parse_none_str=model_config.get("env_parse_none_str"),
                env_parse_enums=model_config.get("env_parse_enums"),
            ),
            CorsOriginsDotEnvSettingsSource(
                settings_cls,
                env_file=model_config.get("env_file"),
                env_file_encoding=model_config.get("env_file_encoding"),
                case_sensitive=model_config.get("case_sensitive"),
                env_prefix=model_config.get("env_prefix"),
                env_nested_delimiter=model_config.get("env_nested_delimiter"),
                env_ignore_empty=model_config.get("env_ignore_empty"),
                env_parse_none_str=model_config.get("env_parse_none_str"),
                env_parse_enums=model_config.get("env_parse_enums"),
            ),
            file_secret_settings,
        )

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
