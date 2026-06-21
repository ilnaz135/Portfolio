"""Pydantic schemas for the portfolio backend."""

from __future__ import annotations

from datetime import date, datetime
from typing import List

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, field_validator, model_validator


USERNAME_PATTERN = r"^[A-Za-z0-9_]+$"


def trim_text(value: str | None) -> str | None:
    return value.strip() if isinstance(value, str) else value


class ORMModel(BaseModel):
    """Base schema configured for SQLAlchemy models."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class UserDirectionCreateSchema(BaseModel):
    other_directions: str = Field(..., min_length=1, max_length=150)


class UserDirectionSchema(ORMModel, UserDirectionCreateSchema):
    id: int


class UserCourseCreateSchema(BaseModel):
    catalog_id: int | None = Field(
        default=None,
        validation_alias=AliasChoices("catalog_id", "catalogId"),
    )
    degree: str | None = Field(default=None, max_length=80)
    program: str | None = Field(default=None, max_length=180)
    course: str | None = Field(default=None, max_length=300)
    name_course: str | None = Field(default=None, max_length=300)
    url_course: str | None = Field(default="", max_length=500)
    specializations: List[str] = Field(default_factory=list)
    difficulty: float = Field(default=0.0, ge=0)

    @model_validator(mode="after")
    def normalize_course_names(self) -> "UserCourseCreateSchema":
        course = trim_text(self.course)
        name_course = trim_text(self.name_course)
        if not course:
            course = name_course
        if not name_course:
            name_course = course
        if not course or not name_course:
            raise ValueError("Course name is required")

        self.course = course
        self.name_course = name_course
        self.degree = trim_text(self.degree)
        self.program = trim_text(self.program)
        self.url_course = trim_text(self.url_course) or ""
        self.specializations = [
            item for item in (trim_text(str(value)) for value in self.specializations) if item
        ]
        return self


class UserCourseSchema(ORMModel, UserCourseCreateSchema):
    id: int
    created_at: datetime


class UserCourseUpdateSchema(BaseModel):
    catalog_id: int | None = Field(
        default=None,
        validation_alias=AliasChoices("catalog_id", "catalogId"),
    )
    degree: str | None = Field(default=None, max_length=80)
    program: str | None = Field(default=None, max_length=180)
    course: str | None = Field(default=None, max_length=300)
    name_course: str | None = Field(default=None, max_length=300)
    url_course: str | None = Field(default=None, max_length=500)
    specializations: List[str] | None = None
    difficulty: float | None = Field(default=None, ge=0)


class CourseCatalogItemSchema(BaseModel):
    id: int
    degree: str | None = ""
    program: str | None = ""
    course: str
    specializations: List[str] = Field(default_factory=list)
    difficulty: float


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

    _trim_strings = field_validator("title", "publication_type", "status")(trim_text)


class UserPublicationSchema(ORMModel, UserPublicationCreateSchema):
    id: int


class UserEventCreateSchema(BaseModel):
    placement_date: date
    title: str = Field(..., min_length=1, max_length=300)
    event_type: str = Field(..., min_length=1, max_length=120)
    event_date: str = Field(..., min_length=1, max_length=120)
    status: str = Field(..., min_length=1, max_length=120)
    points: int = Field(..., ge=0, le=1000)

    _trim_strings = field_validator("title", "event_type", "event_date", "status")(trim_text)


class UserEventSchema(ORMModel, UserEventCreateSchema):
    id: int


class UserGrantCreateSchema(BaseModel):
    placement_date: date
    title: str = Field(..., min_length=1, max_length=300)
    work_type: str = Field(..., min_length=1, max_length=150)
    grant_year: int = Field(..., ge=1900, le=2100)
    status: str = Field(..., min_length=1, max_length=120)
    points: int = Field(..., ge=0, le=1000)

    _trim_strings = field_validator("title", "work_type", "status")(trim_text)


class UserGrantSchema(ORMModel, UserGrantCreateSchema):
    id: int


class UserIntellectualPropertyCreateSchema(BaseModel):
    placement_date: date
    title: str = Field(..., min_length=1, max_length=300)
    intellectual_type: str = Field(..., min_length=1, max_length=150)
    issue_date: date
    status: str = Field(..., min_length=1, max_length=120)
    points: int = Field(..., ge=0, le=1000)

    _trim_strings = field_validator("title", "intellectual_type", "status")(trim_text)


class UserIntellectualPropertySchema(ORMModel, UserIntellectualPropertyCreateSchema):
    id: int


class UserInnovationCreateSchema(BaseModel):
    placement_date: date
    title: str = Field(..., min_length=1, max_length=300)
    implementation_year: int = Field(..., ge=1900, le=2100)
    status: str = Field(..., min_length=1, max_length=150)
    points: int = Field(..., ge=0, le=1000)

    _trim_strings = field_validator("title", "status")(trim_text)


class UserInnovationSchema(ORMModel, UserInnovationCreateSchema):
    id: int


class UserScholarshipCreateSchema(BaseModel):
    placement_date: date
    scholarship_type: str = Field(..., min_length=1, max_length=300)
    academic_year: str = Field(..., min_length=1, max_length=50)
    status: str = Field(..., min_length=1, max_length=120)
    points: int = Field(..., ge=0, le=1000)

    _trim_strings = field_validator("scholarship_type", "academic_year", "status")(trim_text)


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

    _trim_strings = field_validator("organization", "city", "status")(trim_text)


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
    username: str = Field(..., min_length=3, max_length=50, pattern=USERNAME_PATTERN)
    password: str = Field(..., min_length=6, max_length=255)
    email: str = Field(..., min_length=5, max_length=255)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    patronymic: str | None = Field(None, max_length=100)
    cloude_storage: str | None = Field(None, max_length=255)
    avatar_data_url: str | None = Field(None, max_length=2_000_000)
    academic_direction: str = Field("", max_length=150)
    user_directions: str | None = Field("", max_length=500)
    class_: str = Field("", alias="class", max_length=50)
    group: str = Field(
        "",
        validation_alias=AliasChoices("group", "Group"),
        max_length=50,
    )
    avg_score: float = Field(0.0, ge=0, le=100)
    onboarding_completed: bool = False

    model_config = ConfigDict(populate_by_name=True)


class UserUpdateSchema(BaseModel):
    username: str | None = Field(None, min_length=3, max_length=50, pattern=USERNAME_PATTERN)
    password: str | None = Field(None, min_length=6, max_length=255)
    email: str | None = Field(None, min_length=5, max_length=255)
    first_name: str | None = Field(None, min_length=1, max_length=100)
    last_name: str | None = Field(None, min_length=1, max_length=100)
    patronymic: str | None = Field(None, max_length=100)
    cloude_storage: str | None = Field(None, max_length=255)
    avatar_data_url: str | None = Field(None, max_length=2_000_000)
    academic_direction: str | None = Field(None, max_length=150)
    user_directions: str | None = Field(None, max_length=500)
    class_: str | None = Field(None, alias="class", max_length=50)
    group: str | None = Field(
        None,
        validation_alias=AliasChoices("group", "Group"),
        max_length=50,
    )
    avg_score: float | None = Field(None, ge=0, le=100)
    onboarding_completed: bool | None = None

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
    avatar_data_url: str | None
    academic_direction: str
    class_: str = Field(alias="class_")
    group: str
    avg_score: float
    role: str
    is_active: bool
    onboarding_completed: bool
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
    username: str = Field(..., min_length=3, max_length=50, pattern=USERNAME_PATTERN)


class EmailCheckSchema(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)


class ProjectPersonSchema(BaseModel):
    id: int
    username: str
    firstName: str
    lastName: str
    patronymic: str | None = ""


class ProjectMemberSchema(ProjectPersonSchema):
    userId: int
    role: str
    roles: List[str] = Field(default_factory=list)


class ProjectMemberRolesUpdateSchema(BaseModel):
    roles: List[str] = Field(default_factory=list, max_length=10)

    @field_validator("roles")
    @classmethod
    def normalize_roles(cls, roles: List[str]) -> List[str]:
        unique_roles: list[str] = []
        for role in roles:
            normalized = trim_text(str(role))
            if not normalized:
                continue
            if len(normalized) > 100:
                raise ValueError("Role is too long")
            if normalized not in unique_roles:
                unique_roles.append(normalized)
        return unique_roles


class ProjectSchema(BaseModel):
    id: int
    slug: str
    ownerUsername: str
    fullName: str
    visibility: str
    projectType: str
    customer: str
    deadlineFrom: date | None
    deadlineTo: date | None
    status: str
    shortDescription: str
    detailedDescription: str
    cloudUrl: str | None
    teamProjectUrl: str | None
    stacks: List[str] = Field(default_factory=list)
    owner: ProjectPersonSchema
    teamLead: ProjectPersonSchema | None = None
    members: List[ProjectMemberSchema] = Field(default_factory=list)
    memberCount: int
    createdAt: datetime
    updatedAt: datetime


class ProjectCreateSchema(BaseModel):
    slug: str = Field(..., min_length=1, max_length=120)
    project_type: str = Field(
        ...,
        validation_alias=AliasChoices("projectType", "project_type"),
        min_length=1,
        max_length=120,
    )
    short_description: str = Field(
        ...,
        validation_alias=AliasChoices("shortDescription", "short_description"),
        min_length=1,
        max_length=600,
    )
    customer: str = Field("", max_length=150)
    deadline_from: date | None = Field(
        None,
        validation_alias=AliasChoices("deadlineFrom", "deadline_from"),
    )
    deadline_to: date | None = Field(
        None,
        validation_alias=AliasChoices("deadlineTo", "deadline_to"),
    )
    status: str = Field("in_progress", max_length=50)
    detailed_description: str = Field(
        "",
        validation_alias=AliasChoices("detailedDescription", "detailed_description"),
        max_length=1_000_000,
    )
    cloud_url: str | None = Field(
        None,
        validation_alias=AliasChoices("cloudUrl", "cloud_url"),
        max_length=500,
    )
    team_project_url: str | None = Field(
        None,
        validation_alias=AliasChoices("teamProjectUrl", "team_project_url"),
        max_length=500,
    )
    visibility: str = Field("public", max_length=20)
    stacks: List[str] = Field(default_factory=list, max_length=30)

    model_config = ConfigDict(populate_by_name=True)

    _trim_strings = field_validator(
        "slug",
        "project_type",
        "short_description",
        "customer",
        "status",
        "cloud_url",
        "team_project_url",
        "visibility",
    )(trim_text)

    @field_validator("deadline_from", "deadline_to", mode="before")
    @classmethod
    def empty_date_to_none(cls, value):
        return None if value == "" else value


class ProjectUpdateSchema(BaseModel):
    slug: str | None = Field(None, min_length=1, max_length=120)
    project_type: str | None = Field(
        None,
        validation_alias=AliasChoices("projectType", "project_type"),
        min_length=1,
        max_length=120,
    )
    short_description: str | None = Field(
        None,
        validation_alias=AliasChoices("shortDescription", "short_description"),
        min_length=1,
        max_length=600,
    )
    customer: str | None = Field(None, max_length=150)
    deadline_from: date | None = Field(
        None,
        validation_alias=AliasChoices("deadlineFrom", "deadline_from"),
    )
    deadline_to: date | None = Field(
        None,
        validation_alias=AliasChoices("deadlineTo", "deadline_to"),
    )
    status: str | None = Field(None, max_length=50)
    detailed_description: str | None = Field(
        None,
        validation_alias=AliasChoices("detailedDescription", "detailed_description"),
        max_length=1_000_000,
    )
    cloud_url: str | None = Field(
        None,
        validation_alias=AliasChoices("cloudUrl", "cloud_url"),
        max_length=500,
    )
    team_project_url: str | None = Field(
        None,
        validation_alias=AliasChoices("teamProjectUrl", "team_project_url"),
        max_length=500,
    )
    visibility: str | None = Field(None, max_length=20)
    stacks: List[str] | None = Field(None, max_length=30)
    team_lead_id: int | None = Field(
        None,
        validation_alias=AliasChoices("teamLeadId", "team_lead_id"),
    )

    model_config = ConfigDict(populate_by_name=True)

    _trim_strings = field_validator(
        "slug",
        "project_type",
        "short_description",
        "customer",
        "status",
        "cloud_url",
        "team_project_url",
        "visibility",
    )(trim_text)

    @field_validator("deadline_from", "deadline_to", mode="before")
    @classmethod
    def empty_date_to_none(cls, value):
        return None if value == "" else value


class ProjectListSchema(BaseModel):
    items: List[ProjectSchema]
    total: int
    limit: int
    offset: int


class ProjectInvitationCreateSchema(BaseModel):
    invitee_user_id: int = Field(
        ...,
        validation_alias=AliasChoices("inviteeUserId", "invitee_user_id"),
    )
    project_ids: List[int] = Field(
        ...,
        validation_alias=AliasChoices("projectIds", "project_ids"),
        min_length=1,
        max_length=50,
    )

    model_config = ConfigDict(populate_by_name=True)


class ProjectInvitationSchema(BaseModel):
    id: int
    projectId: int
    inviterId: int
    inviteeId: int
    status: str
    projectLink: str
    project: ProjectSchema | None = None
    createdAt: datetime
    respondedAt: datetime | None = None


class NotificationSchema(BaseModel):
    id: int
    type: str
    text: str
    link: str
    isRead: bool
    createdAt: datetime
    invitation: ProjectInvitationSchema | None = None
