"""Authentication and authorization helpers."""

from __future__ import annotations

from datetime import datetime
from typing import Annotated

from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.core.security import hash_token
from app.models import AuthSessionModel, UserModel


def parse_bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
        )

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format",
        )

    return token


async def get_current_session(
    authorization: str | None = Header(default=None),
    session: AsyncSession = Depends(get_db_session),
) -> AuthSessionModel:
    token = parse_bearer_token(authorization)
    token_hash = hash_token(token)

    result = await session.execute(
        select(AuthSessionModel).where(AuthSessionModel.access_token_hash == token_hash)
    )
    auth_session = result.scalars().first()

    if auth_session is None or auth_session.revoked_at is not None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session is invalid or has been revoked",
        )

    if auth_session.access_expires_at <= datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access token has expired",
        )

    return auth_session


async def get_current_user(
    current_session: AuthSessionModel = Depends(get_current_session),
    session: AsyncSession = Depends(get_db_session),
) -> UserModel:
    user = await session.get(UserModel, current_session.user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User linked to this session was not found",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    return user


CurrentSessionDep = Annotated[AuthSessionModel, Depends(get_current_session)]
CurrentUserDep = Annotated[UserModel, Depends(get_current_user)]


def authorize_user_access(user_id: int, current_user: UserModel) -> None:
    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this user resource",
        )


def authorize_record_owner(record_user_id: int, current_user: UserModel) -> None:
    if current_user.role != "admin" and current_user.id != record_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this record",
        )


def require_admin(current_user: UserModel) -> None:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator permissions are required",
        )


def get_request_metadata(request: Request) -> tuple[str | None, str | None]:
    return request.headers.get("user-agent"), request.client.host if request.client else None
