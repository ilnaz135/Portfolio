"""Pydantic schemas for the portfolio backend."""

from __future__ import annotations

from datetime import date, datetime
from typing import List

from pydantic import BaseModel, ConfigDict, Field


class ORMModel(BaseModel):
    """Base schema configured for SQLAlchemy models."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class UserDirectionCreateSchema(BaseModel):
    other_directions: str = Field(..., min_length=1, max_length=150)


class UserDirectionSchema(ORMModel, UserDirectionCreateSchema):
    id: int


class UserCourseCreateSchema(BaseModel):
    name_course: str = Field(..., min_length=1, max_length=200)
    url_course: str = Field(..., min_length=1, max_length=500)


class UserCourseSchema(ORMModel, UserCourseCreateSchema):
    id: int


class AchievementSummarySchema(ORMModel):
    name: str
    type: str
    date: date
    category: str
    status: str
    points: int


class UserPublicationCreateSchema(BaseModel):
    placement_date: date
    title: str = Field(..., min_length=1, max_length=300)
    publication_type: str = Field(..., min_length=1, max_length=120)
    indexation_date: date
    status: str = Field(..., min_length=1, max_length=120)
    points: int = Field(..., ge=0, le=1000)


class UserPublicationSchema(ORMModel, UserPublicationCreateSchema):
    id: int


class UserEventCreateSchema(BaseModel):
    placement_date: date
    title: str = Field(..., min_length=1, max_length=300)
    event_type: str = Field(..., min_length=1, max_length=120)
    event_date: str = Field(..., min_length=1, max_length=120)
    status: str = Field(..., min_length=1, max_length=120)
    points: int = Field(..., ge=0, le=1000)


class UserEventSchema(ORMModel, UserEventCreateSchema):
    id: int


class UserGrantCreateSchema(BaseModel):
    placement_date: date
    title: str = Field(..., min_length=1, max_length=300)
    work_type: str = Field(..., min_length=1, max_length=150)
    grant_year: int = Field(..., ge=1900, le=2100)
    status: str = Field(..., min_length=1, max_length=120)
    points: int = Field(..., ge=0, le=1000)


class UserGrantSchema(ORMModel, UserGrantCreateSchema):
    id: int


class UserIntellectualPropertyCreateSchema(BaseModel):
    placement_date: date
    title: str = Field(..., min_length=1, max_length=300)
    intellectual_type: str = Field(..., min_length=1, max_length=150)
    issue_date: date
    status: str = Field(..., min_length=1, max_length=120)
    points: int = Field(..., ge=0, le=1000)


class UserIntellectualPropertySchema(ORMModel, UserIntellectualPropertyCreateSchema):
    id: int


class UserInnovationCreateSchema(BaseModel):
    placement_date: date
    title: str = Field(..., min_length=1, max_length=300)
    implementation_year: int = Field(..., ge=1900, le=2100)
    status: str = Field(..., min_length=1, max_length=150)
    points: int = Field(..., ge=0, le=1000)


class UserInnovationSchema(ORMModel, UserInnovationCreateSchema):
    id: int


class UserScholarshipCreateSchema(BaseModel):
    placement_date: date
    scholarship_type: str = Field(..., min_length=1, max_length=300)
    academic_year: str = Field(..., min_length=1, max_length=50)
    status: str = Field(..., min_length=1, max_length=120)
    points: int = Field(..., ge=0, le=1000)


class UserScholarshipSchema(ORMModel, UserScholarshipCreateSchema):
    id: int


class UserInternshipCreateSchema(BaseModel):
    placement_date: date
    organization: str = Field(..., min_length=1, max_length=300)
    city: str = Field(..., min_length=1, max_length=120)
    start_date: date
    end_date: date
    status: str = Field(..., min_length=1, max_length=120)
    points: int = Field(..., ge=0, le=1000)


class UserInternshipSchema(ORMModel, UserInternshipCreateSchema):
    id: int


class UserAchievementCollectionsSchema(ORMModel):
    publications: List[UserPublicationSchema] = Field(default_factory=list)
    events: List[UserEventSchema] = Field(default_factory=list)
    grants: List[UserGrantSchema] = Field(default_factory=list)
    intellectual_properties: List[UserIntellectualPropertySchema] = Field(
        default_factory=list
    )
    innovations: List[UserInnovationSchema] = Field(default_factory=list)
    scholarships: List[UserScholarshipSchema] = Field(default_factory=list)
    internships: List[UserInternshipSchema] = Field(default_factory=list)
    scientific_achievements: List[AchievementSummarySchema] = Field(default_factory=list)


class UserAchievementsSchema(UserAchievementCollectionsSchema):
    pass


class UserCreateSchema(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6, max_length=255)
    email: str = Field(..., min_length=5, max_length=255)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    patronymic: str | None = Field(None, max_length=100)
    cloude_storage: str | None = Field(None, max_length=255)
    academic_direction: str = Field(..., max_length=150)
    user_directions: str | None = Field(None, max_length=500)
    class_: str = Field(..., alias="class", max_length=50)
    avg_score: float = Field(..., ge=0, le=100)

    model_config = ConfigDict(populate_by_name=True)


class UserUpdateSchema(BaseModel):
    password: str | None = Field(None, min_length=6, max_length=255)
    email: str | None = Field(None, min_length=5, max_length=255)
    first_name: str | None = Field(None, min_length=1, max_length=100)
    last_name: str | None = Field(None, min_length=1, max_length=100)
    patronymic: str | None = Field(None, max_length=100)
    cloude_storage: str | None = Field(None, max_length=255)
    academic_direction: str | None = Field(None, max_length=150)
    user_directions: str | None = Field(None, max_length=500)
    class_: str | None = Field(None, alias="class", max_length=50)
    avg_score: float | None = Field(None, ge=0, le=100)

    model_config = ConfigDict(populate_by_name=True)


class UserStackCreateSchema(BaseModel):
    stack: str = Field(..., min_length=1, max_length=100)


class UserStackSchema(ORMModel, UserStackCreateSchema):
    id: int


class UserSchema(UserAchievementCollectionsSchema):
    id: int
    username: str
    email: str
    user_directions: str | None
    first_name: str
    last_name: str
    patronymic: str | None
    cloude_storage: str | None
    academic_direction: str
    class_: str = Field(alias="class_")
    avg_score: float
    role: str
    is_active: bool
    last_login_at: datetime | None
    created_at: datetime
    directions: List[UserDirectionSchema] = Field(default_factory=list)
    courses: List[UserCourseSchema] = Field(default_factory=list)
    stacks: List[UserStackSchema] = Field(default_factory=list)


class AuthRegisterSchema(UserCreateSchema):
    remember_me: bool = False


class AuthLoginSchema(BaseModel):
    login: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=6, max_length=255)
    remember_me: bool = False


class AuthRefreshSchema(BaseModel):
    refresh_token: str = Field(..., min_length=20, max_length=255)


class AuthTokenSchema(BaseModel):
    token_type: str = "Bearer"
    access_token: str
    refresh_token: str
    access_expires_at: datetime
    refresh_expires_at: datetime


class AuthSessionSchema(AuthTokenSchema):
    user: UserSchema


class UsernameCheckSchema(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)


class EmailCheckSchema(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
