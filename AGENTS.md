# AGENTS.Md

Guidance for AI agents (Claude Code, Codex, Copilot, etc.) working in this repository.

## Design contract

**`DESIGN.md` is the source of truth for all UI/visual decisions.** Read it
before making any change to `client/`. It is a binding contract:

* Every colour used in the UI must trace back to a token defined in `DESIGN.md`.
* Every component that exists in `client/src/App.jsx` has a corresponding entry
 in the `DESIGN.md` Components section.
* If you add a new component, a new accent colour, or a new interactive pattern,
 you must update `DESIGN.md` in the same commit/change.
* If a user's request conflicts with a rule in `DESIGN.md`'s **Do's and Don'ts**,
 flag the conflict explicitly before proceeding.

## What this repo is

A local-only GitHub repository triage dashboard. Backend is Node.js/Express + SQLite. Frontend is React + Tailwind built with Vite. Deployed as a single Docker container.

## Key constraints

* **No tests exist.** Do not reference or scaffold a test suite unless the user explicitly asks for one.
* **No TypeScript.** The project is plain JavaScript (ESM). Do not convert files or add type annotations.
* **SQLite is the only persistence layer.** Only triage state lives there — never cache the GitHub repo list to disk.
* **In-memory repo cache.** `repoCache` in `server/index.js` is the source of truth for repo metadata at runtime. Any route that needs repo data reads from this array, not the database.
* **Tailwind class names must be static strings.** Dynamic class construction (template literals, computed keys) will be stripped by the JIT scanner. Use the `ACCENT` map pattern already in `App.jsx` when adding new color variants.

## Where things live

* `server/index.js` — Express routes, day-schedule logic (`effectiveState`), in-memory cache, sync policy
* `server/db.js` — SQLite setup and schema (single table: `repo_state`)
* `server/github.js` — GitHub API pagination + rate-limit/auth state
* `client/src/App.jsx` — entire UI (columns, cards, drag-drop, menus)
* `client/src/api.js` — thin `fetch` wrappers for all API routes
* `data/dashboard.db` — SQLite file (gitignored, Docker-mounted volume)

## Development workflow

```bash
# Backend (port 8787)
cd server && npm run dev

# Frontend (port 5173, proxies /api to backend)
cd client && npm run dev

# Production (Docker, single port 8787)
docker compose --env-file .env up --build
```

## Day-schedule model

Repos are bucketed into day columns by how long ago they were last checked.
`effectiveState()` in `server/index.js` computes the column at read time — no
background job. `DEFAULT_INACTIVITY_DAYS` is the **review cycle** (due age),
not the number of columns. Columns: Today + (`DEFAULT_INACTIVITY_DAYS` − 1)
future weekday columns. A repo that has never been checked, or was last checked
≥ N days ago, lands in `day-0` (Today).

## Adding a new API route

1. Add the Express handler in `server/index.js`.
2. Add a corresponding method in `client/src/api.js`.
3. Call the method in `App.jsx` and follow the `mutate(() => api.foo()).then(load)` pattern so the UI refreshes from the server after every mutation.

## Environment variables

`GITHUB_TOKEN` is required. `GITHUB_USERNAME` is optional (blank = token owner's full repo set including private).

Sync and schedule variables are also first-class runtime configuration:

* `DEFAULT_INACTIVITY_DAYS` — due age in days for returning repos to Today
* `SYNC_ON_STARTUP` — enable/disable startup sync
* `SYNC_AUTO` — enable/disable scheduled sync
* `SYNC_INTERVAL_MINUTES` — scheduled sync interval (minimum 1)

See `.env.example` for all variables.
