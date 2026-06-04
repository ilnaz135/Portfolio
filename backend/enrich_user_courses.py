"""Add catalog courses to an already registered user."""

from __future__ import annotations

import argparse
import asyncio
import json
from pathlib import Path
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_maker, ensure_database_schema
from app.models import UserCourseModel, UserModel


BASE_DIR = Path(__file__).resolve().parent
COURSE_CATALOG_PATH = BASE_DIR / "course_difficulty_scores_Ru.json"
DEFAULT_COURSE_COUNT = 12


def load_course_catalog() -> list[dict[str, Any]]:
    """Read valid course catalog rows from the bundled JSON file."""

    try:
        with COURSE_CATALOG_PATH.open("r", encoding="utf-8") as catalog_file:
            data = json.load(catalog_file)
    except FileNotFoundError:
        return []

    if not isinstance(data, list):
        return []

    return [
        item
        for item in data
        if isinstance(item, dict) and str(item.get("course") or "").strip()
    ]


def normalize_specializations(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item).strip() for item in value if str(item).strip()]


def as_catalog_id(value: Any) -> int | None:
    try:
        catalog_id = int(value)
    except (TypeError, ValueError):
        return None
    return catalog_id if catalog_id > 0 else None


def as_difficulty(value: Any) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def select_catalog_slice(
    catalog: list[dict[str, Any]],
    *,
    user_id: int,
    count: int,
) -> list[dict[str, Any]]:
    """Pick a deterministic, different-looking slice for each user."""

    if not catalog or count <= 0:
        return []

    target_count = min(count, len(catalog))
    start_index = (int(user_id) * 7) % len(catalog)
    step = 13 if len(catalog) > 13 else 1
    selected: list[dict[str, Any]] = []
    seen: set[int | str] = set()
    cursor = start_index
    attempts = 0

    while len(selected) < target_count and attempts < len(catalog) * 2:
        item = catalog[cursor % len(catalog)]
        course_name = str(item.get("course") or "").strip()
        catalog_id = as_catalog_id(item.get("id"))
        key: int | str = catalog_id or course_name

        if course_name and key not in seen:
            selected.append(item)
            seen.add(key)

        cursor += step
        attempts += 1

    return selected


def build_course(user_id: int, item: dict[str, Any]) -> UserCourseModel:
    course_name = str(item.get("course") or "").strip()
    course = UserCourseModel(
        user_id=user_id,
        catalog_id=as_catalog_id(item.get("id")),
        degree=str(item.get("degree") or "").strip() or None,
        program=str(item.get("program") or "").strip() or None,
        course=course_name,
        name_course=course_name,
        url_course="",
        difficulty=as_difficulty(item.get("difficulty")),
    )
    course.specializations = normalize_specializations(item.get("specializations"))
    return course


async def find_user(
    session: AsyncSession,
    *,
    user_id: int | None = None,
    username: str | None = None,
    email: str | None = None,
    latest: bool = False,
) -> UserModel | None:
    if user_id is not None:
        return await session.get(UserModel, user_id)

    if username:
        result = await session.execute(
            select(UserModel).where(UserModel.username == username)
        )
        return result.scalars().first()

    if email:
        result = await session.execute(
            select(UserModel).where(UserModel.email == email.lower())
        )
        return result.scalars().first()

    if latest:
        result = await session.execute(
            select(UserModel).order_by(UserModel.created_at.desc(), UserModel.id.desc())
        )
        return result.scalars().first()

    return None


async def enrich_user_courses(
    session: AsyncSession,
    user: UserModel,
    *,
    count: int = DEFAULT_COURSE_COUNT,
    replace: bool = False,
) -> int:
    """Add catalog courses to a user and return the number of inserted rows."""

    catalog = load_course_catalog()
    selected_items = select_catalog_slice(catalog, user_id=user.id, count=count)
    if not selected_items:
        return 0

    if replace:
        await session.execute(
            delete(UserCourseModel).where(
                UserCourseModel.user_id == user.id,
                UserCourseModel.catalog_id.isnot(None),
            )
        )
        await session.flush()

    existing_result = await session.execute(
        select(UserCourseModel.catalog_id).where(
            UserCourseModel.user_id == user.id,
            UserCourseModel.catalog_id.isnot(None),
        )
    )
    existing_catalog_ids = {
        catalog_id for catalog_id in existing_result.scalars().all() if catalog_id
    }

    added = 0
    for item in selected_items:
        catalog_id = as_catalog_id(item.get("id"))
        if catalog_id and catalog_id in existing_catalog_ids:
            continue

        session.add(build_course(user.id, item))
        if catalog_id:
            existing_catalog_ids.add(catalog_id)
        added += 1

    await session.commit()
    return added


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Add course catalog rows to an existing registered user.",
    )
    target = parser.add_mutually_exclusive_group(required=True)
    target.add_argument("--id", type=int, dest="user_id", help="User id")
    target.add_argument("--username", help="Username from the registration form")
    target.add_argument("--email", help="User email from the registration form")
    target.add_argument(
        "--latest",
        action="store_true",
        help="Use the most recently registered user",
    )
    parser.add_argument(
        "--count",
        type=int,
        default=DEFAULT_COURSE_COUNT,
        help=f"How many catalog courses to add, default {DEFAULT_COURSE_COUNT}",
    )
    parser.add_argument(
        "--replace",
        action="store_true",
        help="Remove existing catalog courses for this user before adding new ones",
    )
    return parser.parse_args()


async def main() -> None:
    args = parse_args()
    await ensure_database_schema()

    async with async_session_maker() as session:
        user = await find_user(
            session,
            user_id=args.user_id,
            username=args.username,
            email=args.email,
            latest=args.latest,
        )
        if user is None:
            raise SystemExit("User was not found")

        added = await enrich_user_courses(
            session,
            user,
            count=args.count,
            replace=args.replace,
        )
        print(f"Added {added} courses to {user.username} (id={user.id})")


if __name__ == "__main__":
    asyncio.run(main())
