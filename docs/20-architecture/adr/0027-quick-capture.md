# ADR-0027: Quick capture makes a Thought by default

**Status:** Provisionally agreed · 2026-10-09

**Amended:** 2026-10-09 by [ADR-0037](0037-thoughts.md) (Thoughts); 2026-10-10 by Joe, writing the Stage 2 specs (capture opens over any screen; Android's shortcut and share move to [ADR-0028](0028-capture-from-outside-the-app.md)); 2026-10-14 by Joe, writing the Stage 3 specs (capture makes no Events). 2026-11-09 by [ADR-0065](0065-reminders-alerts-and-the-day.md) ("New" is one line making a Thought, or a Reminder when it has a time; no switch to Task; Stage 7b, as it is built).

## Context

Capturing a thought, a task or a reminder must be faster than Google Tasks or
setting a phone alarm (goal 2).

## Decision

Quick capture is a Screen that opens over whatever you are doing, from any
page, with one tap or one key; saving it leaves you exactly where you were.
Its button is at the top right of every page, in the top bar on a phone
(Joe, 12 October 2026: no longer in the drawer on a computer). Android's home-screen shortcut and
share-to-LifeOS come with capture from outside the app
([ADR-0028](0028-capture-from-outside-the-app.md)), built last.

- **Capture makes a Thought by default**, which lands in Inbox — capture
  quickly, sort later.
- **A one-tap switch in the capture box makes it a Task instead.** No
  keyword to remember. Capture makes no Events: they are made on Plan.
- **When the parser spots a date** ("call mum fri 6pm") it *offers* "Task,
  Fri 18:00?"; it never switches on its own. If the line stays a Thought, it
  still gets a Reminder for that date ([ADR-0023](0023-reminders.md)).
- **The parser is deterministic** (chrono-node plus rules, in
  `packages/capture`, so the capture address can use it too), so capture
  works with no signal. An LLM may improve guesses later, but capture never
  depends on one.
- **Sorting a Thought:** convert it in place into a Note, Task, Shopping list or any
  other Capturable Type (one swipe for the common ones), or delete it
  (archived, with undo) ([ADR-0037](0037-thoughts.md)).

## Consequences

A thought stays a Thought unless you say so.
