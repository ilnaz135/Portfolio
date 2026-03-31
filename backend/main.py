"""
Portfolio Backend API - Main Application

Этот модуль создает и запускает основное FastAPI приложение,
используя модульную архитектуру.
"""

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logging import setup_logging
from app.routes import api_router


def create_application() -> FastAPI:
    """
    Создать и настроить FastAPI приложение.

    Returns:
        Настроенное FastAPI приложение
    """
    # Настроить логирование
    setup_logging()

    # Создать приложение FastAPI
    app = FastAPI(
        title=settings.app_name,
        description=settings.app_description,
        version=settings.app_version,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json"
    )

    # Зарегистрировать обработчики исключений
    from app.core.exceptions import (
        portfolio_exception_handler,
        sqlalchemy_exception_handler,
        general_exception_handler,
        PortfolioException
    )
    from sqlalchemy.exc import SQLAlchemyError

    app.add_exception_handler(PortfolioException, portfolio_exception_handler)
    app.add_exception_handler(SQLAlchemyError, sqlalchemy_exception_handler)
    app.add_exception_handler(Exception, general_exception_handler)

    # Разрешить CORS для сайта 127.0.0.1:5500
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Включить маршруты API
    app.include_router(api_router, prefix="/api/v1")

    return app


# Создать экземпляр приложения
app = create_application()


if __name__ == "__main__":
    """
    Запустить FastAPI приложение с сервером Uvicorn.

    Сервер будет доступен по адресу http://localhost:8000
    Документация API автоматически доступна по адресу http://localhost:8000/docs
    """
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level="info"
    )