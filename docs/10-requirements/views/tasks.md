# Tasks

*Stage 2. The decisions come first; the requirements, drafted at the start of
Stage 2, are at the end.*

**In one line:** Tasks and their Reminders
([ADR-0026](../../20-architecture/adr/0026-navigation-drawer.md),
Provisionally agreed). It replaces Google Tasks.

## Decisions

- **A Task is done by you**; an Event happens. They are separate Types with
  an in-place switch (Events arrive in Stage 3)
  ([ADR-0020](../../20-architecture/adr/0020-task-event-reminder.md),
  Provisionally agreed).
- **Do-on and due:** do-on (a date, with an optional time) is when you mean to
  do it; due is a deadline, and only due makes a Task overdue
  ([ADR-0021](../../20-architecture/adr/0021-time.md), Provisionally agreed).
- **Labels group Tasks**, like Google Tasks' lists (Home, Work, Car)
  ([ADR-0014](../../20-architecture/adr/0014-reference-data-and-labels.md),
  Provisionally agreed). One set of Labels serves Notes and Tasks.
- **Steps** are a checklist inside a Task (`task_steps`, child rows).
- **Someday** is a Task's *idea* status.
- **Repeating Tasks** are generated occurrences: one engine, generated in
  local time, touched occurrences kept, "this and all following" starts a new
  series, two modes (*on a schedule*, *after completion*), and only a
  series' next open occurrence shows; an older untouched one is closed as
  *skipped* when a newer one comes due
  ([ADR-0022](../../20-architecture/adr/0022-repeating-items.md),
  Provisionally agreed).
- **No Google Tasks import** ([ADR-0028](../../20-architecture/adr/0028-capture-from-outside-the-app.md)).

## What the page shows (Stage 2)

"Add a task" is the page's primary action. Tabs:

| Tab | What it shows |
|---|---|
| **By date** | Open Tasks under Overdue, Today, Tomorrow, each remaining day of this week, Later, and No date |
| **By label** | One group per Label that has open Tasks (an Accordion), then No label |
| **Starred** | Open Tasks I have starred |
| **Someday** | Tasks in the *idea* status |
| **Done** | Done Tasks, the most recently done first |

Each Task is an `ItemRow`: a checkbox, the title, and its meta — do-on (and
time), due (red once overdue), Labels, steps done ("2/5"), a repeat icon.

## Requirements

*Stage 2. Statuses: proposed → agreed → built → verified.*

### TSK-001 — Add a Task quickly

**As** Joe, **I want** to add a Task from the Tasks View in one line, **so
that** it's as quick as Google Tasks.
Priority: Must · Status: proposed

Acceptance criteria
1. Given the Tasks View, when I choose "Add a task" and type "renew
   insurance fri", then a Task "Renew insurance" to do on Friday is created,
   parsed as capture parses it
   ([CAP-003](../cross-cutting/capture.md#cap-003--dates-and-times-are-understood-the-same-way-everywhere)).
2. Given I add a Task inside a Label's group, then it has that Label.
3. Given I have no signal, then the Task appears at once and is sent later.

### TSK-002 — A Task's details

**As** Joe, **I want** to set everything about a Task in one place, **so
that** a Task can hold what I need to do it.
Priority: Must · Status: proposed

Acceptance criteria
1. Given a Task, when I open it, then I can change its title, notes, do-on
   date and time, due date, Labels, steps, repeat and Reminders, and each
   change is saved as I make it.
2. Given I set a time without a date, then it is refused, as a do-on time
   needs a do-on date.

### TSK-003 — Tick a Task done

**As** Joe, **I want** to tick a Task off and see it go, **so that** the
list shows only what's left.
Priority: Must · Status: proposed

Acceptance criteria
1. Given an open Task, when I tick it, then it is done, leaves the open
   tabs with Undo, appears on the Done tab, and its Reminders are cleared.
2. Given a done Task, when I untick it, then it is open again, and its
   Reminders still in the future come back.

### TSK-004 — Tasks by date and by Label

**As** Joe, **I want** to see my Tasks by when and by what they're for,
**so that** I can plan the day and find the Car jobs.
Priority: Must · Status: proposed

Acceptance criteria
1. Given open Tasks to do today, tomorrow, next month, and none, then "By
   date" shows them under Today, Tomorrow, Later and No date.
2. Given Tasks labelled Home and Car and one with none, then "By label"
   shows Home, Car and No label, each with its Tasks; a Task with two Labels
   is under both.

### TSK-005 — Steps

**As** Joe, **I want** a checklist inside a Task, **so that** a job with
parts stays one Task.
Priority: Should · Status: proposed

Acceptance criteria
1. Given a Task, when I add steps and tick two of five, then the row's meta
   shows "2/5".
2. Given I tick the Task done, then its steps are left as they were.

### TSK-006 — Someday

**As** Joe, **I want** to park a Task for someday, **so that** it's kept but
not in my way.
Priority: Should · Status: proposed

Acceptance criteria
1. Given a Task, when I move it to Someday, then it leaves the dated tabs,
   loses its do-on date, and appears on the Someday tab; giving it a date
   makes it active again.

### TSK-007 — Repeat on a schedule

**As** Joe, **I want** a Task to repeat on a schedule, **so that** "take
the bins out" comes back every Monday.
Priority: Must · Status: proposed

Acceptance criteria
1. Given a Task, then I can make it repeat daily, every weekday, weekly on
   chosen days, every N days, weeks or months, monthly on a date or on the
   nth weekday ("first Saturday"), or yearly, with an optional end.
2. Given a repeating Task, then the Tasks View and Inbox show only its next
   open occurrence; when I tick it, the one after appears.
3. Given a Task repeating every Monday at 18:30, then each occurrence is at
   18:30 London time, either side of the clocks changing (unit test).
4. Given the series has occurrences made for the weeks ahead, then the
   nightly job keeps about ten weeks made, and a repeat created offline has
   its first weeks made on the device.

### TSK-008 — Repeat after completion

**As** Joe, **I want** some Tasks to come back a while after I last did
them, **so that** "descale the kettle" is three months after the last time,
not on a fixed date.
Priority: Should · Status: proposed

Acceptance criteria
1. Given a Task repeating three months after completion, when I tick it
   on 10 October, then the next occurrence is to do on 10 January.

### TSK-009 — A missed repeat doesn't pile up

**As** Joe, **I want** a missed daily Task to be skipped rather than stack
up, **so that** missing vitamins on Monday doesn't leave seven overdue
Tasks by Sunday.
Priority: Must · Status: proposed

Acceptance criteria
1. Given a daily Task not done on Monday, when Tuesday's occurrence comes
   due, then Monday's is closed as *skipped* (cancelled) if untouched, and
   only Tuesday's shows.
2. Given I had edited Monday's occurrence, then it stays open (it was
   touched).

### TSK-010 — Change or stop a repeat

**As** Joe, **I want** to change a repeat from a given date, or stop it,
**so that** past occurrences and my edits are kept.
Priority: Must · Status: proposed

Acceptance criteria
1. Given a weekly Task, when I change one occurrence's title, then only
   that occurrence changes, and it is marked touched.
2. Given a weekly Task, when I change the repeat "for this and all
   following", then the old series ends there and a new one starts; untouched
   future occurrences follow the new rule, and touched ones stay.
3. Given I stop the repeat, then untouched future occurrences are archived,
   and done, past or touched ones are kept.

### TSK-011 — Reorder by hand

**As** Joe, **I want** to drag Tasks into my own order within a group,
**so that** the list reads in the order I'll do things.
Priority: Could · Status: proposed

Acceptance criteria
1. Given two Tasks under Today, when I drag the second above the first, then
   that order is kept on every device.

Non-goals (Stage 2): Events and the Task ↔ Event switch (Stage 3); sharing
Tasks with the Household (Stage 4); Tasks *for* an Event (Stage 3); a Project
Type ([ADR-0014](../../20-architecture/adr/0014-reference-data-and-labels.md));
importing from Google Tasks.
