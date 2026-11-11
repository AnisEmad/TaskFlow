import datetime as dt
import os
import uuid
from contextlib import asynccontextmanager
from enum import Enum

import jwt
from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import DateTime, ForeignKey, String, Text, Uuid, select
from sqlalchemy.orm import Mapped, Session, mapped_column

from .db import Base, get_db, init_db

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"


def now():
    return dt.datetime.now(dt.timezone.utc)


class Status(str, Enum):
    todo = "todo"
    in_progress = "in_progress"
    done = "done"


class Project(Base):
    __tablename__ = "projects"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True)
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=now)


class Task(Base):
    __tablename__ = "tasks"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True)
    project_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("task_schema.projects.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default=Status.todo.value)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=now)


class ProjectIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = None


class ProjectOut(ProjectIn):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    created_at: dt.datetime


class TaskCreate(BaseModel):
    project_id: uuid.UUID
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    status: Status = Status.todo


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    status: Status | None = None


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    project_id: uuid.UUID
    title: str
    description: str | None
    status: Status
    created_at: dt.datetime


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title="TaskFlow Task Service", root_path=os.getenv("ROOT_PATH", ""), lifespan=lifespan)
bearer = HTTPBearer()


def user_id(creds: HTTPAuthorizationCredentials = Depends(bearer)) -> uuid.UUID:
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return uuid.UUID(payload["sub"])
    except (jwt.PyJWTError, ValueError, KeyError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")


def get_project(db: Session, pid: uuid.UUID, uid: uuid.UUID) -> Project:
    p = db.get(Project, pid)
    if not p or p.owner_id != uid:
        raise HTTPException(404, "Project not found")
    return p


def get_task(db: Session, tid: uuid.UUID, uid: uuid.UUID) -> Task:
    t = db.get(Task, tid)
    if not t or t.owner_id != uid:
        raise HTTPException(404, "Task not found")
    return t


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/projects", response_model=ProjectOut, status_code=201)
def create_project(data: ProjectIn, uid: uuid.UUID = Depends(user_id), db: Session = Depends(get_db)):
    p = Project(owner_id=uid, name=data.name, description=data.description)
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@app.get("/projects", response_model=list[ProjectOut])
def list_projects(uid: uuid.UUID = Depends(user_id), db: Session = Depends(get_db)):
    return db.scalars(select(Project).where(Project.owner_id == uid).order_by(Project.created_at.desc())).all()


@app.get("/projects/{project_id}", response_model=ProjectOut)
def read_project(project_id: uuid.UUID, uid: uuid.UUID = Depends(user_id), db: Session = Depends(get_db)):
    return get_project(db, project_id, uid)


@app.post("/tasks", response_model=TaskOut, status_code=201)
def create_task(data: TaskCreate, uid: uuid.UUID = Depends(user_id), db: Session = Depends(get_db)):
    get_project(db, data.project_id, uid)
    t = Task(
        owner_id=uid, project_id=data.project_id, title=data.title,
        description=data.description, status=data.status.value,
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


@app.get("/tasks", response_model=list[TaskOut])
def list_tasks(
    project_id: uuid.UUID | None = Query(default=None),
    uid: uuid.UUID = Depends(user_id),
    db: Session = Depends(get_db),
):
    q = select(Task).where(Task.owner_id == uid).order_by(Task.created_at)
    if project_id:
        q = q.where(Task.project_id == project_id)
    return db.scalars(q).all()


@app.patch("/tasks/{task_id}", response_model=TaskOut)
def update_task(task_id: uuid.UUID, data: TaskUpdate, uid: uuid.UUID = Depends(user_id), db: Session = Depends(get_db)):
    t = get_task(db, task_id, uid)
    for key, value in data.model_dump(exclude_unset=True, mode="json").items():
        if key in ("title", "status") and value is None:
            continue
        setattr(t, key, value)
    db.commit()
    db.refresh(t)
    return t


@app.delete("/tasks/{task_id}", status_code=204)
def delete_task(task_id: uuid.UUID, uid: uuid.UUID = Depends(user_id), db: Session = Depends(get_db)):
    db.delete(get_task(db, task_id, uid))
    db.commit()
