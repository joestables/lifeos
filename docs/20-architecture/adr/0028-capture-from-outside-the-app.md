# ADR-0028: Capture from outside the app

**Status:** Provisionally agreed · 2026-10-09

**Amended:** 2026-10-09 by [ADR-0037](0037-thoughts.md) (Thoughts); 2026-10-10 by Joe, writing the Stage 2 specs (built after every other stage, not in Stage 2).

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
- **Built last**, after every other stage on the [roadmap](../../roadmap.md):
  Joe wants the other Modules first. An Android widget for typing a Thought
  belongs with it, once the Android wrapper exists.

## Consequences

- iOS Shortcuts and Siri, Android HTTP-shortcut apps, email and anything that
  can make a web request can post to it
  ([capture](../../10-requirements/cross-cutting/capture.md)).
- Email needs an inbound-email service in front, a new dependency chosen
  when this is built.
- Until then, capture is in the app only.
