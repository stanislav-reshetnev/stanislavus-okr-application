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
Quickly narrow down objectives by team, manager, or OKR cycle (via the selector in the filter bar). Use the real-time text search to find specific objectives, key results, or initiatives across the entire tree.

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

### 🔄 OKR Cycles
Organise objectives into time-bound cycles (quarters, months, years). Each root objective belongs to exactly one cycle, keeping different planning periods cleanly separated. Switch between cycles via the selector in the filter bar — the tree shows only objectives belonging to the selected cycle.

Cycle lifecycle: **draft → in_progress → completed**. Only one cycle may be `in_progress` at a time. Administrators manage cycles (create, edit, change status) via the **🗓 OKR Cycles** menu item. The default cycle length is configurable under **⚙ Settings**.

### ⚡ Automated KR Updates
Update key results programmatically via Bearer token authentication. KRs updated through the API are automatically marked with a 🤖 robot icon and tooltip in the UI.

### 🐳 Docker-Ready
One command to start: `docker compose up -d`. Data persists in SQLite, static files are served by nginx, environment variables let you customize branding and timezone.

## Domain Model

The application revolves around seven core entities:

```
  ┌───────────┐
  │   Cycle   │
  └─────┬─────┘
        │ has
  ┌─────▼──────┐
  │  Objective  │
  └──────┬─────┘
    ┌────┴────┐
    │         │
  ┌──┴────┐  ┌┴────────┐
  │KeyResult│ │Initiative│
  └───┬───┘  └─────────┘
      │ has
  ┌───▼──────┐
  │Snapshots │
  └──────────┘
```

| Entity | Description |
|--------|-------------|
| **Cycle** | A time-bound container for root objectives (e.g. "Q2 2026"). Status: `draft`, `in_progress`, `completed`. Managed by administrators via **🗓 OKR Cycles**. |
| **Objective** | A high-level goal (e.g. "Improve Customer Satisfaction"). Objectives are hierarchical — each can have a `parentId` making it a child of another objective, or be a root-level goal linked to a **Cycle**. |
| **Key Result** | A measurable outcome tied to an objective (e.g. "NPS score reaches 9+"). Tracks progress via `currentValue` / `targetValue` / `initialValue` with a unit and confidence score. |
| **KR Snapshot** | A recorded metric value at a specific point in time. Created automatically whenever `currentValue` changes. Powers the **Progress Over Time** chart in the KR detail modal. Historical snapshots can also be imported via `POST /api/keyresults/{id}/snapshots` without affecting the current value. |
| **Initiative** | A project or task contributing to an objective (e.g. "Run customer survey"). Contains a description of the work (`what`), expected `impact`, a documentation link, and a `status` (backlog → in_progress → completed / cancelled). |
| **Team** | A group responsible for objectives. Objectives can be filtered by team. |
| **Manager** | A person responsible for objectives. Objectives can be filtered by manager. |
| **Setting** | Key-value configuration store (default cycle length, KR chart interval, etc.). Managed by administrators via **⚙ Settings**. |

- **Key Results** and **Initiatives** belong to exactly one **Objective**.
- **Objectives** form a tree (via `parentId`). A **Tree** is the full recursive view of objectives with their children, key results, and initiatives.
- **Root objectives** are linked to a **Cycle** (`cycle_id`); child objectives inherit the parent's cycle through the tree structure.
- **Settings** provide application-wide defaults (e.g. `cycle_length` — year, quarter, or month; `theme` — `light`, `soft-dark`, `bold-dark`, or `cyberpunk`).

### Themes

The application supports four color themes. The active theme is a **global** admin-managed setting stored in the `settings` table under the `theme` key, applied via `data-theme` and `data-bs-theme` attributes on the `<html>` element (rendered server-side to avoid any flash of unstyled content).

| Theme | Description |
|-------|-------------|
| `light` (default) | Standard light Bootstrap-based palette with rounded corners (6–16px radius). |
| `soft-dark` | Muted slate-blue dark theme. Professional, low-contrast, minimal gradients. 2–6px corner radius. |
| `bold-dark` | Deep dark background with radial-gradient body and purple→blue gradient primary buttons. Linear/Vercel-inspired. 2–6px corner radius. |
| `cyberpunk` | Black background with neon cyan/magenta accents and cyan→green gradient buttons. Aggressive neon-glow shadows. 2–4px corner radius. |

Themes are switched from the **🎨 Theme** selector in **⚙ Settings** (admin-only).

```
stanislavus-okr-application/
├── app/                  # Flask application package
│   ├── __init__.py       # create_app() factory, Flask-Login setup
│   ├── config.py         # configuration (DB path, SECRET_KEY, etc.)
│   ├── database.py       # SQLite connection, schema, migrations
│   ├── auth_utils.py     # role_required decorator
│   ├── handlers/          # OpenAPI handler functions (auth, teams, managers, objectives, key_results, initiatives, cycles, settings)
│   ├── models/            # objective, key_result, team, manager, user, initiative, cycle, settings
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

## Testing

The project includes Playwright-based E2E tests that run in a dedicated Docker Compose profile. The test suite validates authentication flows, edit mode, objective/KR/initiative CRUD, and more.

**Prerequisites**: Docker and Docker Compose.

```bash
# Run all tests
docker compose --profile test up --build --abort-on-container-exit --exit-code-from test
```

This spins up two additional services:
- **`app-test`** — the Flask app with a temporary SQLite database (`/tmp/test.db`) and fixed secret key for test reproducibility.
- **`test`** — Playwright (Python) worker that runs `pytest` against `app-test`. Browsers (Chromium, Firefox, WebKit) are bundled in the Playwright Docker image.

**What happens:**
1. Stale `test-results/` artifacts are cleaned automatically.
2. `app-test` is polled until it responds (up to 60s).
3. Tests execute — failures produce screenshots and Playwright traces.
4. A self-contained HTML report is generated at `test-results/report.html` with embedded screenshots.
5. The process exits with the test runner's exit code.

**Test structure** under `tests/`:

| File | Contents |
|------|----------|
| `conftest.py` | Fixtures: `app_page` (UI login), `anon_page` (no session), `api` (HTTP client for data seeding + LIFO cleanup) |
| `helpers.py` | `ApiClient` — HTTP helper for seeding/cleaning test data |
| `e2e/test_auth.py` | Setup wizard, login, view-role restrictions, logout |
| `e2e/test_edit_mode.py` | Action button visibility in edit mode |
| `e2e/test_objectives.py` | Create, rename, and delete objectives |
| `e2e/test_key_results.py` | Add KR with auto-expand |
| `e2e/test_initiatives.py` | Add Initiative with auto-expand |
| `e2e/test_cycle_switcher.py` | Switch cycles, verify tree updates |
| `e2e/test_filter.py` | Filter by team and manager |
| `e2e/test_search.py` | Search highlighting |
| `e2e/test_sub_objective.py` | +Obj button creates child with team/manager inheritance |
| `e2e/test_drag_drop.py` | Drag-and-drop reorder of objectives |
| `e2e/test_cycle_status.py` | Cycle status transitions (draft → in_progress → completed) |
| `e2e/test_settings.py` | Change default cycle length |
| `e2e/test_users.py` | User CRUD via Users modal |
| `e2e/test_profile.py` | Change password via Edit Profile |

**Individual test execution** — pass additional `pytest` arguments via the `command` override:

```bash
docker compose --profile test run --rm test pytest tests/e2e/test_auth.py -v --tb=long
```

**Artifacts** are written to `test-results/` (bound to the host for inspection):

- `report.html` — full HTML report with embedded failure screenshots
- `{test_name}_{phase}.png` — standalone screenshots per failed phase
- `{test_name}_trace.zip` — Playwright trace files for debugging in `https://trace.playwright.dev`

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
- KR value history and backfilling via `POST /api/keyresults/{id}/snapshots`
- Configuration and authentication details


