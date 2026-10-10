# Plan: Stage 2 — replace Google Tasks

**Outcome** ([roadmap](../../roadmap.md)): LifeOS replaces Google Tasks, and
Joe starts using it daily. A line can be captured from any page as a
Thought, without losing your place, and sorted later in Inbox into a Note or
a Task. Notes are kept like Google Keep; Tasks have Labels, dates, stars,
sub-tasks and repeats; Reminders arrive by Web Push, with Done and Snooze
where the platform allows. Every Type has its colour. Until Stage 3, an
event-shaped line is saved as a Thought or a Task. Capture from outside the
app waits until after every other stage (Stage 10).

**State:** in progress. Step 1 drafted 10 October 2026 and redrafted the same
day with Joe's answers; waiting for Joe to agree.

## Steps

Steps marked **Joe** need Joe's go-ahead or action before Claude does them.
Every step that builds a screen follows the [design system](../../30-design/README.md)
checklist and brings its own Playwright walks, citing the requirements it
verifies.

| # | Step | State | Produces |
|---|---|---|---|
| 1 | **Joe** — specs: capture in the app, Inbox, Notes, Tasks (with repeats), Reminders, working with Items, Search | Drafted 10 October; redrafted with Joe's answers (below), without implementation detail; all *proposed*, waiting for Joe | [capture](../../10-requirements/cross-cutting/capture.md#requirements), [Inbox](../../10-requirements/views/inbox.md#requirements), [Notes](../../10-requirements/views/notes.md#requirements), [Tasks](../../10-requirements/views/tasks.md#requirements), [reminders](../../10-requirements/cross-cutting/reminders.md#requirements), [items](../../10-requirements/cross-cutting/items.md#requirements), [search](../../10-requirements/cross-cutting/search.md#requirements) |
| 2 | Decisions: how Reminders are delivered (Web Push from an Edge Function, run each minute by `pg_cron`); where the repeat engine's nightly run lives; re-check iOS notification buttons and a Gemini route | Re-checks done 10 October: iOS Web Push still shows no buttons; Gemini can't call a custom address (recorded in the specs). Colour by Type agreed as [ADR-0043](../../20-architecture/adr/0043-colour-by-type.md). Delivery and the nightly run not yet written | ADRs |
| 3 | **Joe** — design, with Claude design: the colours by Type ([ADR-0043](../../20-architecture/adr/0043-colour-by-type.md), Gym coral), no page kicker, the app icon (carried from Stage 1), then the Stage 2 screens — capture (with the phone's top-bar button), Inbox, Notes, Tasks, how each opens its Items, Settings, Search. Into the design spec first, then the theme and shared components, with the screenshot tests refreshed | Not started | [design system](../../30-design/README.md), theme, components, manifest icon |
| 4 | Schema: Labels, marks, sub-tasks, series, Reminders and deliveries, push devices, the person's settings, the search index; the ontology package gains each Type's colour, Labels and mark, and a Note loses its *idea* status; database tests | Not started | Migrations, database tests |
| 5 | Working with Items: opening (own page or popup, back to the same place, a link of its own), delete with undo, Settings with Recently deleted and Labels, convert; OFF-005's "possibly out of date" mark | Not started | Code, tests citing ITM-*, OFF-005 |
| 6 | Capture in the app: from every page, the deterministic parser (chrono-node plus rules), the Thought / Task switch and the offer | Not started | Code, tests citing CAP-* |
| 7 | Inbox: Thoughts to sort, sorting them, today's and overdue Tasks | Not started | Code, tests citing INB-* |
| 8 | Notes View | Not started | Code, tests citing NTE-* |
| 9 | Tasks View, with stars, sub-tasks and Someday | Not started | Code, tests citing TSK-001–007 |
| 10 | Repeating Tasks: the RRULE engine ported from v1 (no dependencies), the first occurrences made on the device, the nightly job that keeps them ahead | Not started | Code, tests citing TSK-008–011 |
| 11 | Reminders: notifications on each device, the delivery job, Done and Snooze, defaults in Settings; then overdue nudges and the morning digest | Not started | Edge Function, `pg_cron` job, tests citing REM-* |
| 12 | Search | Not started | Code, tests citing SRC-* |
| 13 | The nightly smoke walk of production with the test account: sign-in, capture, Inbox ([runbook](../../40-operations/runbook.md)) | Not started | Scheduled workflow |
| 14 | **Joe** — uses LifeOS daily instead of Google Tasks for a week; what he trips over is fixed | Not started | |

Each step's code goes into the specs' status as it lands (*built*, then
*verified* when a test citing the ID passes).

## Joe's answers (10 October)

- **Capture from outside the app** (the capture address, Siri, email,
  Android's shortcut, share and a widget) comes after every other stage, as
  Stage 10 ([ADR-0028](../../20-architecture/adr/0028-capture-from-outside-the-app.md)
  amended). The inbound-email question moves with it.
- **Capture on a phone:** a button in the top bar; each page may also have
  its own floating action, and Inbox's opens the same capture. Capture opens
  over the page and leaves you where you were
  ([ADR-0027](../../20-architecture/adr/0027-quick-capture.md) amended).
- **Opening an Item** depends on the page and the Type: a page of its own
  (easy to go back from) or a popup over the page.
- **One Recently deleted page** in Settings, for every Type.
- **No Recent**, and no blanket Starred: each Type has its own mark —
  Notes pinned, Tasks starred (wanted, as in Google Tasks), Recipes
  favourited (Stage 4). Labels are on Notes and Tasks only, one shared set
  ([ADR-0014](../../20-architecture/adr/0014-reference-data-and-labels.md)
  amended).
- **Notes are just notes**, like Google Keep: Labels filter them, a Note's
  title is its heading, and there is no *idea* status
  ([ADR-0037](../../20-architecture/adr/0037-thoughts.md) amended).
- **Sub-tasks**, not steps: a line you tick inside a Task.
- **Notifications** go to every registered device; no choosing per
  Reminder. The digest time is set in Settings.
- **Colour by Type**: Tasks and Events blue; Thoughts, Notes, Lists and
  Shops yellow; Gym and Cardio coral; Recipes and Meals green; Wardrobe
  orange; Goals purple; Inbox and Plan neutral; no Module name above page
  titles ([ADR-0043](../../20-architecture/adr/0043-colour-by-type.md)).
- **Specs say what, not how**; the screens are designed with Claude design
  once the specs are agreed (step 3).

## Done when

- Every **Must** requirement in this stage's specs is *verified* (a test
  citing its ID passes).
- Joe has used LifeOS instead of Google Tasks for a week.
- The nightly smoke walk runs.
- No two documents conflict.
