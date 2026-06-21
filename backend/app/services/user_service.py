"""User service layer."""

from __future__ import annotations

import json
import random
from datetime import date
from pathlib import Path
from typing import List

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import (
    EmailAlreadyExistsException,
    UserNotFoundException,
    UsernameAlreadyExistsException,
)
from app.core.security import hash_password
from app.models import (
    UserCourseModel,
    UserEventModel,
    UserModel,
    UserPublicationModel,
)
from app.schemas import UserCreateSchema, UserUpdateSchema


COURSE_CATALOG_PATH = Path(__file__).resolve().parents[2] / "course_difficulty_scores_Ru.json"
STARTER_COURSE_COUNT = 4

PROFILE_GENERATION_VARIANTS = [
    ("Информатика и вычислительная техника", "Машинное обучение"),
    ("Программная инженерия", "Фронтенд-разработка"),
    ("Компьютерные науки", "Системное программирование"),
    ("Информационные системы", "Базы данных"),
    ("Искусственный интеллект", "Нейронные сети"),
    ("Веб-разработка", "Веб-дизайн"),
    ("Облачные технологии", "Микросервисы"),
    ("Бэкенд-разработка", "API-разработка"),
]

PROFILE_GENERATION_CLASSES = [
    "1 курс",
    "2 курс",
    "3 курс",
    "4 курс",
]

PROFILE_GENERATION_GROUPS = {
    "1 курс": ["RI-101", "RI-102"],
    "2 курс": ["RI-201", "RI-202"],
    "3 курс": ["RI-301", "RI-302"],
    "4 курс": ["RI-401", "RI-402"],
}

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
    """Business logic for user CRUD."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_user(self, user_data: UserCreateSchema) -> UserModel:
        try:
            user_data = self._apply_generated_profile_defaults(user_data)

            existing_user = await self.get_user_by_username(user_data.username)
            if existing_user:
                raise UsernameAlreadyExistsException(user_data.username)

            existing_email = await self.get_user_by_email(user_data.email)
            if existing_email:
                raise EmailAlreadyExistsException(user_data.email)

            new_user = UserModel(
                username=user_data.username,
                password="__legacy_hidden__",
                password_hash=hash_password(user_data.password),
                email=user_data.email.lower(),
                user_directions=user_data.user_directions,
                first_name=user_data.first_name,
                last_name=user_data.last_name,
                patronymic=user_data.patronymic,
                cloude_storage=user_data.cloude_storage,
                avatar_data_url=user_data.avatar_data_url,
                academic_direction=user_data.academic_direction,
                class_=user_data.class_,
                group=user_data.group.strip() or "unknown",
                avg_score=user_data.avg_score,
                onboarding_completed=user_data.onboarding_completed,
            )

            self.session.add(new_user)
            await self.session.flush()
            self._seed_new_user_courses(new_user)
            self._seed_new_user_achievements(new_user)
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

    async def get_students(self, limit: int = -1) -> List[UserModel]:
        stmt = (
            select(UserModel)
            .options(*USER_RELATION_LOADS)
            .where(UserModel.is_active.is_(True))
            .order_by(UserModel.last_name.asc(), UserModel.first_name.asc(), UserModel.id.asc())
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
                "username" in update_data
                and update_data["username"] is not None
                and update_data["username"] != user.username
            ):
                existing_user = await self.get_user_by_username(update_data["username"])
                if existing_user and existing_user.id != user.id:
                    raise UsernameAlreadyExistsException(update_data["username"])

            if (
                "email" in update_data
                and update_data["email"] is not None
                and update_data["email"].lower() != user.email
            ):
                normalized_email = update_data["email"].lower()
                existing_email = await self.get_user_by_email(normalized_email)
                if existing_email and existing_email.id != user.id:
                    raise EmailAlreadyExistsException(normalized_email)
                update_data["email"] = normalized_email

            password = update_data.pop("password", None)
            if password:
                user.password_hash = hash_password(password)
                user.password = "__legacy_hidden__"

            if "group" in update_data and update_data["group"] is not None:
                update_data["group"] = update_data["group"].strip() or "unknown"

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

    async def username_exists(self, username: str) -> bool:
        user = await self.get_user_by_username(username)
        return user is not None

    async def email_exists(self, email: str) -> bool:
        user = await self.get_user_by_email(email.lower())
        return user is not None

    async def get_user_by_username(self, username: str) -> UserModel | None:
        stmt = select(UserModel).where(UserModel.username == username)
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def get_user_by_email(self, email: str) -> UserModel | None:
        stmt = select(UserModel).where(UserModel.email == email.lower())
        result = await self.session.execute(stmt)
        return result.scalars().first()

    @staticmethod
    def _apply_generated_profile_defaults(user_data: UserCreateSchema) -> UserCreateSchema:
        if not UserService._should_generate_profile_defaults(user_data):
            return user_data

        academic_direction, generated_focus = random.choice(PROFILE_GENERATION_VARIANTS)
        generated_class = random.choice(PROFILE_GENERATION_CLASSES)
        generated_group = random.choice(PROFILE_GENERATION_GROUPS[generated_class])
        generated_avg_score = round(random.uniform(70.0, 100.0), 1)

        return user_data.model_copy(
            update={
                "academic_direction": academic_direction,
                "user_directions": generated_focus,
                "class_": generated_class,
                "group": generated_group,
                "avg_score": generated_avg_score,
            }
        )

    @staticmethod
    def _should_generate_profile_defaults(user_data: UserCreateSchema) -> bool:
        return (
            user_data.academic_direction.strip() == ""
            and (user_data.user_directions or "").strip() == ""
            and user_data.class_.strip() == ""
            and user_data.group.strip() == ""
            and user_data.avg_score == 0.0
        )

    def _seed_new_user_courses(self, user: UserModel) -> None:
        catalog = self._load_course_catalog()
        if not catalog:
            return

        start_index = (int(user.id) * 7) % len(catalog)
        selected_courses: list[dict] = []
        seen: set[int | str] = set()

        for offset in range(len(catalog)):
            item = catalog[(start_index + offset * 13) % len(catalog)]
            course_name = str(item.get("course") or "").strip()
            if not course_name:
                continue

            key = item.get("id") or course_name
            if key in seen:
                continue

            seen.add(key)
            selected_courses.append(item)
            if len(selected_courses) >= STARTER_COURSE_COUNT:
                break

        for item in selected_courses:
            course_name = str(item.get("course") or "").strip()
            if not course_name:
                continue

            try:
                difficulty = float(item.get("difficulty") or 0)
            except (TypeError, ValueError):
                difficulty = 0.0

            course = UserCourseModel(
                user_id=user.id,
                catalog_id=item.get("id"),
                degree=item.get("degree"),
                program=item.get("program"),
                course=course_name,
                name_course=course_name,
                url_course="",
                difficulty=difficulty,
            )
            course.specializations = [
                str(value).strip()
                for value in item.get("specializations", [])
                if str(value).strip()
            ]
            self.session.add(course)

    def _seed_new_user_achievements(self, user: UserModel) -> None:
        self.session.add_all(
            [
                UserPublicationModel(
                    user_id=user.id,
                    placement_date=date(2025, 11, 12),
                    title="Исследование цифрового портфолио студента",
                    publication_type="Статья в сборнике",
                    indexation_date=date(2025, 12, 4),
                    status="Принято",
                    points=18,
                ),
                UserEventModel(
                    user_id=user.id,
                    placement_date=date(2026, 2, 20),
                    title="Доклад на студенческой научной конференции",
                    event_type="Конференция",
                    event_date="20.02.2026",
                    status="Участник",
                    points=12,
                ),
            ]
        )

    @staticmethod
    def _load_course_catalog() -> list[dict]:
        try:
            with COURSE_CATALOG_PATH.open("r", encoding="utf-8") as catalog_file:
                data = json.load(catalog_file)
        except (FileNotFoundError, json.JSONDecodeError):
            return []

        if not isinstance(data, list):
            return []
        return [item for item in data if isinstance(item, dict) and item.get("course")]

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
