"""
Portfolio Backend API - User Routes

Этот модуль содержит маршруты для управления пользователями.
"""

from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.services.user_service import UserService
from app.schemas import (
    UserCreateSchema,
    UserUpdateSchema,
    UserSchema,
    UserLoginSchema,
    UserEmailLoginSchema
)

router = APIRouter()
SessionDep = Depends(get_db_session)


@router.post("", response_model=UserSchema, tags=["Users"], status_code=201)
async def create_user(
    user_data: UserCreateSchema,
    session: AsyncSession = SessionDep
):
    """
    Создать новый профиль пользователя.

    Args:
        user_data: Данные для создания пользователя (имя пользователя должно быть уникальным)
        session: Зависимость сессии базы данных

    Returns:
        Созданный объект пользователя со всеми полями
    """
    user_service = UserService(session)
    return await user_service.create_user(user_data)


@router.get("/{user_id}", response_model=UserSchema, tags=["Users"])
async def get_user(
    user_id: int,
    session: AsyncSession = SessionDep
):
    """
    Получить конкретного пользователя по ID со всеми связанными данными.

    Args:
        user_id: ID пользователя для получения
        session: Зависимость сессии базы данных

    Returns:
        Объект пользователя со всеми связями (направления, курсы, достижения)
    """
    user_service = UserService(session)
    return await user_service.get_user_by_id(user_id)


@router.get("", response_model=List[UserSchema], tags=["Users"])
async def get_all_users(
    session: AsyncSession = SessionDep,
    limit: int = 10
):
    """
    Получить всех пользователей, отсортированных по дате создания (сначала самые новые).

    Args:
        session: Зависимость сессии базы данных
        limit: Максимальное количество пользователей для возврата (limit=-1 для всех)

    Returns:
        Список объектов пользователей, отсортированных по created_at desc
    """
    user_service = UserService(session)
    return await user_service.get_all_users(limit)


@router.put("/{user_id}", response_model=UserSchema, tags=["Users"])
async def update_user(
    user_id: int,
    user_data: UserUpdateSchema,
    session: AsyncSession = SessionDep
):
    """
    Обновить информацию о пользователе (поддерживается частичное обновление).

    Args:
        user_id: ID пользователя для обновления
        user_data: Обновленные данные пользователя
        session: Зависимость сессии базы данных

    Returns:
        Обновленный объект пользователя
    """
    user_service = UserService(session)
    return await user_service.update_user(user_id, user_data)


@router.delete("/{user_id}", tags=["Users"], status_code=204)
async def delete_user(
    user_id: int,
    session: AsyncSession = SessionDep
):
    """
    Удалить пользователя и все связанные данные (каскадное удаление).

    Args:
        user_id: ID пользователя для удаления
        session: Зависимость сессии базы данных
    """
    user_service = UserService(session)
    await user_service.delete_user(user_id)


@router.post("/login", response_model=int, tags=["Users"])
async def login_user(
    login_data: UserLoginSchema,
    session: AsyncSession = SessionDep
):
    """
    Проверить логин и пароль пользователя.

    Args:
        login_data: Данные для входа (username и password)
        session: Зависимость сессии базы данных

    Returns:
        ID пользователя если пользователь найден и пароль верный, иначе -1
    """
    user_service = UserService(session)
    return await user_service.authenticate_user(login_data.username, login_data.password)


@router.post("/login/email", response_model=int, tags=["Users"])
async def login_user_by_email(
    login_data: UserEmailLoginSchema,
    session: AsyncSession = SessionDep
):
    """
    Проверить email и пароль пользователя.

    Args:
        login_data: Данные для входа (email и password)
        session: Зависимость сессии базы данных

    Returns:
        ID пользователя если пользователь найден и пароль верный, иначе -1
    """
    user_service = UserService(session)
    return await user_service.authenticate_user_by_email(
        login_data.email,
        login_data.password
    )
