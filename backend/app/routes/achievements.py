"""Achievement routes for tab-specific scientific achievements."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import (
    CurrentUserDep,
    authorize_record_owner,
    authorize_user_access,
)
from app.core.database import get_db_session
from app.models import (
    UserEventModel,
    UserGrantModel,
    UserInnovationModel,
    UserIntellectualPropertyModel,
    UserInternshipModel,
    UserModel,
    UserPublicationModel,
    UserScholarshipModel,
)
from app.schemas import (
    UserAchievementsSchema,
    UserEventCreateSchema,
    UserEventSchema,
    UserGrantCreateSchema,
    UserGrantSchema,
    UserInnovationCreateSchema,
    UserInnovationSchema,
    UserIntellectualPropertyCreateSchema,
    UserIntellectualPropertySchema,
    UserInternshipCreateSchema,
    UserInternshipSchema,
    UserPublicationCreateSchema,
    UserPublicationSchema,
    UserScholarshipCreateSchema,
    UserScholarshipSchema,
)
from app.services.user_service import UserService

router = APIRouter()
SessionDep = Depends(get_db_session)


async def ensure_user_exists(user_id: int, session: AsyncSession) -> None:
    result = await session.execute(select(UserModel.id).where(UserModel.id == user_id))
    if result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} was not found",
        )


async def list_user_records(
    *,
    user_id: int,
    session: AsyncSession,
    model: type[Any],
    limit: int,
) -> list[Any]:
    await ensure_user_exists(user_id, session)
    stmt = select(model).where(model.user_id == user_id).order_by(model.created_at.desc())
    if limit != -1:
        stmt = stmt.limit(limit)
    result = await session.execute(stmt)
    return result.scalars().all()


async def create_user_record(
    *,
    user_id: int,
    session: AsyncSession,
    model: type[Any],
    payload: dict[str, Any],
) -> Any:
    await ensure_user_exists(user_id, session)
    record = model(user_id=user_id, **payload)
    session.add(record)
    await session.commit()
    await session.refresh(record)
    return record


async def delete_user_record(
    *,
    record_id: int,
    session: AsyncSession,
    model: type[Any],
    record_name: str,
    current_user: UserModel,
) -> Response:
    result = await session.execute(select(model).where(model.id == record_id))
    record = result.scalars().first()
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{record_name} with id {record_id} was not found",
        )

    authorize_record_owner(record.user_id, current_user)
    await session.delete(record)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def build_user_achievements_response(
    user: UserModel,
    limit: int,
) -> UserAchievementsSchema:
    scientific_achievements = user.scientific_achievements
    if limit != -1:
        scientific_achievements = scientific_achievements[:limit]

    # Keep tab-specific collections intact while limiting the flat summary feed.
    return UserAchievementsSchema.model_validate(
        {
            "publications": user.publications,
            "events": user.events,
            "grants": user.grants,
            "intellectual_properties": user.intellectual_properties,
            "innovations": user.innovations,
            "scholarships": user.scholarships,
            "internships": user.internships,
            "scientific_achievements": scientific_achievements,
        }
    )


@router.get("/{user_id}/achievements", response_model=UserAchievementsSchema)
async def get_user_achievements(
    user_id: int,
    current_user: CurrentUserDep,
    session: AsyncSession = SessionDep,
    limit: int = Query(default=-1, ge=-1),
) -> UserAchievementsSchema:
    authorize_user_access(user_id, current_user)
    user = await UserService(session).get_user_by_id(user_id)
    return build_user_achievements_response(user, limit)


@router.get("/{user_id}/achievements/publications", response_model=list[UserPublicationSchema])
async def get_user_publications(
    user_id: int,
    current_user: CurrentUserDep,
    session: AsyncSession = SessionDep,
    limit: int = -1,
) -> list[UserPublicationModel]:
    authorize_user_access(user_id, current_user)
    return await list_user_records(
        user_id=user_id,
        session=session,
        model=UserPublicationModel,
        limit=limit,
    )


@router.post(
    "/{user_id}/achievements/publications",
    response_model=UserPublicationSchema,
    status_code=status.HTTP_201_CREATED,
)
async def create_user_publication(
    user_id: int,
    publication_data: UserPublicationCreateSchema,
    current_user: CurrentUserDep,
    session: AsyncSession = SessionDep,
) -> UserPublicationModel:
    authorize_user_access(user_id, current_user)
    return await create_user_record(
        user_id=user_id,
        session=session,
        model=UserPublicationModel,
        payload=publication_data.model_dump(),
    )


@router.delete("/achievements/publications/{publication_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_publication(
    publication_id: int,
    current_user: CurrentUserDep,
    session: AsyncSession = SessionDep,
) -> Response:
    return await delete_user_record(
        record_id=publication_id,
        session=session,
        model=UserPublicationModel,
        record_name="Publication",
        current_user=current_user,
    )


@router.get("/{user_id}/achievements/events", response_model=list[UserEventSchema])
async def get_user_events(
    user_id: int,
    current_user: CurrentUserDep,
    session: AsyncSession = SessionDep,
    limit: int = -1,
) -> list[UserEventModel]:
    authorize_user_access(user_id, current_user)
    return await list_user_records(
        user_id=user_id,
        session=session,
        model=UserEventModel,
        limit=limit,
    )


@router.post(
    "/{user_id}/achievements/events",
    response_model=UserEventSchema,
    status_code=status.HTTP_201_CREATED,
)
async def create_user_event(
    user_id: int,
    event_data: UserEventCreateSchema,
    current_user: CurrentUserDep,
    session: AsyncSession = SessionDep,
) -> UserEventModel:
    authorize_user_access(user_id, current_user)
    return await create_user_record(
        user_id=user_id,
        session=session,
        model=UserEventModel,
        payload=event_data.model_dump(),
    )


@router.delete("/achievements/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_event(
    event_id: int,
    current_user: CurrentUserDep,
    session: AsyncSession = SessionDep,
) -> Response:
    return await delete_user_record(
        record_id=event_id,
        session=session,
        model=UserEventModel,
        record_name="Event",
        current_user=current_user,
    )


@router.get("/{user_id}/achievements/grants", response_model=list[UserGrantSchema])
async def get_user_grants(
    user_id: int,
    current_user: CurrentUserDep,
    session: AsyncSession = SessionDep,
    limit: int = -1,
) -> list[UserGrantModel]:
    authorize_user_access(user_id, current_user)
    return await list_user_records(
        user_id=user_id,
        session=session,
        model=UserGrantModel,
        limit=limit,
    )


@router.post(
    "/{user_id}/achievements/grants",
    response_model=UserGrantSchema,
    status_code=status.HTTP_201_CREATED,
)
async def create_user_grant(
    user_id: int,
    grant_data: UserGrantCreateSchema,
    current_user: CurrentUserDep,
    session: AsyncSession = SessionDep,
) -> UserGrantModel:
    authorize_user_access(user_id, current_user)
    return await create_user_record(
        user_id=user_id,
        session=session,
        model=UserGrantModel,
        payload=grant_data.model_dump(),
    )


@router.delete("/achievements/grants/{grant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_grant(
    grant_id: int,
    current_user: CurrentUserDep,
    session: AsyncSession = SessionDep,
) -> Response:
    return await delete_user_record(
        record_id=grant_id,
        session=session,
        model=UserGrantModel,
        record_name="Grant",
        current_user=current_user,
    )


@router.get("/{user_id}/achievements/intellectual", response_model=list[UserIntellectualPropertySchema])
async def get_user_intellectual_properties(
    user_id: int,
    current_user: CurrentUserDep,
    session: AsyncSession = SessionDep,
    limit: int = -1,
) -> list[UserIntellectualPropertyModel]:
    authorize_user_access(user_id, current_user)
    return await list_user_records(
        user_id=user_id,
        session=session,
        model=UserIntellectualPropertyModel,
        limit=limit,
    )


@router.post(
    "/{user_id}/achievements/intellectual",
    response_model=UserIntellectualPropertySchema,
    status_code=status.HTTP_201_CREATED,
)
async def create_user_intellectual_property(
    user_id: int,
    intellectual_data: UserIntellectualPropertyCreateSchema,
    current_user: CurrentUserDep,
    session: AsyncSession = SessionDep,
) -> UserIntellectualPropertyModel:
    authorize_user_access(user_id, current_user)
    return await create_user_record(
        user_id=user_id,
        session=session,
        model=UserIntellectualPropertyModel,
        payload=intellectual_data.model_dump(),
    )


@router.delete("/achievements/intellectual/{intellectual_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_intellectual_property(
    intellectual_id: int,
    current_user: CurrentUserDep,
    session: AsyncSession = SessionDep,
) -> Response:
    return await delete_user_record(
        record_id=intellectual_id,
        session=session,
        model=UserIntellectualPropertyModel,
        record_name="Intellectual property",
        current_user=current_user,
    )


@router.get("/{user_id}/achievements/innovation", response_model=list[UserInnovationSchema])
async def get_user_innovations(
    user_id: int,
    current_user: CurrentUserDep,
    session: AsyncSession = SessionDep,
    limit: int = -1,
) -> list[UserInnovationModel]:
    authorize_user_access(user_id, current_user)
    return await list_user_records(
        user_id=user_id,
        session=session,
        model=UserInnovationModel,
        limit=limit,
    )


@router.post(
    "/{user_id}/achievements/innovation",
    response_model=UserInnovationSchema,
    status_code=status.HTTP_201_CREATED,
)
async def create_user_innovation(
    user_id: int,
    innovation_data: UserInnovationCreateSchema,
    current_user: CurrentUserDep,
    session: AsyncSession = SessionDep,
) -> UserInnovationModel:
    authorize_user_access(user_id, current_user)
    return await create_user_record(
        user_id=user_id,
        session=session,
        model=UserInnovationModel,
        payload=innovation_data.model_dump(),
    )


@router.delete("/achievements/innovation/{innovation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_innovation(
    innovation_id: int,
    current_user: CurrentUserDep,
    session: AsyncSession = SessionDep,
) -> Response:
    return await delete_user_record(
        record_id=innovation_id,
        session=session,
        model=UserInnovationModel,
        record_name="Innovation",
        current_user=current_user,
    )


@router.get("/{user_id}/achievements/scholarships", response_model=list[UserScholarshipSchema])
async def get_user_scholarships(
    user_id: int,
    current_user: CurrentUserDep,
    session: AsyncSession = SessionDep,
    limit: int = -1,
) -> list[UserScholarshipModel]:
    authorize_user_access(user_id, current_user)
    return await list_user_records(
        user_id=user_id,
        session=session,
        model=UserScholarshipModel,
        limit=limit,
    )


@router.post(
    "/{user_id}/achievements/scholarships",
    response_model=UserScholarshipSchema,
    status_code=status.HTTP_201_CREATED,
)
async def create_user_scholarship(
    user_id: int,
    scholarship_data: UserScholarshipCreateSchema,
    current_user: CurrentUserDep,
    session: AsyncSession = SessionDep,
) -> UserScholarshipModel:
    authorize_user_access(user_id, current_user)
    return await create_user_record(
        user_id=user_id,
        session=session,
        model=UserScholarshipModel,
        payload=scholarship_data.model_dump(),
    )


@router.delete("/achievements/scholarships/{scholarship_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_scholarship(
    scholarship_id: int,
    current_user: CurrentUserDep,
    session: AsyncSession = SessionDep,
) -> Response:
    return await delete_user_record(
        record_id=scholarship_id,
        session=session,
        model=UserScholarshipModel,
        record_name="Scholarship",
        current_user=current_user,
    )


@router.get("/{user_id}/achievements/internships", response_model=list[UserInternshipSchema])
async def get_user_internships(
    user_id: int,
    current_user: CurrentUserDep,
    session: AsyncSession = SessionDep,
    limit: int = -1,
) -> list[UserInternshipModel]:
    authorize_user_access(user_id, current_user)
    return await list_user_records(
        user_id=user_id,
        session=session,
        model=UserInternshipModel,
        limit=limit,
    )


@router.post(
    "/{user_id}/achievements/internships",
    response_model=UserInternshipSchema,
    status_code=status.HTTP_201_CREATED,
)
async def create_user_internship(
    user_id: int,
    internship_data: UserInternshipCreateSchema,
    current_user: CurrentUserDep,
    session: AsyncSession = SessionDep,
) -> UserInternshipModel:
    authorize_user_access(user_id, current_user)
    return await create_user_record(
        user_id=user_id,
        session=session,
        model=UserInternshipModel,
        payload=internship_data.model_dump(),
    )


@router.delete("/achievements/internships/{internship_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_internship(
    internship_id: int,
    current_user: CurrentUserDep,
    session: AsyncSession = SessionDep,
) -> Response:
    return await delete_user_record(
        record_id=internship_id,
        session=session,
        model=UserInternshipModel,
        record_name="Internship",
        current_user=current_user,
    )
