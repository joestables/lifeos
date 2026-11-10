# Events

*Stage 3. An Event is a core Type with no page of its own: it lives on
[Week](../views/week.md). The decisions come first; the requirements, drafted
at the start of Stage 3 ([plan](../../50-progress/plans/stage-3.md)), are at
the end.*

> **Changed in Stage 7b** (spec agreed 9 November): Plan has an Events tab since step 6 ([PLA-003](../views/plan.md#pla-003--the-events-tab)), and Events have no Labels since step 9 ([PLA-007](../views/plan.md#pla-007--no-labels-on-tasks-and-events-no-sub-tasks)). [Today, Reminders and Plan](today-reminders-plan.md).

## Decisions

- **An Event happens**; a Task is done by you. They are separate Types with
  an in-place switch
  ([ADR-0020](../../20-architecture/adr/0020-task-event-reminder.md),
  Provisionally agreed).
- **What an Event holds** (Joe, 14 October): a title, a start and an end (or
  all day, over one day or several), a place, notes, Alerts and a repeat.
  It has no mark.
- **Events have no Labels** (Joe, 9 November; they took them from Stage 3
  until Stage 7b): Labels are for Notes and Thoughts
  ([PLA-007](../views/plan.md#pla-007--no-labels-on-tasks-and-events-no-sub-tasks),
  [ADR-0065](../../20-architecture/adr/0065-reminders-alerts-and-the-day.md)).
- **Events aren't captured** (Joe, 14 October): capture makes Thoughts and
  Tasks. An Event is made on Week, by switching a Task, or by sorting a
  Thought into one on Notes' Thoughts.
- **An Event I make reminds me 30 minutes before** it starts, if it has a
  time; an all-day Event and one from Google Calendar have no Alert
  unless I add one (Joe, 14 October;
  [alerts](reminders.md#decisions)).
- **Repeating Events** use the same engine and rules as repeating Tasks, on
  a schedule only (an Event isn't done)
  ([ADR-0022](../../20-architecture/adr/0022-repeating-items.md),
  Provisionally agreed). Unlike Tasks, every occurrence shows on Week.
- **Tasks *for* an Event** ("buy a card" for "Mum's birthday lunch") are
  linked with the *for* link
  ([data model](../../20-architecture/data-model.md#link-types)).
- **An Event can be shared with a Household** (Joe, 4 November;
  [HSH-005](spaces-and-sharing.md#hsh-005--share-tasks-and-events)): its
  Space, at the foot of its popup. Every member sees it, can change or
  delete it, gets their own default Alert, and has it in their default
  Google calendar. What Google Calendar brings in starts Personal and can
  be shared too ([integrations](integrations.md#google-calendar)).
- **Events are blue**, with Tasks
  ([ADR-0043](../../20-architecture/adr/0043-colour-by-type.md),
  Provisionally agreed). An Event opens as a popup over the page, on a
  computer and on a phone, as a Task does.
- **Search** finds Events like any Item; a repeating Event is found once, as
  a repeating Task is.

## Requirements

*Stage 3. Statuses: proposed → agreed → built → verified.*

### EVT-001 — Make an Event

**As** Joe, **I want** to put something that's happening on a day, **so
that** Week shows it.
Priority: Must · Status: verified

Acceptance criteria
1. Given a new Event (from a day's "+" on Week, or Week's "Add"), then
   a new Event opens with all its fields — title, all day or a start and end
   time, Alerts (its default among them, EVT-003) just below the end
   (Joe, 4 November), place, repeat, notes, and with a Household its
   Space at the foot
   ([HSH-005](spaces-and-sharing.md#hsh-005--share-tasks-and-events)) —
   and is kept only when I save it; cancelled, nothing is left behind.
2. Given I set a start time, then the end is an hour later until I change
   it; an end before the start is refused.
3. Given an all-day Event from Saturday to Monday, then it is kept as those
   three dates, the same in any timezone.
4. Given I have no signal, then the Event appears at once and is sent
   later.

### EVT-002 — An Event's details

**As** Joe, **I want** to change everything about an Event in one place,
**so that** it stays right when plans change.
Priority: Must · Status: verified

Acceptance criteria
1. Given an Event, when I open it, then I can change its title, times (or
   all day), Alerts (just below the end), place, repeat, notes and, if
   I made it, its Space, and each change is kept as I make it.
2. Given an Event, then I can delete it, with Undo, and recover it from
   Recently deleted ([ITM-002, ITM-003](items.md#requirements)).

### EVT-003 — An Event reminds me

**As** Joe, **I want** to be reminded before an Event, **so that** I leave
in time.
Priority: Must · Status: verified (a real notification on a device is checked by hand)

Acceptance criteria
1. Given I make an Event at 19:30, then it has an Alert at 19:00; moving
   the Event moves the Alert with it. In New event it shows among the
   Alerts before I save, and I can change or remove it there (Joe, 4
   November). A shared Event gives each member their own default, as their
   Settings give it
   ([HSH-005](spaces-and-sharing.md#hsh-005--share-tasks-and-events) 4).
2. Given an all-day Event, or an Event from Google Calendar, then it has no
   Alert until I add one.
3. Given an Event, then I can add Alerts relative to its start ("1 hour
   before", "1 day before at 18:00") or at a fixed time, change them or
   remove them.
4. Given an Event's notification, then it says the title, the time and the
   place, and offers Snooze (an Event isn't done).

### EVT-004 — Repeating Events

**As** Joe, **I want** an Event to repeat, **so that** "5-a-side, every
Wednesday 19:00" is set once.
Priority: Must · Status: verified

Acceptance criteria
1. Given an Event, then I can make it repeat with the same choices as a Task
   on a schedule
   ([TSK-008](../views/plan.md#tsk-008--repeat-on-a-schedule)), with an
   optional end.
2. Given a weekly Event, then each occurrence is on Week at its time, London
   time either side of the clocks changing, for the next two months or so.
3. Given I change one occurrence, or the repeat "for this and all
   following", or stop it, then it behaves as for a Task
   ([TSK-011](../views/plan.md#tsk-011--change-or-stop-a-repeat)).

### EVT-005 — Switch between Task and Event

**As** Joe, **I want** to turn a Task into an Event or back, **so that**
"dinner with Sam fri 7pm" ends up as what it really is.
Priority: Must · Status: verified

Acceptance criteria
1. Given a Task to do on Friday at 19:00, when I make it an Event, then it
   starts on Friday at 19:00 and lasts an hour, keeping its title, notes,
   Alerts, links and history; with no time, it is all day.
2. Given an Event, when I make it a Task, then its start becomes the do-on
   date and time.
3. ~~Given a Task with sub-tasks, then they are kept, unseen on the Event,
   and back if it becomes a Task again.~~ A Task has no sub-tasks (PLA-007).
4. Given I've just switched, then I can undo it
   ([ITM-004](items.md#itm-004--convert-an-item)).

### EVT-006 — Tasks for an Event

**As** Joe, **I want** to hang the jobs for an Event on it, **so that** "buy
a card" is with "Mum's birthday lunch".
Priority: Should · Status: verified

Acceptance criteria
1. Given an Event, when I choose "Link a task", then I can find one of my
   open Tasks and link it, or type a title no Task has and make that Task
   there and then (Joe, 14 October); either way it is a Task of its own,
   linked *for* the Event and listed in the Event with its tick.
2. Given a Task linked to an Event, then I can remove the link from the
   Event or from the Task, and the Task stays.
3. Given a Task for an Event, then the Task shows what it is for, and opens
   it.

Non-goals (Stage 3): capturing an Event (Joe, 14 October); Events shared
with the Household (Stage 4); inviting people, or replying to invitations;
time zones other than my home one; an Event's own page; switching a whole
repeating series between Task and Event (one occurrence switches alone).
