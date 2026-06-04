# AGENTS.Md

Guidance for AI agents (Claude Code, Codex, Copilot, etc.) working in this repository.

## Design contract

**`DESIGN.md` is the source of truth for all UI/visual decisions.** Read it
before making any change to `client/`. It is a binding contract:

* Every colour used in the UI must trace back to a token defined in `DESIGN.md`.
* Every component under `client/src/` has a corresponding entry in the
  `DESIGN.md` Components section.
* If you add a new component, a new accent colour, or a new interactive pattern,
  you must update `DESIGN.md` in the same commit/change.
* If a user's request conflicts with a rule in `DESIGN.md`'s **Do's and Don'ts**,
  flag the conflict explicitly before proceeding.

## What this repo is

A local-only GitHub repository triage dashboard. Backend is Node.js/Express +
SQLite. Frontend is React + Tailwind v4 built with Vite. Ships as a single
Docker container, and is also scriptable via a zero-dependency Node CLI (`cli/`).

## Key constraints

* **Tests exist and must stay green.** Vitest runs in all three workspaces
  (`client/`, `server/`, `cli/`) with **enforced coverage thresholds** in each
  `vitest.config.js`. Add or adjust tests alongside any behaviour change and run
  `npm run test:coverage` before finishing. Do not lower a threshold to pass.
* **No TypeScript.** The project is plain JavaScript (ESM). Do not convert files
  or add type annotations.
* **SQLite stores only triage state** — tables `repo_state`, `repo_notice`,
  `repo_tag`. Never cache the GitHub repo list to disk.
* **In-memory repo cache.** `repoCache` in `server/index.js` is the source of
  truth for repo metadata at runtime. Routes that need repo data read from this
  array (merged with SQLite in `buildPayload()`), not straight from the database.
* **Tailwind class names must be static strings.** Dynamic class construction
  (template literals, computed keys) is stripped by the JIT scanner. Use the
  `ACCENT` map / `cx()` patterns in `client/src/lib/constants.js`; the only
  sanctioned inline colour is the categorical owner/tag palette and the fixed
  priority dot (see `DESIGN.md`).
* **`gh`-first for GitHub.** Prefer the `gh` CLI (`gh auth token`, `gh api`,
  `gh repo`) over hand-rolled REST + PAT plumbing where practical.

## Where things live

* `server/index.js` — Express routes, in-memory cache, sync policy
* `server/schedule.js` — `effectiveState()` (board placement from `checked_at` +
  scheduling anchor), computed at read time; there is no background job
* `server/github.js` — GitHub fetch: multi-owner loading, `gh auth token`
  fallback, pagination, rate-limit/auth state
* `server/report.js` — report builder + markdown/csv formatters
* `server/db.js` — SQLite setup + schema (`repo_state`, `repo_notice`, `repo_tag`)
* `client/src/App.jsx` — the container: data loading/polling, board state,
  persisted view prefs, header + toolbar
* `client/src/components/` — one component per file (Column, RepoCard, CardMenu,
  Badge, ListView, the dialogs, the toolbar menus)
* `client/src/lib/` — `board.js` (pure board logic), `date.js`, `useDialog.js`,
  `constants.js` (UI constants/helpers), `boardCache.js`
* `client/src/api.js` — thin `fetch` wrappers for all API routes
* `cli/repo-triage.mjs` — Node CLI over the HTTP API (no token of its own)
* `data/dashboard.db` — SQLite file (gitignored, Docker-mounted volume)

## Development workflow

```bash
# Everything together (backend :8787 + frontend :5173)
npm install && npm run dev

# Or each side separately
cd server && npm run dev
cd client && npm run dev

# Production (Docker, single port 8787)
docker compose --env-file .env up --build

# Tests (all workspaces)
npm run test            # unit/route tests
npm run test:coverage   # same, with enforced coverage thresholds
```

## Day-schedule model

Repos are bucketed into day columns by how long ago they were last checked.
`effectiveState()` in `server/schedule.js` computes the column at read time — no
background job. `DEFAULT_INACTIVITY_DAYS` is the **review cycle** (due age),
not the number of columns. Columns: Today + (`DEFAULT_INACTIVITY_DAYS` − 1)
future weekday columns. A repo that has never been checked, or was last checked
≥ N days ago, lands in `day-0` (Today). The board can also be re-grouped by
owner/tag/language or shown as a sortable list — all read-only over the same
schedule state.

## Adding a new API route

1. Add the Express handler in `server/index.js`.
2. Add a corresponding method in `client/src/api.js`.
3. Call the method in `App.jsx` via the `mutate(() => api.foo()).then(load)`
   pattern so the UI refreshes from the server after every mutation.
4. Add a route test in `server/routes.test.js` (and a client test if it changes
   UI behaviour); keep coverage above the configured floors.

## Environment variables

`GITHUB_TOKEN` is optional — if unset, the server falls back to `gh auth token`
(requires `gh auth login`). `GITHUB_OWNERS` selects which users/orgs to load
(comma list or JSON array; blank = the token owner's full set). `GITHUB_USERNAME`
is a **deprecated** single-owner alias for `GITHUB_OWNERS`.

Sync and schedule variables are also first-class runtime configuration:

* `DEFAULT_INACTIVITY_DAYS` — due age in days for returning repos to Today
* `SYNC_ON_STARTUP` — enable/disable startup sync
* `SYNC_AUTO` — enable/disable scheduled sync
* `SYNC_INTERVAL_MINUTES` — scheduled sync interval (minimum 1)

See `.env.example` for all variables.
