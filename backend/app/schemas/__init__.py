"""Pydantic schemas for the portfolio backend."""

from __future__ import annotations

from datetime import date
from typing import List

from pydantic import BaseModel, Field


class UserDirectionCreateSchema(BaseModel):
    other_directions: str = Field(..., min_length=1, max_length=150)


class UserDirectionSchema(UserDirectionCreateSchema):
    id: int

    class Config:
        from_attributes = True


class UserCourseCreateSchema(BaseModel):
    name_course: str = Field(..., min_length=1, max_length=200)
    url_course: str = Field(..., min_length=1, max_length=500)


class UserCourseSchema(UserCourseCreateSchema):
    id: int

    class Config:
        from_attributes = True


class AchievementSummarySchema(BaseModel):
    name: str
    type: str
    date: date
    category: str
    status: str
    points: int

    class Config:
        from_attributes = True


class UserPublicationCreateSchema(BaseModel):
    placement_date: date
    title: str = Field(..., min_length=1, max_length=300)
    publication_type: str = Field(..., min_length=1, max_length=120)
    indexation_date: date
    status: str = Field(..., min_length=1, max_length=120)
    points: int = Field(..., ge=0, le=1000)


class UserPublicationSchema(UserPublicationCreateSchema):
    id: int

    class Config:
        from_attributes = True


class UserEventCreateSchema(BaseModel):
    placement_date: date
    title: str = Field(..., min_length=1, max_length=300)
    event_type: str = Field(..., min_length=1, max_length=120)
    event_date: str = Field(..., min_length=1, max_length=120)
    status: str = Field(..., min_length=1, max_length=120)
    points: int = Field(..., ge=0, le=1000)


class UserEventSchema(UserEventCreateSchema):
    id: int

    class Config:
        from_attributes = True


class UserGrantCreateSchema(BaseModel):
    placement_date: date
    title: str = Field(..., min_length=1, max_length=300)
    work_type: str = Field(..., min_length=1, max_length=150)
    grant_year: int = Field(..., ge=1900, le=2100)
    status: str = Field(..., min_length=1, max_length=120)
    points: int = Field(..., ge=0, le=1000)


class UserGrantSchema(UserGrantCreateSchema):
    id: int

    class Config:
        from_attributes = True


class UserIntellectualPropertyCreateSchema(BaseModel):
    placement_date: date
    title: str = Field(..., min_length=1, max_length=300)
    intellectual_type: str = Field(..., min_length=1, max_length=150)
    issue_date: date
    status: str = Field(..., min_length=1, max_length=120)
    points: int = Field(..., ge=0, le=1000)


class UserIntellectualPropertySchema(UserIntellectualPropertyCreateSchema):
    id: int

    class Config:
        from_attributes = True


class UserInnovationCreateSchema(BaseModel):
    placement_date: date
    title: str = Field(..., min_length=1, max_length=300)
    implementation_year: int = Field(..., ge=1900, le=2100)
    status: str = Field(..., min_length=1, max_length=150)
    points: int = Field(..., ge=0, le=1000)


class UserInnovationSchema(UserInnovationCreateSchema):
    id: int

    class Config:
        from_attributes = True


class UserScholarshipCreateSchema(BaseModel):
    placement_date: date
    scholarship_type: str = Field(..., min_length=1, max_length=300)
    academic_year: str = Field(..., min_length=1, max_length=50)
    status: str = Field(..., min_length=1, max_length=120)
    points: int = Field(..., ge=0, le=1000)


class UserScholarshipSchema(UserScholarshipCreateSchema):
    id: int

    class Config:
        from_attributes = True


class UserInternshipCreateSchema(BaseModel):
    placement_date: date
    organization: str = Field(..., min_length=1, max_length=300)
    city: str = Field(..., min_length=1, max_length=120)
    start_date: date
    end_date: date
    status: str = Field(..., min_length=1, max_length=120)
    points: int = Field(..., ge=0, le=1000)


class UserInternshipSchema(UserInternshipCreateSchema):
    id: int

    class Config:
        from_attributes = True


class UserAchievementCollectionsSchema(BaseModel):
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

    class Config:
        from_attributes = True


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

    class Config:
        populate_by_name = True


class UserUpdateSchema(BaseModel):
    password: str | None = Field(None, min_length=6, max_length=255)
    email: str | None = Field(None, min_length=5, max_length=255)
    first_name: str | None = Field(None, min_length=1, max_length=100)
    last_name: str | None = Field(None, min_length=1, max_length=100)
    patronymic: str | None = Field(None, max_length=100)
    cloude_storage: str | None = Field(None, max_length=255)
    academic_direction: str | None = Field(None, min_length=1, max_length=150)
    user_directions: str | None = Field(None, max_length=500)
    class_: str | None = Field(None, alias="class", min_length=1, max_length=50)
    avg_score: float | None = Field(None, ge=0, le=100)

    class Config:
        populate_by_name = True


class UserStackCreateSchema(BaseModel):
    stack: str = Field(..., min_length=1, max_length=100)


class UserStackSchema(UserStackCreateSchema):
    id: int

    class Config:
        from_attributes = True


class UserSchema(UserAchievementCollectionsSchema):
    id: int
    username: str
    password: str
    email: str
    user_directions: str | None
    first_name: str
    last_name: str
    patronymic: str | None
    cloude_storage: str | None
    academic_direction: str
    class_: str = Field(alias="class_")
    avg_score: float
    directions: List[UserDirectionSchema] = Field(default_factory=list)
    courses: List[UserCourseSchema] = Field(default_factory=list)
    stacks: List[UserStackSchema] = Field(default_factory=list)

    class Config:
        from_attributes = True
        populate_by_name = True


class UserLoginSchema(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6, max_length=255)


class UserEmailLoginSchema(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=6, max_length=255)


class UsernameCheckSchema(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)


class EmailCheckSchema(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
