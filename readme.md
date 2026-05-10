# Stanislavus OKR Tree

An OKR (Objectives and Key Results) management application with a hierarchical tree view and interactive graph mode.

Built with Flask + SQLite + Bootstrap 5, served via Docker Compose (gunicorn + nginx).

## Architecture

```
stanislavus-okr-application/
├── app/                  # Flask application package
│   ├── __init__.py       # create_app() factory
│   ├── config.py         # configuration (DB path, etc.)
│   ├── database.py       # SQLite connection, schema, migrations
│   ├── models/           # objective, key_result, team, manager
│   ├── routes/           # blueprints: objectives, key_results, teams, managers, frontend
│   └── services/         # tree builder
├── conf/nginx.conf       # nginx reverse proxy config
├── static/
│   ├── css/app.css       # all custom styles
│   └── js/               # state.js, api.js, forms.js, references.js, renderers.js, refresh.js, app.js
├── templates/
│   └── index.html        # single-page UI
├── docker-compose.yml    # app + nginx services
├── Dockerfile            # python:3.11-slim + gunicorn
├── requirements.txt      # Flask, gunicorn
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

Set `COMPANY_NAME=YourCompany` to customize the branding.

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
