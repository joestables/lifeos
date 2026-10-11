# ADR-0027: Quick capture makes a Thought by default

**Status:** Provisionally agreed · 2026-10-09

**Amended:** 2026-10-09 by [ADR-0037](0037-thoughts.md) (Thoughts); 2026-10-10 by Joe, writing the Stage 2 specs (capture opens over any screen; Android's shortcut and share move to [ADR-0028](0028-capture-from-outside-the-app.md)).

## Context

Capturing a thought, a task or a reminder must be faster than Google Tasks or
setting a phone alarm (goal 2).

## Decision

Quick capture is a Screen that opens over whatever you are doing, from any
page, with one tap or one key; saving it leaves you exactly where you were.
On a phone its button is in the top bar. Android's home-screen shortcut and
share-to-LifeOS come with capture from outside the app
([ADR-0028](0028-capture-from-outside-the-app.md)), built last.

- **Capture makes a Thought by default**, which lands in Inbox — capture
  quickly, sort later.
- **A one-tap switch in the capture box makes it a Task instead** (and an
  Event once Stage 3 exists). No keyword to remember.
- **When the parser spots a date** ("call mum fri 6pm") it *offers* "Task,
  Fri 18:00?"; it never switches on its own. If the line stays a Thought, it
  still gets a Reminder for that date ([ADR-0023](0023-reminders.md)).
- **The parser is deterministic** (chrono-node plus rules, in
  `packages/capture`, so the capture address can use it too), so capture
  works with no signal. An LLM may improve guesses later, but capture never
  depends on one.
- **Sorting a Thought:** convert it in place into a Note, Task, List or any
  other Capturable Type (one swipe for the common ones), or delete it
  (archived, with undo) ([ADR-0037](0037-thoughts.md)).

## Consequences

A thought stays a Thought unless you say so.
