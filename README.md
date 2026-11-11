# TaskFlow

TaskFlow is a multi-tier task management application designed for workflow tracking, team collaboration, and task lifecycle management. The application follows a microservices-inspired architecture, separating the client-facing user interface, the core backend API service, and persistent relational data storage.

---

## Architecture & System Overview

The application is structured around a traditional three-tier architecture where services communicate over an internal network:

```
+------------------+         REST API         +------------------+         SQL / TCP         +------------------+
|                  |  --------------------->  |                  |  --------------------->  |                  |
|     Frontend     |                          |   Backend API    |                          |     Database     |
|   (Client UI)    |  <---------------------  |  (Business Logic)|  <---------------------  | (Persistent Data)|
+------------------+          JSON            +------------------+          Data            +------------------+
```

1. **Frontend Layer**: Client-side single-page application responsible for rendering the user interface, managing local UI state, and interacting with the backend API via asynchronous HTTP requests.
2. **Backend API Layer**: Core application server that exposes RESTful endpoints, handles business logic, validates payloads, enforces authentication/authorization, and executes database operations.
3. **Database Layer**: Relational data store persisting users, tasks, categories, and application state.

---

## Repository Structure

```
TaskFlow/
├── frontend/           # Client-side application source code
├── backend/            # Server-side API application source code
└── db/                 # Database initialization scripts and configuration
```

---

## Services & Technical Requirements

### 1. Frontend (`/frontend`)
* **Description**: The user interface layer built with modern web technologies.
* **Dependencies & Runtime**: 
  * Node.js runtime environment (e.g., Node 18+).
  * Package manager (`npm` or `yarn`).
* **Configuration**:
  * Requires an environment variable pointing to the backend API base URL (e.g., `VITE_API_URL` or `REACT_APP_API_URL`).
* **Build & Execution**:
  * Development server command (e.g., `npm run dev`).
  * Production build command (e.g., `npm run build`), which outputs static assets suitable for serving via a web server like Nginx.

### 2. Backend (`/backend`)
* **Description**: The server application processing incoming API requests and database queries.
* **Dependencies & Runtime**:
  * Language runtime (e.g., Node.js/Express, Python/FastAPI, or Go).
  * Package manager or dependency manifest (`package.json`, `requirements.txt`, or `go.mod`).
* **Configuration**:
  * Relies on environment variables for database connection parameters and server port configuration.
* **Build & Execution**:
  * Package installation command.
  * Application startup command (e.g., `npm start` or `python main.py`).

### 3. Database (`/db`)
* **Description**: Relational database management system (MySQL or PostgreSQL).
* **Requirements**:
  * Compatible database server instance.
  * Initialization schema scripts for tables, indexes, and initial constraints.

---

## Environment Variables

Create a configuration file (such as `.env`) based on your deployment requirements. The application expects the following configuration keys:

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | Port number for the backend server | `5000` |
| `DB_HOST` | Database server hostname or IP | `localhost` |
| `DB_PORT` | Database server listening port | `3306` (MySQL) or `5432` (Postgres) |
| `DB_USER` | Database authentication username | `app_user` |
| `DB_PASSWORD` | Database authentication password | `secure_password` |
| `DB_NAME` | Target database instance name | `taskflow` |
| `API_URL` | Frontend-to-backend communication endpoint | `http://localhost:5000` |

---

## Local Development Setup

To run the services natively for development and testing:

1. **Database Setup**:
   * Start your database service and create an empty database instance matching your configuration.

2. **Backend Setup**:
   ```bash
   cd backend
   # Install dependencies
   npm install
   # Configure environment variables (.env)
   # Start the server
   npm run dev
   ```

3. **Frontend Setup**:
   ```bash
   cd frontend
   # Install dependencies
   npm install
   # Start the development server
   npm run dev
   ```