# Inbox

*Stage 2. The decisions come first; the requirements, drafted at the start of
Stage 2, are at the end.*

**In one line:** one feed of what needs you, drawn from everything — not
dashboard cards ([ADR-0026](../../20-architecture/adr/0026-navigation-drawer.md),
  Provisionally agreed).

## Decisions

- **Thoughts wait here to be sorted.** Capture makes a Thought by default;
  it leaves Inbox when it is converted into another Type (a Note, Task, List…)
  or deleted ([ADR-0037](../../20-architecture/adr/0037-thoughts.md),
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
- Later: readiness-aware gym suggestions
  ([roadmap](../../roadmap.md#later-opportunities)).

## What the page shows (Stage 2)

Three groups, in this order, each hidden when empty:

| Group | What is in it | Order |
|---|---|---|
| **Overdue** | My open Tasks whose due date has passed | Oldest due date first |
| **Today** | My open Tasks to do today or earlier, or due today | Timed ones by time, then the rest by when they were made |
| **To sort** | My Thoughts | Newest first |

With nothing in any group, the page says "Nothing needs you".

## Requirements

*Stage 2. Statuses: proposed → agreed → built → verified.*

### INB-001 — Thoughts wait in Inbox

**As** Joe, **I want** everything I captured and haven't sorted in one
place, **so that** nothing captured is lost.
Priority: Must · Status: proposed

Acceptance criteria
1. Given I have captured three Thoughts, when I open Inbox, then they are
   under "To sort", newest first, with when each was captured.
2. Given a Thought is sorted or deleted, then it leaves Inbox at once,
   offline too.

### INB-002 — Sort a Thought in one action

**As** Joe, **I want** to turn a Thought into a Note or a Task in one action,
**so that** sorting Inbox takes seconds per line.
Priority: Must · Status: proposed

Acceptance criteria
1. Given a Thought, when I choose Task (a swipe right on a phone, a button
   on a computer), then it becomes a Task in place, keeping its id, text,
   Reminders and history, with any date the parser finds in it filled in,
   and it leaves Inbox for the Tasks View.
2. Given a Thought, when I choose Note (a swipe left on a phone, a button
   on a computer), then it becomes a Note in place and appears in the Notes
   View.
3. Given a Thought, when I choose another Type from "Convert to", then only
   the Capturable Types that exist are offered (Note and Task in Stage 2).
4. Given a Thought, when I delete it, then it is archived, a toast offers
   Undo, and Undo puts it back in Inbox.

### INB-003 — Today's and overdue Tasks

**As** Joe, **I want** Inbox to show the Tasks that need me today, **so
that** I start the day from one page.
Priority: Must · Status: proposed

Acceptance criteria
1. Given a Task to do yesterday that isn't done, then it is under "Today",
   not "Overdue" — only a due date makes a Task overdue.
2. Given a Task due yesterday that isn't done, then it is under "Overdue",
   its due date in red.
3. Given a repeating Task, then only its next open occurrence can appear.
4. Given a Task in Inbox, when I tick it, then it is done and leaves Inbox,
   with Undo.

### INB-004 — Move a Task to tomorrow

**As** Joe, **I want** to push today's Task to tomorrow from Inbox, **so
that** Today holds only what I'll really do.
Priority: Should · Status: proposed

Acceptance criteria
1. Given a Task under "Today", when I choose Tomorrow, then its do-on date
   becomes tomorrow (keeping its time), its Reminder moves with it, and it
   leaves Inbox.

### INB-005 — Inbox count in the drawer

**As** Joe, **I want** to see how much is waiting, **so that** I know when
Inbox needs me.
Priority: Should · Status: proposed

Acceptance criteria
1. Given two overdue Tasks, three for today and four Thoughts, then the
   drawer shows 9 beside Inbox.

Non-goals (Stage 2): entries from Modules and Integrations (from Stage 3);
dismissing or snoozing an entry (`core.inbox_state`, when an entry first
needs it); Events.
