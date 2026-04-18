"""Authentication service with server-side sessions."""

from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import generate_token, hash_token, verify_password
from app.models import AuthSessionModel, UserModel
from app.schemas import (
    AuthLoginSchema,
    AuthRefreshSchema,
    AuthRegisterSchema,
    AuthSessionSchema,
    UserCreateSchema,
)
from app.services.user_service import UserService


class AuthService:
    """Handle registration, login, refresh, and logout flows."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.user_service = UserService(session)

    async def register(
        self,
        payload: AuthRegisterSchema,
        *,
        user_agent: str | None,
        ip_address: str | None,
    ) -> AuthSessionSchema:
        user_payload = UserCreateSchema.model_validate(
            payload.model_dump(exclude={"remember_me"}, by_alias=True)
        )
        user = await self.user_service.create_user(user_payload)
        return await self._create_session_response(
            user=user,
            remember_me=payload.remember_me,
            user_agent=user_agent,
            ip_address=ip_address,
        )

    async def login(
        self,
        payload: AuthLoginSchema,
        *,
        user_agent: str | None,
        ip_address: str | None,
    ) -> AuthSessionSchema:
        user = await self._find_user_by_login(payload.login)
        if user is None or not verify_password(payload.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username/email or password",
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive",
            )

        return await self._create_session_response(
            user=user,
            remember_me=payload.remember_me,
            user_agent=user_agent,
            ip_address=ip_address,
        )

    async def refresh_session(
        self,
        payload: AuthRefreshSchema,
        *,
        user_agent: str | None,
        ip_address: str | None,
    ) -> AuthSessionSchema:
        refresh_hash = hash_token(payload.refresh_token)
        result = await self.session.execute(
            select(AuthSessionModel).where(
                AuthSessionModel.refresh_token_hash == refresh_hash
            )
        )
        auth_session = result.scalars().first()

        if auth_session is None or auth_session.revoked_at is not None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh session is invalid or has been revoked",
            )

        now = datetime.utcnow()
        if auth_session.refresh_expires_at <= now:
            auth_session.revoked_at = now
            await self.session.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token has expired",
            )

        user = await self.session.get(UserModel, auth_session.user_id)
        if user is None or not user.is_active:
            auth_session.revoked_at = now
            await self.session.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User linked to this session is unavailable",
            )

        access_token = generate_token()
        refresh_token = generate_token()
        access_expires_at = now + timedelta(minutes=settings.access_token_ttl_minutes)
        refresh_days = (
            settings.refresh_token_ttl_days_remember_me
            if auth_session.remember_me
            else settings.refresh_token_ttl_days
        )
        refresh_expires_at = now + timedelta(days=refresh_days)

        auth_session.access_token_hash = hash_token(access_token)
        auth_session.refresh_token_hash = hash_token(refresh_token)
        auth_session.access_expires_at = access_expires_at
        auth_session.refresh_expires_at = refresh_expires_at
        auth_session.last_used_at = now
        auth_session.user_agent = user_agent
        auth_session.ip_address = ip_address
        user.last_login_at = now

        await self.session.commit()
        return AuthSessionSchema(
            access_token=access_token,
            refresh_token=refresh_token,
            access_expires_at=access_expires_at,
            refresh_expires_at=refresh_expires_at,
            user=await self.user_service.get_user_by_id(user.id),
        )

    async def logout_current_session(self, auth_session: AuthSessionModel) -> None:
        auth_session.revoked_at = datetime.utcnow()
        await self.session.commit()

    async def logout_all_user_sessions(self, user_id: int) -> None:
        now = datetime.utcnow()
        await self.session.execute(
            update(AuthSessionModel)
            .where(
                AuthSessionModel.user_id == user_id,
                AuthSessionModel.revoked_at.is_(None),
            )
            .values(revoked_at=now)
        )
        await self.session.commit()

    async def _create_session_response(
        self,
        *,
        user: UserModel,
        remember_me: bool,
        user_agent: str | None,
        ip_address: str | None,
    ) -> AuthSessionSchema:
        now = datetime.utcnow()
        access_token = generate_token()
        refresh_token = generate_token()
        access_expires_at = now + timedelta(minutes=settings.access_token_ttl_minutes)
        refresh_days = (
            settings.refresh_token_ttl_days_remember_me
            if remember_me
            else settings.refresh_token_ttl_days
        )
        refresh_expires_at = now + timedelta(days=refresh_days)

        auth_session = AuthSessionModel(
            user_id=user.id,
            access_token_hash=hash_token(access_token),
            refresh_token_hash=hash_token(refresh_token),
            access_expires_at=access_expires_at,
            refresh_expires_at=refresh_expires_at,
            remember_me=remember_me,
            user_agent=user_agent,
            ip_address=ip_address,
            last_used_at=now,
        )

        user.last_login_at = now
        self.session.add(auth_session)
        await self.session.commit()

        return AuthSessionSchema(
            access_token=access_token,
            refresh_token=refresh_token,
            access_expires_at=access_expires_at,
            refresh_expires_at=refresh_expires_at,
            user=await self.user_service.get_user_by_id(user.id),
        )

    async def _find_user_by_login(self, login: str) -> UserModel | None:
        if "@" in login:
            return await self.user_service.get_user_by_email(login.lower())
        return await self.user_service.get_user_by_username(login)
