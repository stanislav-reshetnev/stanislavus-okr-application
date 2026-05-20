# External Integrations

The OKR application exposes a REST API that allows third-party systems to read and update OKR data programmatically. This is one of the core features of the application — keeping Key Results up to date from external sources (monitoring dashboards, CI/CD pipelines, CRM systems, etc.) so that the tree always reflects the current state.

## Getting Started

### 1. Obtain an API Token

1. Log in with an admin account.
2. Go to Users → Add a service account with role `edit`.
3. Click the 🔄 button next to the service account to generate an API token.
4. Click the truncated token to copy it.

### 2. Use the OpenAPI Specification

The API is fully described in [openapi.json](openapi.json) (also served at `/openapi.json`). You can explore it interactively at **`/api/docs`** (Swagger UI, requires login) or use the spec to generate a client SDK.

### 3. Call the API

All endpoints require authentication via the `Authorization: Bearer <token>` header.

```bash
curl http://localhost:5000/api/objectives/flat \
  -H 'Authorization: Bearer <api_token>'
```

## Domain Overview

| Concept | Description |
|---------|-------------|
| **Objective** | A high-level goal (e.g. "Improve Customer Satisfaction"). Objectives form a **tree** — each objective can have a `parentId` (another objective) or be a root. |
| **Key Result** | A measurable outcome tied to an objective (e.g. "NPS score reaches 9+"). Each key result belongs to exactly one objective. |
| **Team** | A group responsible for objectives. Objectives can be filtered by team. |
| **Manager** | A person responsible for objectives. Objectives can be filtered by manager. |
| **Tree** | The hierarchical view of objectives with nested children and their key results. |

Key Results track progress via `currentValue` / `targetValue` / `initialValue` and are automatically assigned a `source` ("manual", "api", or "import") and `lastUpdated` timestamp when their value changes.

## Updating Key Results from External Systems

The `PUT /api/keyresults/{keyResultId}` endpoint accepts metric updates:

```bash
curl -X PUT \
  -H 'Authorization: Bearer <api_token>' \
  -H 'Content-Type: application/json' \
  -d '{"currentValue": 42, "source": "api"}' \
  http://localhost:5000/api/keyresults/<keyResultId>
```

### Update behaviour

| Scenario | `lastUpdated` | `source` |
|----------|---------------|----------|
| `currentValue` changes to a new value | ✅ Updated | ✅ Set to `source` value (default: `"manual"`) |
| `currentValue` sent with the same value | ❌ Unchanged | ❌ Unchanged |
| Only metadata fields changed (`name`, `description`, `targetValue`, `unit`, `docLink`, `initialValue`) | ❌ Unchanged | ❌ Unchanged |

This ensures that `lastUpdated` and `source` always reflect the **last actual metric measurement**, not cosmetic edits. KRs updated through the API are marked with a 🤖 robot icon in the UI.

## Configuration

The following environment variables affect API behaviour:

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_HOST` | `http://localhost:5000` | Public URL used in generated curl snippets |
| `CORS_ORIGINS` | (empty) | Comma-separated allowed origins for CORS headers |

## Authentication Reference

| Scheme | Type | Where to send |
|--------|------|---------------|
| `bearerAuth` | HTTP Bearer token | `Authorization: Bearer <token>` header |
| `sessionCookie` | Cookie | `Cookie: session=<session_id>` (browser use) |

All endpoints require authentication. See the `security` block in [openapi.json](openapi.json) for per-endpoint details.
