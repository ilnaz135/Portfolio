"""Achievement routes for tab-specific scientific achievements."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

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
) -> Response:
    result = await session.execute(select(model).where(model.id == record_id))
    record = result.scalars().first()
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{record_name} with id {record_id} was not found",
        )

    await session.delete(record)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/{user_id}/achievements",
    response_model=UserAchievementsSchema,
    tags=["Achievements"],
)
async def get_user_achievements(
    user_id: int,
    session: AsyncSession = SessionDep,
) -> UserModel:
    return await UserService(session).get_user_by_id(user_id)


@router.get(
    "/{user_id}/achievements/publications",
    response_model=list[UserPublicationSchema],
    tags=["Achievements"],
)
async def get_user_publications(
    user_id: int,
    session: AsyncSession = SessionDep,
    limit: int = -1,
) -> list[UserPublicationModel]:
    return await list_user_records(
        user_id=user_id,
        session=session,
        model=UserPublicationModel,
        limit=limit,
    )


@router.post(
    "/{user_id}/achievements/publications",
    response_model=UserPublicationSchema,
    tags=["Achievements"],
    status_code=status.HTTP_201_CREATED,
)
async def create_user_publication(
    user_id: int,
    publication_data: UserPublicationCreateSchema,
    session: AsyncSession = SessionDep,
) -> UserPublicationModel:
    return await create_user_record(
        user_id=user_id,
        session=session,
        model=UserPublicationModel,
        payload=publication_data.model_dump(),
    )


@router.delete(
    "/achievements/publications/{publication_id}",
    tags=["Achievements"],
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_user_publication(
    publication_id: int,
    session: AsyncSession = SessionDep,
) -> Response:
    return await delete_user_record(
        record_id=publication_id,
        session=session,
        model=UserPublicationModel,
        record_name="Publication",
    )


@router.get(
    "/{user_id}/achievements/events",
    response_model=list[UserEventSchema],
    tags=["Achievements"],
)
async def get_user_events(
    user_id: int,
    session: AsyncSession = SessionDep,
    limit: int = -1,
) -> list[UserEventModel]:
    return await list_user_records(
        user_id=user_id,
        session=session,
        model=UserEventModel,
        limit=limit,
    )


@router.post(
    "/{user_id}/achievements/events",
    response_model=UserEventSchema,
    tags=["Achievements"],
    status_code=status.HTTP_201_CREATED,
)
async def create_user_event(
    user_id: int,
    event_data: UserEventCreateSchema,
    session: AsyncSession = SessionDep,
) -> UserEventModel:
    return await create_user_record(
        user_id=user_id,
        session=session,
        model=UserEventModel,
        payload=event_data.model_dump(),
    )


@router.delete(
    "/achievements/events/{event_id}",
    tags=["Achievements"],
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_user_event(
    event_id: int,
    session: AsyncSession = SessionDep,
) -> Response:
    return await delete_user_record(
        record_id=event_id,
        session=session,
        model=UserEventModel,
        record_name="Event",
    )


@router.get(
    "/{user_id}/achievements/grants",
    response_model=list[UserGrantSchema],
    tags=["Achievements"],
)
async def get_user_grants(
    user_id: int,
    session: AsyncSession = SessionDep,
    limit: int = -1,
) -> list[UserGrantModel]:
    return await list_user_records(
        user_id=user_id,
        session=session,
        model=UserGrantModel,
        limit=limit,
    )


@router.post(
    "/{user_id}/achievements/grants",
    response_model=UserGrantSchema,
    tags=["Achievements"],
    status_code=status.HTTP_201_CREATED,
)
async def create_user_grant(
    user_id: int,
    grant_data: UserGrantCreateSchema,
    session: AsyncSession = SessionDep,
) -> UserGrantModel:
    return await create_user_record(
        user_id=user_id,
        session=session,
        model=UserGrantModel,
        payload=grant_data.model_dump(),
    )


@router.delete(
    "/achievements/grants/{grant_id}",
    tags=["Achievements"],
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_user_grant(
    grant_id: int,
    session: AsyncSession = SessionDep,
) -> Response:
    return await delete_user_record(
        record_id=grant_id,
        session=session,
        model=UserGrantModel,
        record_name="Grant",
    )


@router.get(
    "/{user_id}/achievements/intellectual",
    response_model=list[UserIntellectualPropertySchema],
    tags=["Achievements"],
)
async def get_user_intellectual_properties(
    user_id: int,
    session: AsyncSession = SessionDep,
    limit: int = -1,
) -> list[UserIntellectualPropertyModel]:
    return await list_user_records(
        user_id=user_id,
        session=session,
        model=UserIntellectualPropertyModel,
        limit=limit,
    )


@router.post(
    "/{user_id}/achievements/intellectual",
    response_model=UserIntellectualPropertySchema,
    tags=["Achievements"],
    status_code=status.HTTP_201_CREATED,
)
async def create_user_intellectual_property(
    user_id: int,
    intellectual_data: UserIntellectualPropertyCreateSchema,
    session: AsyncSession = SessionDep,
) -> UserIntellectualPropertyModel:
    return await create_user_record(
        user_id=user_id,
        session=session,
        model=UserIntellectualPropertyModel,
        payload=intellectual_data.model_dump(),
    )


@router.delete(
    "/achievements/intellectual/{intellectual_id}",
    tags=["Achievements"],
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_user_intellectual_property(
    intellectual_id: int,
    session: AsyncSession = SessionDep,
) -> Response:
    return await delete_user_record(
        record_id=intellectual_id,
        session=session,
        model=UserIntellectualPropertyModel,
        record_name="Intellectual property",
    )


@router.get(
    "/{user_id}/achievements/innovation",
    response_model=list[UserInnovationSchema],
    tags=["Achievements"],
)
async def get_user_innovations(
    user_id: int,
    session: AsyncSession = SessionDep,
    limit: int = -1,
) -> list[UserInnovationModel]:
    return await list_user_records(
        user_id=user_id,
        session=session,
        model=UserInnovationModel,
        limit=limit,
    )


@router.post(
    "/{user_id}/achievements/innovation",
    response_model=UserInnovationSchema,
    tags=["Achievements"],
    status_code=status.HTTP_201_CREATED,
)
async def create_user_innovation(
    user_id: int,
    innovation_data: UserInnovationCreateSchema,
    session: AsyncSession = SessionDep,
) -> UserInnovationModel:
    return await create_user_record(
        user_id=user_id,
        session=session,
        model=UserInnovationModel,
        payload=innovation_data.model_dump(),
    )


@router.delete(
    "/achievements/innovation/{innovation_id}",
    tags=["Achievements"],
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_user_innovation(
    innovation_id: int,
    session: AsyncSession = SessionDep,
) -> Response:
    return await delete_user_record(
        record_id=innovation_id,
        session=session,
        model=UserInnovationModel,
        record_name="Innovation",
    )


@router.get(
    "/{user_id}/achievements/scholarships",
    response_model=list[UserScholarshipSchema],
    tags=["Achievements"],
)
async def get_user_scholarships(
    user_id: int,
    session: AsyncSession = SessionDep,
    limit: int = -1,
) -> list[UserScholarshipModel]:
    return await list_user_records(
        user_id=user_id,
        session=session,
        model=UserScholarshipModel,
        limit=limit,
    )


@router.post(
    "/{user_id}/achievements/scholarships",
    response_model=UserScholarshipSchema,
    tags=["Achievements"],
    status_code=status.HTTP_201_CREATED,
)
async def create_user_scholarship(
    user_id: int,
    scholarship_data: UserScholarshipCreateSchema,
    session: AsyncSession = SessionDep,
) -> UserScholarshipModel:
    return await create_user_record(
        user_id=user_id,
        session=session,
        model=UserScholarshipModel,
        payload=scholarship_data.model_dump(),
    )


@router.delete(
    "/achievements/scholarships/{scholarship_id}",
    tags=["Achievements"],
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_user_scholarship(
    scholarship_id: int,
    session: AsyncSession = SessionDep,
) -> Response:
    return await delete_user_record(
        record_id=scholarship_id,
        session=session,
        model=UserScholarshipModel,
        record_name="Scholarship",
    )


@router.get(
    "/{user_id}/achievements/internships",
    response_model=list[UserInternshipSchema],
    tags=["Achievements"],
)
async def get_user_internships(
    user_id: int,
    session: AsyncSession = SessionDep,
    limit: int = -1,
) -> list[UserInternshipModel]:
    return await list_user_records(
        user_id=user_id,
        session=session,
        model=UserInternshipModel,
        limit=limit,
    )


@router.post(
    "/{user_id}/achievements/internships",
    response_model=UserInternshipSchema,
    tags=["Achievements"],
    status_code=status.HTTP_201_CREATED,
)
async def create_user_internship(
    user_id: int,
    internship_data: UserInternshipCreateSchema,
    session: AsyncSession = SessionDep,
) -> UserInternshipModel:
    return await create_user_record(
        user_id=user_id,
        session=session,
        model=UserInternshipModel,
        payload=internship_data.model_dump(),
    )


@router.delete(
    "/achievements/internships/{internship_id}",
    tags=["Achievements"],
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_user_internship(
    internship_id: int,
    session: AsyncSession = SessionDep,
) -> Response:
    return await delete_user_record(
        record_id=internship_id,
        session=session,
        model=UserInternshipModel,
        record_name="Internship",
    )
