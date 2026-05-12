# Stanislavus OKR Tree

An OKR (Objectives and Key Results) management application with a hierarchical tree view and interactive graph mode.

Built with Flask + SQLite + Bootstrap 5, served via Docker Compose (gunicorn + nginx). Features user authentication with role-based access control.

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
| `SECRET_KEY` | auto-generated | Flask session signing key (set for production) |

Set `COMPANY_NAME=YourCompany` to customize the branding.

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
| Method | Path | Action | Access |
|--------|------|--------|--------|
| GET | `/login` | Login page | Public |
| POST | `/login` | Authenticate | Public |
| GET | `/logout` | Logout | Any authenticated |
| GET | `/setup` | First-run admin setup page | No users exist |
| POST | `/setup` | Create initial admin | No users exist |

### Users (admin only)
| Method | Path | Action |
|--------|------|--------|
| GET | `/api/users` | List all users |
| POST | `/api/users` | Create user |
| PUT | `/api/users/<id>` | Update user password/role |
| DELETE | `/api/users/<id>` | Delete user |

### Profile
| Method | Path | Action | Access |
|--------|------|--------|--------|
| PUT | `/api/profile/password` | Change own password | Any authenticated |

## Updating KR via External API

```bash
curl -X PUT http://localhost:5000/api/keyresults/<kr_id> \
  -H 'Content-Type: application/json' \
  -d '{"current_value": 42, "source": "api"}'
```

## Features

- Hierarchical objective tree with drag-and-drop reordering
- Interactive graph mode with SVG connection lines
- Filter by team or manager
- Edit mode toggle for create/edit/delete operations
- Team and manager reference management
- Fullscreen tree panel
- User authentication with role-based access control (view / edit / admin)
- First-run administrator setup
- User profile management (password change)
