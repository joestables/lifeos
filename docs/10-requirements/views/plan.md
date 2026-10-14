# Plan

*Stage 3. The decisions come first; the requirements, drafted at the start of
Stage 3 ([plan](../../50-progress/plans/stage-3.md)), are at the end.*

**In one line:** the one place to plan meals, outfits, shops, gym, cardio,
events and tasks ([ADR-0026](../../20-architecture/adr/0026-navigation-drawer.md),
  Provisionally agreed).

## Decisions

- **Plan is a query**: Schedulable Items in a date range. Nothing links to
  Plan ([ADR-0005](../../20-architecture/adr/0005-traits-links-rules.md),
  Provisionally agreed).
- **Plan reads `core.items`**; Modules may only enrich how their Items look,
  so a new Schedulable Type — Shops, Meals, Workouts, Outfits worn — appears
  on Plan with no Plan work
  ([ADR-0029](../../20-architecture/adr/0029-plan-reads-core-items.md),
  Provisionally agreed).
- **Where an Item shows:** on the first of `starts_at` (as a local date),
  `do_on`, `due_on` that it has. A Task with only a deadline shows on its due
  date; a Task with neither (Someday, No date) isn't on Plan. A Goal is not on
  Plan ([data model](../../20-architecture/data-model.md#time-fields-per-schedulable-type)).
  An Event over several days shows on each of them.
- **Every Type by default, filtered by Type** (Joe, 14 October): each
  Schedulable Type that exists is a pill to show or hide; the choice is
  remembered for me, on every device.
- **A week on a computer, a day on a phone** (Joe, 14 October): a computer
  opens on the week and can switch to a day; a phone shows one day. The week
  starts on Monday.
- **A day is a column of cards**, not an hour grid: all-day and untimed
  Items first, then the rest by time (Joe, 14 October; [patterns](../../30-design/patterns.md#plan)).
- **Every occurrence shows.** Plan is a calendar, so each occurrence of a
  repeating Task or Event is on its own day; ones closed as *skipped* aren't
  shown. (The Tasks View and Inbox show only a series' next open occurrence,
  [ADR-0022](../../20-architecture/adr/0022-repeating-items.md).)
- **Done stays on its day**, faded and struck through; an overdue Task stays
  on the day it was for, and Inbox carries it.
- **Add with "+"** on a day, choosing among the Schedulable Types that exist;
  **move by dragging** to another day on a computer (Joe, 14 October).
- **Plan is neutral**: it mixes Types, so each Item shows its own Type's
  colour ([ADR-0043](../../20-architecture/adr/0043-colour-by-type.md),
  Provisionally agreed).
- Meals use fixed slots: breakfast, lunch, dinner, snack (Stage 4).
- The standard time fields hold the plan; detail tables hold what happened,
  enabling planned-vs-done ([ADR-0021](../../20-architecture/adr/0021-time.md)).
- Planning is mostly creating occurrences of definitions, and the action
  creates the link (planning a recipe for Thursday creates the Meal and its
  *uses* link) — from Stage 4.
- Later: readiness-aware gym suggestions; "plan my week"
  ([roadmap](../../roadmap.md#later-opportunities)).

## What the page shows (Stage 3)

The Type pills at the top (Task and Event in Stage 3; more as their stages
arrive), then the dates shown, with Today and the arrows to move a week (or a
day) at a time, and, on a computer, a switch between Week and Day.

| Layout | Where | What it shows |
|---|---|---|
| **Week** | A computer, by default | Seven days, Monday to Sunday, side by side, each a column of cards with a "+" |
| **Day** | A computer, when chosen; always on a phone | One day's cards, with a strip of the week's days above to move between them |

Each card shows its Type's icon and colour, its title and its time (or "All
day"); a Task its checkbox, star and due date where they differ; an Event its
place; anything repeating, its repeat; an Event from Google Calendar, a small
mark saying so. A card opens its Item as that Item opens anywhere else
([ITM-001](../cross-cutting/items.md#itm-001--open-an-item)).

## Requirements

*Stage 3. Statuses: proposed → agreed → built → verified.*

### PLN-001 — See my week

**As** Joe, **I want** my week on one page, whatever kind of thing is in it,
**so that** I can see the shape of it at a glance.
Priority: Must · Status: proposed

Acceptance criteria
1. Given a computer, when I open Plan, then it shows this week, Monday to
   Sunday, with today marked.
2. Given a Task to do on Tuesday at 18:00, a Task due on Wednesday with no
   do-on date, an all-day Event on Thursday and an Event on Friday at 19:30,
   then each is on its day; on each day, all-day and untimed Items come
   first, then the rest by time.
3. Given an Event from Saturday to Monday, then it shows on each of those
   days.
4. Given a Task with no date, or in Someday, then it isn't on Plan.
5. Given a Task repeating every Monday, then each Monday shows its
   occurrence; one closed as *skipped* isn't shown.
6. Given a done Task, then it stays on its day, faded and struck through;
   an overdue Task stays on the day it was to be done.

### PLN-002 — See one day

**As** Joe, **I want** one day on its own, **so that** on my phone, or when
a day is full, I can see it properly.
Priority: Must · Status: proposed

Acceptance criteria
1. Given a phone, when I open Plan, then it shows today, with the week's
   days above it; choosing another day shows that day.
2. Given a computer, when I switch to Day, then it shows one day; switching
   back shows its week. The layout I chose is kept next time on that
   computer.

### PLN-003 — Move through time

**As** Joe, **I want** to move to other weeks and days and back to today,
**so that** I can plan ahead and look back.
Priority: Must · Status: proposed

Acceptance criteria
1. Given the week, when I press the next arrow, then the next week shows;
   on a day, the next day.
2. Given any week or day, when I press Today, then this week (or today)
   shows.
3. Given I choose a date, then its week (or that day) shows.

### PLN-004 — Choose which Types to show

**As** Joe, **I want** to hide the kinds of thing I don't want to see now,
**so that** Plan shows what I'm planning.
Priority: Must · Status: proposed

Acceptance criteria
1. Given Plan, then every Schedulable Type that exists is shown as a pill,
   all on by default.
2. Given I turn Task off, then no Tasks show until I turn it on again.
3. Given I turned Task off on my computer, when I open Plan on my phone,
   then Task is off there too.
4. Given a new Schedulable Type arrives with a later stage, then it is on
   until I turn it off.

### PLN-005 — Act on an Item from Plan

**As** Joe, **I want** to open and tick things off straight from Plan, **so
that** I needn't go to another page.
Priority: Must · Status: proposed

Acceptance criteria
1. Given a card, when I open it, then the Item opens as it does anywhere
   else, and closing it leaves me where I was on Plan.
2. Given a Task's card, when I tick it, then it is done, stays on its day
   struck through, and I can undo that.
3. Given I have no signal, then what this device already has shows, marked
   as possibly out of date
   ([OFF-005](../cross-cutting/offline.md#off-005--read-what-ive-already-loaded)), and my changes show
   at once and are sent later.

### PLN-006 — Add something to a day

**As** Joe, **I want** to add anything that can be planned straight onto a
day, **so that** planning is one step.
Priority: Must · Status: proposed

Acceptance criteria
1. Given a day, when I press its "+", then I choose among the Schedulable
   Types that exist (Task and Event in Stage 3), and a new Item of that Type
   opens with all its fields, dated that day; it is kept only when I save it.
2. Given a new Task from "+", then its do-on date is that day; a new Event
   starts that day at the next whole hour if the day is today, otherwise at
   my default time, and lasts an hour.
3. Given I save it, then it is on that day at once.

### PLN-007 — Drag to another day

**As** Joe on a computer, **I want** to drag something to another day, **so
that** rearranging the week is quick.
Priority: Should · Status: proposed

Acceptance criteria
1. Given the week, when I drag a Task from Tuesday to Thursday, then its
   do-on date is Thursday, keeping its time and due date, and its Reminders
   move with it; I can undo that.
2. Given I drag an Event, then it starts on the new day at the same time
   and keeps its length.
3. Given an occurrence of a repeating Item, then only that occurrence moves
   ([TSK-011](tasks.md#tsk-011--change-or-stop-a-repeat)).
4. Given an Event from a Google calendar that is incoming only, then it
   can't be dragged ([GCL-004](../cross-cutting/integrations.md#gcl-004--incoming-events-are-googles)).

Non-goals (Stage 3): an hour grid; a month view; dragging on a phone (a
phone moves an Item by changing its date); dragging to a time within a day;
planning Meals, Shops, Workouts and Outfits (with their stages); readiness
suggestions and "plan my week" (later); Plan in Inbox's digest.
