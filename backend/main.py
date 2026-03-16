from typing import Annotated
from fastapi import Depends, FastAPI
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
import uvicorn


app = FastAPI()
engine = create_async_engine("sqlite+aiosqlite:///portfolio.db", echo=True)
new_async_session = async_sessionmaker(engine, expire_on_commit=False)

async def get_session():
  async with new_async_session() as session:
    yield session


SessionDep = Annotated[AsyncSession, Depends(get_session)]

class Base(DeclarativeBase):
  pass


class UserModel(Base):
  __tablename__ = "users"

  id: Mapped[int] = mapped_column(primary_key=True)
  username: Mapped[str]
  firstname: Mapped[str]
  lastname: Mapped[str]
  surname: Mapped[str]
  direction: Mapped[str]
  course: Mapped[str]
  avg_score: Mapped[int]


class UserSchema(BaseModel):
  username: str
  firstname: str
  lastname: str
  surname: str


class UserGetSchema(BaseModel):
  id: int
  username: str
  firstname: str
  lastname: str
  surname: str
  direction: str
  course: str
  avg_score: str

@app.post("/setup")
async def setup_database():
  async with engine.begin() as conn:
    await conn.run_sync(Base.metadata.drop_all)
    await conn.run_sync(Base.metadata.create_all)

@app.post("/users{user_id}")
async def add_user(user: UserSchema, session: SessionDep) -> UserSchema:
  new_user = UserModel(
    username = user.username,
    firstname = user.firstname,
    lastname = user.lastname,
    surname = user.surname,
  )
  session.add(new_user)
  await session.commit()

  return {"success": True, "message": "Пользователь успешно добавлен"}


@app.get("/users")
async def get_user(user_id: int, session: SessionDep) -> UserGetSchema:
  user = session.get(UserModel, user_id)

  return user

if __name__ == "__main__":
  uvicorn.run("main:app", reload=True)