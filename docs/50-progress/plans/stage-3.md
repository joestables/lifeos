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
agreed and in the design spec; step 4, the schema, is next.

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
| 4 | Schema: what an Event holds (its place); Labels on Events; series for Events; `core.plan_items`; `core.connections` (tokens in Vault), `core.external_refs`, `core.calendar_links` and the calendar outbox; the person's Plan settings; the ontology gains Event's default Reminder; database tests | To do | Migrations, database tests |
| 5 | Events: the popup and "New event", all-day and timed, Labels, Reminders, the Task ↔ Event switch, a Thought sorted into an Event, Events in Search, Tasks *for* an Event | To do | Code, tests citing EVT-* and the changed INB-, ITM-, REM-, SRC- requirements |
| 6 | Repeating Events: series for Events, with `packages/recurrence` and the nightly run | To do | Code, tests citing EVT-* |
| 7 | Plan View: week and day, the Type filter, Today and moving between weeks or days, ticking a Task off, opening an Item, adding any Schedulable Type on a day with "+", dragging to another day | To do | Code, tests citing PLN-* |
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
