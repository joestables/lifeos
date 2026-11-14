# Today

*Stage 7b, replacing Inbox (Stage 2). The decisions come first; the
requirements, agreed by Joe on 9 November in [Today, Reminders and
Plan](../cross-cutting/today-reminders-plan.md), are at the end.*

**In one line:** everything on today, and my overdue Tasks, in one list
([ADR-0026](../../20-architecture/adr/0026-navigation-drawer.md),
[ADR-0065](../../20-architecture/adr/0065-reminders-alerts-and-the-day.md),
Provisionally agreed). Where the app opens.

## Decisions

- **Today is Week's today, of every Type** (Joe, 9 November): what Week
  shows on today, whatever Week's Type pills, plus my overdue Tasks; it is
  worked out on the device, as Week is
  ([ADR-0065](../../20-architecture/adr/0065-reminders-alerts-and-the-day.md)
  10).
- **No Thoughts on Today.** They wait on Notes' Thoughts tab
  ([NTE-005](notes.md#nte-005--thoughts-on-notes)); Today says only how
  many ([ADR-0037](../../20-architecture/adr/0037-thoughts.md), amended).
- **No Labels on Today**: it has no Label pills.
- **The day in four parts** (Joe, 9 November): Anytime (no time), Morning
  (00:00–12:00), Afternoon (12:00–17:00) and Evening (17:00–24:00); a Meal
  in its slot's part.
- **Done and past stay as the day's record** until the day ends, as a done
  Task stays on Week.
- **Due** drives "overdue" ([ADR-0021](../../20-architecture/adr/0021-time.md)):
  a Task to do on an earlier day and not done stays on Today, as on Plan's
  Tasks; one due before today is under Overdue.
- A repeating Task shows its **next open occurrence only**
  ([ADR-0022](../../20-architecture/adr/0022-repeating-items.md), Provisionally agreed).
- A **broken Integration** shows on Today, and so does the offer to turn
  notifications on
  ([REM-001](../cross-cutting/reminders.md#rem-001--turn-on-notifications-for-a-device)).
- **Today is neutral**: it mixes Types, so each Item shows its own Type's
  colour ([ADR-0043](../../20-architecture/adr/0043-colour-by-type.md),
  Provisionally agreed).
- **Only what is mine**: in one of my Spaces
  ([HSH-005](../cross-cutting/spaces-and-sharing.md#hsh-005--share-tasks-and-events) 7).
- The **morning digest** is Today in one notification
  ([REM-008](../cross-cutting/reminders.md#rem-008--a-morning-digest));
  it counts no Thoughts from Stage 7b's step 8 (ALR-001 4).
- The **Today widget** becomes Today in Stage 7b's step 10
  ([TDY-006](../cross-cutting/today-reminders-plan.md#tdy-006--the-today-widget-is-today)).

## What the page shows

Today's date over the title ("Sunday 11 October"). Then, each hidden when
empty:

| Group | What is in it | Order |
|---|---|---|
| **Overdue** | My open Tasks due before today | Oldest due date first |
| **Anytime** | What has no time: an untimed Task (one left from an earlier day too), a Workout, a Shopping list, an all-day Event or one going on from an earlier day | As Week's day orders them |
| **Morning** | 00:00–12:00: Breakfast, then by time | By time |
| **Afternoon** | 12:00–17:00: Lunch, then by time | By time |
| **Evening** | 17:00–24:00: Dinner, then by time | By time |

A Task is its row, as on Plan: ticked, moved to tomorrow, starred, opened,
converted or deleted from its "…" menu; no Labels or sub-tasks. A Reminder
shows its tile, title, that day's Alert times (an Alarm's with an alarm
clock) and its repeat, and converts or deletes from its menu. Anything else
shows its tile, title, time and one detail ("09:30–09:45 · Zoom", "Dinner").
At the foot, while Thoughts wait, one quiet line, "5 thoughts to sort",
opens Notes' Thoughts. With nothing today and nothing overdue: "Nothing
today". `/inbox` opens Today.

## Requirements

*Stage 7b. Statuses: proposed → agreed → built → verified. Inbox's
requirements (INB, Stage 2) are kept where they still hold: sorting and
ticking off Thoughts on [Notes](notes.md#thoughts) (INB-001, INB-002,
INB-006); ticking and moving Tasks in TDY-003 and TDY-004; the count in
TDY-005. Its Label filter (INB-007) went with Stage 7b.*

### TDY-001 — Today

**As** Joe, **I want** one page with everything on today, **so that** I
open the app and see my day.
Priority: Must · Status: verified (`today.spec.ts`)

Acceptance criteria
1. Given Today, then it is the first page in the drawer and where the app
   opens; it shows today's date over its title ("Monday 9 November").
2. Given Today, then it shows my overdue Tasks (due before today, not done)
   under **Overdue**, then everything Week shows today, of every Type,
   whatever Week's Type pills: Tasks, Events, Reminders, Meals, Shopping
   lists, Workouts and later Types. A Task to do on an earlier day and not
   done is there too, as on Plan's Tasks (TSK-004).
3. Given Thoughts, then none is on Today; while any waits, one quiet line
   at the foot says how many ("5 thoughts to sort") and opens Notes'
   Thoughts tab (NTE-005).
4. Given Today, then it has no Label pills.
5. Given nothing today and nothing overdue, then it says "Nothing today",
   with the Thoughts line under it if any wait.
6. Given a broken Integration, or none of my devices with notifications
   on, then their Alerts show at the top.
7. Given `/inbox` (a bookmark, an old notification), then Today opens.

### TDY-002 — The day in four parts

**As** Joe, **I want** the day split into parts, **so that** I can see at
a glance what's this morning and what's tonight.
Priority: Must · Status: verified (`today.spec.ts`, `src/lib/today.test.ts`)

Acceptance criteria
1. Given today's Items, then they are grouped, each group hidden when
   empty: **Anytime** (no time: an untimed Task, a Workout, a Shopping
   list, an all-day Event), **Morning** (00:00–12:00), **Afternoon**
   (12:00–17:00) and **Evening** (17:00–24:00).
2. Given a Meal, then Breakfast is in the Morning, Lunch the Afternoon and
   Dinner the Evening, first in its group.
3. Given a Reminder, then it is in the part of its first Alert that day,
   listing all that day's times; an Event in the part it starts in (one
   that began on an earlier day, in Anytime).
4. Given a group, then its Items are in time order; Anytime's as Week's day
   orders them.

### TDY-003 — Done and past stay as the day's record

**As** Joe, **I want** what I've done and what has passed to stay on
Today, **so that** the page is a record of my day.
Priority: Must · Status: verified (`today.spec.ts`, `src/lib/today.test.ts`)

Acceptance criteria
1. Given a Task ticked done today, then it stays in its place, struck
   through, until the day ends; unticking it brings it back.
2. Given an Event that has ended, or a Reminder whose Alerts that day have
   all gone off, then it stays, faded. A Meal never fades on Today; eaten,
   it is struck through, as any done Item is, never faded (Joe, 14
   November).
3. Given the day ends, then everything of the day leaves, but for overdue
   Tasks, which move to Overdue, and Tasks not done, which stay.

### TDY-004 — Act on what's on Today

**As** Joe, **I want** to act on things where they are, **so that** I
needn't go to their own page.
Priority: Must · Status: verified (`today.spec.ts`)

Acceptance criteria
1. Given a Task on Today, then I can tick it, move it to tomorrow, star it
   and open it, as on Plan; moved to tomorrow, its Alert moves with it and
   it leaves Today, with Undo.
2. Given any other Item, then it shows its Type's tile, its title and its
   time and one detail (a place, "Dinner", a Reminder's times and repeat);
   tapping it opens it (ITM-001).
3. Given a Reminder or a Task, then its "…" menu converts it (RMD-006) or
   deletes it.
4. Given a phone, then a Fab ("+") opens Week's "+" for today, Add to
   Today: every Schedulable Type (Task, Event, Reminder, Meal, Shopping
   list, Workout), each new one for today (Joe, 14 November).

### TDY-005 — How much is on Today, in the drawer

**As** Joe, **I want** the drawer to say how much is on Today, **so that**
I can see it from any page.
Priority: Should · Status: verified (`today.spec.ts`)

Acceptance criteria
1. Given Today, then the drawer's count beside it is the number of Items on
   the page, every group, done and past ones too; Thoughts aren't counted.

TDY-006, the Today widget as Today, is built with the Android app's next
release ([Today, Reminders and Plan](../cross-cutting/today-reminders-plan.md#tdy-006--the-today-widget-is-today)).

Non-goals: entries from Modules and Integrations beyond the broken
Integration's Alert; choosing which Types Today shows; Labels.
