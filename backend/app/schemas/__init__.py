"""
Portfolio Backend API - Pydantic Schemas

Этот модуль содержит все Pydantic схемы для валидации данных API,
сериализации и документации.
"""

from typing import List
from datetime import datetime
from pydantic import BaseModel, Field


# --- Схемы направлений ---

class UserDirectionCreateSchema(BaseModel):
    """
    Схема для создания нового направления пользователя.

    Поля:
    - other_directions: Дополнительное академическое направление
    """
    other_directions: str = Field(..., min_length=1, max_length=150)


class UserDirectionSchema(UserDirectionCreateSchema):
    """
    Схема для возврата данных направления из API.
    Включает все поля плюс ID.
    """
    id: int

    class Config:
        from_attributes = True


# --- Схемы курсов ---

class UserCourseCreateSchema(BaseModel):
    """
    Схема для создания нового курса пользователя.

    Поля:
    - name_course: Название/заголовок курса
    - url_course: URL ссылка на курс или сертификат
    """
    name_course: str = Field(..., min_length=1, max_length=200)
    url_course: str = Field(..., min_length=1, max_length=500)


class UserCourseSchema(UserCourseCreateSchema):
    """
    Схема для возврата данных курса из API.
    Включает все поля плюс ID.
    """
    id: int

    class Config:
        from_attributes = True


# --- Схемы научных достижений ---

class UserScientificAchievementCreateSchema(BaseModel):
    """
    Схема для создания нового научного достижения.

    Поля:
    - name: Название/заголовок достижения
    - type: Тип достижения (публикация, награда, презентация и т.д.)
    - date: Дата достижения
    """
    name: str = Field(..., min_length=1, max_length=300)
    type: str = Field(..., min_length=1, max_length=100)
    date: datetime


class UserScientificAchievementSchema(UserScientificAchievementCreateSchema):
    """
    Схема для возврата данных научного достижения из API.
    Включает все поля плюс ID.
    """
    id: int

    class Config:
        from_attributes = True


# --- Схемы пользователей ---

class UserCreateSchema(BaseModel):
    """
    Схема для создания нового пользователя.

    Поля:
    - username: Уникальное имя пользователя для аутентификации
    - password: Пароль пользователя
    - email: Email пользователя
    - first_name: Имя пользователя
    - last_name: Фамилия пользователя
    - patronymic: Отчество пользователя (среднее имя)
    - cloude_storage: URL облачного хранилища (GitHub, GitLab и т.д.)
    - academic_direction: Основная академическая специализация
    - user_directions: Одно академическое направление пользователя
    - class_: Номер класса/группы
    - avg_score: Средний академический балл/GPA (от 0 до 100)
    """
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6, max_length=255)
    email: str = Field(..., min_length=5, max_length=255)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    patronymic: str = Field(None, max_length=100)
    cloude_storage: str = Field(None, max_length=255)
    academic_direction: str = Field(..., max_length=150)
    user_directions: str | None = Field(None, max_length=500)
    class_: str = Field(..., alias="class", max_length=50)
    avg_score: float = Field(..., ge=0, le=100)

    class Config:
        populate_by_name = True


class UserUpdateSchema(BaseModel):
    """
    Схема для обновления информации о пользователе.
    Все поля опциональны для поддержки частичных обновлений.
    """
    password: str = Field(None, min_length=6, max_length=255)
    email: str = Field(None, min_length=5, max_length=255)
    first_name: str = Field(None, min_length=1, max_length=100)
    last_name: str = Field(None, min_length=1, max_length=100)
    patronymic: str = Field(None, max_length=100)
    cloude_storage: str = Field(None, max_length=255)
    academic_direction: str = Field(None, min_length=1, max_length=150)
    user_directions: str | None = Field(None, max_length=500)
    class_: str = Field(None, alias="class", min_length=1, max_length=50)
    avg_score: float = Field(None, ge=0, le=100)

    class Config:
        populate_by_name = True


# --- Схемы стеков ---

class UserStackCreateSchema(BaseModel):
    """
    Схема для создания нового стека пользователя.

    Поля:
    - stack: Название технологического стека/языка программирования
    """
    stack: str = Field(..., min_length=1, max_length=100)


class UserStackSchema(UserStackCreateSchema):
    """
    Схема для возврата данных стека из API.
    Включает все поля плюс ID.
    """
    id: int

    class Config:
        from_attributes = True


class UserSchema(BaseModel):
    """
    Схема для возврата полных данных пользователя из API.
    Включает все поля пользователя плюс связанные данные (направления, курсы, достижения, стеки).
    """
    id: int
    username: str
    password: str
    email: str
    user_directions: str | None
    first_name: str
    last_name: str
    patronymic: str | None
    cloude_storage: str | None
    academic_direction: str
    class_: str = Field(alias="class_")
    avg_score: float
    directions: List[UserDirectionSchema] = Field(default_factory=list)
    courses: List[UserCourseSchema] = Field(default_factory=list)
    scientific_achievements: List[UserScientificAchievementSchema] = Field(default_factory=list)
    stacks: List[UserStackSchema] = Field(default_factory=list)

    class Config:
        from_attributes = True
        populate_by_name = True


# --- Схемы аутентификации ---

class UserLoginSchema(BaseModel):
    """
    Схема для проверки логина и пароля пользователя.

    Поля:
    - username: Имя пользователя (логин)
    - password: Пароль пользователя
    """
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6, max_length=255)


class UserEmailLoginSchema(BaseModel):
    """
    Схема для проверки email и пароля пользователя.

    Поля:
    - email: Email пользователя
    - password: Пароль пользователя
    """
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=6, max_length=255)


class UsernameCheckSchema(BaseModel):
    """
    Схема для проверки занятости username.

    Поля:
    - username: Имя пользователя
    """
    username: str = Field(..., min_length=3, max_length=50)


class EmailCheckSchema(BaseModel):
    """
    Схема для проверки занятости email.

    Поля:
    - email: Email пользователя
    """
    email: str = Field(..., min_length=5, max_length=255)
