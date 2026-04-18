"""Stack routes."""

from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUserDep, authorize_user_access
from app.core.database import get_db_session
from app.schemas import UserStackCreateSchema, UserStackSchema
from app.services.stack_service import StackService

router = APIRouter()
SessionDep = Depends(get_db_session)


@router.post("/{user_id}/stacks", response_model=UserStackSchema, status_code=status.HTTP_201_CREATED)
async def add_user_stack(
    user_id: int,
    stack_data: UserStackCreateSchema,
    current_user: CurrentUserDep,
    session: AsyncSession = SessionDep,
) -> UserStackSchema:
    authorize_user_access(user_id, current_user)
    return await StackService(session).add_stack_to_user(user_id, stack_data)


@router.get("/{user_id}/stacks", response_model=List[UserStackSchema])
async def get_user_stacks(
    user_id: int,
    current_user: CurrentUserDep,
    session: AsyncSession = SessionDep,
    limit: int = 10,
) -> List[UserStackSchema]:
    authorize_user_access(user_id, current_user)
    return await StackService(session).get_user_stacks(user_id, limit)


@router.delete("/{user_id}/stacks/{stack_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_stack(
    user_id: int,
    stack_id: int,
    current_user: CurrentUserDep,
    session: AsyncSession = SessionDep,
) -> Response:
    authorize_user_access(user_id, current_user)
    await StackService(session).remove_stack_from_user(user_id, stack_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
