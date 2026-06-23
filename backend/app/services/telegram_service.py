"""Telegram bot integration for site notifications and account binding."""

from __future__ import annotations

import asyncio
import json
import logging
import secrets
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import (
    NotificationModel,
    TelegramBotStateModel,
    TelegramLinkCodeModel,
    UserModel,
)
from app.services.user_service import normalize_telegram_username


logger = logging.getLogger(__name__)

REGISTER_BUTTON_TEXT = "Регистрация"
STATE_IDLE = "idle"
STATE_AWAITING_SITE_USERNAME = "awaiting_site_username"
STATE_AWAITING_CODE = "awaiting_code"


def is_telegram_configured() -> bool:
    return bool(settings.telegram_bot_token.strip())


def build_public_site_link(link: str | None) -> str:
    normalized_link = str(link or "").strip()
    if not normalized_link or normalized_link == "#":
        return ""

    parsed_link = urllib.parse.urlparse(normalized_link)
    if parsed_link.scheme and parsed_link.netloc:
        return normalized_link

    base_url = settings.public_site_url.strip().rstrip("/")
    if not base_url:
        return normalized_link

    parsed_base = urllib.parse.urlparse(base_url)
    if not parsed_base.scheme:
        base_url = f"https://{base_url}"

    return urllib.parse.urljoin(f"{base_url}/", normalized_link.lstrip("/"))


async def call_telegram_api_json(
    method: str,
    payload: dict[str, Any],
    *,
    timeout: int = 10,
) -> dict[str, Any] | None:
    if not is_telegram_configured():
        return None

    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/{method}"
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")

    def send_request() -> dict[str, Any] | None:
        request = urllib.request.Request(
            url,
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                if not 200 <= response.status < 300:
                    return None
                return json.loads(response.read().decode("utf-8"))
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
            logger.warning("Telegram API request failed for %s: %s", method, error)
            return None

    return await asyncio.to_thread(send_request)


async def call_telegram_api(method: str, payload: dict[str, Any]) -> bool:
    data = await call_telegram_api_json(method, payload)
    return bool(data and data.get("ok"))


async def send_telegram_message(
    chat_id: str,
    text: str,
    *,
    reply_markup: dict[str, Any] | None = None,
) -> bool:
    payload: dict[str, Any] = {
        "chat_id": chat_id,
        "text": text,
        "disable_web_page_preview": True,
    }
    if reply_markup:
        payload["reply_markup"] = reply_markup
    return await call_telegram_api("sendMessage", payload)


async def send_user_notification_to_telegram(
    user: UserModel,
    text: str,
    link: str | None = None,
) -> bool:
    if not user.telegram_chat_id:
        return False

    message = text.strip()
    if link and link != "#":
        message_link = build_public_site_link(link)
        if message_link:
            message = f"{message}\n\nСсылка: {message_link}"
    return await send_telegram_message(user.telegram_chat_id, message)


def start_keyboard() -> dict[str, Any]:
    return {
        "keyboard": [[{"text": REGISTER_BUTTON_TEXT}]],
        "resize_keyboard": True,
        "one_time_keyboard": False,
    }


async def get_or_create_bot_state(
    session: AsyncSession,
    *,
    chat_id: str,
    telegram_user_id: str | None,
    telegram_username: str | None,
) -> TelegramBotStateModel:
    result = await session.execute(
        select(TelegramBotStateModel).where(TelegramBotStateModel.chat_id == chat_id)
    )
    state = result.scalars().first()
    now = datetime.utcnow()

    if state is None:
        state = TelegramBotStateModel(
            chat_id=chat_id,
            telegram_user_id=telegram_user_id,
            telegram_username=telegram_username,
            state=STATE_IDLE,
            updated_at=now,
        )
        session.add(state)
        await session.flush()
        return state

    state.telegram_user_id = telegram_user_id
    state.telegram_username = telegram_username
    state.updated_at = now
    return state


async def generate_unique_link_code(session: AsyncSession) -> str:
    now = datetime.utcnow()
    for _ in range(100):
        code = f"{secrets.randbelow(1_000_000):06d}"
        result = await session.execute(
            select(TelegramLinkCodeModel.id).where(
                TelegramLinkCodeModel.code == code,
                TelegramLinkCodeModel.consumed_at.is_(None),
                TelegramLinkCodeModel.expires_at > now,
            )
        )
        if result.scalars().first() is None:
            return code

    raise RuntimeError("Unable to generate unique Telegram binding code")


async def expire_previous_codes(
    session: AsyncSession,
    *,
    user_id: int,
    chat_id: str,
) -> None:
    now = datetime.utcnow()
    await session.execute(
        update(TelegramLinkCodeModel)
        .where(
            TelegramLinkCodeModel.consumed_at.is_(None),
            (
                (TelegramLinkCodeModel.user_id == user_id)
                | (TelegramLinkCodeModel.chat_id == chat_id)
            ),
        )
        .values(consumed_at=now)
    )


async def send_start_message(chat_id: str) -> None:
    await send_telegram_message(
        chat_id,
        "Нажмите «Регистрация», чтобы привязать Telegram к профилю на сайте.",
        reply_markup=start_keyboard(),
    )


async def request_site_username(
    session: AsyncSession,
    state: TelegramBotStateModel,
) -> None:
    state.state = STATE_AWAITING_SITE_USERNAME
    state.site_username = None
    state.pending_code_id = None
    state.attempts = 0
    state.updated_at = datetime.utcnow()
    await session.commit()
    await send_telegram_message(
        state.chat_id,
        "Введите username вашего профиля на сайте.",
        reply_markup=start_keyboard(),
    )


async def send_link_code_to_site_notification(
    session: AsyncSession,
    state: TelegramBotStateModel,
    user: UserModel,
    telegram_username: str,
) -> None:
    code = await generate_unique_link_code(session)
    await expire_previous_codes(session, user_id=user.id, chat_id=state.chat_id)

    pending_code = TelegramLinkCodeModel(
        user_id=user.id,
        chat_id=state.chat_id,
        telegram_user_id=state.telegram_user_id,
        telegram_username=telegram_username,
        code=code,
        expires_at=datetime.utcnow() + timedelta(minutes=settings.telegram_code_ttl_minutes),
    )
    session.add(pending_code)
    await session.flush()

    session.add(
        NotificationModel(
            user_id=user.id,
            invitation_id=None,
            type="telegram_link_code",
            text=(
                f"Код привязки Telegram: {code}\n"
                "Если это не вы, проигнорируйте данное сообщение."
            ),
            link="#",
        )
    )

    state.state = STATE_AWAITING_CODE
    state.site_username = user.username
    state.pending_code_id = pending_code.id
    state.attempts = 0
    state.updated_at = datetime.utcnow()

    await session.commit()
    await send_telegram_message(
        state.chat_id,
        "Отправил письмо на аккаунт. Проверьте уведомления в сайте.",
        reply_markup=start_keyboard(),
    )


async def request_link_code_by_telegram_username(
    session: AsyncSession,
    state: TelegramBotStateModel,
) -> None:
    telegram_username = normalize_telegram_username(state.telegram_username)

    if not telegram_username:
        state.state = STATE_IDLE
        state.pending_code_id = None
        state.updated_at = datetime.utcnow()
        await session.commit()
        await send_telegram_message(
            state.chat_id,
            "У вашего Telegram-аккаунта не задан username. Добавьте username в Telegram и повторите регистрацию.",
            reply_markup=start_keyboard(),
        )
        return

    result = await session.execute(
        select(UserModel).where(UserModel.telegram_username == telegram_username)
    )
    user = result.scalars().first()
    if user is None:
        state.state = STATE_IDLE
        state.pending_code_id = None
        state.updated_at = datetime.utcnow()
        await session.commit()
        await send_telegram_message(
            state.chat_id,
            "Сначала откройте настройки на сайте, нажмите «Привязка Tg» и сохраните ваш Telegram username.",
            reply_markup=start_keyboard(),
        )
        return

    await send_link_code_to_site_notification(session, state, user, telegram_username)


async def handle_site_username(
    session: AsyncSession,
    state: TelegramBotStateModel,
    site_username: str,
) -> None:
    cleaned_site_username = site_username.strip()
    telegram_username = normalize_telegram_username(state.telegram_username)

    if not telegram_username:
        state.state = STATE_IDLE
        state.updated_at = datetime.utcnow()
        await session.commit()
        await send_telegram_message(
            state.chat_id,
            "У вашего Telegram-аккаунта не задан username. Добавьте username в Telegram и повторите регистрацию.",
            reply_markup=start_keyboard(),
        )
        return

    result = await session.execute(
        select(UserModel).where(UserModel.username == cleaned_site_username)
    )
    user = result.scalars().first()
    if user is None:
        state.state = STATE_IDLE
        state.updated_at = datetime.utcnow()
        await session.commit()
        await send_telegram_message(
            state.chat_id,
            "Пользователь с таким username на сайте не найден. Проверьте ввод и нажмите «Регистрация» ещё раз.",
            reply_markup=start_keyboard(),
        )
        return

    if not user.telegram_username:
        state.state = STATE_IDLE
        state.updated_at = datetime.utcnow()
        await session.commit()
        await send_telegram_message(
            state.chat_id,
            "Сначала откройте настройки на сайте, нажмите «Привязка Tg» и сохраните ваш Telegram username.",
            reply_markup=start_keyboard(),
        )
        return

    if normalize_telegram_username(user.telegram_username) != telegram_username:
        state.state = STATE_IDLE
        state.updated_at = datetime.utcnow()
        await session.commit()
        await send_telegram_message(
            state.chat_id,
            "Telegram username не совпадает с username, сохранённым на сайте. Обновите «Привязка Tg» и повторите регистрацию.",
            reply_markup=start_keyboard(),
        )
        return

    await send_link_code_to_site_notification(session, state, user, telegram_username)


async def handle_code(
    session: AsyncSession,
    state: TelegramBotStateModel,
    code_text: str,
) -> None:
    code = code_text.strip()
    now = datetime.utcnow()
    pending_code = None

    if state.pending_code_id:
        pending_code = await session.get(TelegramLinkCodeModel, state.pending_code_id)

    if (
        pending_code is None
        or pending_code.chat_id != state.chat_id
        or pending_code.consumed_at is not None
        or pending_code.expires_at <= now
    ):
        state.state = STATE_IDLE
        state.pending_code_id = None
        state.updated_at = now
        await session.commit()
        await send_telegram_message(
            state.chat_id,
            "Код устарел. Нажмите «Регистрация» и запросите новый код.",
            reply_markup=start_keyboard(),
        )
        return

    if pending_code.code != code:
        pending_code.attempts += 1
        state.attempts += 1
        state.updated_at = now

        if pending_code.attempts >= settings.telegram_max_code_attempts:
            pending_code.consumed_at = now
            state.state = STATE_IDLE
            state.pending_code_id = None
            await session.commit()
            await send_telegram_message(
                state.chat_id,
                "Код введён неверно слишком много раз. Нажмите «Регистрация», чтобы получить новый код.",
                reply_markup=start_keyboard(),
            )
            return

        await session.commit()
        await send_telegram_message(
            state.chat_id,
            "Неверный код. Проверьте уведомление на сайте и попробуйте ещё раз.",
            reply_markup=start_keyboard(),
        )
        return

    user = await session.get(UserModel, pending_code.user_id)
    if user is None:
        state.state = STATE_IDLE
        state.pending_code_id = None
        pending_code.consumed_at = now
        await session.commit()
        await send_telegram_message(
            state.chat_id,
            "Профиль на сайте не найден. Нажмите «Регистрация» и повторите привязку.",
            reply_markup=start_keyboard(),
        )
        return

    user.telegram_chat_id = pending_code.chat_id
    user.telegram_user_id = pending_code.telegram_user_id
    user.telegram_username = normalize_telegram_username(pending_code.telegram_username)
    user.telegram_linked_at = now
    pending_code.consumed_at = now
    state.state = STATE_IDLE
    state.pending_code_id = None
    state.attempts = 0
    state.updated_at = now

    await session.commit()
    await send_telegram_message(
        state.chat_id,
        "Telegram успешно привязан. Теперь уведомления будут приходить на сайт и в этот чат.",
        reply_markup=start_keyboard(),
    )


async def handle_telegram_update(session: AsyncSession, payload: dict[str, Any]) -> None:
    message = payload.get("message")
    if not isinstance(message, dict):
        return

    text = str(message.get("text") or "").strip()
    if not text:
        return

    chat = message.get("chat") or {}
    sender = message.get("from") or {}
    chat_id = str(chat.get("id") or "")
    if not chat_id:
        return

    telegram_user_id = str(sender.get("id")) if sender.get("id") is not None else None
    telegram_username = normalize_telegram_username(sender.get("username"))
    state = await get_or_create_bot_state(
        session,
        chat_id=chat_id,
        telegram_user_id=telegram_user_id,
        telegram_username=telegram_username,
    )

    if text == "/start":
        state.state = STATE_IDLE
        state.pending_code_id = None
        state.updated_at = datetime.utcnow()
        await session.commit()
        await send_start_message(chat_id)
        return

    if text == REGISTER_BUTTON_TEXT:
        await request_link_code_by_telegram_username(session, state)
        return

    if state.state == STATE_AWAITING_SITE_USERNAME:
        await handle_site_username(session, state, text)
        return

    if state.state == STATE_AWAITING_CODE:
        await handle_code(session, state, text)
        return

    await send_telegram_message(
        chat_id,
        "Для привязки нажмите «Регистрация».",
        reply_markup=start_keyboard(),
    )


async def poll_telegram_updates(session_factory) -> None:
    """Read bot updates through long polling for local/dev deployments."""

    if not is_telegram_configured() or not settings.telegram_enable_polling:
        return

    offset: int | None = None
    logger.info("Telegram bot polling started")

    while True:
        payload: dict[str, Any] = {
            "timeout": 25,
            "allowed_updates": ["message"],
        }
        if offset is not None:
            payload["offset"] = offset

        data = await call_telegram_api_json("getUpdates", payload, timeout=35)
        if not data or not data.get("ok"):
            await asyncio.sleep(3)
            continue

        updates = data.get("result") or []
        for update in updates:
            update_id = update.get("update_id")
            if isinstance(update_id, int):
                offset = update_id + 1

            async with session_factory() as session:
                try:
                    await handle_telegram_update(session, update)
                except Exception:
                    logger.exception("Failed to handle Telegram update")
                    await session.rollback()
