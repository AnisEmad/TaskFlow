import os

os.environ["DATABASE_URL"] = "sqlite://"
os.environ["JWT_SECRET"] = "test-secret-key-for-unit-tests-only"

import datetime as dt
import uuid

import jwt
import pytest
from fastapi.testclient import TestClient

from app.main import app


def make_headers(uid=None):
    exp = dt.datetime.now(dt.timezone.utc) + dt.timedelta(minutes=5)
    token = jwt.encode({"sub": str(uid or uuid.uuid4()), "exp": exp}, os.environ["JWT_SECRET"], algorithm="HS256")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def headers():
    return make_headers()
