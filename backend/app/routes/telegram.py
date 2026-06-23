"""Telegram bot webhook routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db_session
from app.services.telegram_service import handle_telegram_update

router = APIRouter()
SessionDep = Depends(get_db_session)


@router.post("/webhook")
async def telegram_webhook(
    request: Request,
    session: AsyncSession = SessionDep,
) -> Response:
    if settings.telegram_webhook_secret:
        secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token")
        if secret != settings.telegram_webhook_secret:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid Telegram webhook secret")

    payload = await request.json()
    await handle_telegram_update(session, payload)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
