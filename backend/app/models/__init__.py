"""
Модели базы данных SQLAlchemy.

Этот модуль содержит все модели данных для приложения портфолио.
"""

from datetime import datetime
from typing import List

from sqlalchemy import String, Integer, Float, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class UserModel(Base):
    """
    Таблица пользователей - хранит основную информацию о профиле пользователя.

    Поля:
    - id: Первичный ключ, уникальный идентификатор пользователя
    - username: Уникальное имя пользователя для входа
    - password: Пароль пользователя
    - user_directions: Академические направления пользователя
    - first_name: Имя пользователя
    - last_name: Фамилия пользователя
    - patronymic: Отчество пользователя (среднее имя)
    - cloude_storage: Ссылка на облачное хранилище (например, GitHub, GitLab)
    - academic_direction: Основная академическая специализация пользователя
    - class_: Номер класса/группы в университете
    - avg_score: Средний академический балл/GPA (от 0 до 100)
    - created_at: Дата и время создания записи

    Связи:
    - directions: Связь один-ко-многим с UserDirectionModel
    - courses: Связь один-ко-многим с UserCourseModel
    - scientific_achievements: Связь один-ко-многим с UserScientificAchievementModel
    - stacks: Связь один-ко-многим с UserStackModel
    """
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    password: Mapped[str] = mapped_column(String(255), nullable=False)
    user_directions: Mapped[str] = mapped_column(Text, nullable=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    patronymic: Mapped[str] = mapped_column(String(100), nullable=True)
    cloude_storage: Mapped[str] = mapped_column(String(255), nullable=True)
    academic_direction: Mapped[str] = mapped_column(String(150), nullable=False)
    class_: Mapped[str] = mapped_column("class", String(50), nullable=False)
    avg_score: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Связи с другими таблицами
    directions: Mapped[List["UserDirectionModel"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan"
    )
    courses: Mapped[List["UserCourseModel"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan"
    )
    scientific_achievements: Mapped[List["UserScientificAchievementModel"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan"
    )
    stacks: Mapped[List["UserStackModel"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan"
    )


class UserDirectionModel(Base):
    """
    Таблица направлений пользователей - хранит дополнительные академические направления для каждого пользователя.
    Несколько направлений могут быть связаны с одним пользователем.

    Поля:
    - id: Первичный ключ
    - user_id: Внешний ключ, ссылка на таблицу users
    - other_directions: Дополнительное академическое направление/специализация
    - created_at: Дата и время создания записи

    Связи:
    - user: Связь многие-к-одному с UserModel
    """
    __tablename__ = "users_directions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    other_directions: Mapped[str] = mapped_column(String(150), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Связь обратно к User
    user: Mapped["UserModel"] = relationship(back_populates="directions")


class UserCourseModel(Base):
    """
    Таблица курсов пользователей - отслеживает все курсы, завершенные пользователем.

    Поля:
    - id: Первичный ключ
    - user_id: Внешний ключ, ссылка на таблицу users
    - name_course: Название/заголовок курса
    - url_course: URL ссылка на курс или сертификат курса
    - created_at: Дата и время создания записи

    Связи:
    - user: Связь многие-к-одному с UserModel
    """
    __tablename__ = "users_courses"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    name_course: Mapped[str] = mapped_column(String(200), nullable=False)
    url_course: Mapped[str] = mapped_column(String(500), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Связь обратно к User
    user: Mapped["UserModel"] = relationship(back_populates="courses")


class UserScientificAchievementModel(Base):
    """
    Таблица научных достижений пользователей - записывает научные публикации,
    презентации, награды и другие исследовательские достижения.

    Поля:
    - id: Первичный ключ
    - user_id: Внешний ключ, ссылка на таблицу users
    - name: Название/заголовок достижения
    - type: Тип достижения (например, "публикация", "награда", "презентация", "патент")
    - date: Дата получения достижения
    - created_at: Дата и время создания записи

    Связи:
    - user: Связь многие-к-одному с UserModel
    """
    __tablename__ = "users_scientific_achievements"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    name: Mapped[str] = mapped_column(String(300), nullable=False)
    type: Mapped[str] = mapped_column(String(100), nullable=False)
    date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Связь обратно к User
    user: Mapped["UserModel"] = relationship(back_populates="scientific_achievements")


class UserStackModel(Base):
    """
    Таблица стеков технологий пользователей - хранит технологические стеки,
    которыми обладает каждый пользователь.

    Поля:
    - id: Первичный ключ
    - user_id: Внешний ключ, ссылка на таблицу users
    - stack: Название технологического стека/языка программирования
    - created_at: Дата и время создания записи

    Связи:
    - user: Связь многие-к-одному с UserModel
    """
    __tablename__ = "users_stack"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    stack: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Связь обратно к User
    user: Mapped["UserModel"] = relationship(back_populates="stacks")