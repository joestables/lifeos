# Plan

*Stage 2, as Tasks; Plan from Stage 7b, with Events and Reminders as lists
too. The decisions come first; the requirements, drafted at the start of
Stage 2 and in [Today, Reminders and
Plan](../cross-cutting/today-reminders-plan.md), are at the end.*

**In one line:** my Tasks, Events and Reminders as lists, and what repeats
([ADR-0026](../../20-architecture/adr/0026-navigation-drawer.md),
[ADR-0065](../../20-architecture/adr/0065-reminders-alerts-and-the-day.md),
Provisionally agreed). It replaces Google Tasks.

## Decisions

- **A Task is done by you**; an Event happens. They are separate Types with
  an in-place switch (Events arrive in Stage 3)
  ([ADR-0020](../../20-architecture/adr/0020-task-event-reminder.md),
  Provisionally agreed).
- **Do-on and due:** do-on (a date, with an optional time) is when you mean to
  do it; due is a deadline, and only due makes a Task overdue
  ([ADR-0021](../../20-architecture/adr/0021-time.md), Provisionally agreed).
- **No Labels on Plan** (Joe, 9 November): its lists have no Label pills,
  and its rows show none. Labels on Tasks and Events go in Stage 7b's step
  9 (PLA-007); until then a Task's popup still has them
  ([ADR-0014](../../20-architecture/adr/0014-reference-data-and-labels.md),
  amended).
- **Tasks are starred**, as in Google Tasks: starring is the Task's mark,
  private to the person who stars it.
- **A Task can be shared with a Household** (Joe, 4 November;
  [HSH-005](../cross-cutting/spaces-and-sharing.md#hsh-005--share-tasks-and-events)):
  its Space, at the foot of its popup. Nobody is assigned: a shared Task is
  on every member's Today and Plan, and whoever ticks it ticks it for
  all.
- **Sub-tasks** are lines ticked inside a Task — a title and a tick, nothing
  more. They are not Tasks of their own, so they never appear on Today or
  Week, and Plan's rows don't count them; they go in Stage 7b's step 9
  (PLA-007).
- **Someday** is a Task's *idea* status.
- **Repeating Tasks** are generated occurrences: one engine, generated in
  local time, touched occurrences kept, "this and all following" starts a new
  series, two modes (*on a schedule*, *after completion*), and only a
  series' next open occurrence shows; an older untouched one is closed as
  *skipped* when a newer one comes due
  ([ADR-0022](../../20-architecture/adr/0022-repeating-items.md),
  Provisionally agreed).
- **Tasks are blue**, with Events and Reminders; the page takes that colour
  ([ADR-0043](../../20-architecture/adr/0043-colour-by-type.md),
  Provisionally agreed).
- **No Google Tasks import** ([ADR-0028](../../20-architecture/adr/0028-capture-from-outside-the-app.md)).

## What the page shows

Four tabs (Joe, 9 November), each a list; the page's main action follows
the tab: New task, New event, New reminder, and on Recurring "New", a menu
of the three.

| Tab | What it shows |
|---|---|
| **Tasks** (first) | Open Tasks under Overdue, Today, Tomorrow, each remaining day of this week, Later, No date, and Someday last; one ticked done today stays in Today, struck through, until the day ends |
| **Events** (`?tab=events`) | My Events from today on, Google's too, under Today, Tomorrow, each remaining day of this week and Later, each with its time and place; a repeating one's next only; one ended today stays, faded |
| **Reminders** (`?tab=reminders`) | My Reminders on the day of their next Alert, under the same groups, each with that day's Alert times and its repeat; today's whose Alerts have all gone off stay, faded |
| **Recurring** (`?tab=recurring`) | Each repeating Task, Event and Reminder once, under Tasks, Events and Reminders, with its repeat in full and its next date, soonest first |

There is no Completed tab. `/tasks` opens Plan (`/tasks?view=recurring`,
Recurring); `/plan?day=…` and `/plan?add=1`, Week's addresses before
Stage 7b, open Week.

Each Task shows its title and, where it has them: do-on (and time), due
(marked once overdue), whether it repeats, its Household and whether it is
starred; its "…" menu moves it to tomorrow or Someday, converts it into an
Event or a Reminder, or deletes it. A Task opens as a popup over the page, on a computer
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

*Stage 2, and Stage 7b's PLA-001–006. Statuses: proposed → agreed → built → verified.*

### TSK-001 — Add a Task quickly

**As** Joe, **I want** to add a Task from Plan in one line, **so
that** it's as quick as Google Tasks.
Priority: Must · Status: verified

Acceptance criteria
1. Given Plan, when I add "renew insurance fri", then a Task
   "Renew insurance" to do on Friday is created, its date understood as
   capture understands it
   ([CAP-003](../cross-cutting/capture.md#cap-003--dates-and-times-are-understood-the-same-way-everywhere)).
3. Given I have no signal, then the Task appears at once and is sent later.
4. Given "New task", then a new Task opens with all its fields — title,
   notes, do-on date (today, PLA-006) and time, due date, repeat, Alerts (its default
   among them once it has a do-on date,
   [REM-002](../cross-cutting/reminders.md#rem-002--a-task-reminds-me-on-its-do-on-date)),
   Labels and sub-tasks, and with a Household its Space at the foot
   ([HSH-005](../cross-cutting/spaces-and-sharing.md#hsh-005--share-tasks-and-events)) —
   and is kept only when I save it; cancelled, nothing is left behind (Joe,
   12 October).

### TSK-002 — A Task's details

**As** Joe, **I want** to set everything about a Task in one place, **so
that** a Task can hold what I need to do it.
Priority: Must · Status: verified

Acceptance criteria
1. Given a Task, when I open it, then I can change its title, notes, do-on
   date and time, due date, Labels, sub-tasks, repeat, Alerts, star and,
   if I made it, its Space, and each change is kept as I make it.
2. Given I set a time without a date, then I'm asked for the date, as a
   do-on time needs a do-on date.

### TSK-003 — Tick a Task done

**As** Joe, **I want** to tick a Task off and see it go, **so that** the
list shows only what's left.
Priority: Must · Status: verified

Acceptance criteria
1. Given an open Task, when I tick it, then it is done (I can undo that)
   and its Alerts are cleared; for today or an earlier day, it stays in
   Today, struck through, until the day ends (PLA-002 2), and otherwise it
   leaves the list.
2. Given a done Task, when I untick it, then it is open again, and its
   Alerts still in the future come back.

### TSK-004 — Tasks by date

**As** Joe, **I want** to see my Tasks by when, **so that** I can plan the
day.
Priority: Must · Status: verified

Acceptance criteria
1. Given open Tasks to do today, tomorrow, next month, and with no date,
   then Plan's Tasks shows them under Today, Tomorrow, Later and No date.
2. Given a Task, when I give it a Label, then I can pick one I already have
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
   leaves the dated groups and shows under Someday, last in Plan's Tasks; giving it a do-on date
   makes it active again.

### TSK-008 — Repeat on a schedule

**As** Joe, **I want** a Task to repeat on a schedule, **so that** "take
the bins out" comes back every Monday.
Priority: Must · Status: verified

Acceptance criteria
1. Given a Task, then I can make it repeat daily, every weekday, weekly on
   chosen days, every N days, weeks or months, monthly on a date or on the
   nth weekday ("first Saturday"), or yearly, with an optional end.
2. Given a repeating Task, then Plan and Today show only its next
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


### PLA-001 — Plan: Tasks, Events, Reminders, Recurring

*Stage 7b, agreed by Joe on 9 November.*

**As** Joe, **I want** my Tasks, Events and Reminders as lists on one
page, **so that** I can see what's coming of each.
Priority: Must · Status: verified (`plan.spec.ts`, `sign-in.spec.ts`)

Acceptance criteria
1. Given the drawer, then Plan is third, blue, with a list icon; `/tasks`
   opens it.
2. Given Plan, then its tabs are **Tasks**, **Events**, **Reminders** and
   **Recurring**; it has no Completed tab and no Label pills.
3. Given a tab, then the page's main action follows it: New task, New
   event, New reminder; on Recurring, "New", a menu of the three.

### PLA-002 — The Tasks tab

**As** Joe, **I want** my Tasks by when, as before, **so that** nothing
changes but what I don't use.
Priority: Must · Status: verified (`plan.spec.ts`, `src/lib/tasks.test.ts`)

Acceptance criteria
1. Given Tasks, then open Tasks are under Overdue, Today, Tomorrow, each
   remaining day of this week, Later, No date and Someday (TSK-004),
   without Labels.
2. Given a Task ticked done today, then it stays in Today, struck through,
   until the day ends (TDY-003 1).
3. Given a Task's row, then it shows its time, day, due date, repeat, star
   and Household, but no Labels or sub-tasks.

### PLA-003 — The Events tab

**As** Joe, **I want** my coming Events as a list, **so that** I can see
what's on without paging through weeks.
Priority: Must · Status: built (`src/lib/plan-lists.test.ts`)

Acceptance criteria
1. Given Events, then my Events from today on, those from Google Calendar
   too, are under Today, Tomorrow, each remaining day of this week and
   Later, each with its time (or "All day") and place; one over several
   days is on the day it starts, saying until when, and one going on since
   an earlier day is under Today.
2. Given a repeating Event, then only its next occurrence is listed.
3. Given an Event today that has ended, then it stays, faded, until the
   day ends; ones before today aren't listed.

### PLA-004 — The Reminders tab

**As** Joe, **I want** my Reminders as a list, **so that** I can see every
nudge to come.
Priority: Must · Status: built (`src/lib/plan-lists.test.ts`)

Acceptance criteria
1. Given Reminders, then my Reminders are under Today, Tomorrow, each
   remaining day of this week and Later, on the day of their next Alert,
   each with its Alert times that day, its repeat, and in Later its date; a
   repeating one's next only.
2. Given today's Reminders whose Alerts have all gone off, then they stay,
   faded, until the day ends.

### PLA-005 — The Recurring tab

**As** Joe, **I want** everything that repeats in one place, **so that** I
can see and change my routines.
Priority: Must · Status: verified (`repeating.spec.ts`; Events and Reminders by `src/lib/plan-lists.test.ts`)

Acceptance criteria
1. Given Recurring, then each repeating Task, Event and Reminder is listed
   once, under Tasks, Events and Reminders, each with its repeat in full
   ("Every 2 weeks", "1 week after it's done") and its next date, soonest
   first.

### PLA-006 — A new Task starts today

**As** Joe, **I want** a new Task to be for today unless I say otherwise,
**so that** I needn't set the date each time.
Priority: Must · Status: verified (`plan.spec.ts`)

Acceptance criteria
1. Given New task, then Do on is today, and I can change or clear it.
2. Given its default Alert (REM-002 1) would be at a time already gone
   today, then it is an hour from now instead, shown in its Alerts before I
   save.

PLA-007, Labels and sub-tasks gone from Tasks and Events, comes with Stage
7b's step 9 ([Today, Reminders and Plan](../cross-cutting/today-reminders-plan.md#pla-007--no-labels-on-tasks-and-events-no-sub-tasks)).

Non-goals (Stage 2): Events and the Task ↔ Event switch (Stage 3); sharing
Tasks with the Household (HSH-005); Tasks *for* an Event (Stage 3); sub-tasks
with their own dates or Alerts; a Project Type
([ADR-0014](../../20-architecture/adr/0014-reference-data-and-labels.md));
importing from Google Tasks.
