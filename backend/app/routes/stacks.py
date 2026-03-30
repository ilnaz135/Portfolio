"""
Portfolio Backend API - Stack Routes

Этот модуль содержит маршруты для управления стеками технологий пользователей.
"""

from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.services.stack_service import StackService
from app.schemas import (
    UserStackCreateSchema,
    UserStackSchema
)

router = APIRouter()
SessionDep = Depends(get_db_session)


@router.post("/{user_id}/stacks", response_model=UserStackSchema, tags=["Stacks"], status_code=201)
async def add_user_stack(
    user_id: int,
    stack_data: UserStackCreateSchema,
    session: AsyncSession = SessionDep
):
    """
    Добавить новый стек технологий в профиль пользователя.

    Args:
        user_id: ID пользователя
        stack_data: Информация о стеке
        session: Зависимость сессии базы данных

    Returns:
        Созданный объект стека
    """
    stack_service = StackService(session)
    return await stack_service.add_stack_to_user(user_id, stack_data)


@router.get("/{user_id}/stacks", response_model=List[UserStackSchema], tags=["Stacks"])
async def get_user_stacks(
    user_id: int,
    session: AsyncSession = SessionDep,
    limit: int = 10
):
    """
    Получить все стеки технологий для конкретного пользователя, отсортированные по дате создания (сначала самые новые).

    Args:
        user_id: ID пользователя
        session: Зависимость сессии базы данных
        limit: Максимальное количество стеков для возврата (limit=-1 для всех)

    Returns:
        Список объектов стеков для пользователя, отсортированных по created_at desc
    """
    stack_service = StackService(session)
    return await stack_service.get_user_stacks(user_id, limit)


@router.delete("/{user_id}/stacks/{stack_id}", tags=["Stacks"], status_code=204)
async def delete_user_stack(
    user_id: int,
    stack_id: int,
    session: AsyncSession = SessionDep
):
    """
    Удалить конкретную запись о стеке технологий.

    Args:
        user_id: ID пользователя
        stack_id: ID стека для удаления
        session: Зависимость сессии базы данных
    """
    stack_service = StackService(session)
    await stack_service.remove_stack_from_user(user_id, stack_id)