"""
Конфигурация приложения.

Этот модуль содержит все настройки приложения, переменные окружения
и конфигурацию базы данных.
"""

import os
from typing import Optional
from pydantic_settings import BaseSettings


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
    database_url: str = "sqlite+aiosqlite:///portfolio.db"

    # Настройки CORS
    cors_origins: list[str] = ["*"]
    cors_allow_credentials: bool = True
    cors_allow_methods: list[str] = ["*"]
    cors_allow_headers: list[str] = ["*"]

    # Настройки пагинации
    default_page_size: int = 10
    max_page_size: int = 100

    class Config:
        env_file = ".env"
        case_sensitive = False


# Создаем экземпляр настроек
settings = Settings()