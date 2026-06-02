# Repo·triage

Repo·triage is a local-only day-schedule kanban for GitHub repositories. Every
repo is placed in a day column by last review age. Once a repo reaches the due
age (`DEFAULT_INACTIVITY_DAYS`), it returns to **Today** automatically.

## Features

* Day-based board: **Today + N-1 future weekday columns**
* Drag-drop scheduling by day column
* Per-repo review cycle override
* Inclusive repository filtering (`own`, `forks`, `archived`)
* Auto-sync with GitHub on startup and/or interval
* Live GitHub API rate-limit status and token validity feedback
* SQLite persistence for triage state only (repo catalog is always from GitHub)

## Quick start

1. Copy `.env.example` to `.env` and set `GITHUB_TOKEN`.
2. Run:

```bash
docker compose --env-file .env up --build
```

1. Open [http://localhost:8787](http://localhost:8787)

## Environment variables

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `GITHUB_TOKEN` | yes | none | GitHub API auth token |
| `GITHUB_USERNAME` | no | empty | If set, load only that user/org public repos |
| `DEFAULT_INACTIVITY_DAYS` | no | `7` | Due age in days for returning a repo to Today |
| `SYNC_ON_STARTUP` | no | `true` | Fetch GitHub repos when server starts |
| `SYNC_AUTO` | no | `true` | Enable periodic background sync |
| `SYNC_INTERVAL_MINUTES` | no | `60` | Sync interval minutes (min 1) |
| `DATA_DIR` | no | `/data` in Docker, `./data` fallback | SQLite data directory |

### Token scopes

* Classic token: `repo` scope for private repos
* Fine-grained token: read access to repository metadata

## Day-Schedule model

`DEFAULT_INACTIVITY_DAYS` is the due-age threshold, not the number of
degradation steps. The board displays exactly `DEFAULT_INACTIVITY_DAYS` columns:

* `day-0`: **Today** (due now)
* `day-1..day-(N-1)`: future weekday columns

Rules:

* Never checked => Today
* Checked age >= N days => Today
* Checked age < N days => one of the future day columns

Card actions:

* **Checked now** => moves to furthest future column
* **Move to Today** => moves immediately to Today
* **Clear check date** => treated as never checked (Today)

## Filtering model

Each repo can independently be:

* own or fork
* live or archived

Toolbar filters are **inclusive unions**. A repo is shown if it matches at
least one enabled category:

* `own`: non-fork and non-archived
* `forks`: any fork (live or archived)
* `archived`: any archived repo (own or fork)

Examples:

* `own` only => own live repos
* `own + archived` => all non-fork repos (own live + own archived)
* `forks` only => all fork repos (fork live + fork archived)
* all enabled => all repos

Filter settings persist in browser `localStorage`.

## GitHub API behavior

* Repo fetching is paginated (`/user/repos` or `/users/:username/repos`)
* Rate-limit headers are tracked server-side and exposed in `GET /api/repos`
* If token is invalid/expired (`401`), UI shows an auth error banner
* If rate limit is exhausted, refresh is blocked until reset time

## Architecture

```plaintext
server/
    index.js   Express API, schedule computation, sync loop
    github.js  GitHub API client + rate-limit/auth state
    db.js      SQLite schema and connection

client/
    src/App.jsx  Single-page UI (board, filters, drag/drop, menus)
    src/api.js   Fetch wrappers for API routes
```

## API

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/repos` | Board payload + sync/rate-limit status |
| POST | `/api/refresh` | Trigger manual GitHub refresh |
| POST | `/api/repos/:id/check` | `{ daysAgo }` set effective last-check age |
| POST | `/api/repos/:id/inactivity` | `{ days }` set per-repo review-cycle override |
| POST | `/api/repos/:id/priority` | Legacy low-level state setter (used for clear) |
| POST | `/api/repos/:id/touch` | Reset `priority_set_at` to now |
| POST | `/api/reorder` | Persist column order |

## Release notes (prototype)

The prototype is release-ready for local/self-hosted use with:

* persistent triage state
* robust GitHub auth/rate-limit handling
* configurable sync policy
* complete design contract in `DESIGN.md`
* agent tooling contract in `AGENTS.md` and `.github/copilot-instructions.md`

## Development

```bash
# backend
cd server && npm install && npm run dev

# frontend
cd client && npm install && npm run dev
```

No test suite exists yet.
