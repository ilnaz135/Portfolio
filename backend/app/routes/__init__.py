"""
Portfolio Backend API - Routes Package

Этот модуль объединяет все маршруты приложения.
"""

from fastapi import APIRouter

from .system import router as system_router
from .users import router as users_router
from .directions import router as directions_router
from .courses import router as courses_router
from .achievements import router as achievements_router
from .stacks import router as stacks_router

# Создаем основной роутер для всех API маршрутов
api_router = APIRouter()

# Включаем все подроутеры с соответствующими префиксами
api_router.include_router(system_router)
api_router.include_router(users_router, prefix="/users")
api_router.include_router(directions_router, prefix="/users")
api_router.include_router(courses_router, prefix="/users")
api_router.include_router(achievements_router, prefix="/users")
api_router.include_router(stacks_router, prefix="/users")