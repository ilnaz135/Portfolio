"""
Portfolio Backend API - Achievement Routes

Этот модуль содержит маршруты для управления научными достижениями пользователей.
"""

from typing import List
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.models import UserModel, UserScientificAchievementModel
from app.schemas import (
    UserScientificAchievementCreateSchema,
    UserScientificAchievementSchema
)

router = APIRouter()
SessionDep = Depends(get_db_session)


@router.post("/{user_id}/achievements", response_model=UserScientificAchievementSchema, tags=["Achievements"], status_code=status.HTTP_201_CREATED)
async def add_scientific_achievement(
    user_id: int,
    achievement_data: UserScientificAchievementCreateSchema,
    session: AsyncSession = SessionDep
) -> UserScientificAchievementModel:
    """
    Добавить новое научное достижение в профиль пользователя.

    Args:
        user_id: ID пользователя
        achievement_data: Информация о достижении (название, тип и дата)
        session: Зависимость сессии базы данных

    Returns:
        Созданный объект достижения

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

        # Создать новое достижение
        new_achievement = UserScientificAchievementModel(
            user_id=user_id,
            name=achievement_data.name,
            type=achievement_data.type,
            date=achievement_data.date
        )
        session.add(new_achievement)
        await session.commit()
        await session.refresh(new_achievement)
        return new_achievement

    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при добавлении достижения: {str(e)}"
        )


@router.get("/{user_id}/achievements", response_model=List[UserScientificAchievementSchema], tags=["Achievements"])
async def get_user_achievements(
    user_id: int,
    session: AsyncSession = SessionDep,
    limit: int = 10
) -> List[UserScientificAchievementModel]:
    """
    Получить все научные достижения для конкретного пользователя, отсортированные по дате создания (сначала самые новые).

    Args:
        user_id: ID пользователя
        session: Зависимость сессии базы данных
        limit: Максимальное количество достижений для возврата (limit=-1 для всех)

    Returns:
        Список объектов достижений для пользователя, отсортированных по created_at desc

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

        # Получить достижения
        stmt = select(UserScientificAchievementModel).where(
            UserScientificAchievementModel.user_id == user_id
        ).order_by(UserScientificAchievementModel.created_at.desc())
        if limit != -1:
            stmt = stmt.limit(limit)
        result = await session.execute(stmt)
        achievements = result.scalars().all()
        return achievements

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при получении достижений: {str(e)}"
        )


@router.delete("/achievements/{achievement_id}", tags=["Achievements"], status_code=status.HTTP_204_NO_CONTENT)
async def delete_achievement(
    achievement_id: int,
    session: AsyncSession = SessionDep
) -> None:
    """
    Удалить конкретную запись о научном достижении.

    Args:
        achievement_id: ID достижения для удаления
        session: Зависимость сессии базы данных

    Raises:
        HTTPException 404: Если достижение не найдено
        HTTPException 500: Если произошла ошибка базы данных
    """
    try:
        stmt = select(UserScientificAchievementModel).where(
            UserScientificAchievementModel.id == achievement_id
        )
        achievement = await session.execute(stmt)
        found_achievement = achievement.scalars().first()

        if not found_achievement:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Достижение с ID {achievement_id} не найдено"
            )

        await session.delete(found_achievement)
        await session.commit()

    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при удалении достижения: {str(e)}"
        )