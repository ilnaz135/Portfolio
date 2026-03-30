"""
Portfolio Backend API - System Routes

Этот модуль содержит системные маршруты для инициализации базы данных
и проверки здоровья API.
"""

from fastapi import APIRouter, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.database import engine
from app.models import Base

router = APIRouter()


@router.post("/setup", tags=["System"])
async def setup_database() -> dict:
    """
    Инициализировать базу данных, создав все таблицы.
    Должен быть вызван один раз перед использованием API.

    Returns:
        Словарь с сообщением о статусе настройки

    Raises:
        HTTPException: Если настройка базы данных не удалась
    """
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        return {"status": "Настройка базы данных завершена успешно"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Настройка базы данных не удалась: {str(e)}"
        )


@router.get("/health", tags=["System"])
async def health_check() -> dict:
    """
    Эндпоинт проверки здоровья API.

    Returns:
        Словарь, указывающий статус API
    """
    return {"status": "healthy", "service": "Portfolio Backend API"}