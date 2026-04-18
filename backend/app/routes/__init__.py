"""API route registry."""

from fastapi import APIRouter

from .achievements import router as achievements_router
from .auth import router as auth_router
from .courses import router as courses_router
from .directions import router as directions_router
from .stacks import router as stacks_router
from .system import router as system_router
from .users import router as users_router

api_router = APIRouter()

api_router.include_router(system_router)
api_router.include_router(auth_router, prefix="/auth", tags=["Auth"])
api_router.include_router(users_router, prefix="/users", tags=["Users"])
api_router.include_router(directions_router, prefix="/users", tags=["Directions"])
api_router.include_router(courses_router, prefix="/users", tags=["Courses"])
api_router.include_router(achievements_router, prefix="/users", tags=["Achievements"])
api_router.include_router(stacks_router, prefix="/users", tags=["Stacks"])
