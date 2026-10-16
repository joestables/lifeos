# Plan: Stage 3 — the one planning view

**Outcome** ([roadmap](../../roadmap.md)): Plan is where Joe sees his days.
It shows every Schedulable Item — Tasks and Events now, and Shops, Meals,
Workouts and the rest as their stages arrive, with no Plan work
([ADR-0029](../../20-architecture/adr/0029-plan-reads-core-items.md)) — in
a week on a computer and a day on a phone, filtered by Type, with anything
added to a day from its "+" and dragged between days. Events exist, repeat,
remind, take Labels and switch with Tasks; capture stays Thoughts and Tasks. Google
Calendar is connected, incoming only or both ways, and always Personal.
Lists, Shops and list templates have moved to Stage 4b, after Recipes.

**State:** the plan is written (14 October 2026), from Joe's brief (below).
Steps 1 (specs) and 2 (decisions) are agreed (14 October); step 3's design is
agreed and in the design spec; step 4's schema is written, tested and live;
steps 5 (Events in the app), 6 (repeating Events) and 7 (Plan) are done (16 October).

## Steps

Steps marked **Joe** need Joe's go-ahead or action before Claude does them.
Every step that builds a screen follows the [design system](../../30-design/README.md)
checklist and brings its own Playwright walks, citing the requirements it
verifies. Google Calendar is never called from a browser walk: the walks use
a stand-in for Google, as they do for Supabase.

| # | Step | State | Produces |
|---|---|---|---|
| 1 | **Joe** — specs: Plan; Events (with repeats, Reminders, Labels, the Task ↔ Event switch, Tasks *for* an Event); Google Calendar (connecting, choosing calendars, the sync level, what goes each way, a broken connection); and what they change in capture, Inbox, items, Search and Reminders | Agreed 14 October, with Joe's [answers](#questions-for-the-specs): PLN-001–007, EVT-001–006, GCL-001–006; ADR-0014 (Events take Labels) and ADR-0027 (capture makes no Events) amended | [Plan](../../10-requirements/views/plan.md#requirements) (PLN-*), [Events](../../10-requirements/cross-cutting/events.md#requirements) (EVT-*), [Google Calendar](../../10-requirements/cross-cutting/integrations.md#google-calendar) (GCL-*), changes to [capture](../../10-requirements/cross-cutting/capture.md), [Inbox](../../10-requirements/views/inbox.md), [items](../../10-requirements/cross-cutting/items.md), [search](../../10-requirements/cross-cutting/search.md), [reminders](../../10-requirements/cross-cutting/reminders.md) |
| 2 | Decisions: how Calendar sync runs (Google's push notifications to an Edge Function, incremental sync tokens, a `pg_cron` catch-up); how changes go out to Google on two-way, and who wins when both sides change; how a repeating Event maps to a Google repeating event; Plan's read over a date range (ADR-0029); re-check Google's rules for the scopes and an unverified app | Agreed by Joe 14 October: [ADR-0047](../../20-architecture/adr/0047-google-calendar-sync.md) (connecting, polling every five minutes with sync tokens, Google expanding its own repeats, Google's fields locked on incoming calendars), [ADR-0048](../../20-architecture/adr/0048-google-calendar-two-way.md) (a server outbox, the later change winning field by field, repeats sent as Google repeating events), [ADR-0049](../../20-architecture/adr/0049-plans-read.md) (`core.plan_items`, hidden Types in my settings). Re-checked from search (Google's pages couldn't be opened from the session): the scopes, the 100-user cap, refresh tokens, sync tokens; whether push notifications need a verified domain is unconfirmed, so polling comes first | ADRs, re-checks recorded |
| 3 | **Joe** — design, with Claude design: Plan's week (computer) and day (computer and phone), the Type filter (FilterChip), PlanCard and DayColumn for each Type, a day's "+" and its choice of Type, dragging; the Event popup and "New event"; Settings → Google Calendar (connect, calendars, sync level); how an imported Event looks; a broken connection in Inbox. Into the design spec first, then the shared components, with the screenshot tests refreshed | First pass 14 October on a [design canvas](https://claude.ai/artifact/S7eLUszjswnPN77EkbTcxK) (private to Joe), drawn from the real components on `/design-stage-3` (development and preview builds only; `scripts/design-shots.mjs` takes its screenshots), dark and light, desktop and phone. Drafted in `@/components/lifeos` with it: PlanCard (a Task's checkbox, a detail line, marks), PlanWeek with AllDayBar, NowLine and DropSlot, PlanDay, PlanToolbar, WeekStrip, AddToDay; the `/design` screenshots refreshed. Second pass the same day after Joe's comments: closer to the first Plan design (each card its Type's icon and name, title, then time and place; no checkboxes, marks or all-day bars; days that run the page's height; the dates on the left, ‹ Today › on the right), the day and the phone a list of cards with their times inside, and "Link a task" on an Event (TaskLinker). Agreed by Joe 14 October; into the design spec ([components](../../30-design/components.md), [patterns](../../30-design/patterns.md#plan)) and `/design` | [design system](../../30-design/README.md), components |
| 4 | Schema: what an Event holds (its place); Labels on Events; series for Events; `core.plan_items`; `core.connections` (tokens in Vault), `core.external_refs`, `core.calendar_links` and the calendar outbox; the person's Plan settings; the ontology gains Event's default Reminder; database tests | Done 14 October; applied to the live project 15 October as eleven small migrations (`stage3_columns`, `stage3_items`, `stage3_reminders`, `stage3_home_timezone`, `stage3_event_series`, `stage3_set_repeat`, `stage3_settings`, `stage3_calendar`, `stage3_calendar_rules`, `stage3_plan_items` and a generated `ontology`), since the connector's `apply_migration` timed out on larger ones. `stage3_convert` (Task ↔ Event mapping its times) was run by Joe in the SQL editor the same day, because the connector holds any migration containing a `DELETE` for a confirmation that never reaches the session; Claude checked it matches the repository and recorded it in the migration history. What step 4 brings: (Event takes Labels, has a place and a default Reminder 30 minutes before); `core.items.place`; all-day Events kept as dates (midnight UTC); Task ↔ Event mapping its times; series of Events; `core.plan_items`; `plan_hidden_types` in my settings; `core.connections`, `core.calendar_links` and `core.external_refs` with `set_calendar_level` and `set_new_events_calendar`; Google's fields locked on incoming calendars, and Google's Events kept Personal. 35 new database tests; a midnight-sensitive repeating test made to use London's date. The calendar outbox comes with two-way sync, step 10 | Migrations, database tests |
| 5 | Events: the popup and "New event", all-day and timed, Labels, Reminders, the Task ↔ Event switch, a Thought sorted into an Event, Events in Search, Tasks *for* an Event | Done 16 October: the Event popup (EventDetails, with EventTimesField new in the design spec), "New event" from Plan's main action (Plan's week and day come in step 7), an Event's Reminders before its start or on its day at a time (ReminderDialog extended; migrations `stage3_event_reminders` and `stage3_event_notification`, live, saying an Event's time and place in its notification), the Event default in Settings, the Task ↔ Event switch laid over at once (offline too) with Undo, a Thought sorted into an Event from its menu, Events in Search with their time and place, and Tasks *for* an Event (linked or made with the TaskLinker, unlinked, and shown on the Task as For). EVT-001, 002, 003, 005, 006 verified; repeat on an Event comes with step 6. 8 database tests, Playwright walks in `events.spec.ts` | Code, tests citing EVT-* and the changed INB-, ITM-, REM-, SRC- requirements |
| 6 | Repeating Events: series for Events, with `packages/recurrence` and the nightly run | Done 16 October: Repeat on the Event popup and "New event" (on a schedule only), each occurrence at its time in my timezone for its length (or all day for its days) with its place, Labels and own Reminders, laid over at once offline; one occurrence changed alone, or the repeat changed or stopped from one on; Search finds a repeating Event once, as its next occurrence. The server side came with step 4; the nightly run tops up Event series as it does Tasks', and never skips an Event's occurrence. Undoing a new repeating Task or Event takes its repeat with it. EVT-004 verified | Code, tests citing EVT-* |
| 7 | Plan View: week and day, the Type filter, Today and moving between weeks or days, ticking a Task off, opening an Item, adding any Schedulable Type on a day with "+", dragging to another day | Done 16 October: the week (a computer's default) and the day (chosen on a computer and kept on it; a phone's), each Item on its days by `src/lib/plan.ts`; previous, Today, next and any date from the toolbar's Calendar, the day shown in the page's address; the Type filter kept with my settings on every device; a card opens its Item; a day's "+", the toolbar's "Add" and a phone's Fab add a Task or an Event on that day; dragging a card to another day on a computer, with Undo. ADR-0049 amended for Joe to confirm: Plan places Items from what the device holds rather than reading `core.plan_items` a week at a time. PLN-001–006 verified, PLN-007 but for incoming Google Events (step 9) | Code, tests citing PLN-* |
| 8 | **Joe** — Google Cloud: enable the Calendar API, add the Calendar scopes to the consent screen (the app stays in Production, unverified), the Edge Function's redirect address on the OAuth client; the client secret into Supabase's Edge Function secrets | To do | [integration setup](../../40-operations/integration-setup.md#google-calendar-stage-3) |
| 9 | Google Calendar, incoming: connect and disconnect in Settings, choose calendars, import and keep up to date, imported Events on Plan, a broken connection in Inbox and the nightly health check | To do | Edge Functions, `pg_cron` job, tests citing GCL-* |
| 10 | Google Calendar, two-way: Events made, changed or deleted in LifeOS go to Google, on the calendars set to two-way | To do | Edge Function, tests citing GCL-* |
| 11 | **Joe** — uses Plan and Calendar daily; what he trips over is fixed | To do | Code, tests |

Each step's code goes into the specs' status as it lands (*built*, then
*verified* when a test citing the ID passes).

## Joe's brief (14 October)

- **Stage 2 is done**; Stage 3 starts.
- **The stage is split.** Lists, Shops and list templates move to a new
  **Stage 4b**, after Recipes (Stage 4). With them go live updates (wanted
  where two people share a List) and ingredients to shopping lists, which
  need Lists ([roadmap](../../roadmap.md)).
- **Google Calendar sync has a level I choose:** incoming only (one way,
  Google → LifeOS) or two-way.
- **Calendar syncs are always Personal.**
- **Plan shows every Type by default**, and I can choose which Types to show.
  It shows every Schedulable Type, including Workouts, Shops and Meals as
  they arrive.
- **On a computer Plan is a week by default**, and can be a day. **On a
  phone, a day.**

## Questions for the specs

Each has Claude's recommendation; Joe's answers (14 October) are in bold
after it, and settle step 1.

1. **Sync level per calendar or per account?** *Recommended:* per Google
   calendar — each is off, incoming or two-way; new LifeOS Events go to the
   one I mark as the place for them. **Joe: per calendar.**
2. **What goes to Google on two-way?** *Recommended:* Events only. Tasks,
   Meals, Workouts and Shops stay in LifeOS, so Google Calendar isn't
   cluttered with them. The alternative is every timed Item. **Joe: Events
   only.**
3. **On incoming only, can I change an imported Event in LifeOS?**
   *Recommended:* no — its title and times are Google's, with "Edit in Google
   Calendar"; I can still add Reminders and Tasks *for* it. **Joe: no, it
   can't be changed.**
4. **"Always Personal":** imported Events are in my Personal Space and can't
   be shared. From Stage 4, does a Household Event go to my Google Calendar
   on two-way? *Recommended:* only Events in my Personal Space go out.
   **Joe: yes, Household Events go to Google Calendar too.** What Calendar
   brings in stays Personal; what goes out is my Personal and Household
   Events, to my own two-way calendar.
5. **Reminders on imported Events:** LifeOS's Reminder, Google's
   notification, or both? *Recommended:* LifeOS's own default for Events
   (say 30 minutes before a timed Event; none for all-day), and Google's left
   to Google. **Joe: no Reminder by default on an imported Event; I may add
   one.**
6. **Deleting:** an Event deleted in Google goes to Recently deleted in
   LifeOS; on two-way, deleting in LifeOS deletes it in Google.
   *Recommended* as written. **Joe: fine.**
7. **Plan's week:** each day a column of cards, untimed first and then by
   time (the DayColumn and PlanCard already in the design system), or an
   hour grid like Google Calendar? *Recommended:* the columns of cards; a
   phone shows one day, with a strip of the week to move between days.
   **Joe: agreed.**
8. **The Type filter** is remembered for me across devices (with my
   settings), not kept in the page's address as Labels are (**Joe: yes,
   across every device**). Week starts on
   Monday. Done Items stay on their day, faded and struck through; overdue
   Tasks stay on their day (Inbox carries them). *Recommended* as written.
   **Joe: the week starts on Monday.**
9. **Adding from Plan:** pressing a day (or "New" with the day chosen)
   offers an Event or a Task on that day; on a computer an Item can be
   dragged to another day. *Recommended* as written. **Joe: a "+" to choose
   any Type to add on that day; drag and drop, yes.**
10. **Inbox and Events:** do today's Events show in Inbox's Today?
    *Recommended:* no — Inbox is what needs me; Plan shows the day.
    **Joe: fine.**
11. **What an Event holds:** title, start and end (or all day), place,
    notes, Reminders, repeat; no Labels (as the data model says).
    *Recommended* as written. **Joe: and Labels.**

## Joe's second answers (14 October)

- **Capture stays Thoughts and Tasks**: no Event in capture
  ([ADR-0027](../../20-architecture/adr/0027-quick-capture.md) amended).
- **No Reminder by default on an Event from Google**; I may add one.
- **Deleting** follows both ways, as recommended.
- **The week starts on Monday.**
- **A "+" on each day** makes any Type that can be planned, chosen from a
  list; **dragging** moves Items between days.
- **Inbox** doesn't show today's Events.
- **An Event takes Labels**
  ([ADR-0014](../../20-architecture/adr/0014-reference-data-and-labels.md)
  amended).

Taken as recommended, for Joe to confirm with the specs: an Event made in
LifeOS reminds me 30 minutes before (none when all day); a Thought can
still be sorted into an Event in Inbox; a new calendar connection starts
with the main calendar incoming and the rest off; Events come in from four
weeks back.

## Done when

- Every **Must** requirement in this stage's specs is *verified* (a test
  citing its ID passes).
- Joe's Google Calendar is connected, at the level he chose, and Plan is
  what he uses to see his week.
- No two documents conflict.
