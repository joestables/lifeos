# Inbox

*Stage 2. The decisions come first; the requirements, drafted at the start of
Stage 2, are at the end.*

> **Changing in Stage 7b** (spec agreed 9 November, not yet built): Replaces Inbox with **Today**: everything on today plus overdue Tasks, no Thoughts (TDY-001–006). [Today, Reminders and Plan](../cross-cutting/today-reminders-plan.md). Until it is built, this page is how it works.

**In one line:** one feed of what needs you, drawn from everything — not
dashboard cards ([ADR-0026](../../20-architecture/adr/0026-navigation-drawer.md),
  Provisionally agreed).

## Decisions

- **Thoughts wait here to be sorted.** Capture makes a Thought by default;
  it leaves Inbox when it is converted into another Type (a Note, Task, Shopping list…),
  ticked off (done: it no longer matters) or deleted
  ([ADR-0037](../../20-architecture/adr/0037-thoughts.md), Provisionally
  agreed).
- **Labels filter the page**, as on Notes and Tasks: what has no Labels
  leaves while one is chosen
  ([ADR-0014](../../20-architecture/adr/0014-reference-data-and-labels.md),
  Provisionally agreed).
- **Due** drives "overdue" ([ADR-0021](../../20-architecture/adr/0021-time.md)).
- A repeating Task shows its **next open occurrence only**
  ([ADR-0022](../../20-architecture/adr/0022-repeating-items.md), Provisionally agreed).
- Modules contribute **Inbox entries**
  ([contracts](../../20-architecture/contracts.md#moduledefinition)).
- Dismiss and snooze of Inbox entries are **per person**
  (`core.inbox_state`).
- A **broken Integration** shows in Inbox (from Stage 3).
- The **morning digest** is Inbox in one notification
  ([REM-008](../cross-cutting/reminders.md#rem-008--a-morning-digest)).
- **Inbox is neutral**: it mixes Types, so each Item shows its own Type's
  colour ([ADR-0043](../../20-architecture/adr/0043-colour-by-type.md),
  Provisionally agreed).
- **Food puts nothing in Inbox** (Joe, 18 October): no Recipes, Ideas,
  Meals, shopping lists or staples appear here. A Thought can still be
  sorted into a Recipe Idea or a Shopping list.
- Later: readiness-aware gym suggestions
  ([roadmap](../../roadmap.md#later-opportunities)).

## What the page shows (Stage 2)

My Labels at the top, as pills to choose; with any chosen, every group
shows only what has one of them. Then three groups, in this order, each
hidden when empty:

| Group | What is in it | Order |
|---|---|---|
| **Overdue** | My open Tasks whose due date has passed | Oldest due date first |
| **Today** | My open Tasks to do today or earlier, or due today | Timed ones by time, then the rest by when they were made |
| **Thoughts** | My Thoughts not ticked off | Newest first |

With nothing in any group, the page says "Nothing needs you"; with nothing
left by the Labels chosen, "No items labelled Home". While none
of my devices has notifications on, an Alert above the groups offers to
turn them on, or "Not now"
([REM-001](../cross-cutting/reminders.md#rem-001--turn-on-notifications-for-a-device)).

## Requirements

*Stage 2. Statuses: proposed → agreed → built → verified.*

### INB-001 — Thoughts wait in Inbox

**As** Joe, **I want** everything I captured and haven't sorted in one
place, **so that** nothing captured is lost.
Priority: Must · Status: verified

Acceptance criteria
1. Given I have captured three Thoughts, when I open Inbox, then they are
   under "Thoughts", newest first, each showing when it was captured and
   its Labels.
2. Given a Thought is sorted or deleted, then it leaves Inbox at once,
   offline too.

### INB-002 — Sort a Thought in one action

**As** Joe, **I want** to turn a Thought into a Note or a Task in one action,
**so that** sorting Inbox takes seconds per line.
Priority: Must · Status: verified

Acceptance criteria
1. Given a Thought, when I make it a Task (one action, on a phone or a
   computer), then it becomes a Task in place, keeping its text, Reminders
   (one at the same moment as the Task's own isn't kept twice) and
   history, with any date in it understood as it was meant when captured
   ([CAP-003](../cross-cutting/capture.md#cap-003--dates-and-times-are-understood-the-same-way-everywhere)),
   and it leaves Inbox for the Tasks View.
2. Given a Thought, when I make it a Note (one action), then it becomes a
   Note in place and appears in the Notes View.
3. Given a Thought, when I choose another Type, then only the Types a
   Thought can become that exist are offered (Note and Task in Stage 2;
   Event from Stage 3, its date understood as for a Task and kept as its
   start; Recipe and Shopping list from Stage 4, as
   [ITM-006](../cross-cutting/items.md#itm-006--food-items) sets).
4. Given a Thought, when I delete it, then it leaves Inbox, and I can undo
   that at once or recover it later from Settings
   ([ITM-002, ITM-003](../cross-cutting/items.md#requirements)).

### INB-003 — Today's and overdue Tasks

**As** Joe, **I want** Inbox to show the Tasks that need me today, **so
that** I start the day from one page.
Priority: Must · Status: verified

Acceptance criteria
1. Given a Task to do yesterday that isn't done, then it is under "Today",
   not "Overdue" — only a due date makes a Task overdue.
2. Given a Task due yesterday that isn't done, then it is under "Overdue",
   marked as overdue.
3. Given a repeating Task, then only its next open occurrence can appear.
4. Given a Task in Inbox, when I tick it, then it is done and leaves Inbox,
   and I can undo that.

### INB-004 — Move a Task to tomorrow

**As** Joe, **I want** to push today's Task to tomorrow from Inbox, **so
that** Today holds only what I'll really do.
Priority: Should · Status: verified

Acceptance criteria
1. Given a Task under "Today", when I choose Tomorrow, then its do-on date
   becomes tomorrow (keeping its time), its Reminder moves with it, and it
   leaves Inbox.

### INB-005 — How much is waiting, on every page

**As** Joe, **I want** to see how much is waiting, **so that** I know when
Inbox needs me.
Priority: Should · Status: verified

Acceptance criteria
1. Given two overdue Tasks, three for today and four Thoughts, then the
   navigation shows 9 beside Inbox, on every page.

### INB-006 — Tick a Thought off

**As** Joe, **I want** to tick a Thought off when it no longer matters, as I
tick a Task, **so that** Inbox holds only what still needs me.
Priority: Should · Status: verified

Acceptance criteria
1. Given a Thought in Inbox, when I tick it, then it is done, leaves Inbox
   and its count, and I can undo that at once.
2. Given a done Thought, opened from Search, when I untick it, then it is
   back in Inbox.
3. Given a done Thought, when I convert it, then it is done as a Task, and
   an active Note.

### INB-007 — Filter Inbox by Label

**As** Joe, **I want** to narrow Inbox to one or more Labels, **so that** I
can see just what's waiting for Home.
Priority: Should · Status: verified

Acceptance criteria
1. Given my Labels shown at the top of Inbox, when I choose Family, then
   each group shows only what is labelled Family; when I also choose Car,
   what has either.
2. Given a Label is chosen, then what has no Labels is hidden until I
   clear the choice; the count beside Inbox doesn't change.

Non-goals (Stage 2): entries from Modules and Integrations (from Stage 3);
dismissing or snoozing an entry (`core.inbox_state`, when an entry first
needs it); Events, which Plan shows (Joe, 14 October).
