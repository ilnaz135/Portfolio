"""
Настройка логирования.

Этот модуль содержит конфигурацию логирования для приложения.
"""

import logging
import sys
from typing import Optional

from app.core.config import settings


def setup_logging(level: Optional[str] = None) -> None:
    """
    Настройка логирования для приложения.

    Args:
        level: Уровень логирования (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    """
    if level is None:
        level = "DEBUG" if settings.debug else "INFO"

    # Создаем форматтер
    formatter = logging.Formatter(
        fmt="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    # Настраиваем корневой логгер
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, level.upper()))

    # Удаляем существующие обработчики
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    # Консольный обработчик
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)

    # Логгер для SQLAlchemy (если не в режиме отладки, уменьшаем verbosity)
    if not settings.debug:
        sqlalchemy_logger = logging.getLogger("sqlalchemy.engine")
        sqlalchemy_logger.setLevel(logging.WARNING)

    # Логгер для Uvicorn
    uvicorn_logger = logging.getLogger("uvicorn")
    uvicorn_logger.handlers.clear()
    uvicorn_logger.addHandler(console_handler)

    # Логгер для FastAPI
    fastapi_logger = logging.getLogger("fastapi")
    fastapi_logger.handlers.clear()
    fastapi_logger.addHandler(console_handler)


# Настраиваем логирование при импорте модуля
setup_logging()