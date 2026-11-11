import os
import time

from sqlalchemy import MetaData, create_engine, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.pool import StaticPool

URL = os.environ["DATABASE_URL"]
SCHEMA = "auth_schema"

if URL.startswith("sqlite"):  # used by tests only
    engine = create_engine(URL, connect_args={"check_same_thread": False}, poolclass=StaticPool)
    engine = engine.execution_options(schema_translate_map={SCHEMA: None})
else:
    engine = create_engine(URL, pool_pre_ping=True)

SessionLocal = sessionmaker(bind=engine, autoflush=False)


class Base(DeclarativeBase):
    metadata = MetaData(schema=SCHEMA)


def init_db():
    for attempt in range(30):
        try:
            with engine.begin() as conn:
                if engine.dialect.name == "postgresql":
                    conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS {SCHEMA}"))
                Base.metadata.create_all(conn)
            return
        except OperationalError:
            if attempt == 29:
                raise
            time.sleep(2)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
