# ADR-0020: Task, Event and Reminder

**Status:** Accepted · 2026-10-09

## Context

Tasks, Events and reminders overlap in everyday use.

## Decision

- **Task and Event stay separate Types**, with a cheap in-place switch
  between them. A Task is *done by you*; an Event *happens*.
- **A reminder is not a Type.** Reminders attach to Items
  ([ADR-0023](0023-reminders.md)).

## Consequences

Task ↔ Event maps `do_on` + `do_at` to `starts_at` (all-day when there is no
time).
