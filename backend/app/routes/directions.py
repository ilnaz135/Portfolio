"""Direction routes."""

from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import (
    CurrentUserDep,
    authorize_record_owner,
    authorize_user_access,
)
from app.core.database import get_db_session
from app.models import UserDirectionModel, UserModel
from app.schemas import UserDirectionCreateSchema, UserDirectionSchema

router = APIRouter()
SessionDep = Depends(get_db_session)


async def ensure_user_exists(user_id: int, session: AsyncSession) -> None:
    if await session.get(UserModel, user_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} was not found",
        )


@router.post("/{user_id}/directions", response_model=UserDirectionSchema, status_code=status.HTTP_201_CREATED)
async def add_user_direction(
    user_id: int,
    direction_data: UserDirectionCreateSchema,
    current_user: CurrentUserDep,
    session: AsyncSession = SessionDep,
) -> UserDirectionModel:
    authorize_user_access(user_id, current_user)
    await ensure_user_exists(user_id, session)

    new_direction = UserDirectionModel(
        user_id=user_id,
        other_directions=direction_data.other_directions,
    )
    session.add(new_direction)
    await session.commit()
    await session.refresh(new_direction)
    return new_direction


@router.get("/{user_id}/directions", response_model=List[UserDirectionSchema])
async def get_user_directions(
    user_id: int,
    current_user: CurrentUserDep,
    session: AsyncSession = SessionDep,
    limit: int = 10,
) -> List[UserDirectionModel]:
    authorize_user_access(user_id, current_user)
    await ensure_user_exists(user_id, session)

    stmt = (
        select(UserDirectionModel)
        .where(UserDirectionModel.user_id == user_id)
        .order_by(UserDirectionModel.created_at.desc())
    )
    if limit != -1:
        stmt = stmt.limit(limit)
    result = await session.execute(stmt)
    return result.scalars().all()


@router.delete("/directions/{direction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_direction(
    direction_id: int,
    current_user: CurrentUserDep,
    session: AsyncSession = SessionDep,
) -> Response:
    result = await session.execute(
        select(UserDirectionModel).where(UserDirectionModel.id == direction_id)
    )
    direction = result.scalars().first()
    if direction is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Direction with id {direction_id} was not found",
        )

    authorize_record_owner(direction.user_id, current_user)
    await session.delete(direction)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
