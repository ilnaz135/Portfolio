"""
Portfolio Backend API - Stack Service

Этот модуль содержит бизнес-логику для работы со стеками технологий пользователей.
"""

from typing import List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.models import UserModel, UserStackModel
from app.schemas import UserStackCreateSchema
from app.core.exceptions import UserNotFoundException, StackAlreadyExistsException


class StackService:
    """
    Сервис для работы со стеками технологий пользователей.
    Содержит бизнес-логику для CRUD операций со стеками.
    """

    def __init__(self, session: AsyncSession):
        """
        Инициализация сервиса.

        Args:
            session: Асинхронная сессия базы данных
        """
        self.session = session

    async def add_stack_to_user(self, user_id: int, stack_data: UserStackCreateSchema) -> UserStackModel:
        """
        Добавить стек к пользователю.

        Args:
            user_id: ID пользователя
            stack_data: Данные стека

        Returns:
            Созданный стек

        Raises:
            UserNotFoundException: Если пользователь не найден
            StackAlreadyExistsException: Если стек уже существует у пользователя
        """
        try:
            # Проверить, существует ли пользователь
            user = await self.session.get(UserModel, user_id)
            if not user:
                raise UserNotFoundException(user_id)

            # Проверить, существует ли уже такой стек у пользователя
            existing_stack = await self._get_user_stack_by_name(user_id, stack_data.stack)
            if existing_stack:
                raise StackAlreadyExistsException(stack_data.stack)

            # Создать новый стек
            new_stack = UserStackModel(
                user_id=user_id,
                stack=stack_data.stack
            )

            self.session.add(new_stack)
            await self.session.commit()
            await self.session.refresh(new_stack)
            return new_stack

        except IntegrityError:
            await self.session.rollback()
            raise StackAlreadyExistsException(stack_data.stack)
        except Exception:
            await self.session.rollback()
            raise

    async def get_user_stacks(self, user_id: int, limit: int = 10) -> List[UserStackModel]:
        """
        Получить все стеки пользователя.

        Args:
            user_id: ID пользователя
            limit: Максимальное количество стеков

        Returns:
            Список стеков пользователя

        Raises:
            UserNotFoundException: Если пользователь не найден
        """
        # Проверить, существует ли пользователь
        user = await self.session.get(UserModel, user_id)
        if not user:
            raise UserNotFoundException(user_id)

        stmt = select(UserStackModel).where(UserStackModel.user_id == user_id).order_by(UserStackModel.created_at.desc())
        if limit != -1:
            stmt = stmt.limit(limit)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def remove_stack_from_user(self, user_id: int, stack_id: int) -> None:
        """
        Удалить стек у пользователя.

        Args:
            user_id: ID пользователя
            stack_id: ID стека

        Raises:
            UserNotFoundException: Если пользователь не найден
        """
        try:
            # Проверить, существует ли пользователь
            user = await self.session.get(UserModel, user_id)
            if not user:
                raise UserNotFoundException(user_id)

            # Найти стек
            stack = await self.session.get(UserStackModel, stack_id)
            if stack and stack.user_id == user_id:
                await self.session.delete(stack)
                await self.session.commit()
        except Exception:
            await self.session.rollback()
            raise

    async def _get_user_stack_by_name(self, user_id: int, stack_name: str) -> UserStackModel | None:
        """
        Получить стек пользователя по названию.

        Args:
            user_id: ID пользователя
            stack_name: Название стека

        Returns:
            Стек или None
        """
        stmt = select(UserStackModel).where(
            UserStackModel.user_id == user_id,
            UserStackModel.stack == stack_name
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()