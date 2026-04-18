"""Course routes."""

from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import (
    CurrentUserDep,
    authorize_record_owner,
    authorize_user_access,
)
from app.core.database import get_db_session
from app.models import UserCourseModel, UserModel
from app.schemas import UserCourseCreateSchema, UserCourseSchema

router = APIRouter()
SessionDep = Depends(get_db_session)


async def ensure_user_exists(user_id: int, session: AsyncSession) -> None:
    if await session.get(UserModel, user_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} was not found",
        )


@router.post("/{user_id}/courses", response_model=UserCourseSchema, status_code=status.HTTP_201_CREATED)
async def add_user_course(
    user_id: int,
    course_data: UserCourseCreateSchema,
    current_user: CurrentUserDep,
    session: AsyncSession = SessionDep,
) -> UserCourseModel:
    authorize_user_access(user_id, current_user)
    await ensure_user_exists(user_id, session)

    new_course = UserCourseModel(
        user_id=user_id,
        name_course=course_data.name_course,
        url_course=course_data.url_course,
    )
    session.add(new_course)
    await session.commit()
    await session.refresh(new_course)
    return new_course


@router.get("/{user_id}/courses", response_model=List[UserCourseSchema])
async def get_user_courses(
    user_id: int,
    current_user: CurrentUserDep,
    session: AsyncSession = SessionDep,
    limit: int = 10,
) -> List[UserCourseModel]:
    authorize_user_access(user_id, current_user)
    await ensure_user_exists(user_id, session)

    stmt = (
        select(UserCourseModel)
        .where(UserCourseModel.user_id == user_id)
        .order_by(UserCourseModel.created_at.desc())
    )
    if limit != -1:
        stmt = stmt.limit(limit)
    result = await session.execute(stmt)
    return result.scalars().all()


@router.delete("/courses/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_course(
    course_id: int,
    current_user: CurrentUserDep,
    session: AsyncSession = SessionDep,
) -> Response:
    result = await session.execute(
        select(UserCourseModel).where(UserCourseModel.id == course_id)
    )
    course = result.scalars().first()
    if course is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Course with id {course_id} was not found",
        )

    authorize_record_owner(course.user_id, current_user)
    await session.delete(course)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
