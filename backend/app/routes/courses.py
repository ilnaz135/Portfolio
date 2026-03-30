"""
Portfolio Backend API - Course Routes

Этот модуль содержит маршруты для управления курсами пользователей.
"""

from typing import List
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.models import UserModel, UserCourseModel
from app.schemas import (
    UserCourseCreateSchema,
    UserCourseSchema
)

router = APIRouter()
SessionDep = Depends(get_db_session)


@router.post("/{user_id}/courses", response_model=UserCourseSchema, tags=["Courses"], status_code=status.HTTP_201_CREATED)
async def add_user_course(
    user_id: int,
    course_data: UserCourseCreateSchema,
    session: AsyncSession = SessionDep
) -> UserCourseModel:
    """
    Добавить новый завершенный курс в профиль пользователя.

    Args:
        user_id: ID пользователя
        course_data: Информация о курсе (название и URL)
        session: Зависимость сессии базы данных

    Returns:
        Созданный объект курса

    Raises:
        HTTPException 404: Если пользователь не найден
        HTTPException 500: Если произошла ошибка базы данных
    """
    try:
        # Проверить, существует ли пользователь
        stmt = select(UserModel).where(UserModel.id == user_id)
        user = await session.execute(stmt)
        found_user = user.scalars().first()

        if not found_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Пользователь с ID {user_id} не найден"
            )

        # Создать новый курс
        new_course = UserCourseModel(
            user_id=user_id,
            name_course=course_data.name_course,
            url_course=course_data.url_course
        )
        session.add(new_course)
        await session.commit()
        await session.refresh(new_course)
        return new_course

    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при добавлении курса: {str(e)}"
        )


@router.get("/{user_id}/courses", response_model=List[UserCourseSchema], tags=["Courses"])
async def get_user_courses(
    user_id: int,
    session: AsyncSession = SessionDep,
    limit: int = 10
) -> List[UserCourseModel]:
    """
    Получить все завершенные курсы для конкретного пользователя, отсортированные по дате создания (сначала самые новые).

    Args:
        user_id: ID пользователя
        session: Зависимость сессии базы данных
        limit: Максимальное количество курсов для возврата (limit=-1 для всех)

    Returns:
        Список объектов курсов для пользователя, отсортированных по created_at desc

    Raises:
        HTTPException 404: Если пользователь не найден
        HTTPException 500: Если произошла ошибка базы данных
    """
    try:
        # Проверить, существует ли пользователь
        stmt = select(UserModel).where(UserModel.id == user_id)
        user = await session.execute(stmt)
        found_user = user.scalars().first()

        if not found_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Пользователь с ID {user_id} не найден"
            )

        # Получить курсы
        stmt = select(UserCourseModel).where(UserCourseModel.user_id == user_id).order_by(UserCourseModel.created_at.desc())
        if limit != -1:
            stmt = stmt.limit(limit)
        result = await session.execute(stmt)
        courses = result.scalars().all()
        return courses

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при получении курсов: {str(e)}"
        )


@router.delete("/courses/{course_id}", tags=["Courses"], status_code=status.HTTP_204_NO_CONTENT)
async def delete_course(
    course_id: int,
    session: AsyncSession = SessionDep
) -> None:
    """
    Удалить конкретную запись о курсе.

    Args:
        course_id: ID курса для удаления
        session: Зависимость сессии базы данных

    Raises:
        HTTPException 404: Если курс не найден
        HTTPException 500: Если произошла ошибка базы данных
    """
    try:
        stmt = select(UserCourseModel).where(UserCourseModel.id == course_id)
        course = await session.execute(stmt)
        found_course = course.scalars().first()

        if not found_course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Курс с ID {course_id} не найден"
            )

        await session.delete(found_course)
        await session.commit()

    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при удалении курса: {str(e)}"
        )