# Plan: Stage 7b — Today, Reminders and Plan

**Outcome:** a few days of daily use showed Joe using Thoughts as simple
reminders, and Events as too much friction. A new **Reminder** Type (a
title, its Alerts and a Repeat; not Completable) takes that job, and the
pages are reshaped around the day: **Today** (was Inbox), **Week** (was
Plan), **Plan** (was Tasks: Tasks, Events, Reminders, Recurring) and Notes
with a **Thoughts** tab. "New" makes Thoughts and Reminders only.

**State:** started 9 November 2026, at Joe's asking, as its own stage
(the name "7b" is provisional). He set out the changes, Claude raised what
they missed, and Joe answered the same day ([his answers](#joes-answers-9-november)).
Step 3's design, drawn first so Joe could choose how "New" works, is on
`/design-stage-7b` and the [Stage 7b design canvas](https://claude.ai/artifact/EqX4D326Apjs5aGVF2W4Gs)
(private to Joe), waiting on Joe. Step 1's specs follow his choice.

## Steps

Steps marked **Joe** need Joe's go-ahead or action before Claude does them.
Every step that builds a screen follows the [design system](../../30-design/README.md)
checklist.

| # | Step | State | Produces |
|---|---|---|---|
| 1 | **Joe** — specs: the Reminder Type (a title, Alerts, Repeat; Personal only; blue; not Completable; leaves Today at the end of its day; Thought → Reminder, Reminder ↔ Task and Event); Alerts (the rename of an Item's Reminders); Today (views/inbox.md becomes views/today.md); Week (views/plan.md); Plan (views/tasks.md: Tasks, Events, Reminders, Recurring; no Completed, Labels or sub-tasks; a new Task on today, its alert an hour from now); Notes' Thoughts tab; capture ("New": Thoughts and Reminders); the digest without Thoughts; the glossary, data model and capability map | To do, after step 3's choice | Specs |
| 2 | Decisions: an ADR for the Reminder Type and Alerts, superseding parts of ADR-0020 (a reminder is not a Type), ADR-0023 (a Thought with a date gets one), ADR-0026 (the drawer's pages), ADR-0027 (capture) and ADR-0037 (Thoughts wait in Inbox); where a Reminder's times live so Week shows it on each of its days and still reads `core.items` (ADR-0029); Labels and sub-tasks removed | To do | ADRs |
| 3 | **Joe** — design: the five ways "New" could work (A two tabs, B one line, C choose first, D quick times, and B + D recommended); Today; Week with Reminders; Plan's four tabs; a Reminder, its Alerts and New reminder; New task; Notes' Thoughts; the widget as Today | First pass 9 November, drawn from the real components on `/design-stage-7b` (development and preview builds only; `DESIGN_PAGE=design-stage-7b scripts/design-shots.mjs` takes its screenshots), dark and light, desktop and phone, on the [design canvas](https://claude.ai/artifact/EqX4D326Apjs5aGVF2W4Gs). Drafts in the spec: ItemRow `past`, CaptureDialog's `title`, `badge` and slot, ReminderList's `noun`. Waiting on Joe | [design system](../../30-design/README.md) |
| 4 | Schema: the `reminder` Type in the ontology (Schedulable by its Alerts, not Completable, Personal, Capturable); a Thought's Reminders not kept (the 19 already gone off removed; the 3 to come converted to Reminders); Labels removed from Tasks and Events (the 18 "Work" on Events deleted); sub-tasks dropped (`core.subtasks`); migration, database tests, advisors | To do | Migration |
| 5 | Today, Week and Plan, with routes from `/inbox`, `/plan` and `/tasks` kept working (the widget's links, notifications, bookmarks); the drawer | To do | Code |
| 6 | "New", as chosen in step 3; Notes' Thoughts tab | To do | Code |
| 7 | Notifications and the Android app: a Reminder's notification (Snooze; Done dismisses), the digest without Thoughts, the widget as Today with Reminders; `public/android.json` raised if native code changed | To do | Code, Edge Function |
| 8 | **Joe** — uses it daily; what he trips over is fixed | To do | Code |

## Joe's answers (9 November)

To the questions Claude asked after Joe set out the changes:

1. **When a Reminder leaves Today:** at the end of its day, as a done
   Task stays there as a record of the day. Reminders are for trivial
   things, as Thoughts have been.
2. **Names:** Reminder is the Type; a Task's, Event's or Reminder's
   notifications are its **Alerts**.
3. **Alerts:** agreed.
4. **Repeating Reminders:** yes; Plan gets a Reminders tab beside Tasks,
   Events and Recurring.
5. **Thoughts on Today:** a quiet line saying how many wait to be sorted,
   never the Thoughts themselves; Thoughts not in the morning digest.
6. **Today and the widget** become the same thing. The Tasks page's new
   name: open (Claude drew it as Plan).
7. **Existing data:** Thoughts whose Reminders have gone off stay Thoughts,
   their Reminders removed; the "Work" Label on 18 Events deleted;
   sub-tasks deleted. (The one Note with a Reminder was a Thought with a
   date converted to a Note on 12 October, its Reminder carried over;
   Notes can't be given one.)
8. **The Reminder Type:** blue, with Tasks and Events; never shared;
   converts to a Task or an Event; Alarm one tap away.
9. **A new Task's alert** is an hour from now when its default time has
   passed; the Events tab as Claude suggested; a Reminders widget later.
