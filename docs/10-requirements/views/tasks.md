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
- **Labels filter Tasks**, like choosing among Google Tasks' lists (Home,
  Work, Car). Thoughts, Notes, Tasks and Events share one set of Labels
  ([ADR-0014](../../20-architecture/adr/0014-reference-data-and-labels.md),
  Provisionally agreed).
- **Tasks are starred**, as in Google Tasks: starring is the Task's mark,
  private to the person who stars it.
- **Sub-tasks** are lines ticked inside a Task — a title and a tick, nothing
  more. They are not Tasks of their own, so they never appear in Inbox or on
  Plan.
- **Someday** is a Task's *idea* status.
- **Repeating Tasks** are generated occurrences: one engine, generated in
  local time, touched occurrences kept, "this and all following" starts a new
  series, two modes (*on a schedule*, *after completion*), and only a
  series' next open occurrence shows; an older untouched one is closed as
  *skipped* when a newer one comes due
  ([ADR-0022](../../20-architecture/adr/0022-repeating-items.md),
  Provisionally agreed).
- **Tasks are blue**, with Events; the page takes that colour
  ([ADR-0043](../../20-architecture/adr/0043-colour-by-type.md),
  Provisionally agreed).
- **No Google Tasks import** ([ADR-0028](../../20-architecture/adr/0028-capture-from-outside-the-app.md)).

## What the page shows (Stage 2)

"New task" is the page's main action. The page has three views (Joe, 13
October), and under them my Labels as pills: choosing one or more narrows
every view to the Tasks with any of them, and the choice stays as I switch
views.

| View of the page | What it shows |
|---|---|
| **All tasks** (first) | Open Tasks under Overdue, Today, Tomorrow, each remaining day of this week, Later, No date, and Someday last |
| **Recurring** | Each repeating Task once, with its repeat and its next date: those on a schedule, then those that come back after they're done, soonest first |
| **Completed** | Done Tasks, struck through, the most recently changed first (when they were done, unless changed since) |

Each Task shows its title and, where it has them: do-on (and time), due
(marked once overdue), Labels, sub-tasks done ("2/5"), whether it repeats and
whether it is starred. A Task opens as a popup over the page, on a computer
and on a phone ([ITM-001](../cross-cutting/items.md#itm-001--open-an-item)).

**A repeat** is set in the Task's Repeat field: on a schedule, or a while
after it's done. The Task becomes the repeat's first occurrence, from its
do-on date (today, if it has none or it has passed); each occurrence after it
is made with the Task's title, notes, time, Labels and due date (the same
distance after its do-on date), but not its sub-tasks. Changing the repeat
of an occurrence applies from that occurrence on (TSK-011); "Don't repeat"
stops it there. Occurrences a repeat takes away when it changes or stops
don't appear in Recently deleted: they were never edited.

## Requirements

*Stage 2. Statuses: proposed → agreed → built → verified.*

### TSK-001 — Add a Task quickly

**As** Joe, **I want** to add a Task from the Tasks View in one line, **so
that** it's as quick as Google Tasks.
Priority: Must · Status: verified

Acceptance criteria
1. Given the Tasks View, when I add "renew insurance fri", then a Task
   "Renew insurance" to do on Friday is created, its date understood as
   capture understands it
   ([CAP-003](../cross-cutting/capture.md#cap-003--dates-and-times-are-understood-the-same-way-everywhere)).
2. Given I add a Task with the page narrowed to Labels, then it starts
   with those Labels.
3. Given I have no signal, then the Task appears at once and is sent later.
4. Given "New task", then a new Task opens with all its fields — title,
   notes, do-on date and time, due date, repeat, Reminders (its default
   among them once it has a do-on date,
   [REM-002](../cross-cutting/reminders.md#rem-002--a-task-reminds-me-on-its-do-on-date)),
   Labels and sub-tasks — and is kept only when I save it; cancelled,
   nothing is left behind (Joe, 12 October).

### TSK-002 — A Task's details

**As** Joe, **I want** to set everything about a Task in one place, **so
that** a Task can hold what I need to do it.
Priority: Must · Status: verified

Acceptance criteria
1. Given a Task, when I open it, then I can change its title, notes, do-on
   date and time, due date, Labels, sub-tasks, repeat, Reminders and star,
   and each change is kept as I make it.
2. Given I set a time without a date, then I'm asked for the date, as a
   do-on time needs a do-on date.

### TSK-003 — Tick a Task done

**As** Joe, **I want** to tick a Task off and see it go, **so that** the
list shows only what's left.
Priority: Must · Status: verified

Acceptance criteria
1. Given an open Task, when I tick it, then it is done, leaves the open
   Tasks (I can undo that), appears under Completed, and its Reminders are
   cleared.
2. Given a done Task, when I untick it, then it is open again, and its
   Reminders still in the future come back.

### TSK-004 — Tasks by date, filtered by Label

**As** Joe, **I want** to see my Tasks by when and by what they're for,
**so that** I can plan the day and find the Car jobs.
Priority: Must · Status: verified

Acceptance criteria
1. Given open Tasks to do today, tomorrow, next month, and with no date,
   then "All tasks" shows them under Today, Tomorrow, Later and No date.
2. Given Tasks labelled Home and Car and one with none, when I choose
   Car, then every view shows only Car's Tasks, and still does when I
   switch views; choosing Home too shows Tasks with either.
3. Given a Task, when I give it a Label, then I can pick one I already have
   or make a new one, from the same set as Notes
   ([ITM-005](../cross-cutting/items.md#itm-005--labels-on-thoughts-notes-and-tasks)).

### TSK-005 — Star a Task

**As** Joe, **I want** to star the Tasks that matter most, as in Google
Tasks, **so that** they stand out wherever they appear.
Priority: Should · Status: verified

Acceptance criteria
1. Given a Task, when I star it, then it shows as starred wherever it
   appears; unstarring it removes the star.
2. Given a Task shared with the Household (from Stage 4), then my star is
   mine alone.

### TSK-006 — Sub-tasks

**As** Joe, **I want** to tick off parts of a Task inside it, **so that** a
job with parts stays one Task.
Priority: Could · Status: verified

Acceptance criteria
1. Given a Task, when I add five sub-tasks and tick two, then the Task shows
   "2/5" wherever it appears.
2. Given I tick the Task done, then its sub-tasks are left as they were.

### TSK-007 — Someday

**As** Joe, **I want** to park a Task for someday, **so that** it's kept but
not in my way.
Priority: Should · Status: verified

Acceptance criteria
1. Given a Task, when I move it to Someday, then it loses its do-on date,
   leaves the dated groups and shows under Someday, last in All tasks; giving it a do-on date
   makes it active again.

### TSK-008 — Repeat on a schedule

**As** Joe, **I want** a Task to repeat on a schedule, **so that** "take
the bins out" comes back every Monday.
Priority: Must · Status: verified

Acceptance criteria
1. Given a Task, then I can make it repeat daily, every weekday, weekly on
   chosen days, every N days, weeks or months, monthly on a date or on the
   nth weekday ("first Saturday"), or yearly, with an optional end.
2. Given a repeating Task, then the Tasks View and Inbox show only its next
   open occurrence; when I tick it, the one after appears.
3. Given a Task repeating every Monday at 18:30, then each occurrence is at
   18:30 London time, either side of the clocks changing.
4. Given a repeating Task, then its occurrences are always there for the
   next two months or so, including when the repeat was set up offline.

### TSK-009 — Repeat after completion

**As** Joe, **I want** some Tasks to come back a while after I last did
them, **so that** "descale the kettle" is three months after the last time,
not on a fixed date.
Priority: Should · Status: verified

Acceptance criteria
1. Given a Task repeating three months after completion, when I tick it
   on 10 October, then the next occurrence is to do on 10 January.

### TSK-010 — A missed repeat doesn't pile up

**As** Joe, **I want** a missed daily Task to be skipped rather than stack
up, **so that** missing vitamins on Monday doesn't leave seven overdue
Tasks by Sunday.
Priority: Must · Status: verified

Acceptance criteria
1. Given a daily Task not done on Monday, when Tuesday's occurrence comes
   due, then Monday's is closed as *skipped* if I hadn't changed it, and only
   Tuesday's shows.
2. Given I had changed Monday's occurrence, then it stays open.

### TSK-011 — Change or stop a repeat

**As** Joe, **I want** to change a repeat from a given date, or stop it,
**so that** past occurrences and my edits are kept.
Priority: Must · Status: verified

Acceptance criteria
1. Given a weekly Task, when I change one occurrence's title, then only
   that occurrence changes.
2. Given a weekly Task, when I change the repeat "for this and all
   following", then occurrences from there follow the new repeat, except
   ones I had changed, which stay as they are; earlier ones are unchanged.
3. Given I stop the repeat, then future occurrences I hadn't changed go,
   and done, past or changed ones are kept.

### TSK-012 — Reorder by hand

**As** Joe, **I want** to put Tasks in my own order within a group, **so
that** the list reads in the order I'll do things.
Priority: Could · Status: agreed

Acceptance criteria
1. Given two Tasks under Today, when I move the second above the first, then
   that order is kept on every device.

Non-goals (Stage 2): Events and the Task ↔ Event switch (Stage 3); sharing
Tasks with the Household (Stage 4); Tasks *for* an Event (Stage 3); sub-tasks
with their own dates or Reminders; a Project Type
([ADR-0014](../../20-architecture/adr/0014-reference-data-and-labels.md));
importing from Google Tasks.
