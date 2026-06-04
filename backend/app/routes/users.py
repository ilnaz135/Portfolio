"""User routes."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUserDep, authorize_user_access, require_admin
from app.core.database import get_db_session
from app.schemas import (
    CourseCatalogItemSchema,
    EmailCheckSchema,
    UserCreateSchema,
    UserSchema,
    UserUpdateSchema,
    UsernameCheckSchema,
)
from app.services.user_service import UserService

router = APIRouter()
SessionDep = Depends(get_db_session)
COURSE_CATALOG_PATH = Path(__file__).resolve().parents[2] / "course_difficulty_scores_Ru.json"


@lru_cache(maxsize=1)
def load_course_catalog() -> list[dict]:
    with COURSE_CATALOG_PATH.open("r", encoding="utf-8") as catalog_file:
        data = json.load(catalog_file)
    return data if isinstance(data, list) else []


@router.post("", response_model=UserSchema, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreateSchema,
    session: AsyncSession = SessionDep,
) -> UserSchema:
    """Create a user profile."""

    return await UserService(session).create_user(user_data)


@router.post("/check-username", response_model=bool)
async def check_username(
    check_data: UsernameCheckSchema,
    session: AsyncSession = SessionDep,
) -> bool:
    """Check whether a username is already used."""

    return await UserService(session).username_exists(check_data.username)


@router.post("/check-email", response_model=bool)
async def check_email(
    check_data: EmailCheckSchema,
    session: AsyncSession = SessionDep,
) -> bool:
    """Check whether an email is already used."""

    return await UserService(session).email_exists(check_data.email)


@router.get("", response_model=List[UserSchema])
async def get_all_users(
    current_user: CurrentUserDep,
    session: AsyncSession = SessionDep,
    limit: int = 10,
) -> List[UserSchema]:
    """Return all users for administrators."""

    require_admin(current_user)
    return await UserService(session).get_all_users(limit)


@router.get("/students", response_model=List[UserSchema])
async def get_students(
    current_user: CurrentUserDep,
    session: AsyncSession = SessionDep,
    limit: int = -1,
) -> List[UserSchema]:
    """Return active students for the students directory."""

    return await UserService(session).get_students(limit)


@router.get("/course-catalog", response_model=List[CourseCatalogItemSchema])
async def get_course_catalog(
    current_user: CurrentUserDep,
) -> List[dict]:
    """Return course catalog metadata used by the profile course cards."""

    return load_course_catalog()


@router.get("/{user_id}", response_model=UserSchema)
async def get_user(
    user_id: int,
    current_user: CurrentUserDep,
    session: AsyncSession = SessionDep,
) -> UserSchema:
    """Return a user profile with related data."""

    return await UserService(session).get_user_by_id(user_id)


@router.put("/{user_id}", response_model=UserSchema)
async def update_user(
    user_id: int,
    user_data: UserUpdateSchema,
    current_user: CurrentUserDep,
    session: AsyncSession = SessionDep,
) -> UserSchema:
    """Update a user profile."""

    authorize_user_access(user_id, current_user)
    return await UserService(session).update_user(user_id, user_data)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    current_user: CurrentUserDep,
    session: AsyncSession = SessionDep,
) -> Response:
    """Delete a user profile."""

    authorize_user_access(user_id, current_user)
    await UserService(session).delete_user(user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
