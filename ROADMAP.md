# Roadmap

All 19 original feature issues are closed. This file tracks the next round of
work derived from a post-completion audit. Each item has a corresponding GitHub
issue; work through them top-to-bottom within each section.

---

## Bugs & fixes

| # | Issue | Notes |
|---|---|---|
| #21 | [Fix coverage threshold failures (client + server)](https://github.com/davidsneighbour/project-dashboard/issues/21) | `npm run test:coverage` currently exits non-zero on both workspaces. Add ~15–20 targeted tests for `CardMenu` gh-actions flow, `App.jsx` error banners, `api.js` untested methods (`restoreState`, `addFlag`/`removeFlag`, `deleteTag`). |
| #33 | [Align e2e mock DEFAULT_INACTIVITY with server default (3 → 7)](https://github.com/davidsneighbour/project-dashboard/issues/33) | `e2e/helpers.js` uses `DEFAULT_INACTIVITY = 3`; the server default is `7`. Fixtures don't reflect real board width. |

---

## Performance & refactoring

| # | Issue | Notes |
|---|---|---|
| #22 | [Split server/index.js into focused modules](https://github.com/davidsneighbour/project-dashboard/issues/22) | 838-line file mixing routes, sync loop, settings, gh endpoints. Proposed split: `routes/{repos,sync,settings,gh}.js` + `lib/{buildPayload,schedule}.js`. |
| #23 | [Make paginateViaGh async (spawn instead of execFileSync)](https://github.com/davidsneighbour/project-dashboard/issues/23) | `execFileSync` blocks the event loop for the full `gh api --paginate` duration. Replace with `spawn` + async stream. |
| #24 | [Cache buildPayload() result with dirty-flag invalidation](https://github.com/davidsneighbour/project-dashboard/issues/24) | `buildPayload()` does a full SQLite JOIN on every `GET /api/repos`. A module-level cache invalidated by mutations would make steady-state polling cheap. |
| #25 | [Run ENRICH_METADATA enrichment async after initial payload](https://github.com/davidsneighbour/project-dashboard/issues/25) | When `ENRICH_METADATA=true`, `enrichRepos()` blocks the event loop through all GraphQL batches before the board is usable. Return the base list immediately; write enrichment results in the background. Depends on #23. |
| #26 | [Debounce client polling against recent mutations](https://github.com/davidsneighbour/project-dashboard/issues/26) | After a mutation the board fires `load()` immediately, then the 30-second poll tick fires again shortly after — two requests for the same data. Skip the poll if a load happened within the last 10 seconds. |

---

## New features

| # | Issue | Notes |
|---|---|---|
| #27 | [Webhook receiver for real-time GitHub sync](https://github.com/davidsneighbour/project-dashboard/issues/27) | `POST /api/webhook` with HMAC validation (`WEBHOOK_SECRET` env). Handles `push`, `create`, `delete`, `repository`, `pull_request`. `gh webhook forward` works for local dev. |
| #28 | [Per-repo activity log / review timeline](https://github.com/davidsneighbour/project-dashboard/issues/28) | New `activity_log` table; entry written by every mutation route. `GET /api/repos/:id/activity` exposes it. Surfaces in CardMenu/NoticesDialog as a mixed-type timeline feed. |
| #29 | [Cross-session undo history (SQLite undo_log)](https://github.com/davidsneighbour/project-dashboard/issues/29) | Persist last N undo entries in SQLite so bulk-ignore recovery survives a page reload. `GET /api/undo` + `POST /api/undo/:id`. UI `Toast` seeds from the DB on load. |
| #30 | [Tag-based review rules (tag → inactivity_days override)](https://github.com/davidsneighbour/project-dashboard/issues/30) | New `tag_rules` table. `effectiveState()` precedence: per-repo override → tag rule → global default. Exposed via `GET/PUT/DELETE /api/tag-rules/:tag`. Settings panel gets a Tag rules section. |
| #31 | [CLI watch mode with desktop notifications](https://github.com/davidsneighbour/project-dashboard/issues/31) | `repo-triage watch [--interval 60] [--notify]`. Polls `/api/repos`, diffs Today column, prints newly-due repos. `--notify` fires OS notifications via `osascript` / `notify-send` / PowerShell — no npm dependencies. |
| #32 | [Scheduled report export (file or email digest)](https://github.com/davidsneighbour/project-dashboard/issues/32) | Cron-style schedule in settings (`reportSchedule.cron`, `outputPath`, optional `emailTo`). Lightweight evaluator in the sync loop — no `node-cron` dep. `GET /api/reports/last-export` for UI feedback. |

---

## Suggested order

For a single contributor working sequentially:

1. **#21** — fix coverage first so `test:coverage` is a reliable CI gate
2. **#33** — small, quick, unblocks correct e2e baseline
3. **#26** — two-line fix with immediate UX benefit
4. **#24** — straightforward cache layer; high impact on polling-heavy use
5. **#22** — structural refactor; easier after coverage is solid (#21)
6. **#23 → #25** — async execution; #25 depends on #23
7. **#30** — self-contained feature, no UI complexity
8. **#31** — CLI-only, no server changes
9. **#27** — webhook; requires external setup for integration testing
10. **#28 → #29** — activity log and undo share schema patterns; do together
11. **#32** — scheduled export; last because it touches settings + reports + cron

---

## Coverage targets (current vs. threshold)

Thresholds are set in `client/vitest.config.js` and `server/vitest.config.js`
(90% stmts / 85% branch / 85% funcs / 90% lines for both).

| Workspace | Stmts | Branch | Funcs | Lines |
|---|---|---|---|---|
| client | 89.5% ❌ | 83.5% ❌ | 84.4% ❌ | 91.5% ✅ |
| server | 97.8% ✅ | 83.6% ❌ | 96.2% ✅ | 99.0% ✅ |

The client gap is concentrated in `CardMenu.jsx` (73.5% stmts) and `App.jsx`
(81% branch). The server gap is entirely branch coverage in `github.js` and
`index.js` error/fallback paths.
