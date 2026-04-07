"""
Portfolio Backend API - User Service

Этот модуль содержит бизнес-логику для работы с пользователями.
"""

from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from app.models import UserModel
from app.schemas import UserCreateSchema, UserUpdateSchema
from app.core.exceptions import (
    EmailAlreadyExistsException,
    UserNotFoundException,
    UsernameAlreadyExistsException,
)


class UserService:
    """
    Сервис для работы с пользователями.
    Содержит бизнес-логику для CRUD операций с пользователями.
    """

    def __init__(self, session: AsyncSession):
        """
        Инициализация сервиса.

        Args:
            session: Асинхронная сессия базы данных
        """
        self.session = session

    async def create_user(self, user_data: UserCreateSchema) -> UserModel:
        """
        Создать нового пользователя.

        Args:
            user_data: Данные для создания пользователя

        Returns:
            Созданный пользователь

        Raises:
            UsernameAlreadyExistsException: Если имя пользователя уже существует
        """
        try:
            # Проверить, существует ли имя пользователя
            existing_user = await self._get_user_by_username(user_data.username)
            if existing_user:
                raise UsernameAlreadyExistsException(user_data.username)

            existing_email = await self._get_user_by_email(user_data.email)
            if existing_email:
                raise EmailAlreadyExistsException(user_data.email)

            # Создать нового пользователя
            new_user = UserModel(
                username=user_data.username,
                password=user_data.password,
                email=user_data.email,
                user_directions=user_data.user_directions,
                first_name=user_data.first_name,
                last_name=user_data.last_name,
                patronymic=user_data.patronymic,
                cloude_storage=user_data.cloude_storage,
                academic_direction=user_data.academic_direction,
                class_=user_data.class_,
                avg_score=user_data.avg_score
            )

            self.session.add(new_user)
            await self.session.commit()
            await self.session.refresh(new_user)
            return await self.get_user_by_id(new_user.id)

        except IntegrityError as exc:
            await self.session.rollback()
            self._raise_unique_constraint_error(
                exc,
                username=user_data.username,
                email=user_data.email
            )
        except Exception:
            await self.session.rollback()
            raise

    async def get_user_by_id(self, user_id: int) -> UserModel:
        """
        Получить пользователя по ID.

        Args:
            user_id: ID пользователя

        Returns:
            Пользователь

        Raises:
            UserNotFoundException: Если пользователь не найден
        """
        stmt = (
            select(UserModel)
            .options(
                selectinload(UserModel.directions),
                selectinload(UserModel.courses),
                selectinload(UserModel.scientific_achievements),
                selectinload(UserModel.stacks),
            )
            .where(UserModel.id == user_id)
        )
        result = await self.session.execute(stmt)
        user = result.scalars().first()

        if not user:
            raise UserNotFoundException(user_id)
        return user

    async def get_all_users(self, limit: int = 10) -> List[UserModel]:
        """
        Получить всех пользователей.

        Args:
            limit: Максимальное количество пользователей

        Returns:
            Список пользователей
        """
        stmt = (
            select(UserModel)
            .options(
                selectinload(UserModel.directions),
                selectinload(UserModel.courses),
                selectinload(UserModel.scientific_achievements),
                selectinload(UserModel.stacks),
            )
            .order_by(UserModel.created_at.desc())
        )
        if limit != -1:
            stmt = stmt.limit(limit)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def update_user(self, user_id: int, user_data: UserUpdateSchema) -> UserModel:
        """
        Обновить пользователя.

        Args:
            user_id: ID пользователя
            user_data: Данные для обновления

        Returns:
            Обновленный пользователь

        Raises:
            UserNotFoundException: Если пользователь не найден
        """
        try:
            user = await self.get_user_by_id(user_id)

            # Обновить только предоставленные поля
            update_data = user_data.model_dump(exclude_unset=True, by_alias=True)
            if "class" in update_data:
                update_data["class_"] = update_data.pop("class")

            if (
                "email" in update_data
                and update_data["email"] is not None
                and update_data["email"] != user.email
            ):
                existing_email = await self._get_user_by_email(update_data["email"])
                if existing_email and existing_email.id != user.id:
                    raise EmailAlreadyExistsException(update_data["email"])

            for field, value in update_data.items():
                if value is not None:
                    setattr(user, field, value)

            await self.session.commit()
            await self.session.refresh(user)
            return await self.get_user_by_id(user.id)

        except IntegrityError as exc:
            await self.session.rollback()
            self._raise_unique_constraint_error(
                exc,
                username=user.username,
                email=update_data.get("email", user.email)
            )
        except Exception:
            await self.session.rollback()
            raise

    async def delete_user(self, user_id: int) -> None:
        """
        Удалить пользователя.

        Args:
            user_id: ID пользователя

        Raises:
            UserNotFoundException: Если пользователь не найден
        """
        try:
            user = await self.get_user_by_id(user_id)
            await self.session.delete(user)
            await self.session.commit()
        except Exception:
            await self.session.rollback()
            raise

    async def _get_user_by_username(self, username: str) -> Optional[UserModel]:
        """
        Получить пользователя по имени пользователя.

        Args:
            username: Имя пользователя

        Returns:
            Пользователь или None
        """
        stmt = select(UserModel).where(UserModel.username == username)
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def _get_user_by_email(self, email: str) -> Optional[UserModel]:
        """
        Получить пользователя по email.

        Args:
            email: Email пользователя

        Returns:
            Пользователь или None
        """
        stmt = select(UserModel).where(UserModel.email == email)
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def authenticate_user(self, username: str, password: str) -> bool:
        """
        Проверить, существует ли пользователь с данным логином и паролем.

        Args:
            username: Имя пользователя
            password: Пароль пользователя

        Returns:
            True если пользователь найден и пароль совпадает, иначе False
        """
        user = await self._get_user_by_username(username)
        if user and user.password == password:
            return True
        return False

    @staticmethod
    def _raise_unique_constraint_error(
        exc: IntegrityError,
        username: str,
        email: str
    ) -> None:
        """
        Преобразовать ошибку уникальности БД в понятное исключение API.

        Args:
            exc: Ошибка целостности SQLAlchemy
            username: Имя пользователя для сообщения об ошибке
            email: Email для сообщения об ошибке
        """
        error_message = str(getattr(exc, "orig", exc)).lower()
        if "users.email" in error_message or " email" in error_message:
            raise EmailAlreadyExistsException(email) from exc
        raise UsernameAlreadyExistsException(username) from exc
