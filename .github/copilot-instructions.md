---
applyTo: 'client/**'
---

# Design contract

Before making any change to files under `client/`, read `DESIGN.md` in the
repository root. It is the source of truth and binding contract for all visual
and UI decisions.

## Hard rules (never violate without flagging)

- All colours must reference a token defined in `DESIGN.md`'s YAML front matter.
  Do not invent new hex values or Tailwind colour classes outside that token set.
- All Tailwind colour class names must be **static strings** — no template
  literals, no computed class names. Use the `ACCENT` map pattern in `App.jsx`
  for any column-specific colour variants.
- IBM Plex Mono is the only typeface. Do not add `font-sans` or `font-serif`
  classes anywhere.
- The design is **dark-only**. Do not add light-mode variants (`dark:` prefix
  is for opt-in; the base styles assume dark).
- Do not introduce new shadow patterns (`box-shadow`/`drop-shadow`) across the
  UI. The card-menu popover shadow is the only existing exception.
- Column width is fixed at `w-72` (288 px). Do not make it fluid.

## When adding a new component or colour

1. Add the token/component entry to `DESIGN.md` first.
2. Implement it in `client/src/App.jsx`.
3. Both changes belong in the same edit.

## When a request conflicts with DESIGN.md

State the conflict explicitly to the user and ask whether to update the design
contract or find a compliant alternative. Do not silently violate it.
