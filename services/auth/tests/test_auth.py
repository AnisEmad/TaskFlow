CREDS = {"email": "Ann@example.com", "password": "password123"}


def test_register_login_me(client):
    r = client.post("/register", json=CREDS)
    assert r.status_code == 201
    assert r.json()["email"] == "ann@example.com"
    assert "password" not in r.text

    r = client.post("/login", json=CREDS)
    assert r.status_code == 200
    token = r.json()["access_token"]

    r = client.get("/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["email"] == "ann@example.com"


def test_duplicate_register(client):
    client.post("/register", json=CREDS)
    assert client.post("/register", json=CREDS).status_code == 409


def test_wrong_password(client):
    client.post("/register", json=CREDS)
    r = client.post("/login", json={**CREDS, "password": "wrong-password"})
    assert r.status_code == 401


def test_me_requires_valid_token(client):
    assert client.get("/me", headers={"Authorization": "Bearer nope"}).status_code == 401
