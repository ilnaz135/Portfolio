"""
Конфигурация приложения.

Этот модуль содержит все настройки приложения, переменные окружения
и конфигурацию базы данных.
"""

import os
from pathlib import Path
from typing import Any, Optional
from pydantic import field_validator
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    """
    Настройки приложения, загружаемые из переменных окружения.
    """

    # Настройки приложения
    app_name: str = "Portfolio Backend API"
    app_version: str = "1.0.0"
    app_description: str = "REST API для управления портфолио пользователей с академическими достижениями, курсами и научными успехами."

    # Настройки сервера
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False

    # Настройки базы данных
    database_url: str = f"sqlite+aiosqlite:///{BASE_DIR / 'portfolio.db'}"

    # Настройки CORS
    cors_origins: list[str] = ["*"]
    cors_allow_credentials: bool = True
    cors_allow_methods: list[str] = ["*"]
    cors_allow_headers: list[str] = ["*"]

    # Настройки пагинации
    default_page_size: int = 10
    max_page_size: int = 100

    @field_validator("debug", mode="before")
    @classmethod
    def parse_debug_value(cls, value: Any) -> bool:
        """
        Нормализовать значение DEBUG из окружения.

        Поддерживает строковые режимы вроде `release` и `debug`,
        чтобы приложение не падало на старте из-за нестандартного значения.
        """
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


# Создаем экземпляр настроек
settings = Settings()
