"""
Конфигурация базы данных.

Этот модуль содержит настройки подключения к базе данных,
создание движка SQLAlchemy и фабрику сессий.
"""

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


class Base(DeclarativeBase):
    """
    Базовый класс для всех моделей SQLAlchemy.
    Предоставляет декларативную базовую конфигурацию.
    """
    pass


# Создание асинхронного движка базы данных
engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    future=True
)

# Фабрика асинхронных сессий для подключений к базе данных
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)


async def get_db_session() -> AsyncSession:
    """
    Функция зависимости, которая предоставляет асинхронную сессию базы данных
    для каждого запроса и обеспечивает правильную очистку.

    Yields:
        AsyncSession: Асинхронная сессия базы данных
    """
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


# Тип аннотации для инъекции зависимости сессии
SessionDep = AsyncSession