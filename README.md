# TaskFlow

TaskFlow is a multi-tier, containerized task management application designed to streamline workflow tracking, team collaboration, and task lifecycle management. This repository follows a microservices/multi-container architecture, separating concerns between the client-facing frontend, the core backend API, and persistent data storage.

---

## System Architecture & Data Flow

TaskFlow operates on a classic 3-tier application architecture communicating over an internal Docker bridge network:

```
+------------------+         REST API         +------------------+         SQL / TCP         +------------------+
|                  |  --------------------->  |                  |  --------------------->  |                  |
|     Frontend     |                          |   Backend API    |                          |     Database     |
|   (Client UI)    |  <---------------------  |  (Business Logic)|  <---------------------  | (Persistent Data)|
+------------------+          JSON            +------------------+          Data            +------------------+
```

1. **Frontend Layer**: Serves the user interface, handling user interactions, routing, and rendering task boards. It communicates asynchronously with the backend via HTTP/REST requests.
2. **Backend API Layer**: Processes incoming business logic, validates payloads, manages authentication, and executes database queries. 
3. **Database Layer**: Persists user profiles, task states, metadata, and relational constraints securely using a managed relational database engine.

---

## Services Breakdown & Containerization Guide

Since the `Dockerfile` for each service has been removed, use the specifications below to understand what each service requires and how to construct your custom Dockerfiles.

### 1. Frontend Service (`/frontend`)
* **Role**: Client-side application interface.
* **Tech Stack**: Typically built with a modern frontend framework (e.g., React/Vite, Vue, or Next.js) or static HTML/JS/CSS assets.
* **How it Works**: 
  * In development, it runs a hot-reloading dev server.
  * In production, source files must be compiled/bundled into static HTML, JS, and CSS artifacts, then served via a high-performance web server like **Nginx**.
* **Dockerfile Requirements for Your Implementation**:
  * **Multi-stage build recommended**: 
    1. *Build Stage*: Use a node base image (`node:alpine`), copy `package.json` and lock files, run `npm install`, copy source code, and run the build command (e.g., `npm run build`).
    2. *Production Stage*: Use a lightweight web server image (`nginx:alpine`), copy the compiled static assets from the build stage into Nginx's public directory (`/usr/share/nginx/html`), and expose port `80`.

---

### 2. Backend Service (`/backend`)
* **Role**: Core application server handling REST endpoints, middleware, and database ORM/drivers.
* **Tech Stack**: Typically built using Node.js (Express), Python (FastAPI/Flask), or Go.
* **How it Works**:
  * Listens on a designated TCP port (e.g., `5000` or `3000`).
  * Connects to the database using environment variables for host, port, user, password, and database name.
  * Runs database migrations or initializes connection pools upon startup.
* **Dockerfile Requirements for Your Implementation**:
  * Choose an appropriate official runtime base image (e.g., `node:18-alpine`, `python:3.11-slim`, or `golang:1.21-alpine`).
  * Set a working directory inside the container (`/app`).
  * Copy dependency manifests first to leverage Docker layer caching, then install dependencies.
  * Copy the remaining source code.
  * Define the correct container entrypoint or startup command (e.g., `CMD ["node", "src/index.js"]` or `CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5000"]`).
  * Expose the application port.

---

### 3. Database Service (`/db` or external image)
* **Role**: Persistent relational data store.
* **Tech Stack**: MySQL or PostgreSQL.
* **How it Works**:
  * Stores tables for users, tasks, categories, and audit logs.
  * Initializes root/admin credentials and creates the default application database via initialization environment variables.
* **Dockerfile / Containerization Notes**:
  * While you can use official images directly (`mysql:8.0` or `postgres:15-alpine`), if you choose to write a custom Dockerfile for it, you would typically extend the official image to inject custom `.sql` initialization scripts or custom configuration files (`my.cnf` / `postgresql.conf`) into the container entrypoint directory (`/docker-entrypoint-initdb.d/`).

---

## Environment Variables

To run the application successfully, ensure your environment variables are properly configured (via `.env` files or Docker Compose environment blocks):

| Variable | Description | Example |
| :--- | :--- | :--- |
| `PORT` | Port on which the backend server listens | `5000` |
| `DB_HOST` | Hostname of the database container or service | `db` or `localhost` |
| `DB_PORT` | Database listening port | `3306` (MySQL) or `5432` (Postgres) |
| `DB_USER` | Database username | `taskflow_user` |
| `DB_PASSWORD` | Database user password | `secret_password` |
| `DB_NAME` | Name of the application database | `taskflow_db` |
| `REACT_APP_API_URL` / `VITE_API_URL` | Endpoint URL for frontend-to-backend communication | `http://localhost:5000` |

---

## Getting Started Locally

If you want to run services natively during development:

1. **Database**: Ensure your local database service is running and create the required database instance.
2. **Backend**:
   ```bash
   cd backend
   # Install dependencies
   npm install # or pip install -r requirements.txt
   # Configure environment variables
   cp .env.example .env
   # Start the server
   npm run dev # or python main.py
   ```
3. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
