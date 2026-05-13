# Stanislavus OKR Tree

An OKR (Objectives and Key Results) management application with a hierarchical tree view and interactive graph mode.

Built with Flask + SQLite + Bootstrap 5, served via Docker Compose (gunicorn + nginx). Features user authentication with role-based access control.

## Features

### 📋 Hierarchical View
Explore your OKR tree in a familiar nested list. Expand/collapse key results, track progress with color-coded bars, see team assignments and responsible managers at a glance.

<video src="https://raw.githubusercontent.com/stanislav-reshetnev/stanislavus-okr-application/main/screens/01_OKR_view_hierarchy.webm" controls width="100%"></video>

### 🔍 Filtering & Search
Quickly narrow down objectives by team or manager. Use the real-time text search to find specific objectives or key results across the entire tree.

<video src="https://raw.githubusercontent.com/stanislav-reshetnev/stanislavus-okr-application/main/screens/02_OKR_view_hierarchy_filtering.webm" controls width="100%"></video>

### 🕸️ Interactive Graph Mode
Switch to a visual tree view with SVG connection lines that reveal the parent-child relationships between objectives. Pan the canvas by dragging with your mouse.

<video src="https://raw.githubusercontent.com/stanislav-reshetnev/stanislavus-okr-application/main/screens/03_OKR_view_tree.webm" controls width="100%"></video>

### ✏️ Edit Mode
Enable edit mode to create, edit, reorder, and delete objectives and key results. Drag-and-drop to restructure the tree. Manage teams and managers in dedicated reference panels.

<video src="https://raw.githubusercontent.com/stanislav-reshetnev/stanislavus-okr-application/main/screens/04_OKR_edit_tree.webm" controls width="100%"></video>

### 🔐 Role-Based Access
Three built-in roles — `view`, `edit`, and `admin` — control who can see, modify, or manage users. A first-run setup wizard creates the initial administrator account.

### ⚡ Automated KR Updates
Update key results programmatically via Bearer token authentication. KRs updated through the API are automatically marked with a 🤖 robot icon and tooltip in the UI.

### 🐳 Docker-Ready
One command to start: `docker compose up -d`. Data persists in SQLite, static files are served by nginx, environment variables let you customize branding and timezone.

## Architecture

```
stanislavus-okr-application/
├── app/                  # Flask application package
│   ├── __init__.py       # create_app() factory, Flask-Login setup
│   ├── config.py         # configuration (DB path, SECRET_KEY, etc.)
│   ├── database.py       # SQLite connection, schema, migrations
│   ├── auth_utils.py     # role_required decorator
│   ├── models/           # objective, key_result, team, manager, user
│   ├── routes/           # blueprints: objectives, key_results, teams, managers, frontend, auth
│   └── services/         # tree builder
├── conf/nginx.conf       # nginx reverse proxy config
├── static/
│   ├── css/app.css       # all custom styles
│   └── js/               # state.js, api.js, forms.js, references.js, users.js, renderers.js, refresh.js, app.js
├── templates/
│   ├── index.html        # main application page
│   ├── login.html        # login page
│   └── setup.html        # first-run admin setup page
├── docker-compose.yml    # app + nginx services
├── Dockerfile            # python:3.11-slim + gunicorn
├── requirements.txt      # Flask, Flask-Login, gunicorn
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
| `app` | Flask app via gunicorn | custom (built) | 5000 (internal) |
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
| `edit` | View + create/edit/delete objectives, key results, teams, and managers |
| `admin` | Full access + user management (create/edit/delete users, change roles) |

- Role assignment is managed exclusively by administrators.
- Users can change their own password via the profile dropdown in the top-right corner.

## API Endpoints

### Objectives
| Method | Path | Action |
|--------|------|--------|
| GET | `/api/tree` | Get objective tree (optional `?team_id=X&manager_id=Y`) |
| GET | `/api/objectives/flat` | Get flat list of all objectives |
| POST | `/api/objectives` | Create objective |
| PUT | `/api/objectives/<id>` | Update objective |
| DELETE | `/api/objectives/<id>` | Delete objective with sub-objectives and KRs |

### Key Results
| Method | Path | Action |
|--------|------|--------|
| POST | `/api/objectives/<obj_id>/keyresults` | Add KR to objective |
| PUT | `/api/keyresults/<id>` | Update KR (e.g. `{"current_value": 42, "source": "api"}`) |
| DELETE | `/api/keyresults/<id>` | Delete KR |

### Teams
| Method | Path | Action |
|--------|------|--------|
| GET | `/api/teams` | List teams |
| POST | `/api/teams` | Create team |
| PUT | `/api/teams/<id>` | Rename team |
| DELETE | `/api/teams/<id>` | Delete team |

### Managers
| Method | Path | Action |
|--------|------|--------|
| GET | `/api/managers` | List managers |
| POST | `/api/managers` | Create manager |
| PUT | `/api/managers/<id>` | Rename manager |
| DELETE | `/api/managers/<id>` | Delete manager |

### Authentication

All API endpoints support two authentication methods:
- **Cookie** – browser-based, uses Flask-Login session
- **Bearer token** – for automation, pass via `Authorization: Bearer <token>` header

| Method | Path | Action | Access |
|--------|------|--------|--------|
| GET | `/login` | Login page | Public |
| POST | `/login` | Authenticate | Public |
| GET | `/logout` | Logout | Any authenticated |
| GET | `/setup` | First-run admin setup page | No users exist |
| POST | `/setup` | Create initial admin | No users exist |

Every user has an auto-generated API token visible in the user management panel (admin only). Tokens can be regenerated at any time — the old token stops working immediately.

### Users (admin only)
| Method | Path | Action |
|--------|------|--------|
| GET | `/api/users` | List all users (includes `api_token`, `api_token_generated_at`) |
| POST | `/api/users` | Create user (auto-generates API token) |
| PUT | `/api/users/<id>` | Update user password/role, or pass `{"regenerate_token": true}` to issue a new API token |
| DELETE | `/api/users/<id>` | Delete user |

### Profile
| Method | Path | Action | Access |
|--------|------|--------|--------|
| PUT | `/api/profile/password` | Change own password | Any authenticated |

## Updating KR via External API

All API endpoints support authentication via Bearer token. Use a dedicated service account (role `edit`) for automation — no session cookies needed:

```bash
# Update Key Result value using API token
curl -X PUT \
  -H 'Authorization: Bearer <api_token>' \
  -H 'Content-Type: application/json' \
  -d '{"current_value": 42, "source": "api"}' \
  http://localhost:5000/api/keyresults/<kr_id>
```

To get an API token, log in as admin → Users → click 🔄 on the robot user to generate/regenerate a token, then click the truncated token to copy it. Create a robot user with role `edit` via the Add User form in the same panel.


