# Plan: Stage 2 — replace Google Tasks

**Outcome** ([roadmap](../../roadmap.md)): LifeOS replaces Google Tasks, and
Joe starts using it daily. A line can be captured from anywhere — in the app,
by Siri, by email — as a Thought, sorted later in Inbox into a Note or a
Task. Notes are kept under Labels; Tasks have Labels, dates, steps and
repeats; Reminders arrive by Web Push, with Done and Snooze where the
platform allows. Until Stage 3, an event-shaped line is saved as a Thought or
a Task.

**State:** in progress. Step 1 drafted 10 October 2026, waiting for Joe.

## Steps

Steps marked **Joe** need Joe's go-ahead or action before Claude does them.
Every step that builds a screen follows the [design system](../../30-design/README.md)
checklist and brings its own Playwright walks, citing the requirements it
verifies.

| # | Step | State | Produces |
|---|---|---|---|
| 1 | **Joe** — specs: capture, Inbox, Notes, Tasks (with repeats), Reminders, working with Items (open, delete and recover, convert, Labels, Starred, Recent), Search | Drafted 10 October, all *proposed*; five questions for Joe (below) | [capture](../../10-requirements/cross-cutting/capture.md#requirements), [Inbox](../../10-requirements/views/inbox.md#requirements), [Notes](../../10-requirements/views/notes.md#requirements), [Tasks](../../10-requirements/views/tasks.md#requirements), [reminders](../../10-requirements/cross-cutting/reminders.md#requirements), [items](../../10-requirements/cross-cutting/items.md#requirements), [search](../../10-requirements/cross-cutting/search.md#requirements) |
| 2 | Decisions: how Reminders are delivered (Web Push from an Edge Function, run each minute by `pg_cron`); where the repeat engine's nightly run lives; the inbound-email service (**Joe**); re-check iOS notification buttons and a Gemini route | Re-checks done 10 October: iOS Web Push still shows no buttons; Gemini can't call a custom address (recorded in the specs). ADRs not yet written | ADRs |
| 3 | **Joe** — an app icon: a short exercise to choose it (carried from Stage 1), into the design spec, then the manifest, so the app can be installed | Not started | [design system](../../30-design/README.md), manifest |
| 4 | Schema: Labels, the `note` table (pin), `task_steps`, series, Reminders and deliveries, push devices, Inbox state, stars, recent, capture tokens, the person's settings, the search index; the ontology package updated; database tests | Not started | Migrations, database tests |
| 5 | Working with Items: the Item's details Sheet (with a link of its own), delete with undo, the Settings Screen with Recently deleted and Labels, convert, star, recent; OFF-005's "possibly out of date" mark | Not started | Code, tests citing ITM-*, OFF-005 |
| 6 | Capture: the phone's capture button designed into the patterns first; the Capture Screen from every page, the deterministic parser (chrono-node plus rules), the Thought / Task switch and the offer | Not started | Code, tests citing CAP-001–004 |
| 7 | Inbox: Thoughts to sort, sorting them, today's and overdue Tasks | Not started | Code, tests citing INB-* |
| 8 | Notes View | Not started | Code, tests citing NTE-* |
| 9 | Tasks View, with steps and Someday | Not started | Code, tests citing TSK-001–006 |
| 10 | Repeating Tasks: the RRULE engine ported from v1 (no dependencies), the first window made on the device, the nightly job that extends every window | Not started | Code, tests citing TSK-007–010 |
| 11 | Reminders: notifications on each device, the delivery job, Done and Snooze, defaults in Settings; then overdue nudges and the morning digest | Not started | Edge Function, `pg_cron` job, tests citing REM-* |
| 12 | The capture address: the Edge Function, the token in Settings, rate limit and log; the Siri Shortcut set up with Joe; email through the chosen service; Android's home-screen shortcut and share target | Not started | Edge Function, [integration setup](../../40-operations/integration-setup.md), tests citing CAP-005–008 |
| 13 | Search: the Command component designed into the spec first, then the Search Screen | Not started | Code, tests citing SRC-* |
| 14 | The nightly smoke walk of production with the test account: sign-in, capture, Inbox ([runbook](../../40-operations/runbook.md)) | Not started | Scheduled workflow |
| 15 | **Joe** — uses LifeOS daily instead of Google Tasks for a week; what he trips over is fixed | Not started | |

Each step's code goes into the specs' status as it lands (*built*, then
*verified* when a test citing the ID passes).

## Questions for Joe (step 1)

1. **The inbound-email service.** Recommended: Cloudflare Email Routing with
   a small Email Worker that posts to the capture address — free, and no
   third party holds the mail — if `joestables.uk`'s DNS can move to
   Cloudflare. Otherwise Postmark's inbound webhook. Which domain should the
   capture email address use?
2. **Note colour.** The data model gives a Note a colour, Google Keep style,
   but colour means Module and nothing else
   ([patterns](../../30-design/patterns.md#module-colour)). Recommended: no
   Note colour; pin and Labels do the sorting. The data model changes once
   agreed.
3. **The Tasks View's first tab.** Recommended: Tasks by date (overdue,
   today, tomorrow, this week, later, no date), with a second tab by Label —
   the Label tab is the nearest thing to Google Tasks' lists.
4. **Formatting in Notes.** Recommended: Markdown typed as you write (bold,
   italic, lists, checklists, links), shown formatted when not editing. No
   toolbar.
5. **Where Starred and Recent show.** Recommended: on the Search Screen
   before you type, and Starred also as a tab on the Tasks View (Google
   Tasks has one).

## Done when

- Every **Must** requirement in this stage's specs is *verified* (a test
  citing its ID passes).
- Joe has used LifeOS instead of Google Tasks for a week.
- The nightly smoke walk runs.
- No two documents conflict.
