# ADR-0029: Plan reads `core.items`

**Status:** Provisionally agreed · 2026-10-09

**Amended:** 2026-11-09 by [ADR-0065](0065-reminders-alerts-and-the-day.md) (Plan reads `core.items`, and a Reminder's Alerts for its days; Stage 7b, as it is built).

## Context

Plan shows every Schedulable Type. If it depended on each Module, every new
Type would need Plan work.

## Decision

**Plan reads the core table.** `core.items` already has the title, times and
Type. Modules may **only enrich how their Items look**: a Module may
optionally publish a view that adds a subtitle or icon; without one, the
core's default rendering is used.

## Consequences

A new Schedulable Type appears on Plan with no extra work.
