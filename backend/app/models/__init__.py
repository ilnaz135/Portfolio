"""SQLAlchemy models for the portfolio backend."""

from __future__ import annotations

import json
from datetime import date, datetime
from typing import Any, List

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class UserModel(Base):
    """Main user profile."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    # Legacy column kept for SQLite compatibility while auth uses password_hash.
    password: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    user_directions: Mapped[str | None] = mapped_column(Text, nullable=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    patronymic: Mapped[str | None] = mapped_column(String(100), nullable=True)
    cloude_storage: Mapped[str | None] = mapped_column(String(255), nullable=True)
    avatar_data_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    academic_direction: Mapped[str] = mapped_column(String(150), nullable=False)
    class_: Mapped[str] = mapped_column("class", String(50), nullable=False)
    group: Mapped[str] = mapped_column(
        "Group",
        String(50),
        nullable=False,
        default="unknown",
        server_default="unknown",
    )
    avg_score: Mapped[float] = mapped_column(Float, nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="user")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    directions: Mapped[List["UserDirectionModel"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    courses: Mapped[List["UserCourseModel"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    publications: Mapped[List["UserPublicationModel"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    events: Mapped[List["UserEventModel"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    grants: Mapped[List["UserGrantModel"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    intellectual_properties: Mapped[List["UserIntellectualPropertyModel"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    innovations: Mapped[List["UserInnovationModel"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    scholarships: Mapped[List["UserScholarshipModel"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    internships: Mapped[List["UserInternshipModel"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    stacks: Mapped[List["UserStackModel"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    auth_sessions: Mapped[List["AuthSessionModel"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )

    @property
    def scientific_achievements(self) -> list[dict[str, Any]]:
        """Backward-compatible flat achievement summary for the main profile page."""

        items: list[dict[str, Any]] = []

        def add_item(
            *,
            name: str,
            type_: str,
            achievement_date: date,
            category: str,
            status: str,
            points: int,
        ) -> None:
            items.append(
                {
                    "name": name,
                    "type": type_,
                    "date": achievement_date,
                    "category": category,
                    "status": status,
                    "points": points,
                }
            )

        for publication in self.publications:
            add_item(
                name=publication.title,
                type_=publication.publication_type,
                achievement_date=publication.indexation_date,
                category="publications",
                status=publication.status,
                points=publication.points,
            )

        for event in self.events:
            add_item(
                name=event.title,
                type_=event.event_type,
                achievement_date=event.placement_date,
                category="events",
                status=event.status,
                points=event.points,
            )

        for grant in self.grants:
            add_item(
                name=grant.title,
                type_=grant.work_type,
                achievement_date=grant.placement_date,
                category="grants",
                status=grant.status,
                points=grant.points,
            )

        for intellectual_property in self.intellectual_properties:
            add_item(
                name=intellectual_property.title,
                type_=intellectual_property.intellectual_type,
                achievement_date=intellectual_property.issue_date,
                category="intellectual_properties",
                status=intellectual_property.status,
                points=intellectual_property.points,
            )

        for innovation in self.innovations:
            add_item(
                name=innovation.title,
                type_="innovation",
                achievement_date=innovation.placement_date,
                category="innovations",
                status=innovation.status,
                points=innovation.points,
            )

        for scholarship in self.scholarships:
            add_item(
                name=scholarship.scholarship_type,
                type_="scholarship",
                achievement_date=scholarship.placement_date,
                category="scholarships",
                status=scholarship.status,
                points=scholarship.points,
            )

        for internship in self.internships:
            add_item(
                name=internship.organization,
                type_="internship",
                achievement_date=internship.start_date,
                category="internships",
                status=internship.status,
                points=internship.points,
            )

        items.sort(key=lambda item: item["date"], reverse=True)
        return items


class AuthSessionModel(Base):
    """Server-side access/refresh token session."""

    __tablename__ = "auth_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    access_token_hash: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        nullable=False,
    )
    refresh_token_hash: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        nullable=False,
    )
    access_expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    refresh_expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    remember_me: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    user_agent: Mapped[str | None] = mapped_column(String(500), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
    last_used_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    user: Mapped["UserModel"] = relationship(back_populates="auth_sessions")


class UserDirectionModel(Base):
    """Additional academic directions for a user."""

    __tablename__ = "users_directions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    other_directions: Mapped[str] = mapped_column(String(150), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    user: Mapped["UserModel"] = relationship(back_populates="directions")


class UserCourseModel(Base):
    """Completed or active courses."""

    __tablename__ = "users_courses"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    catalog_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    degree: Mapped[str | None] = mapped_column(String(80), nullable=True)
    program: Mapped[str | None] = mapped_column(String(180), nullable=True)
    course: Mapped[str] = mapped_column(String(300), nullable=False, default="")
    name_course: Mapped[str] = mapped_column(String(300), nullable=False)
    url_course: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    specializations_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    difficulty: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    user: Mapped["UserModel"] = relationship(back_populates="courses")

    @property
    def specializations(self) -> list[str]:
        try:
            value = json.loads(self.specializations_json or "[]")
        except json.JSONDecodeError:
            return []
        if not isinstance(value, list):
            return []
        return [str(item).strip() for item in value if str(item).strip()]

    @specializations.setter
    def specializations(self, value: list[str] | None) -> None:
        cleaned = [str(item).strip() for item in (value or []) if str(item).strip()]
        self.specializations_json = json.dumps(cleaned, ensure_ascii=False)


class UserPublicationModel(Base):
    """Publication records from the achievements page."""

    __tablename__ = "users_publications"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    placement_date: Mapped[date] = mapped_column(Date, nullable=False)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    publication_type: Mapped[str] = mapped_column(String(120), nullable=False)
    indexation_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(120), nullable=False)
    points: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    user: Mapped["UserModel"] = relationship(back_populates="publications")


class UserEventModel(Base):
    """Event and conference records."""

    __tablename__ = "users_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    placement_date: Mapped[date] = mapped_column(Date, nullable=False)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    event_type: Mapped[str] = mapped_column(String(120), nullable=False)
    event_date: Mapped[str] = mapped_column(String(120), nullable=False)
    status: Mapped[str] = mapped_column(String(120), nullable=False)
    points: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    user: Mapped["UserModel"] = relationship(back_populates="events")


class UserGrantModel(Base):
    """Grant records."""

    __tablename__ = "users_grants"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    placement_date: Mapped[date] = mapped_column(Date, nullable=False)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    work_type: Mapped[str] = mapped_column(String(150), nullable=False)
    grant_year: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(120), nullable=False)
    points: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    user: Mapped["UserModel"] = relationship(back_populates="grants")


class UserIntellectualPropertyModel(Base):
    """Intellectual property records."""

    __tablename__ = "users_intellectual_properties"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    placement_date: Mapped[date] = mapped_column(Date, nullable=False)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    intellectual_type: Mapped[str] = mapped_column(String(150), nullable=False)
    issue_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(120), nullable=False)
    points: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    user: Mapped["UserModel"] = relationship(back_populates="intellectual_properties")


class UserInnovationModel(Base):
    """Innovation activity records."""

    __tablename__ = "users_innovations"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    placement_date: Mapped[date] = mapped_column(Date, nullable=False)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    implementation_year: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(150), nullable=False)
    points: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    user: Mapped["UserModel"] = relationship(back_populates="innovations")


class UserScholarshipModel(Base):
    """Scholarship records."""

    __tablename__ = "users_scholarships"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    placement_date: Mapped[date] = mapped_column(Date, nullable=False)
    scholarship_type: Mapped[str] = mapped_column(String(300), nullable=False)
    academic_year: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(120), nullable=False)
    points: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    user: Mapped["UserModel"] = relationship(back_populates="scholarships")


class UserInternshipModel(Base):
    """Internship records."""

    __tablename__ = "users_internships"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    placement_date: Mapped[date] = mapped_column(Date, nullable=False)
    organization: Mapped[str] = mapped_column(String(300), nullable=False)
    city: Mapped[str] = mapped_column(String(120), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(120), nullable=False)
    points: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    user: Mapped["UserModel"] = relationship(back_populates="internships")


class UserStackModel(Base):
    """Technology stack items for a user."""

    __tablename__ = "users_stack"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    stack: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    user: Mapped["UserModel"] = relationship(back_populates="stacks")


class ProjectModel(Base):
    """Portfolio project stored in the database."""

    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(120), nullable=False)
    owner_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    team_lead_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    visibility: Mapped[str] = mapped_column(String(20), nullable=False, default="public")
    project_type: Mapped[str] = mapped_column(String(120), nullable=False)
    customer: Mapped[str] = mapped_column(String(150), nullable=False, default="")
    deadline_from: Mapped[date | None] = mapped_column(Date, nullable=True)
    deadline_to: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="in_progress")
    short_description: Mapped[str] = mapped_column(String(600), nullable=False)
    detailed_description_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    cloud_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    team_project_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    owner: Mapped["UserModel"] = relationship(foreign_keys=[owner_id])
    team_lead: Mapped["UserModel | None"] = relationship(foreign_keys=[team_lead_id])
    members: Mapped[List["ProjectMemberModel"]] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
    )
    stacks: Mapped[List["ProjectStackModel"]] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
    )
    invitations: Mapped[List["ProjectInvitationModel"]] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
    )


class ProjectMemberModel(Base):
    """Project member with one or more display roles."""

    __tablename__ = "project_members"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    roles_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    project: Mapped["ProjectModel"] = relationship(back_populates="members")
    user: Mapped["UserModel"] = relationship()


class ProjectStackModel(Base):
    """Technology stack item for a project."""

    __tablename__ = "project_stacks"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    stack: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    project: Mapped["ProjectModel"] = relationship(back_populates="stacks")


class ProjectInvitationModel(Base):
    """Invitation from a project owner/team lead to another user."""

    __tablename__ = "project_invitations"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    inviter_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    invitee_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    project_link: Mapped[str] = mapped_column(String(500), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
    responded_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    project: Mapped["ProjectModel"] = relationship(back_populates="invitations")
    inviter: Mapped["UserModel"] = relationship(foreign_keys=[inviter_id])
    invitee: Mapped["UserModel"] = relationship(foreign_keys=[invitee_id])
    notification: Mapped["NotificationModel | None"] = relationship(
        back_populates="invitation",
        cascade="all, delete-orphan",
    )


class NotificationModel(Base):
    """User notification, currently used for project invitations."""

    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    invitation_id: Mapped[int | None] = mapped_column(
        ForeignKey("project_invitations.id", ondelete="CASCADE"),
        nullable=True,
    )
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    text: Mapped[str] = mapped_column(String(500), nullable=False)
    link: Mapped[str] = mapped_column(String(500), nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    user: Mapped["UserModel"] = relationship()
    invitation: Mapped["ProjectInvitationModel | None"] = relationship(
        back_populates="notification",
    )
