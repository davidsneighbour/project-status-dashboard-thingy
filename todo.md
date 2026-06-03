# Project status dashboard - TODO and testing plan

## Ideas and todos

* [ ] x on the individual column filter text fields to easily delete the filter.

## Status snapshot (2026-06-03)

* `npm run test` runs **client (14 files / 53 tests)** + **server (4 files / 54 tests)**, all green, no Docker.
* `npm run test:coverage` runs both workspaces with enforced thresholds (`vitest.config.js`). Current: **client ~90% lines / 84% branch**, **server ~89% lines / 78% branch**.
* No-Docker run path: `npm run dev` (root) boots backend + frontend together; the backend auto-loads the root `.env`. `npm run server` runs just the backend.
* **The engineering backlog is clear.** All testing-foundation, issue-coverage, route-test, coverage-enforcement, and docs work is complete and committed. The only remaining items are the manual release-QA checklist below (requires a browser + a real `GITHUB_TOKEN`); most of those behaviors are already covered by automated tests.

## Feature work: ignore flag + notices (2026-06-03)

Local-only repo metadata persisted in SQLite alongside triage state.

### Ignore flag

* [x] `repo_state.ignored` column (migration for existing DBs) + `POST /api/repos/:id/ignore`
* [x] `buildPayload()` exposes `ignored` boolean per repo
* [x] ignored repos hidden from the board by default
* [x] global **show ignored** toggle in the toolbar, separate from the own/forks/archived pills
* [x] ignore / unignore action in the card menu + `ignored` badge on the card

### Notices

* [x] `repo_notice` table (id, repo_id, full_name, body, created_at)
* [x] `POST /api/repos/:id/notices` (timestamped), `GET /api/repos/:id/notices`, `GET /api/notices?sort=&dir=`, `DELETE /api/notices/:noticeId`
* [x] `buildPayload()` exposes `latest_notice` + `notice_count` per repo
* [x] latest notice shown on the repo card
* [x] add-notice + view-notices actions in the card menu
* [x] Notices dialog: all notices for one repo and across all repos, sortable by date and repo name
* [x] tests: server routes (ignore + notices CRUD + sort), client `filterRepos(showIgnored)` + `sortNotices`

## Bugfix + refactor: background sync (2026-06-03)

GitHub loading is owned by the backend; the frontend only reads `/api/repos`.

* [x] **Bug:** on a fresh server start the cached board flashes, then `load()` overwrites the cache with the not-ready empty payload and the board never refills until a manual F5. Fix: never clobber a populated board with a not-ready empty payload, and never persist a not-ready payload to localStorage.
* [x] Keep polling `/api/repos` while the server reports `cacheReady: false` **or** `syncing: true` (drive the loop from the server's status, not the cached value).
* [x] Backend owns the initial load on server start (already via `SYNC_ON_STARTUP`); make it a fire-and-forget background `queueRefresh()` so a slow GitHub fetch never blocks request handling.
* [x] `POST /api/refresh` queues a background sync and returns immediately instead of blocking on the GitHub fetch; expose a `syncing` flag in `/api/repos`.
* [x] Auto-sync interval also goes through `queueRefresh()` (no overlapping fetches).
* [x] Frontend "sync GitHub" queues the backend task and reflects `syncing` (spinner/disabled) while the poll loop pulls in the result.
* [x] tests: queued refresh returns fast + reports `syncing`; `/api/repos` exposes `syncing`; frontend keeps cached board on a not-ready payload.

## Bugfix: help diagram renders as a build-time SVG (2026-06-03)

* [x] **Bug:** F1 help showed "Unable to render Mermaid diagram…" because Mermaid was run in the browser at view time and failed.
* [x] Pre-render the `help.md` flow diagram to a static, dark-themed SVG committed at `client/src/help-diagram.svg`; the help dialog inlines it (no runtime Mermaid).
* [x] `scripts/build-help-diagram.mjs` regenerates the SVG from the `help.md` mermaid block via `@mermaid-js/mermaid-cli`; wired as `prebuild` + `build:help-diagram`, best-effort (skips cleanly if Chromium/cli absent so `npm run build` never fails).
* [x] Drop the runtime `mermaid` dependency (removed from `package.json` + lockfile; ~110 packages, big bundle win).
* [x] tests: help dialog renders the pre-built diagram SVG and shows no Mermaid fallback.

## Feature: load from multiple users/orgs + owner indicator (2026-06-03)

* [x] **No config** still loads the token owner's own repos (public + private + archived).
* [x] `GITHUB_OWNERS` env: comma-separated **or** JSON array of users/orgs; `GITHUB_USERNAME` kept as single-owner fallback. `parseOwners()` handles both forms + dedupe.
* [x] Per configured owner: token owner's own login → `/user/repos` (private incl.); an org you belong to → `/orgs/{org}/repos?type=all`; a plain user → `/users/{user}/repos`.
* [x] If the token isn't a member/authorized for an org → load its **public** repos and surface a clear on-screen warning (non-fatal); dedupe repos across owners.
* [x] Backend exposes `owners` + `sourceWarnings` in `/api/repos`; each repo carries `owner`/`owner_type`.
* [x] Frontend: owner badge + left colour stripe on each card (categorical owner palette), source-warning banner, multi-owner header context.
* [x] Test seed owners: `davidsneighbour` (user), `dnbhq` (org), `gohugo-ananke` (org) — set `GITHUB_OWNERS=davidsneighbour, dnbhq, gohugo-ananke` in `.env`.
* [x] tests: `parseOwners`, per-owner fetch paths (self/org-member/org-public+warning/user/403 fallback), routes mock update, client owner badge + warning banner.

## Bugfix: "checked" age reflects the real review time (2026-06-03)

* [x] **Bug:** dragging a card from Today to a future column showed e.g. "checked 6d ago" although the user reviewed it just now — because the card read the back-dated scheduling anchor (`priority_set_at`) as the last-checked time.
* [x] New `repo_state.checked_at` column (migration + backfill from `priority_set_at`) records the *actual* review time; board placement still uses `priority_set_at`.
* [x] `effectiveState()` derives `checkedAgeDays` from `checked_at`; `/check` stamps `checked_at = now` only when the card lands in a future column (`daysAgo < interval` = "reviewed, resurface later"), not when moving to Today ("make due"). `/touch` stamps it; clearing the check date clears it.
* [x] Card shows **"checked today"** for age 0 (was "checked 0d ago"), "not checked yet" for none.
* [x] tests: `effectiveState` checked_at derivation, route check/move-to-today behaviour, client wording.

## Manual interaction test checklist

Run this checklist against local dev (`server :8787`, `client :5173`) and Docker (`:8787`).

### Startup and data loading

* [ ] first load shows loading state, then board appears once `cacheReady` is true
* [ ] if startup sync is slow, polling refreshes board automatically every ~2s until ready
* [ ] repo count and review cycle value in header match API payload

### Header and sync controls

* [ ] `sync GitHub` triggers refresh and toggles `syncing...` label while in flight
* [ ] sync button disabled when `rateLimit.authInvalid` is true
* [ ] sync button disabled when `rateLimit.remaining === 0`
* [ ] rate-limit indicator text changes style for normal, low (<100), and zero
* [ ] last synced timestamp updates after manual refresh

### Search and filter interaction

* [ ] typing in `filter repos...` narrows cards by name, description, and language
* [ ] toggling `own` only shows non-fork, non-archived repos
* [ ] toggling `forks` includes fork repos regardless of archive state
* [ ] toggling `archived` includes archived repos regardless of fork state
* [ ] filter behavior is inclusive union across checked toggles
* [ ] `show all` appears when not all toggles are enabled and restores defaults
* [ ] filter settings persist after page reload (localStorage)

### Board and drag-drop interaction

* [ ] Today column remains sticky while horizontally scrolling future columns
* [ ] dragging card to empty column moves it and persists after reload
* [ ] dropping card onto another card updates moved card column correctly
* [ ] empty-column `drag here` placeholder appears only when no cards exist

### Card menu actions

* [ ] `...` opens card menu and clicking backdrop closes it
* [ ] `Checked now` sets check date to now and moves repo to furthest future bucket
* [ ] `Move to Today` uses default inactivity days target and moves repo to today bucket
* [ ] `Clear check date` sets repo back to "not checked yet"
* [ ] setting `Review every (days)` to a number persists per-repo override
* [ ] leaving `Review every (days)` blank resets to default cycle

### Error and edge-state handling

* [ ] invalid token banner appears when backend reports `authInvalid`
* [ ] rate-limit exhausted banner appears with reset time when remaining is zero
* [ ] generic GitHub error banner appears for other failures
* [ ] missing token hint appears when `tokenPresent` is false
* [ ] app remains usable for local filtering/search even when refresh is blocked

### Schedule edge cases

* [ ] never-checked repos always resolve to Today
* [ ] repos checked >= inactivity threshold resolve to Today
* [ ] repos checked below threshold resolve to future day columns
* [ ] per-repo inactivity values greater than global default are documented and verified

### Links and metadata

* [ ] clicking repo name opens GitHub page in new tab
* [ ] card badges correctly show public/private, live/archived, fork, language
* [ ] checked age and due text render expected values after mutations

## Notes

* Implement one item at a time and add matching tests before moving on.
