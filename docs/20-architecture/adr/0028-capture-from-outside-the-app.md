# ADR-0028: Capture from outside the app

**Status:** Provisionally agreed · 2026-10-09

**Amended:** 2026-10-09 by [ADR-0037](0037-thoughts.md) (Thoughts).

## Context

The biggest single friction win is capture without opening LifeOS at all.
Joe's girlfriend's iPhone has no share target.

## Decision

- **A personal capture address:** an Edge Function URL plus a secret token
  per person, which only creates Items in that person's Personal Space (it
  can read nothing).
- **Same rules as in-app capture:** a Thought by default; a leading "task" (or a
  Shortcut built for tasks) makes a Task; the same deterministic parser finds
  dates and offers the same Reminder.
- **Safety:** the token can be revoked and regenerated in Settings; each
  capture is rate-limited and logged; nothing it sends is executed, only
  stored as text.
- **No Google Tasks import.**
- Built in **Stage 2**, with in-app capture.

## Consequences

- iOS Shortcuts and Siri, Android HTTP-shortcut apps, email and anything that
  can make a web request can post to it
  ([capture](../../10-requirements/cross-cutting/capture.md)).
- Email needs an inbound-email service in front, a new dependency chosen in
  Stage 2.
