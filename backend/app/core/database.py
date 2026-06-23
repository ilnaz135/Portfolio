"""Database configuration and lightweight schema migration helpers."""

from __future__ import annotations

import json
import re
from datetime import datetime
from pathlib import Path

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


COURSE_CATALOG_PATH = Path(__file__).resolve().parents[2] / "course_difficulty_scores_Ru.json"
DEFAULT_CATALOG_COURSE_SEED_COUNT = 4


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
        await ensure_users_profile_schema(conn)
        await ensure_users_username_ascii_schema(conn)
        await ensure_user_courses_schema(conn)
        await ensure_achievement_text_schema(conn)
        await ensure_user_starter_achievements(conn)


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

    if "onboarding_completed" not in columns:
        await conn.execute(
            text(
                "ALTER TABLE users ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT 0"
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
            SET onboarding_completed = 0
            WHERE onboarding_completed IS NULL
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


async def ensure_users_profile_schema(conn: AsyncConnection) -> None:
    columns_result = await conn.exec_driver_sql("PRAGMA table_info(users)")
    columns = {row[1] for row in columns_result.fetchall()}

    if "avatar_data_url" not in columns:
        await conn.execute(text("ALTER TABLE users ADD COLUMN avatar_data_url TEXT NULL"))

    telegram_columns = {
        "telegram_username": "VARCHAR(32) NULL",
        "telegram_chat_id": "VARCHAR(64) NULL",
        "telegram_user_id": "VARCHAR(64) NULL",
        "telegram_linked_at": "DATETIME NULL",
    }

    for column_name, definition in telegram_columns.items():
        if column_name not in columns:
            await conn.execute(
                text(f"ALTER TABLE users ADD COLUMN {column_name} {definition}")
            )


def load_course_catalog_for_seed() -> list[dict]:
    try:
        with COURSE_CATALOG_PATH.open("r", encoding="utf-8") as catalog_file:
            data = json.load(catalog_file)
    except FileNotFoundError:
        return []

    if not isinstance(data, list):
        return []
    return [item for item in data if isinstance(item, dict) and item.get("course")]


async def ensure_user_courses_schema(conn: AsyncConnection) -> None:
    columns_result = await conn.exec_driver_sql("PRAGMA table_info(users_courses)")
    columns = {row[1] for row in columns_result.fetchall()}

    column_definitions = {
        "catalog_id": "INTEGER NULL",
        "degree": "VARCHAR(80) NULL",
        "program": "VARCHAR(180) NULL",
        "course": "VARCHAR(300) NOT NULL DEFAULT ''",
        "specializations_json": "TEXT NOT NULL DEFAULT '[]'",
        "difficulty": "FLOAT NOT NULL DEFAULT 0",
    }

    for column_name, definition in column_definitions.items():
        if column_name not in columns:
            await conn.execute(
                text(f"ALTER TABLE users_courses ADD COLUMN {column_name} {definition}")
            )

    await conn.execute(
        text(
            """
            UPDATE users_courses
            SET course = name_course
            WHERE course IS NULL OR TRIM(course) = ''
            """
        )
    )
    await conn.execute(
        text(
            """
            UPDATE users_courses
            SET name_course = course
            WHERE name_course IS NULL OR TRIM(name_course) = ''
            """
        )
    )
    await conn.execute(
        text(
            """
            UPDATE users_courses
            SET url_course = ''
            WHERE url_course IS NULL
            """
        )
    )
    await conn.execute(
        text(
            """
            UPDATE users_courses
            SET specializations_json = '[]'
            WHERE specializations_json IS NULL OR TRIM(specializations_json) = ''
            """
        )
    )
    await conn.execute(
        text(
            """
            UPDATE users_courses
            SET difficulty = 0
            WHERE difficulty IS NULL
            """
        )
    )

    catalog = load_course_catalog_for_seed()
    if not catalog:
        return

    users_result = await conn.exec_driver_sql("SELECT id FROM users ORDER BY id")
    user_ids = [row[0] for row in users_result.fetchall()]
    course_count = min(DEFAULT_CATALOG_COURSE_SEED_COUNT, len(catalog))

    for user_id in user_ids:
        existing_courses = await conn.execute(
            text(
                """
                SELECT COUNT(*)
                FROM users_courses
                WHERE user_id = :user_id
                """
            ),
            {"user_id": user_id},
        )
        if (existing_courses.scalar_one() or 0) > 0:
            continue

        start_index = (int(user_id) * 7) % len(catalog)
        for offset in range(course_count):
            item = catalog[(start_index + offset * 13) % len(catalog)]
            course_name = str(item.get("course") or "").strip()
            if not course_name:
                continue

            specializations = [
                str(value).strip()
                for value in item.get("specializations", [])
                if str(value).strip()
            ]
            try:
                difficulty = float(item.get("difficulty") or 0)
            except (TypeError, ValueError):
                difficulty = 0.0

            await conn.execute(
                text(
                    """
                    INSERT INTO users_courses (
                        user_id,
                        catalog_id,
                        degree,
                        program,
                        course,
                        name_course,
                        url_course,
                        specializations_json,
                        difficulty,
                        created_at
                    )
                    VALUES (
                        :user_id,
                        :catalog_id,
                        :degree,
                        :program,
                        :course,
                        :name_course,
                        '',
                        :specializations_json,
                        :difficulty,
                        :created_at
                    )
                    """
                ),
                {
                    "user_id": user_id,
                    "catalog_id": item.get("id"),
                    "degree": item.get("degree"),
                    "program": item.get("program"),
                    "course": course_name,
                    "name_course": course_name,
                    "specializations_json": json.dumps(
                        specializations,
                        ensure_ascii=False,
                    ),
                    "difficulty": difficulty,
                    "created_at": datetime.utcnow(),
                },
            )


async def ensure_user_starter_achievements(conn: AsyncConnection) -> None:
    users_result = await conn.exec_driver_sql("SELECT id FROM users ORDER BY id")
    user_ids = [row[0] for row in users_result.fetchall()]

    for user_id in user_ids:
        counts = []
        for table_name in (
            "users_publications",
            "users_events",
            "users_grants",
            "users_intellectual_properties",
            "users_innovations",
            "users_scholarships",
            "users_internships",
        ):
            result = await conn.execute(
                text(f"SELECT COUNT(*) FROM {table_name} WHERE user_id = :user_id"),
                {"user_id": user_id},
            )
            counts.append(result.scalar_one() or 0)

        if sum(counts) > 0:
            continue

        await conn.execute(
            text(
                """
                INSERT INTO users_publications (
                    user_id,
                    placement_date,
                    title,
                    publication_type,
                    indexation_date,
                    status,
                    points,
                    created_at
                )
                VALUES (
                    :user_id,
                    :placement_date,
                    :title,
                    :publication_type,
                    :indexation_date,
                    :status,
                    :points,
                    :created_at
                )
                """
            ),
            {
                "user_id": user_id,
                "placement_date": "2025-11-12",
                "title": "Исследование цифрового портфолио студента",
                "publication_type": "Статья в сборнике",
                "indexation_date": "2025-12-04",
                "status": "Принято",
                "points": 18,
                "created_at": datetime.utcnow(),
            },
        )
        await conn.execute(
            text(
                """
                INSERT INTO users_events (
                    user_id,
                    placement_date,
                    title,
                    event_type,
                    event_date,
                    status,
                    points,
                    created_at
                )
                VALUES (
                    :user_id,
                    :placement_date,
                    :title,
                    :event_type,
                    :event_date,
                    :status,
                    :points,
                    :created_at
                )
                """
            ),
            {
                "user_id": user_id,
                "placement_date": "2026-02-20",
                "title": "Доклад на студенческой научной конференции",
                "event_type": "Конференция",
                "event_date": "20.02.2026",
                "status": "Участник",
                "points": 12,
                "created_at": datetime.utcnow(),
            },
        )


USERNAME_RE = re.compile(r"^[A-Za-z0-9_]{3,50}$")
CYRILLIC_TRANSLIT = {
    "а": "a",
    "б": "b",
    "в": "v",
    "г": "g",
    "д": "d",
    "е": "e",
    "ё": "e",
    "ж": "zh",
    "з": "z",
    "и": "i",
    "й": "y",
    "к": "k",
    "л": "l",
    "м": "m",
    "н": "n",
    "о": "o",
    "п": "p",
    "р": "r",
    "с": "s",
    "т": "t",
    "у": "u",
    "ф": "f",
    "х": "h",
    "ц": "ts",
    "ч": "ch",
    "ш": "sh",
    "щ": "sch",
    "ъ": "",
    "ы": "y",
    "ь": "",
    "э": "e",
    "ю": "yu",
    "я": "ya",
}


def normalize_ascii_username(value: str, user_id: int, used: set[str]) -> str:
    transliterated = "".join(
        CYRILLIC_TRANSLIT.get(ch.lower(), ch.lower()) for ch in str(value or "")
    )
    normalized = re.sub(r"[^a-z0-9_]+", "_", transliterated).strip("_")
    if len(normalized) < 3:
        normalized = f"user_{user_id}"
    normalized = normalized[:50].strip("_") or f"user_{user_id}"

    if not USERNAME_RE.fullmatch(normalized):
        normalized = f"user_{user_id}"

    candidate = normalized
    suffix = 1
    while candidate in used:
        suffix_text = f"_{suffix}"
        candidate = f"{normalized[: 50 - len(suffix_text)]}{suffix_text}"
        suffix += 1
    used.add(candidate)
    return candidate


async def ensure_users_username_ascii_schema(conn: AsyncConnection) -> None:
    users_result = await conn.exec_driver_sql(
        "SELECT id, username FROM users ORDER BY id"
    )
    rows = users_result.fetchall()
    used: set[str] = set()

    for user_id, username in rows:
        normalized = normalize_ascii_username(username, user_id, used)
        if normalized == username:
            continue

        await conn.execute(
            text("UPDATE users SET username = :username WHERE id = :user_id"),
            {"username": normalized, "user_id": user_id},
        )


async def ensure_achievement_text_schema(conn: AsyncConnection) -> None:
    cleanup_statements = [
        """
        UPDATE users_publications
        SET title = TRIM(title),
            publication_type = TRIM(publication_type),
            status = TRIM(status)
        """,
        """
        UPDATE users_events
        SET title = TRIM(title),
            event_type = TRIM(event_type),
            event_date = TRIM(event_date),
            status = TRIM(status)
        """,
        """
        UPDATE users_grants
        SET title = TRIM(title),
            work_type = TRIM(work_type),
            status = TRIM(status)
        """,
        """
        UPDATE users_intellectual_properties
        SET title = TRIM(title),
            intellectual_type = TRIM(intellectual_type),
            status = TRIM(status)
        """,
        """
        UPDATE users_innovations
        SET title = TRIM(title),
            status = TRIM(status)
        """,
        """
        UPDATE users_scholarships
        SET scholarship_type = TRIM(scholarship_type),
            academic_year = TRIM(academic_year),
            status = TRIM(status)
        """,
        """
        UPDATE users_internships
        SET organization = TRIM(organization),
            city = TRIM(city),
            status = TRIM(status)
        """,
    ]

    for statement in cleanup_statements:
        try:
            await conn.execute(text(statement))
        except Exception:
            continue


SessionDep = AsyncSession
