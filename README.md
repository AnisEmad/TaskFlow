# TaskFlow

A small project and task manager: React + TypeScript (Vite) frontend, two FastAPI microservices (Auth, Tasks), one PostgreSQL instance with two schemas, and an Nginx API gateway, all run with Docker Compose.

## Run

Requires Docker with Compose v2.

```bash
cp .env.example .env      # then set POSTGRES_PASSWORD and JWT_SECRET (openssl rand -hex 32)
docker compose up --build
```

Open <http://localhost:8080> (change `GATEWAY_PORT` in `.env` to use another port), register an account, and start creating projects and tasks.

| URL | What |
|---|---|
| `http://localhost:8080/` | Web app |
| `http://localhost:8080/api/auth/docs` | Auth Service Swagger UI |
| `http://localhost:8080/api/tasks/docs` | Task Service Swagger UI |

## Layout

```
frontend/        React + TS + Vite app (served by its own nginx container)
services/auth/   Auth Service (register, login, JWT) -> auth_schema
services/tasks/  Task Service (projects, tasks)      -> task_schema
nginx/           API gateway config
docs/            Architecture diagram
```

## API summary

Auth (`/api/auth`): `POST /register`, `POST /login`, `GET /me`.
Tasks (`/api/tasks`, Bearer token required): `GET|POST /projects`, `GET /projects/{id}`, `GET|POST /tasks` (`?project_id=`), `PATCH|DELETE /tasks/{id}`.
Task statuses: `todo`, `in_progress`, `done`.

The Task Service validates JWTs locally with the shared `JWT_SECRET`; it never calls the Auth Service. Users only see their own projects and tasks.

## Tests

Tests use an in-memory SQLite database, so no Postgres is needed:

```bash
cd services/auth  && pip install -r requirements-dev.txt && pytest
cd services/tasks && pip install -r requirements-dev.txt && pytest
```

## Frontend development

```bash
cd frontend && npm install && npm run dev   # proxies /api to http://localhost:8080
```

## Notes

- Tables are created on service startup (no migrations, to keep things simple).
- Data persists in the `pgdata` Docker volume; remove it with `docker compose down -v`.
