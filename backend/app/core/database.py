"""Database configuration and lightweight schema migration helpers."""

from __future__ import annotations

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
from app.core.security import hash_password


class Base(DeclarativeBase):
    """Base class for SQLAlchemy models."""


engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    future=True,
)

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db_session() -> AsyncSession:
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


async def ensure_database_schema(db_engine: AsyncEngine | None = None) -> None:
    import app.models  # noqa: F401

    target_engine = db_engine or engine
    async with target_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await ensure_users_email_schema(conn)
        await ensure_users_group_schema(conn)
        await ensure_users_auth_schema(conn)


async def ensure_users_email_schema(conn: AsyncConnection) -> None:
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


async def ensure_users_group_schema(conn: AsyncConnection) -> None:
    columns_result = await conn.exec_driver_sql("PRAGMA table_info(users)")
    columns = {row[1].lower() for row in columns_result.fetchall()}
    group_column_exists = "group" in columns

    if not group_column_exists:
        await conn.execute(
            text(
                'ALTER TABLE users ADD COLUMN "Group" '
                "VARCHAR(50) NOT NULL DEFAULT 'unknown'"
            )
        )

    backfill_filter = '"Group" IS NULL OR TRIM("Group") = \'\''
    if not group_column_exists:
        backfill_filter = f"{backfill_filter} OR \"Group\" = 'unknown'"

    await conn.execute(
        text(
            f"""
            UPDATE users
            SET "Group" = CASE TRIM(COALESCE("class", ''))
                WHEN :first_course THEN 'RI-101'
                WHEN :second_course THEN 'RI-201'
                WHEN :third_course THEN 'RI-301'
                WHEN :fourth_course THEN 'RI-401'
                ELSE 'unknown'
            END
            WHERE {backfill_filter}
            """
        ),
        {
            "first_course": "1 \u043a\u0443\u0440\u0441",
            "second_course": "2 \u043a\u0443\u0440\u0441",
            "third_course": "3 \u043a\u0443\u0440\u0441",
            "fourth_course": "4 \u043a\u0443\u0440\u0441",
        },
    )


async def ensure_users_auth_schema(conn: AsyncConnection) -> None:
    columns_result = await conn.exec_driver_sql("PRAGMA table_info(users)")
    columns = {row[1] for row in columns_result.fetchall()}

    if "password_hash" not in columns:
        await conn.execute(
            text(
                "ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NOT NULL DEFAULT ''"
            )
        )

    if "role" not in columns:
        await conn.execute(
            text(
                "ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user'"
            )
        )

    if "is_active" not in columns:
        await conn.execute(
            text(
                "ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT 1"
            )
        )

    if "last_login_at" not in columns:
        await conn.execute(
            text("ALTER TABLE users ADD COLUMN last_login_at DATETIME NULL")
        )

    users_result = await conn.exec_driver_sql(
        "SELECT id, password, password_hash FROM users"
    )
    for user_id, legacy_password, password_hash in users_result.fetchall():
        if (password_hash or "").strip():
            continue

        if (legacy_password or "").strip():
            await conn.execute(
                text(
                    """
                    UPDATE users
                    SET password_hash = :password_hash
                    WHERE id = :user_id
                    """
                ),
                {
                    "password_hash": hash_password(legacy_password),
                    "user_id": user_id,
                },
            )

    await conn.execute(
        text(
            """
            UPDATE users
            SET role = 'user'
            WHERE role IS NULL OR TRIM(role) = ''
            """
        )
    )

    await conn.execute(
        text(
            """
            UPDATE users
            SET is_active = 1
            WHERE is_active IS NULL
            """
        )
    )

    await conn.execute(
        text(
            """
            UPDATE users
            SET password = '__legacy_hidden__'
            WHERE password IS NOT NULL
              AND TRIM(password) != ''
              AND password != '__legacy_hidden__'
              AND password_hash IS NOT NULL
              AND TRIM(password_hash) != ''
            """
        )
    )


SessionDep = AsyncSession
