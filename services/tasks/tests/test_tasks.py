from .conftest import make_headers


def test_requires_auth(client):
    assert client.get("/projects").status_code in (401, 403)
    assert client.get("/projects", headers={"Authorization": "Bearer bad"}).status_code == 401


def test_project_and_task_flow(client, headers):
    r = client.post("/projects", json={"name": "Website"}, headers=headers)
    assert r.status_code == 201
    pid = r.json()["id"]
    assert len(client.get("/projects", headers=headers).json()) == 1

    r = client.post("/tasks", json={"project_id": pid, "title": "Write copy"}, headers=headers)
    assert r.status_code == 201 and r.json()["status"] == "todo"
    tid = r.json()["id"]

    r = client.patch(f"/tasks/{tid}", json={"status": "in_progress"}, headers=headers)
    assert r.json()["status"] == "in_progress"
    r = client.patch(f"/tasks/{tid}", json={"title": "Write better copy", "status": "done"}, headers=headers)
    assert r.json()["title"] == "Write better copy" and r.json()["status"] == "done"

    assert len(client.get(f"/tasks?project_id={pid}", headers=headers).json()) == 1
    assert client.delete(f"/tasks/{tid}", headers=headers).status_code == 204
    assert client.get("/tasks", headers=headers).json() == []


def test_invalid_status_rejected(client, headers):
    pid = client.post("/projects", json={"name": "P"}, headers=headers).json()["id"]
    r = client.post("/tasks", json={"project_id": pid, "title": "x", "status": "bogus"}, headers=headers)
    assert r.status_code == 422


def test_users_cannot_see_each_others_data(client, headers):
    pid = client.post("/projects", json={"name": "Private"}, headers=headers).json()["id"]
    other = make_headers()
    assert client.get("/projects", headers=other).json() == []
    assert client.get(f"/projects/{pid}", headers=other).status_code == 404
    r = client.post("/tasks", json={"project_id": pid, "title": "x"}, headers=other)
    assert r.status_code == 404
