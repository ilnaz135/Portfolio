"""User service layer."""

from __future__ import annotations

import random
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import (
    EmailAlreadyExistsException,
    UserNotFoundException,
    UsernameAlreadyExistsException,
)
from app.models import UserModel
from app.schemas import UserCreateSchema, UserUpdateSchema


PROFILE_GENERATION_VARIANTS = [
    ("Информатика и вычислительная техника", "Машинное обучение"),
    ("Программная инженерия", "Фронтенд-разработка"),
    ("Компьютерные науки", "Системное программирование"),
    ("Информационные системы", "Базы данных"),
    ("Искусственный интеллект", "Нейронные сети"),
    ("Веб-разработка", "Веб-дизайн"),
    ("Облачные технологии", "Микросервисы"),
    ("Бэкенд-разработка", "API разработка"),
]

PROFILE_GENERATION_CLASSES = [
    "1 курс",
    "2 курс",
    "3 курс",
    "4 курс",
]

USER_RELATION_LOADS = (
    selectinload(UserModel.directions),
    selectinload(UserModel.courses),
    selectinload(UserModel.publications),
    selectinload(UserModel.events),
    selectinload(UserModel.grants),
    selectinload(UserModel.intellectual_properties),
    selectinload(UserModel.innovations),
    selectinload(UserModel.scholarships),
    selectinload(UserModel.internships),
    selectinload(UserModel.stacks),
)


class UserService:
    """Business logic for user CRUD and authentication."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_user(self, user_data: UserCreateSchema) -> UserModel:
        try:
            user_data = self._apply_generated_profile_defaults(user_data)

            existing_user = await self._get_user_by_username(user_data.username)
            if existing_user:
                raise UsernameAlreadyExistsException(user_data.username)

            existing_email = await self._get_user_by_email(user_data.email)
            if existing_email:
                raise EmailAlreadyExistsException(user_data.email)

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
                avg_score=user_data.avg_score,
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
                email=user_data.email,
            )
        except Exception:
            await self.session.rollback()
            raise

    async def get_user_by_id(self, user_id: int) -> UserModel:
        stmt = (
            select(UserModel)
            .options(*USER_RELATION_LOADS)
            .where(UserModel.id == user_id)
        )
        result = await self.session.execute(stmt)
        user = result.scalars().first()

        if not user:
            raise UserNotFoundException(user_id)
        return user

    async def get_all_users(self, limit: int = 10) -> List[UserModel]:
        stmt = (
            select(UserModel)
            .options(*USER_RELATION_LOADS)
            .order_by(UserModel.created_at.desc())
        )
        if limit != -1:
            stmt = stmt.limit(limit)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def update_user(self, user_id: int, user_data: UserUpdateSchema) -> UserModel:
        try:
            user = await self.get_user_by_id(user_id)
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
                email=update_data.get("email", user.email),
            )
        except Exception:
            await self.session.rollback()
            raise

    async def delete_user(self, user_id: int) -> None:
        try:
            user = await self.get_user_by_id(user_id)
            await self.session.delete(user)
            await self.session.commit()
        except Exception:
            await self.session.rollback()
            raise

    async def authenticate_user(self, username: str, password: str) -> int:
        user = await self._get_user_by_username(username)
        if user and user.password == password:
            return user.id
        return -1

    async def authenticate_user_by_email(self, email: str, password: str) -> int:
        user = await self._get_user_by_email(email)
        if user and user.password == password:
            return user.id
        return -1

    async def username_exists(self, username: str) -> bool:
        user = await self._get_user_by_username(username)
        return user is not None

    async def email_exists(self, email: str) -> bool:
        user = await self._get_user_by_email(email)
        return user is not None

    async def _get_user_by_username(self, username: str) -> Optional[UserModel]:
        stmt = select(UserModel).where(UserModel.username == username)
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def _get_user_by_email(self, email: str) -> Optional[UserModel]:
        stmt = select(UserModel).where(UserModel.email == email)
        result = await self.session.execute(stmt)
        return result.scalars().first()

    @staticmethod
    def _apply_generated_profile_defaults(user_data: UserCreateSchema) -> UserCreateSchema:
        if not UserService._should_generate_profile_defaults(user_data):
            return user_data

        academic_direction, _ = random.choice(PROFILE_GENERATION_VARIANTS)
        generated_class = random.choice(PROFILE_GENERATION_CLASSES)
        generated_avg_score = round(random.uniform(70.0, 100.0), 1)

        return user_data.model_copy(
            update={
                "academic_direction": academic_direction,
                "class_": generated_class,
                "avg_score": generated_avg_score,
            }
        )

    @staticmethod
    def _should_generate_profile_defaults(user_data: UserCreateSchema) -> bool:
        return (
            user_data.academic_direction.strip() == ""
            and (user_data.user_directions or "").strip() == ""
            and user_data.class_.strip() == ""
            and user_data.avg_score == 0.0
        )

    @staticmethod
    def _raise_unique_constraint_error(
        exc: IntegrityError,
        username: str,
        email: str,
    ) -> None:
        error_message = str(getattr(exc, "orig", exc)).lower()
        if "users.email" in error_message or " email" in error_message:
            raise EmailAlreadyExistsException(email) from exc
        raise UsernameAlreadyExistsException(username) from exc
