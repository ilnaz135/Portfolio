"""
Обработка ошибок и исключений.

Этот модуль содержит пользовательские исключения и обработчики ошибок
для FastAPI приложения.
"""

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError, SQLAlchemyError


class PortfolioException(Exception):
    """
    Базовое исключение для приложения портфолио.
    """

    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class UserNotFoundException(PortfolioException):
    """Исключение, когда пользователь не найден."""

    def __init__(self, user_id: int):
        super().__init__(f"Пользователь с ID {user_id} не найден", 404)


class UsernameAlreadyExistsException(PortfolioException):
    """Исключение, когда имя пользователя уже существует."""

    def __init__(self, username: str):
        super().__init__(f"Имя пользователя '{username}' уже существует", 400)


class EmailAlreadyExistsException(PortfolioException):
    """Исключение, когда email уже существует."""

    def __init__(self, email: str):
        super().__init__(f"Email '{email}' уже существует", 400)


class DirectionNotFoundException(PortfolioException):
    """Исключение, когда направление не найдено."""

    def __init__(self, direction_id: int):
        super().__init__(f"Направление с ID {direction_id} не найдено", 404)


class CourseNotFoundException(PortfolioException):
    """Исключение, когда курс не найден."""

    def __init__(self, course_id: int):
        super().__init__(f"Курс с ID {course_id} не найден", 404)


class AchievementNotFoundException(PortfolioException):
    """Исключение, когда достижение не найдено."""

    def __init__(self, achievement_id: int):
        super().__init__(f"Достижение с ID {achievement_id} не найдено", 404)


class StackAlreadyExistsException(PortfolioException):
    """Исключение, когда стек уже существует у пользователя."""

    def __init__(self, stack_name: str):
        super().__init__(f"Стек '{stack_name}' уже существует у пользователя", 400)


async def portfolio_exception_handler(request: Request, exc: PortfolioException):
    """
    Обработчик пользовательских исключений портфолио.

    Args:
        request: HTTP запрос
        exc: Исключение PortfolioException

    Returns:
        JSONResponse с деталями ошибки
    """
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message}
    )


async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    """
    Обработчик исключений SQLAlchemy.

    Args:
        request: HTTP запрос
        exc: Исключение SQLAlchemy

    Returns:
        JSONResponse с деталями ошибки базы данных
    """
    if isinstance(exc, IntegrityError):
        return JSONResponse(
            status_code=400,
            content={"detail": "Ошибка целостности данных. Проверьте корректность введенных данных."}
        )

    return JSONResponse(
        status_code=500,
        content={"detail": "Внутренняя ошибка базы данных"}
    )


async def general_exception_handler(request: Request, exc: Exception):
    """
    Обработчик общих исключений.

    Args:
        request: HTTP запрос
        exc: Общее исключение

    Returns:
        JSONResponse с деталями общей ошибки
    """
    return JSONResponse(
        status_code=500,
        content={"detail": "Внутренняя ошибка сервера"}
    )
