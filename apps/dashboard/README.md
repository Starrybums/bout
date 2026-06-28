# BOUT Dashboard (Phase 2 — not built yet)

This folder is reserved for a future browser dashboard that visualizes the same
data the CLI already produces: daily briefs, watchlist, journal, and reports.

**Current status:** placeholder only. Nothing in this MVP renders here yet.

## Planned approach

- A lightweight Next.js app (or a simple Express + static HTML server if a
  full framework is overkill) that reads from the same SQLite database and
  `reports/` markdown files the CLI writes to — no separate backend needed
  for the MVP-to-dashboard step.
- Pages mirroring the CLI surface area: Brief, News, Calendar, Watchlist,
  Journal, Reports, Model settings.
- Same disclaimer footer as the CLI output: research/education only, not
  financial advice.

## Why this wasn't built yet

The brief was explicit about building the CLI MVP first and not building the
full dashboard until the terminal workflow is solid. This stub exists so the
intended repo layout (`apps/cli`, `apps/dashboard`) is visible from day one.
