"""Project, invitation and notification routes."""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Iterable

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import CurrentUserDep
from app.core.database import get_db_session
from app.models import (
    NotificationModel,
    ProjectInvitationModel,
    ProjectMemberModel,
    ProjectModel,
    ProjectStackModel,
    UserModel,
)
from app.schemas import (
    NotificationSchema,
    ProjectCreateSchema,
    ProjectInvitationCreateSchema,
    ProjectInvitationSchema,
    ProjectListSchema,
    ProjectMemberRolesUpdateSchema,
    ProjectSchema,
    ProjectUpdateSchema,
)

router = APIRouter()
SessionDep = Depends(get_db_session)

PROJECT_DESCRIPTIONS_DIR = Path(__file__).resolve().parents[2] / "project_descriptions"
OWNER_ROLE = "\u0412\u043b\u0430\u0434\u0435\u043b\u0435\u0446"
MEMBER_ROLE = "\u0423\u0447\u0430\u0441\u0442\u043d\u0438\u043a"


def project_options():
    return (
        selectinload(ProjectModel.owner),
        selectinload(ProjectModel.team_lead),
        selectinload(ProjectModel.members).selectinload(ProjectMemberModel.user),
        selectinload(ProjectModel.stacks),
    )


def invitation_options():
    return (
        selectinload(ProjectInvitationModel.project).options(*project_options()),
        selectinload(ProjectInvitationModel.inviter),
        selectinload(ProjectInvitationModel.invitee),
    )


def parse_roles(roles_json: str | None) -> list[str]:
    try:
        value = json.loads(roles_json or "[]")
        if isinstance(value, list):
            return [str(role).strip() for role in value if str(role).strip()]
    except json.JSONDecodeError:
        pass
    return []


def dump_roles(roles: Iterable[str]) -> str:
    unique_roles: list[str] = []
    for role in roles:
        normalized = str(role).strip()
        if normalized and normalized not in unique_roles:
            unique_roles.append(normalized)
    return json.dumps(unique_roles, ensure_ascii=False)


def user_person(user: UserModel | None) -> dict:
    if user is None:
        return {
            "id": 0,
            "username": "",
            "firstName": "",
            "lastName": "",
            "patronymic": "",
        }

    return {
        "id": user.id,
        "username": user.username,
        "firstName": user.first_name,
        "lastName": user.last_name,
        "patronymic": user.patronymic or "",
    }


def project_member(member: ProjectMemberModel) -> dict:
    roles = parse_roles(member.roles_json)
    person = user_person(member.user)
    return {
        **person,
        "userId": member.user_id,
        "role": roles[0] if roles else "",
        "roles": roles,
    }


def read_project_description(project: ProjectModel) -> str:
    if not project.detailed_description_path:
        return ""

    path = Path(project.detailed_description_path)
    if not path.is_absolute():
        path = PROJECT_DESCRIPTIONS_DIR / path

    try:
        return path.read_text(encoding="utf-8")
    except OSError:
        return ""


def write_project_description(project: ProjectModel, markdown: str) -> None:
    PROJECT_DESCRIPTIONS_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"project_{project.id}.md"
    path = PROJECT_DESCRIPTIONS_DIR / filename
    path.write_text(markdown or "", encoding="utf-8")
    project.detailed_description_path = filename


def project_full_name(project: ProjectModel) -> str:
    return f"{project.owner.username}/{project.slug}" if project.owner else project.slug


def serialize_project(project: ProjectModel) -> ProjectSchema:
    full_name = project_full_name(project)
    return ProjectSchema(
        id=project.id,
        slug=project.slug,
        ownerUsername=project.owner.username if project.owner else "",
        fullName=full_name,
        visibility=project.visibility,
        projectType=project.project_type,
        customer=project.customer,
        deadlineFrom=project.deadline_from,
        deadlineTo=project.deadline_to,
        status=project.status,
        shortDescription=project.short_description,
        detailedDescription=read_project_description(project),
        cloudUrl=project.cloud_url,
        teamProjectUrl=project.team_project_url,
        stacks=[item.stack for item in project.stacks],
        owner=user_person(project.owner),
        teamLead=user_person(project.team_lead) if project.team_lead else None,
        members=[project_member(member) for member in project.members],
        memberCount=len(project.members),
        createdAt=project.created_at,
        updatedAt=project.updated_at,
    )


def is_project_member(project: ProjectModel, user_id: int) -> bool:
    return any(member.user_id == user_id for member in project.members)


def is_project_manager(project: ProjectModel, user_id: int) -> bool:
    if project.owner_id == user_id or project.team_lead_id == user_id:
        return True

    for member in project.members:
        if member.user_id == user_id and "Team Lead" in parse_roles(member.roles_json):
            return True
    return False


def get_project_member(project: ProjectModel, user_id: int) -> ProjectMemberModel | None:
    return next(
        (member for member in project.members if member.user_id == user_id),
        None,
    )


async def get_project_or_404(session: AsyncSession, project_id: int) -> ProjectModel:
    result = await session.execute(
        select(ProjectModel)
        .options(*project_options())
        .where(ProjectModel.id == project_id)
    )
    project = result.scalars().first()
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


@router.get("", response_model=ProjectListSchema)
async def get_projects(
    current_user: CurrentUserDep,
    session: AsyncSession = SessionDep,
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    mine: bool = False,
    manageable: bool = False,
) -> ProjectListSchema:
    result = await session.execute(
        select(ProjectModel)
        .options(*project_options())
        .order_by(ProjectModel.created_at.desc())
    )
    all_projects = result.scalars().all()

    def include_project(project: ProjectModel) -> bool:
        if manageable:
            return is_project_manager(project, current_user.id)
        if mine:
            return is_project_member(project, current_user.id)
        return project.visibility != "private" or is_project_member(project, current_user.id)

    filtered = [project for project in all_projects if include_project(project)]
    page = filtered[offset : offset + limit]
    return ProjectListSchema(
        items=[serialize_project(project) for project in page],
        total=len(filtered),
        limit=limit,
        offset=offset,
    )


@router.get("/{project_id}", response_model=ProjectSchema)
async def get_project(
    project_id: int,
    current_user: CurrentUserDep,
    session: AsyncSession = SessionDep,
) -> ProjectSchema:
    project = await get_project_or_404(session, project_id)
    if project.visibility == "private" and not is_project_member(project, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Project is private")
    return serialize_project(project)


@router.post("", response_model=ProjectSchema, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: ProjectCreateSchema,
    current_user: CurrentUserDep,
    session: AsyncSession = SessionDep,
) -> ProjectSchema:
    project = ProjectModel(
        slug=project_data.slug,
        owner_id=current_user.id,
        team_lead_id=current_user.id,
        visibility=project_data.visibility or "public",
        project_type=project_data.project_type,
        customer=project_data.customer or "",
        deadline_from=project_data.deadline_from,
        deadline_to=project_data.deadline_to,
        status=project_data.status or "in_progress",
        short_description=project_data.short_description,
        cloud_url=project_data.cloud_url,
        team_project_url=project_data.team_project_url,
    )
    session.add(project)
    await session.flush()
    write_project_description(project, project_data.detailed_description)

    session.add(
        ProjectMemberModel(
            project_id=project.id,
            user_id=current_user.id,
            roles_json=dump_roles([OWNER_ROLE]),
        )
    )
    for stack in project_data.stacks:
        cleaned = stack.strip()
        if cleaned:
            session.add(ProjectStackModel(project_id=project.id, stack=cleaned[:100]))

    await session.commit()
    return serialize_project(await get_project_or_404(session, project.id))


@router.put("/{project_id}/members/{user_id}/roles", response_model=ProjectSchema)
async def update_project_member_roles(
    project_id: int,
    user_id: int,
    roles_data: ProjectMemberRolesUpdateSchema,
    current_user: CurrentUserDep,
    session: AsyncSession = SessionDep,
) -> ProjectSchema:
    project = await get_project_or_404(session, project_id)
    if project.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owner can edit project member roles",
        )

    member = get_project_member(project, user_id)
    if member is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project member not found")

    roles = list(roles_data.roles)
    is_owner_member = project.owner_id == member.user_id
    if not is_owner_member and OWNER_ROLE in roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Owner role can only belong to the project owner",
        )

    if is_owner_member:
        roles = [OWNER_ROLE, *[role for role in roles if role != OWNER_ROLE]]

    member.roles_json = dump_roles(roles)
    project.updated_at = datetime.utcnow()
    await session.commit()
    return serialize_project(await get_project_or_404(session, project.id))


@router.put("/{project_id}", response_model=ProjectSchema)
async def update_project(
    project_id: int,
    project_data: ProjectUpdateSchema,
    current_user: CurrentUserDep,
    session: AsyncSession = SessionDep,
) -> ProjectSchema:
    project = await get_project_or_404(session, project_id)
    if project.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only owner can edit project")

    update_data = project_data.model_dump(exclude_unset=True, by_alias=False)
    description = update_data.pop("detailed_description", None)
    stacks = update_data.pop("stacks", None)

    for field, value in update_data.items():
        if value is not None:
            setattr(project, field, value)

    if description is not None:
        write_project_description(project, description)

    if stacks is not None:
        project.stacks.clear()
        await session.flush()
        for stack in stacks:
            cleaned = stack.strip()
            if cleaned:
                project.stacks.append(ProjectStackModel(stack=cleaned[:100]))

    project.updated_at = datetime.utcnow()
    await session.commit()
    return serialize_project(await get_project_or_404(session, project.id))


@router.post("/invitations", response_model=list[ProjectInvitationSchema], status_code=status.HTTP_201_CREATED)
async def create_project_invitations(
    invitation_data: ProjectInvitationCreateSchema,
    current_user: CurrentUserDep,
    session: AsyncSession = SessionDep,
) -> list[ProjectInvitationSchema]:
    invitee = await session.get(UserModel, invitation_data.invitee_user_id)
    if invitee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitee not found")

    created: list[ProjectInvitationModel] = []
    for project_id in invitation_data.project_ids:
        project = await get_project_or_404(session, project_id)
        if not is_project_manager(project, current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only owner or Team Lead can invite to project",
            )

        existing_result = await session.execute(
            select(ProjectInvitationModel)
            .options(*invitation_options())
            .where(
                ProjectInvitationModel.project_id == project.id,
                ProjectInvitationModel.invitee_id == invitee.id,
                ProjectInvitationModel.status == "pending",
            )
        )
        existing = existing_result.scalars().first()
        if existing:
            created.append(existing)
            continue

        link = f"projectsindex.html?projectId={project.id}"
        invitation = ProjectInvitationModel(
            project_id=project.id,
            inviter_id=current_user.id,
            invitee_id=invitee.id,
            status="pending",
            project_link=link,
        )
        session.add(invitation)
        await session.flush()
        session.add(
            NotificationModel(
                user_id=invitee.id,
                invitation_id=invitation.id,
                type="project_invitation",
                text=f"\u0412\u0430\u0441 \u043f\u0440\u0438\u0433\u043b\u0430\u0441\u0438\u043b\u0438 \u0432 \u043f\u0440\u043e\u0435\u043a\u0442 «{project_full_name(project)}»",
                link=link,
            )
        )
        created.append(invitation)

    await session.commit()
    return [serialize_invitation(await get_invitation_or_404(session, item.id)) for item in created]


async def get_invitation_or_404(session: AsyncSession, invitation_id: int) -> ProjectInvitationModel:
    result = await session.execute(
        select(ProjectInvitationModel)
        .options(*invitation_options())
        .where(ProjectInvitationModel.id == invitation_id)
    )
    invitation = result.scalars().first()
    if invitation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation not found")
    return invitation


def serialize_invitation(invitation: ProjectInvitationModel) -> ProjectInvitationSchema:
    return ProjectInvitationSchema(
        id=invitation.id,
        projectId=invitation.project_id,
        inviterId=invitation.inviter_id,
        inviteeId=invitation.invitee_id,
        status=invitation.status,
        projectLink=invitation.project_link,
        project=serialize_project(invitation.project) if invitation.project else None,
        createdAt=invitation.created_at,
        respondedAt=invitation.responded_at,
    )


@router.post("/invitations/{invitation_id}/accept", response_model=ProjectInvitationSchema)
async def accept_project_invitation(
    invitation_id: int,
    current_user: CurrentUserDep,
    session: AsyncSession = SessionDep,
) -> ProjectInvitationSchema:
    invitation = await get_invitation_or_404(session, invitation_id)
    if invitation.invitee_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invitation belongs to another user")
    if invitation.status != "pending":
        return serialize_invitation(invitation)

    project = invitation.project
    if project and not is_project_member(project, current_user.id):
        session.add(
            ProjectMemberModel(
                project_id=project.id,
                user_id=current_user.id,
                roles_json=dump_roles([MEMBER_ROLE]),
            )
        )

    invitation.status = "accepted"
    invitation.responded_at = datetime.utcnow()
    await session.commit()
    return serialize_invitation(await get_invitation_or_404(session, invitation.id))


@router.post("/invitations/{invitation_id}/decline", response_model=ProjectInvitationSchema)
async def decline_project_invitation(
    invitation_id: int,
    current_user: CurrentUserDep,
    session: AsyncSession = SessionDep,
) -> ProjectInvitationSchema:
    invitation = await get_invitation_or_404(session, invitation_id)
    if invitation.invitee_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invitation belongs to another user")
    if invitation.status == "pending":
        invitation.status = "declined"
        invitation.responded_at = datetime.utcnow()
        await session.commit()
    return serialize_invitation(await get_invitation_or_404(session, invitation.id))


@router.get("/notifications/list", response_model=list[NotificationSchema])
async def get_notifications(
    current_user: CurrentUserDep,
    session: AsyncSession = SessionDep,
) -> list[NotificationSchema]:
    result = await session.execute(
        select(NotificationModel)
        .options(selectinload(NotificationModel.invitation).options(*invitation_options()))
        .where(NotificationModel.user_id == current_user.id)
        .order_by(NotificationModel.created_at.desc())
    )
    return [serialize_notification(item) for item in result.scalars().all()]


def serialize_notification(notification: NotificationModel) -> NotificationSchema:
    return NotificationSchema(
        id=notification.id,
        type=notification.type,
        text=notification.text,
        link=notification.link,
        isRead=notification.is_read,
        createdAt=notification.created_at,
        invitation=serialize_invitation(notification.invitation) if notification.invitation else None,
    )


@router.post("/notifications/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_notification_read(
    notification_id: int,
    current_user: CurrentUserDep,
    session: AsyncSession = SessionDep,
) -> Response:
    notification = await session.get(NotificationModel, notification_id)
    if notification is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    if notification.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Notification belongs to another user")
    notification.is_read = True
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
