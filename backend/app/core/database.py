"""
Конфигурация базы данных.

Этот модуль содержит настройки подключения к базе данных,
создание движка SQLAlchemy и фабрику сессий.
"""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncConnection,
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
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


async def ensure_database_schema(db_engine: AsyncEngine | None = None) -> None:
    """
    Создать таблицы и применить простые миграции схемы.

    Args:
        db_engine: Движок БД. Если не передан, используется основной engine.
    """
    import app.models  # noqa: F401

    target_engine = db_engine or engine
    async with target_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await ensure_users_email_schema(conn)


async def ensure_users_email_schema(conn: AsyncConnection) -> None:
    """
    Убедиться, что таблица users содержит колонку email и уникальный индекс.

    Args:
        conn: Активное соединение с БД
    """
    columns_result = await conn.exec_driver_sql("PRAGMA table_info(users)")
    columns = {row[1] for row in columns_result.fetchall()}

    if "email" not in columns:
        await conn.execute(
            text("ALTER TABLE users ADD COLUMN email VARCHAR(255) NOT NULL DEFAULT ''")
        )

    await conn.execute(
        text(
            """
            UPDATE users
            SET email = lower(username) || '@portfolio.local'
            WHERE email IS NULL OR TRIM(email) = ''
            """
        )
    )

    index_list_result = await conn.exec_driver_sql("PRAGMA index_list(users)")
    email_index_exists = False
    for row in index_list_result.fetchall():
        index_name = row[1].replace("'", "''")
        index_info_result = await conn.exec_driver_sql(
            f"PRAGMA index_info('{index_name}')"
        )
        indexed_columns = {index_row[2] for index_row in index_info_result.fetchall()}
        if "email" in indexed_columns:
            email_index_exists = True
            break

    if not email_index_exists:
        await conn.execute(
            text("CREATE UNIQUE INDEX ix_users_email_unique ON users (email)")
        )


# Тип аннотации для инъекции зависимости сессии
SessionDep = AsyncSession
