# ADR-0027: Quick capture makes a Note by default

**Status:** Accepted · 2026-10-09

## Context

Capturing a thought, a task or a reminder must be faster than Google Tasks or
setting a phone alarm (goal 2).

## Decision

Quick capture is a Screen, available everywhere: a shortcut, a button, a
home-screen shortcut and share-to-LifeOS (both Android only).

- **Capture makes a sticky Note by default** — capture quickly, organise
  later.
- **A one-tap switch in the capture box makes it a Task instead** (and an
  Event once Stage 3 exists). No keyword to remember.
- **When the parser spots a date** ("call mum fri 6pm") it *offers* "Task,
  Fri 18:00?"; it never switches on its own. If the line stays a Note, it
  still gets a Reminder for that date ([ADR-0023](0023-reminders.md)).
- **The parser is deterministic** (chrono-node plus rules), so capture works
  with no signal. An LLM may improve guesses later, but capture never depends
  on one.
- **Leaving Unsorted:** a Note is converted to another Type, **filed** (kept
  as a Note, shown in the Notes View — one swipe), marked as an idea, or
  deleted (archived, with undo).

## Consequences

A thought stays a thought unless you say so.
