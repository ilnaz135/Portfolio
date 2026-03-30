"""
Portfolio Backend API - Direction Routes

Этот модуль содержит маршруты для управления академическими направлениями пользователей.
"""

from typing import List
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.models import UserModel, UserDirectionModel
from app.schemas import (
    UserDirectionCreateSchema,
    UserDirectionSchema
)

router = APIRouter()
SessionDep = Depends(get_db_session)


@router.post("/{user_id}/directions", response_model=UserDirectionSchema, tags=["Directions"], status_code=status.HTTP_201_CREATED)
async def add_user_direction(
    user_id: int,
    direction_data: UserDirectionCreateSchema,
    session: AsyncSession = SessionDep
) -> UserDirectionModel:
    """
    Добавить новое академическое направление в профиль пользователя.

    Args:
        user_id: ID пользователя
        direction_data: Информация о направлении
        session: Зависимость сессии базы данных

    Returns:
        Созданный объект направления

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

        # Создать новое направление
        new_direction = UserDirectionModel(
            user_id=user_id,
            other_directions=direction_data.other_directions
        )
        session.add(new_direction)
        await session.commit()
        await session.refresh(new_direction)
        return new_direction

    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при добавлении направления: {str(e)}"
        )


@router.get("/{user_id}/directions", response_model=List[UserDirectionSchema], tags=["Directions"])
async def get_user_directions(
    user_id: int,
    session: AsyncSession = SessionDep,
    limit: int = 10
) -> List[UserDirectionModel]:
    """
    Получить все академические направления для конкретного пользователя, отсортированные по дате создания (сначала самые новые).

    Args:
        user_id: ID пользователя
        session: Зависимость сессии базы данных
        limit: Максимальное количество направлений для возврата (limit=-1 для всех)

    Returns:
        Список объектов направлений для пользователя, отсортированных по created_at desc

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

        # Получить направления
        stmt = select(UserDirectionModel).where(UserDirectionModel.user_id == user_id).order_by(UserDirectionModel.created_at.desc())
        if limit != -1:
            stmt = stmt.limit(limit)
        result = await session.execute(stmt)
        directions = result.scalars().all()
        return directions

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при получении направлений: {str(e)}"
        )


@router.delete("/directions/{direction_id}", tags=["Directions"], status_code=status.HTTP_204_NO_CONTENT)
async def delete_direction(
    direction_id: int,
    session: AsyncSession = SessionDep
) -> None:
    """
    Удалить конкретную запись о направлении.

    Args:
        direction_id: ID направления для удаления
        session: Зависимость сессии базы данных

    Raises:
        HTTPException 404: Если направление не найдено
        HTTPException 500: Если произошла ошибка базы данных
    """
    try:
        stmt = select(UserDirectionModel).where(UserDirectionModel.id == direction_id)
        direction = await session.execute(stmt)
        found_direction = direction.scalars().first()

        if not found_direction:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Направление с ID {direction_id} не найдено"
            )

        await session.delete(found_direction)
        await session.commit()

    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при удалении направления: {str(e)}"
        )