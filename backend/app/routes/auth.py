"""Authentication routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentSessionDep, CurrentUserDep, get_request_metadata
from app.core.database import get_db_session
from app.schemas import (
    AuthLoginSchema,
    AuthRefreshSchema,
    AuthRegisterSchema,
    AuthSessionSchema,
    UserSchema,
)
from app.services.auth_service import AuthService
from app.services.user_service import UserService

router = APIRouter()
SessionDep = Depends(get_db_session)


@router.post("/register", response_model=AuthSessionSchema, status_code=status.HTTP_201_CREATED)
async def register(
    payload: AuthRegisterSchema,
    request: Request,
    session: AsyncSession = SessionDep,
) -> AuthSessionSchema:
    user_agent, ip_address = get_request_metadata(request)
    auth_service = AuthService(session)
    return await auth_service.register(
        payload,
        user_agent=user_agent,
        ip_address=ip_address,
    )


@router.post("/login", response_model=AuthSessionSchema)
async def login(
    payload: AuthLoginSchema,
    request: Request,
    session: AsyncSession = SessionDep,
) -> AuthSessionSchema:
    user_agent, ip_address = get_request_metadata(request)
    auth_service = AuthService(session)
    return await auth_service.login(
        payload,
        user_agent=user_agent,
        ip_address=ip_address,
    )


@router.post("/refresh", response_model=AuthSessionSchema)
async def refresh(
    payload: AuthRefreshSchema,
    request: Request,
    session: AsyncSession = SessionDep,
) -> AuthSessionSchema:
    user_agent, ip_address = get_request_metadata(request)
    auth_service = AuthService(session)
    return await auth_service.refresh_session(
        payload,
        user_agent=user_agent,
        ip_address=ip_address,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    current_session: CurrentSessionDep,
    session: AsyncSession = SessionDep,
) -> Response:
    await AuthService(session).logout_current_session(current_session)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/logout-all", status_code=status.HTTP_204_NO_CONTENT)
async def logout_all(
    current_user: CurrentUserDep,
    session: AsyncSession = SessionDep,
) -> Response:
    await AuthService(session).logout_all_user_sessions(current_user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me", response_model=UserSchema)
async def get_current_profile(
    current_user: CurrentUserDep,
    session: AsyncSession = SessionDep,
) -> UserSchema:
    return await UserService(session).get_user_by_id(current_user.id)
