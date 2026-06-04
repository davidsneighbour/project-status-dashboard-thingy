# Repo·triage — roadmap & TODO

*Updated 2026-06-04. Completed work lives in git history. Open work is now
tracked as **GitHub issues** (see below); this file keeps only the working
agreements, the open-issue index, and the pre-release smoke test.*

## Working agreements

* `DESIGN.md` is the binding UI contract — update it before changing `client/`.
* Add/adjust tests alongside behaviour; keep all three workspaces green and
  coverage above the configured floors (`npm run test:coverage`). No TypeScript;
  Tailwind classes stay static strings.
* **`gh`-first:** for anything touching GitHub, prefer the `gh` CLI
  (`gh auth token`, `gh api`, `gh repo`) over hand-rolled REST + PAT plumbing.
* British English (`en-GB`) for prose; `cspell` is clean across the project.

## Open issues

Roadmap and next steps are tracked as issues so testing notes and discussion
live alongside them (base URL: `github.com/davidsneighbour/project-status-dashboard-thingy/issues`):

| # | Item | Kind |
| --- | --- | --- |
| [2](https://github.com/davidsneighbour/project-status-dashboard-thingy/issues/2) | Faithful Undo via server-side restore (notice deletion + clear-check) | enhancement |
| [3](https://github.com/davidsneighbour/project-status-dashboard-thingy/issues/3) | Enrich repo metadata via per-repo `gh api` / GraphQL (open-PR count, release, last-commit, CI) | enhancement |
| [4](https://github.com/davidsneighbour/project-status-dashboard-thingy/issues/4) | Fetch repos through `gh api --paginate` (REST fallback) — risky, own PR | enhancement |
| [5](https://github.com/davidsneighbour/project-status-dashboard-thingy/issues/5) | Map GitHub topics → suggested tags | enhancement |
| [6](https://github.com/davidsneighbour/project-status-dashboard-thingy/issues/6) | Per-card `gh` quick actions (open web, list PRs/issues, create issue) | enhancement |
| [7](https://github.com/davidsneighbour/project-status-dashboard-thingy/issues/7) | In-app settings panel (review cycle, sync interval, owners) | enhancement |
| [8](https://github.com/davidsneighbour/project-status-dashboard-thingy/issues/8) | Persist view/display prefs server-side | enhancement |
| [9](https://github.com/davidsneighbour/project-status-dashboard-thingy/issues/9) | Generic per-repo flags (pinned / muted / needs-decision) | enhancement |
| [10](https://github.com/davidsneighbour/project-status-dashboard-thingy/issues/10) | Exportable weekly-triage Markdown digest | enhancement |
| [11](https://github.com/davidsneighbour/project-status-dashboard-thingy/issues/11) | Accessibility: add axe checks to the component tests | enhancement |
| [12](https://github.com/davidsneighbour/project-status-dashboard-thingy/issues/12) | End-to-end smoke test (Playwright) | enhancement |
| [13](https://github.com/davidsneighbour/project-status-dashboard-thingy/issues/13) | CLI polish: fuzzy/multi resolve, `gh` passthrough, ship as bin + extension | enhancement |
| [14](https://github.com/davidsneighbour/project-status-dashboard-thingy/issues/14) | Bulk untag in the BulkBar | good first issue |
| [15](https://github.com/davidsneighbour/project-status-dashboard-thingy/issues/15) | Make CI markdown-lint blocking (resolve `@dnbhq` rule crash) | documentation |
| [16](https://github.com/davidsneighbour/project-status-dashboard-thingy/issues/16) | Decide: remove deprecated `GITHUB_USERNAME` alias in next major | question |

## Known constraint (no action available)

* `prebuild-install@7.1.3` is flagged "no longer maintained" but is a transitive
  dependency of `better-sqlite3@12.10.0` (the latest), which still depends on it.
  Nothing to do until upstream changes — not a deprecation we introduce.

## Manual smoke test (pre-release)

Most behaviour is covered by automated tests; spot-check the parts that need a
real browser + token:

* [ ] First load shows cached board (if any) then refreshes; slow startup polls in.
* [ ] Drag across columns persists after reload; "checked today" shows on snooze.
* [ ] Board ↔ list toggle; within-column sort; group by owner/tag/language.
* [ ] Multi-select → bulk ignore/tag/schedule; ignore shows an **Undo** toast.
* [ ] Field toggles hide/show stars, issues, forks, language, pushed, notice.
* [ ] Multi-owner load: owner badges appear; non-member org shows the public-only
  warning banner.
* [ ] Auth-invalid and rate-limit-exhausted banners render and disable sync.
* [ ] Backup → restore round-trips triage state (`/api/backup`, `/api/restore`).
