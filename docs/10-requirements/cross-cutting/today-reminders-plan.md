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
| Today (TDY) | `views/today.md`, replacing [inbox](../views/inbox.md) |
| The Reminder Type (RMD) and Alerts (ALR) | [reminders](reminders.md) and [items](items.md); the glossary and [data model](../../20-architecture/data-model.md) |
| "New" (NEW) | [capture](capture.md) |
| Week (WEK) | `views/week.md`, renamed from [plan](../views/plan.md) |
| Plan (PLA) | `views/plan.md`, from [tasks](../views/tasks.md) |
| Notes' Thoughts (NTE-005) | [notes](../views/notes.md) |

## Requirements

*Stage 7b, drafted 9 November and agreed by Joe the same day. Statuses:
proposed → agreed → built → verified.*

### The Reminder Type

### RMD-001 — A Reminder

**As** Joe, **I want** a Reminder that is just a title and when, **so
that** "move the car at 3" is out of my head in seconds and nags me on
time.
Priority: Must · Status: agreed

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
Priority: Must · Status: agreed

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
Priority: Must · Status: agreed

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
Priority: Must · Status: agreed

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
Priority: Must · Status: agreed

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
Priority: Must · Status: agreed

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

### TDY-001 — Today

**As** Joe, **I want** one page with everything on today, **so that** I
open the app and see my day.
Priority: Must · Status: agreed

Acceptance criteria
1. Given Today, then it is the first page in the drawer and where the app
   opens; it shows today's date over its title ("Monday 9 November").
2. Given Today, then it shows my overdue Tasks (due before today, not done)
   under **Overdue**, then everything Week shows today, of every Type,
   whatever Week's Type pills: Tasks, Events, Reminders, Meals, Shopping
   lists, Workouts and later Types.
3. Given Thoughts, then none is on Today; while any waits, one quiet line
   at the foot says how many ("5 thoughts to sort") and opens Notes'
   Thoughts tab (NTE-005).
4. Given Today, then it has no Label pills.
5. Given nothing today and nothing overdue, then it says "Nothing today",
   with the Thoughts line under it if any wait.
6. Given a broken Integration, or none of my devices with notifications
   on, then their Alerts show at the top, as on Inbox.
7. Given `/inbox` (a bookmark, an old notification), then Today opens.

### TDY-002 — The day in four parts

**As** Joe, **I want** the day split into parts, **so that** I can see at
a glance what's this morning and what's tonight.
Priority: Must · Status: agreed

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
Priority: Must · Status: agreed

Acceptance criteria
1. Given a Task ticked done today, then it stays in its place, struck
   through, until the day ends; unticking it brings it back.
2. Given an Event that has ended, or a Reminder whose Alerts that day have
   all gone off, or a Meal whose slot has passed, then it stays, faded.
3. Given the day ends, then everything of the day leaves, but for overdue
   Tasks, which move to Overdue.

### TDY-004 — Act on what's on Today

**As** Joe, **I want** to act on things where they are, **so that** I
needn't go to their own page.
Priority: Must · Status: agreed

Acceptance criteria
1. Given a Task on Today, then I can tick it, move it to tomorrow, star it
   and open it, as on Plan (INB-003, INB-004).
2. Given any other Item, then it shows its Type's tile, its title and its
   time and one detail (a place, "Dinner", a Reminder's times and repeat);
   tapping it opens it (ITM-001).
3. Given a Reminder or a Task, then its "…" menu converts it (RMD-006) or
   deletes it.

### TDY-005 — How much is on Today, in the drawer

**As** Joe, **I want** the drawer to say how much is on Today, **so that**
I can see it from any page.
Priority: Should · Status: agreed

Acceptance criteria
1. Given Today, then the drawer's count beside it is the number of Items on
   the page, every group, done and past ones too; Thoughts aren't counted.

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

### NEW-001 — The "New" button

**As** Joe, **I want** "New" where it always is, **so that** making a
Reminder is one tap from anywhere.
Priority: Must · Status: agreed

Acceptance criteria
1. Given any page, then "New" is at the top right on a computer and in the
   top bar on a phone: the quiet button it is now, with a bell and a plus
   in place of the speech bubble; on a computer, N opens it too.
2. Given I press it, then "New" opens over the page, the line ready to type
   in, as capture does now (CAP-002).

### NEW-002 — One smart line

**As** Joe, **I want** to type a reminder as I'd say it, **so that** it's
quick and there's nothing to choose first.
Priority: Must · Status: agreed

Acceptance criteria
1. Given "New", then it is one line ("Remind me to…"), quick times under it
   (NEW-005), and Cancel and Save; there is no Thought / Reminder switch.
2. Given the line has a time (one typed, NEW-003, or one added, NEW-005),
   then Save makes a Reminder; with none, a Thought. A tile at the top right
   says which as I type: the Reminder's blue bell or the Thought's yellow
   lightbulb. The button says only "Save".
3. Given the line is empty, then Save is off; Enter saves.
4. Given I save, then it is made in my Personal Space, offline too (CAP-001
   4), and "New" closes.

### NEW-003 — Times are understood, and kept out of the title

**As** Joe, **I want** "clean bedroom tues 8pm" to become "Clean bedroom"
at 20:00 on Tuesday, **so that** the title reads as I'd write it.
Priority: Must · Status: agreed

Acceptance criteria
1. Given I type "clean bedroom tues 8pm", then the words for the time
   become an Alert pill, Tue 10 Nov, 20:00, and the title is "Clean
   bedroom" (its first letter a capital); the words are understood as
   everywhere else (CAP-003).
2. Given "… tues 8pm and 9pm", then there are two Alert pills.
3. Given a date with no time ("call mum tomorrow"), then the Alert is at my
   default time (09:00 unless changed).
4. Given a time with no date ("bins out 7pm"), then it is today, or
   tomorrow if 19:00 has passed; a weekday is the next one, today if its
   time is still to come.
5. Given "in 2 hours", "tonight", "this weekend", then they are understood
   as the quick times are (NEW-005).
6. Given no Alert can be in the past, then nothing typed makes one.
7. Given "every tuesday", then no Repeat is set from the line (Joe, 9
   November); a Repeat is set in the Reminder's popup (RMD-004).

### NEW-004 — Alert pills in the line

**As** Joe, **I want** each Alert as a pill I can change or remove,
**so that** fixing what was understood is a tap.
Priority: Must · Status: agreed

Acceptance criteria
1. Given an Alert, typed or added, then it is a pill in the line after the
   title, in the Reminder's blue tint, with a bell (an alarm clock for an
   Alarm) and its date and time, and × at its end.
2. Given I tap a pill, then the Alert dialog opens: its date and time, and
   Alarm (RMD-002 2).
3. Given I press × or Backspace just after a pill, then it is removed; the
   last one removed, the line is a Thought again.

### NEW-005 — Quick times

**As** Joe, **I want** the likely times a tap away, **so that** on my
phone I needn't type a time at all.
Priority: Must · Status: agreed

Acceptance criteria
1. Given "New", then under the line are three pills: **In 1 hour**; the
   likeliest next time — **This evening** (18:00) before 17:00, **Tomorrow
   morning** (my default time tomorrow) from 17:00; and **More**.
2. Given I tap one, then its Alert is added as a pill (NEW-004); the pill
   tapped doesn't stay chosen, and tapping it again adds nothing new.
3. Given More, then it offers In 1 hour, This evening, Tomorrow morning,
   This weekend (Saturday at my default time) each with its time, and
   "Pick a date and time", which opens the Alert dialog.
4. Given a phone, then the pills scroll sideways rather than wrapping.

### NEW-006 — A Thought from "New"

**As** Joe, **I want** to jot a Thought as before, **so that** an idea
with no time is still captured in seconds.
Priority: Must · Status: agreed

Acceptance criteria
1. Given the line has no time, then my Labels show under the quick times,
   to give the Thought (CAP-009); with a time, they hide (a Reminder has
   none).
2. Given I save a Thought, then it waits in Notes' Thoughts tab (NTE-005),
   counted on Today's Thoughts line (TDY-001 3).

### Week

### WEK-001 — Plan becomes Week

**As** Joe, **I want** the week's page called Week, **so that** Plan can
name the lists of what I plan.
Priority: Must · Status: agreed

Acceptance criteria
1. Given the drawer, then Week is second, with Plan's calendar icon, and
   is what Plan is now (PLN-001–008), renamed.
2. Given `/plan?add=1` from a widget not yet updated, then Week opens with
   its "+" pressed for today.

### WEK-002 — Reminders on Week

**As** Joe, **I want** Reminders on Week, **so that** I see what I'll be
nudged about each day.
Priority: Must · Status: agreed

Acceptance criteria
1. Given Week, then Reminders are a Type pill to show or hide (PLN-004),
   and a choice under a day's "+" (PLN-006, RMD-001 4).
2. Given a Reminder's card, then it shows its Type, title and that day's
   Alert times ("15:00, 15:40"), and fades once they have all gone off
   (RMD-003).

### Plan

### PLA-001 — Plan: Tasks, Events, Reminders, Recurring

**As** Joe, **I want** my Tasks, Events and Reminders as lists on one
page, **so that** I can see what's coming of each.
Priority: Must · Status: agreed

Acceptance criteria
1. Given the drawer, then Plan is third, blue, with a list icon; `/tasks`
   opens it.
2. Given Plan, then its tabs are **Tasks**, **Events**, **Reminders** and
   **Recurring**; it has no Completed tab and no Label pills.
3. Given a tab, then the page's main action follows it: New task, New
   event, New reminder; on Recurring, "New", a menu of the three.

### PLA-002 — The Tasks tab

**As** Joe, **I want** my Tasks by when, as now, **so that** nothing
changes but what I don't use.
Priority: Must · Status: agreed

Acceptance criteria
1. Given Tasks, then open Tasks are under Overdue, Today, Tomorrow, each
   remaining day of this week, Later, No date and Someday, as All tasks is
   now (TSK-004), without Labels.
2. Given a Task ticked done today, then it stays in Today, struck through,
   until the day ends (TDY-003 1).
3. Given a Task's row, then it shows its time, day, due date, repeat, star
   and Household, but no Labels or sub-tasks.

### PLA-003 — The Events tab

**As** Joe, **I want** my coming Events as a list, **so that** I can see
what's on without paging through weeks.
Priority: Must · Status: agreed

Acceptance criteria
1. Given Events, then my Events from today on, those from Google Calendar
   too, are under Today, Tomorrow, each remaining day of this week and
   Later, each with its time (or "All day") and place; one over several
   days is on the day it starts, saying until when.
2. Given a repeating Event, then only its next occurrence is listed.
3. Given an Event today that has ended, then it stays, faded, until the
   day ends; ones before today aren't listed.

### PLA-004 — The Reminders tab

**As** Joe, **I want** my Reminders as a list, **so that** I can see every
nudge to come.
Priority: Must · Status: agreed

Acceptance criteria
1. Given Reminders, then my Reminders are under Today, Tomorrow, each
   remaining day of this week and Later, on the day of their next Alert,
   each with its Alert times that day, its repeat, and in Later its date.
2. Given today's Reminders whose Alerts have all gone off, then they stay,
   faded, until the day ends.

### PLA-005 — The Recurring tab

**As** Joe, **I want** everything that repeats in one place, **so that** I
can see and change my routines.
Priority: Must · Status: agreed

Acceptance criteria
1. Given Recurring, then each repeating Task, Event and Reminder is listed
   once, under Tasks, Events and Reminders, each with its repeat in full
   ("Every 2 weeks", "1 week after it's done") and its next date, soonest
   first.

### PLA-006 — A new Task starts today

**As** Joe, **I want** a new Task to be for today unless I say otherwise,
**so that** I needn't set the date each time.
Priority: Must · Status: agreed

Acceptance criteria
1. Given New task, then Do on is today, and I can change or clear it.
2. Given its default Alert (REM-002 1) would be at a time already gone
   today, then it is an hour from now instead, shown in its Alerts before I
   save.

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

### NTE-005 — Thoughts on Notes

**As** Joe, **I want** my Thoughts on Notes, on a tab of their own, **so
that** they're sorted somewhere calm rather than crowding my day.
Priority: Must · Status: agreed

Acceptance criteria
1. Given Notes, then its tabs are **Notes** and **Thoughts**; my Labels
   are pills under them and narrow either tab (NTE-002).
2. Given Thoughts, then my Thoughts not ticked off are listed newest first,
   each with when it was captured and its Labels.
3. Given a Thought, then I can tick it off (INB-006), delete it, or convert
   it: Reminder, Task and Note one tap each, any other Capturable Type from
   its menu (INB-002, RMD-006 1).
4. Given the Thoughts tab, then the page's main action is New thought,
   opening "New" (NEW-002).

## Non-goals

Shared Reminders; a Reminder with notes, Labels or a place; Alerts on
Thoughts or Notes; a Completed list of Tasks; choosing which Types Today
shows; a widget for "New" (later, with capture from outside the app,
Stage 10).

## Joe's answers to the open points (9 November)

Joe agreed Claude's choices in this spec and answered its two points:

1. **"every tuesday" in "New"** sets no Repeat (NEW-003 7).
2. **Snooze is the same for Tasks, Events and Reminders**: that Alert moves
   to an hour from then, for me only, shown as "Snoozed" in the Item's
   Alerts, as a Task's does now (RMD-005 3). Events get no Done.
