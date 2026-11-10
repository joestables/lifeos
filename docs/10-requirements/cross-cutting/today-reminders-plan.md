# Today, Reminders and Plan

*Stage 7b ([plan](../../50-progress/plans/stage-7b.md)). The decisions come
first, then the requirements, drafted 9 November from Joe's four rounds of
answers that day and the design he agreed, and agreed by him the same day
([Stage 7b design canvas](https://claude.ai/artifact/EqX4D326Apjs5aGVF2W4Gs),
`/design-stage-7b`). Until it is built, the pages it changes work as their
own specs say; each points here. When a part is built, its requirements
move into those specs ([where each goes](#where-each-part-goes)) and they
describe it as it is. How it is built: [ADR-0065](../../20-architecture/adr/0065-reminders-alerts-and-the-day.md) (Provisionally agreed).*

## Why

A few days of daily use showed Joe using Thoughts as simple reminders —
every open Thought had one, and 19 of 22 had already gone off and sat in
Inbox — and Events as too much friction for a nudge. So a Reminder becomes
a Type of its own, light enough to make in a few keystrokes, and the pages
are reshaped around the day.

## Decisions

- **A Reminder is a Type** (Joe, 9 November): a title, its Alerts and a
  Repeat; nothing else (no notes, Labels, Space or mark). It isn't
  Completable: it has no done, and it leaves Today when its day ends. It
  is for small things; something that needs doing is a Task.
- **An Item's notifications are its Alerts.** What the specs and the app
  have called an Item's Reminders — a notification at a time, on a Task,
  an Event, a Meal or a Shopping list — are **Alerts**: "Alerts", "Add an
  alert", the "Alert" dialog. An **Alarm** is an Alert that rings
  ([REM-011](reminders.md#rem-011--an-alarm)). How they are delivered
  doesn't change ([reminders](reminders.md)).
- **Thoughts have no Alerts.** A Thought is a raw capture waiting to be
  sorted; something to be reminded of is a Reminder. Notes have none
  either.
- **A Reminder is Personal only** (Joe: no shared Reminders), blue with
  Tasks and Events, its icon a ringing bell (`bell-ring`); an Alert's line
  keeps the plain bell.
- **A Reminder is on each day it has an Alert**, on Today and Week, saying
  that day's Alert times. It is Capturable (a Thought becomes one in
  place), and converts in place to and from a Task and an Event.
- **The pages** (Joe, 9 November):

  | Page | Was | What it is |
  |---|---|---|
  | **Today** | Inbox | Everything on today, as Week has it, plus overdue Tasks; no Thoughts |
  | **Week** | Plan | Plan as it is, renamed; Reminders a Type on it |
  | **Plan** | Tasks | Tasks, Events and Reminders as lists: Tasks, Events, Reminders, Recurring |
  | **Notes** | Notes | Notes and, on a tab of their own, Thoughts |

  The drawer's first three are Today, Week and Plan. Today and Week are
  neutral; Plan is blue, as its three Types are.
- **"New" makes Thoughts and Reminders only**, as one smart line: no switch
  between them; a time in the line makes a Reminder, none a Thought. Tasks,
  Events and the rest are made on Plan, Week and their own pages.
- **The "New" button** keeps its quiet look, its speech bubble swapped for
  a bell with a plus (`bell-plus`).
- **Labels are for Notes and Thoughts only**; Tasks and Events lose them
  (Joe: he doesn't use them). **Sub-tasks go** from Tasks. **Plan has no
  Completed tab.**
- **Dates in "New":** a date with no time is at my default time (09:00
  unless changed); a time with no date is today, or tomorrow once it has
  passed. No Alert can be set in the past (Joe, 9 November).
- **The Today widget is Today**: what the page shows, in its order
  ([the Android app](android.md)).
- **The morning digest counts no Thoughts**: "2 overdue · 5 today".

## Where each part goes

When built, each part's requirements move to the spec that owns its page
or idea, and this page shrinks to a pointer:

| Part | Into |
|---|---|
| Today (TDY) | [today](../views/today.md), which replaced Inbox: TDY-001–005 moved there (step 6) |
| The Reminder Type (RMD) and Alerts (ALR) | [reminders](reminders.md) and [items](items.md); the glossary and [data model](../../20-architecture/data-model.md) |
| "New" (NEW) | [capture](capture.md#new): moved there (step 7) |
| Week (WEK) | [week](../views/week.md), renamed from Plan: moved there (step 6) |
| Plan (PLA) | [plan](../views/plan.md), from Tasks: PLA-001–006 moved there (steps 5, 6) |
| Notes' Thoughts (NTE-005) | [notes](../views/notes.md): moved there (step 6) |

## Requirements

*Stage 7b, drafted 9 November and agreed by Joe the same day. Statuses:
proposed → agreed → built → verified.*

### The Reminder Type

### RMD-001 — A Reminder

**As** Joe, **I want** a Reminder that is just a title and when, **so
that** "move the car at 3" is out of my head in seconds and nags me on
time.
Priority: Must · Status: built (step 5: 1–4, from a day's "+" on Week; step 6: New reminder on Plan, and a row's "…" menu on Today and Plan)

Acceptance criteria
1. Given a Reminder, then it has a title, one or more Alerts, and
   optionally a Repeat; nothing else. It opens as a popup like a Task's
   (ITM-001), headed "Reminder" with its ringing bell: its title, its
   Alerts, its Repeat.
2. Given a Reminder, then it is mine alone: it is in my Personal Space and
   can't be moved to a Household.
3. Given a Reminder, then it can't be ticked done; it can be deleted, with
   undo (ITM-002), from its popup's menu or its row's.
4. Given I make a Reminder on Week ("+" on a day) or Plan (New reminder),
   then its popup opens with one Alert: an hour from now if the day is
   today, else at my default time on that day; I give it a title and Save.

### RMD-002 — A Reminder's Alerts

**As** Joe, **I want** a Reminder to alert me as many times as I need,
any of them as an Alarm, **so that** "parcel arriving" can nudge me at 9
and again at 12.
Priority: Must · Status: built (step 5)

Acceptance criteria
1. Given a Reminder, then each Alert is at a date and time; I can add,
   change and remove them in its popup, as on a Task (REM-003).
2. Given an Alert, when I open it, then the Alert dialog lets me change
   its date and time and turn Alarm on (REM-011).
3. Given a Reminder with one Alert, then that Alert can be changed but not
   removed: a Reminder always has one.
4. Given an Alert's time, then it can't be in the past: the dialog won't
   save one.

### RMD-003 — A Reminder on Today and Week

**As** Joe, **I want** a Reminder on the days it alerts me, with its
times, **so that** my day shows what I'll be nudged about.
Priority: Must · Status: built (step 5: on Week, faded once gone, moved by dragging; step 6: on Today, and an Alarm's clock on Week's card)

Acceptance criteria
1. Given a Reminder with Alerts on Tuesday and Thursday, then it is on
   Week on both days, and on Today on each of them; each time it says that
   day's Alert times ("15:00, 15:40"), an Alarm's with an alarm clock.
2. Given every Alert of the day has gone off, then it stays on that day,
   faded, as a record; at the end of the day it leaves Today.
3. Given I drag a Reminder to another day on Week, then that day's Alerts
   move by the days moved, keeping their times.

### RMD-004 — Repeating Reminders

**As** Joe, **I want** a Reminder to repeat, **so that** "bins out" comes
every Monday without my making it again.
Priority: Must · Status: built (step 5: 1 and 2, and each occurrence on Week; step 6: Plan's Reminders and Recurring tabs)

Acceptance criteria
1. Given a Reminder, then I can give it a Repeat on a schedule, as a Task's
   or an Event's (TSK-008), not "after it's done" (it is never done).
2. Given a repeating Reminder, then each occurrence has the series' Alerts
   at the same times on its own day; changing one occurrence's Alert
   changes no other (REM-002 4).
3. Given repeating Reminders, then Week shows each occurrence on its day;
   Plan's Reminders tab shows only the next, and its Recurring tab the
   Reminder once, with its repeat and its next date.

### RMD-005 — A Reminder's notification

**As** Joe, **I want** to deal with a Reminder from its notification,
**so that** I needn't open the app.
Priority: Must · Status: agreed

Acceptance criteria
1. Given a Reminder's Alert goes off, then its notification shows the
   Reminder's title and the Alert's time, with Done and Snooze (on Android
   and computers, as REM-005; an Alarm as REM-011).
2. Given I choose Done, then the notification goes and nothing else
   changes: the Reminder stays on its day.
3. Given I choose Snooze, then that Alert moves to an hour from then, for
   me only, shown as "Snoozed" in the Reminder's Alerts — as on a Task or an
   Event (REM-005) — and the Reminder with it on Today and Week.

### RMD-006 — Convert to and from a Reminder

**As** Joe, **I want** to turn a Reminder into a Task or an Event and back,
and a Thought into a Reminder, **so that** what turns out to be a job, or
a fixed time, becomes one without retyping.
Priority: Must · Status: built (steps 5 and 6: 1 from Notes' Thoughts)

Acceptance criteria
1. Given a Thought, when I convert it to a Reminder (in Notes' Thoughts,
   NTE-005), then its popup opens with one Alert: the date and time its
   text names (NEW-003), else an hour from now; its text is the title.
2. Given a Reminder, when I convert it to a Task, then its do-on date and
   time are its next Alert's, and its Alerts are kept; to an Event, it
   starts at its next Alert and lasts an hour, its Alerts kept.
3. Given a Task or an Event, when I convert it to a Reminder, then its
   Alerts are kept; with none, it gets one at its do-on time (its default
   time if it has no time) or at its start; one in the past isn't kept.
4. Given any conversion, then it keeps its id, links and history, a Repeat
   on a schedule is kept, and I can undo it (ITM-004).

### Alerts

### ALR-001 — Reminders become Alerts; Thoughts have none

**As** Joe, **I want** one word for an Item's notifications, and none on
Thoughts, **so that** "Reminder" means one thing.
Priority: Must · Status: built in part (1, step 4: Alerts by name in the app, its code and the database; 2, step 7: "New" makes no Thought Alert and Settings has no Thought default; the rest of 2, and 3 and 4, step 8)

Acceptance criteria
1. Given a Task, an Event, a Meal, a Shopping list or a Reminder, then its
   notifications are listed under "Alerts", added with "Add an alert", and
   each opens the "Alert" dialog; Settings says Alerts too (REM-007).
2. Given a Thought, then it has no Alerts, and none is made for a date in
   its text (CAP-004 goes); Settings has no Thought default.
3. Given I convert a Thought, then it has no Alert to carry; a Note never
   has one.
4. Given the morning digest, then it counts no Thoughts: "2 overdue · 5
   today" (REM-008).

### Today

TDY-001–005 are built and have moved to [Today](../views/today.md#requirements)
(Stage 7b, step 6). TDY-006 comes with the Android app's next release (step 10).

### TDY-006 — The Today widget is Today

**As** Joe, **I want** the widget to show what Today shows, **so that**
the phone's home screen and the app agree.
Priority: Must · Status: agreed

Acceptance criteria
1. Given the widget, then it shows Today's Items in Today's order —
   overdue Tasks first ("Overdue" for their time), then the day — each its
   Type's icon, title and time, Reminders with their first time that day;
   done and past faded (WID-002 1, amended).
2. Given I tap the date, then Today opens; "+" opens Week with its "+"
   pressed for today, as now (WID-002 8).

### "New"

NEW-001–006 are built and have moved to [capture](capture.md#new) (step 7).

### Week

WEK-001 and WEK-002 are built and have moved to [Week](../views/week.md#wek-001--plan-becomes-week) (step 6).

### Plan

PLA-001–006 are built and have moved to [Plan](../views/plan.md#pla-001--plan-tasks-events-reminders-recurring) (steps 5 and 6). PLA-007 comes with step 9.

### PLA-007 — No Labels on Tasks and Events, no sub-tasks

**As** Joe, **I want** the fields I don't use gone, **so that** a Task's
popup is shorter.
Priority: Must · Status: agreed

Acceptance criteria
1. Given a Task's or an Event's popup, new or opened, then it has no Labels
   field; a Task's has no Sub-tasks.
2. Given the Labels on my Tasks and Events and the sub-tasks on my Tasks,
   then they are deleted (step 4: the "Work" Label on 18 Events, one Task's
   sub-tasks); the Labels themselves stay, for Notes and Thoughts.

### Notes

NTE-005 is built and has moved to [Notes](../views/notes.md#nte-005--thoughts-on-notes) (step 6).

