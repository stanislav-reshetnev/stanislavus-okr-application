# Stanislavus OKR Tree

An OKR (Objectives and Key Results) management application with a hierarchical tree view and interactive graph mode.

Built with Flask + SQLite + Bootstrap 5, served via Docker Compose (uvicorn + nginx). Features user authentication with role-based access control.

## Features

### 📋 Hierarchical View
Explore your OKR tree in a familiar nested list. Expand/collapse key results, track progress with color-coded bars, see team assignments and responsible managers at a glance.

<p>
    <img src="https://raw.githubusercontent.com/stanislav-reshetnev/stanislavus-okr-application/main/screenshots/OKR_simple_view.gif" alt="OKR Tree - Hierarchical View" />
<p>

### 🔍 Filtering & Search
Quickly narrow down objectives by team or manager. Use the real-time text search to find specific objectives, key results, or initiatives across the entire tree.

### 📋 Initiatives
Create and track initiatives (projects or tasks) linked to each objective. Each initiative carries a status — backlog, in progress, completed, or cancelled — giving you full visibility into the operational work driving your objectives forward.

### 🕸️ Interactive Graph Mode
Switch to a visual tree view with SVG connection lines that reveal the parent-child relationships between objectives. Pan the canvas by dragging with your mouse.

<p>
    <img src="https://raw.githubusercontent.com/stanislav-reshetnev/stanislavus-okr-application/main/screenshots/OKR_tree_view.gif" alt="OKR Tree - Interactive Graph Mode" />
<p>

### ✏️ Edit Mode
Enable edit mode to create, edit, reorder, and delete objectives, key results, and initiatives. Drag-and-drop to restructure the tree. Manage teams and managers in dedicated reference panels.

### 🔐 Role-Based Access
Three built-in roles — `view`, `edit`, and `admin` — control who can see, modify, or manage users. A first-run setup wizard creates the initial administrator account.

### ⚡ Automated KR Updates
Update key results programmatically via Bearer token authentication. KRs updated through the API are automatically marked with a 🤖 robot icon and tooltip in the UI.

### 🐳 Docker-Ready
One command to start: `docker compose up -d`. Data persists in SQLite, static files are served by nginx, environment variables let you customize branding and timezone.

## Domain Model

The application revolves around five core entities:

```
                  ┌────────────┐
                  │  Objective  │
                  └──────┬─────┘
                    ┌────┴────┐
                    │         │
              ┌─────┴──┐  ┌──┴──────┐
              │KeyResult│  │Initiative│
              └────────┘  └─────────┘
```

| Entity | Description |
|--------|-------------|
| **Objective** | A high-level goal (e.g. "Improve Customer Satisfaction"). Objectives are hierarchical — each can have a `parentId` making it a child of another objective, or be a root-level goal. |
| **Key Result** | A measurable outcome tied to an objective (e.g. "NPS score reaches 9+"). Tracks progress via `currentValue` / `targetValue` / `initialValue` with a unit and confidence score. |
| **Initiative** | A project or task contributing to an objective (e.g. "Run customer survey"). Contains a description of the work (`what`), expected `impact`, a documentation link, and a `status` (backlog → in_progress → completed / cancelled). |
| **Team** | A group responsible for objectives. Objectives can be filtered by team. |
| **Manager** | A person responsible for objectives. Objectives can be filtered by manager. |

- **Key Results** and **Initiatives** belong to exactly one **Objective**.
- **Objectives** form a tree (via `parentId`). A **Tree** is the full recursive view of objectives with their children, key results, and initiatives.

```
stanislavus-okr-application/
├── app/                  # Flask application package
│   ├── __init__.py       # create_app() factory, Flask-Login setup
│   ├── config.py         # configuration (DB path, SECRET_KEY, etc.)
│   ├── database.py       # SQLite connection, schema, migrations
│   ├── auth_utils.py     # role_required decorator
│   ├── handlers/          # OpenAPI handler functions (auth, teams, managers, objectives, key_results, initiatives)
│   ├── models/            # objective, key_result, team, manager, user, initiative
│   ├── routes/            # Flask page-route blueprints: frontend, auth
│   └── services/          # tree builder
├── conf/nginx.conf       # nginx reverse proxy config
├── static/
│   ├── css/app.css       # all custom styles
│   └── js/               # state.js, api.js, forms.js, references.js, users.js, renderers.js, refresh.js, app.js
├── templates/
│   ├── index.html        # main application page
│   ├── login.html        # login page
│   └── setup.html        # first-run admin setup page
├── docker-compose.yml    # app + nginx services
├── Dockerfile            # python:3.11-slim + uvicorn
├── requirements.txt      # Flask, Flask-Login, connexion, uvicorn
└── run.py                # entry point
```

## Quick Start

```bash
docker compose up -d
```

Open http://localhost:5000

## Local Development

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python run.py
```

Set `FLASK_ENV=development` for Flask debug mode (auto-reload disabled — restart manually).

## Docker Compose

| Service | Role | Image | Port |
|---------|------|-------|------|
| `app` | Flask app via uvicorn | custom (built) | 5000 (internal) |
| `nginx` | Reverse proxy, static files | nginx:alpine | 5000 → 80 |

Data is persisted in `./data/okr.db` (bind mount at `/data`).

## Configuration

| Variable | Default       | Description |
|----------|---------------|-------------|
| `OKR_DB_PATH` | `data/okr.db` | SQLite database path |
| `COMPANY_NAME` | `Company`     | Company name displayed in the UI title and heading |
| `APP_HOST` | `http://localhost:5000` | Public URL of the application (used in generated curl snippets) |
| `SECRET_KEY` | auto-generated | Flask session signing key (set for production) |
| `TZ` | `Etc/UTC` | Container timezone (e.g. `Europe/Moscow`, `America/New_York`) |
| `CORS_ORIGINS` | `` (empty) | Comma-separated allowed origins for CORS, e.g. `http://localhost:3000,https://app.example.com`. When set, the server responds with `Access-Control-Allow-Origin` and related headers. |

### Usage examples

```bash
# Run with custom branding and timezone
COMPANY_NAME=MyCorp TZ=Europe/Moscow docker compose up -d

# Or via .env file
# echo "COMPANY_NAME=MyCorp" >> .env
# echo "TZ=Europe/Moscow" >> .env
# docker compose up -d
```

## First-Run Setup

On first launch, when no users exist in the database, the application redirects to `/setup`, where an initial administrator account must be created. After setup, all users must authenticate via `/login`.

## Access Control

Three roles are supported:

| Role | Permissions |
|------|-------------|
| `view` | Read-only access to the OKR tree |
| `edit` | View + create/edit/delete objectives, key results, initiatives, teams, and managers |
| `admin` | Full access + user management (create/edit/delete users, change roles) |

- Role assignment is managed exclusively by administrators.
- Users can change their own password via the profile dropdown in the top-right corner.

## OpenAPI Specification (Manifest First)

The application follows a **Manifest First** approach: all `/api/*` endpoints are
defined in the [openapi.json](openapi.json) file and auto-registered at startup by
Connexion. The specification is also served at [/openapi.json](/openapi.json) for
external consumption, and an interactive **Swagger UI** is available at
[/api/docs](/api/docs) (requires login).

Responses that return collections are wrapped in an object
(e.g. `{"teams": [...]}` instead of a bare array).

## External Integrations

Updating Key Results from external sources (monitoring dashboards, CI/CD pipelines, CRM systems, etc.) is one of the core features of the application — it keeps the tree always reflecting the current state.

See **[INTEGRATIONS.md](INTEGRATIONS.md)** for:
- How to obtain and use an API token
- The complete OpenAPI specification reference
- Key Result update behaviour (source tracking, lastUpdated)
- Configuration and authentication details


