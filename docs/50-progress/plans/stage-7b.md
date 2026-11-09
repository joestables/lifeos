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
(private to Joe). Joe leant to option A, refined ([his second answers](#joes-answers-9-november-second-round));
its second pass, and five directions for the "New" button, wait on Joe.
Joe agreed the whole design on 9 November, and step 1's specs the same day; step 2's decision, ADR-0065, the same day. Step 4, the schema, is next.

## Steps

Steps marked **Joe** need Joe's go-ahead or action before Claude does them.
Every step that builds a screen follows the [design system](../../30-design/README.md)
checklist.

| # | Step | State | Produces |
|---|---|---|---|
| 1 | **Joe** — specs: the Reminder Type (a title, Alerts, Repeat; Personal only; blue; not Completable; leaves Today at the end of its day; Thought → Reminder, Reminder ↔ Task and Event); Alerts (the rename of an Item's Reminders); Today (views/inbox.md becomes views/today.md); Week (views/plan.md); Plan (views/tasks.md: Tasks, Events, Reminders, Recurring; no Completed, Labels or sub-tasks; a new Task on today, its alert an hour from now); Notes' Thoughts tab; capture ("New": Thoughts and Reminders); the digest without Thoughts; the glossary, data model and capability map | Drafted 9 November, after Joe agreed the design: [today, reminders and plan](../../10-requirements/cross-cutting/today-reminders-plan.md) (RMD-001–006, ALR-001, TDY-001–006, NEW-001–006, WEK-001–002, PLA-001–007, NTE-005), with two open points; each spec it changes points to it, and the glossary, data model (the Reminder Type to come), capability map and index. Joe agreed Claude's choices and answered both points the same day (no Repeat from "New"; one Snooze for every Type, no Done on Events), and agreed the spec. **Done** | Specs |
| 2 | Decisions: an ADR for the Reminder Type and Alerts, superseding parts of ADR-0020 (a reminder is not a Type), ADR-0023 (a Thought with a date gets one), ADR-0026 (the drawer's pages), ADR-0027 (capture) and ADR-0037 (Thoughts wait in Inbox); where a Reminder's times live so Week shows it on each of its days and still reads `core.items` (ADR-0029); Labels and sub-tasks removed | Drafted 9 November: [ADR-0065](../../20-architecture/adr/0065-reminders-alerts-and-the-day.md) (Provisionally agreed): the `reminder` Type; its days its Alerts' days, `do_on`/`do_at` its next Alert; Alerts by name in the database and the code (`core.alerts`), the Android app's wire names kept until its next APK; `takes_alerts`; one Snooze, Done for Completable Items and Reminders; no Alert in the past; Labels for Notes and Thoughts, sub-tasks dropped; `/today`, `/week`, `/plan` and the redirects; Today on the device; "New" in `packages/capture`. Joe agreed it, the full rename to Alerts included, 9 November. **Done** | ADRs |
| 3 | **Joe** — design: how "New" works, and the button that opens it; Today; Week with Reminders; Plan's four tabs; a Reminder, its Alerts and New reminder; New task; Notes' Thoughts; the widget as Today | First pass 9 November, with five ways "New" could work (A two tabs, B one line, C choose first, D quick times, B + D recommended); Joe chose A, refined: opening on Reminder, the time understood and taken out of the title as Alerts (and a Repeat), "+ Alert" with quick times, Alarm as a chip; and five directions for the button (today's ghost "New", a solid "+ New", a round "+", Reminder split from Thought, a box reading "Remind me to…"). Second pass the same day; Joe liked neither, and asked for variations: five of the popup (some keeping the switch, some not; a title and a When field, quick times such as "In 1 hour", the time understood and kept out of the title) and five quieter variations on today's button with another icon. Third pass the same day; Joe chose 5, one smart line, and the bell-plus button, with tweaks ([fourth round](#joes-answers-9-november-fourth-round)); drawn as chosen the same day, the other variations removed from the page and the spec. Third pass: drawn from the real components on `/design-stage-7b` (development and preview builds only; `DESIGN_PAGE=design-stage-7b scripts/design-shots.mjs` takes its screenshots), dark and light, desktop and phone, on the [design canvas](https://claude.ai/artifact/EqX4D326Apjs5aGVF2W4Gs). Drafts in the spec: ItemRow `past`; ReminderList's `noun`; CaptureButton's `look="bell"` (AppShell's `captureLook`); NewDialog, SmartLine, SavesAs, QuickChip, ChipRow and AddAlertMenu. Joe agreed it all, 9 November. **Done** | [design system](../../30-design/README.md) |
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

## Joe's answers (9 November, second round)

To the first pass of the design and Claude's seven questions:

1. **"New":** none of the five quite right; option A, refined. It opens on
   the Reminder tab. Dates are understood, and smarter: "clean bedroom
   Tues 8pm" suggests the Reminder "Clean bedroom" with an Alert on
   Tuesday at 20:00, the words for the time not kept in the title; more
   Alerts can be added; clean, fluid and low friction. The "New" button
   redesigned too, with directions to choose from.
2. **The Tasks page's name:** Plan, for now.
3. **Today's groups:** Anytime (no time), Morning (00:00–12:00), Afternoon
   (12:00–17:00), Evening (17:00–24:00); Meals by slot, Breakfast in the
   Morning, Lunch the Afternoon, Dinner the Evening.
4. **A Reminder** is a title only.
5. **A Reminder's notification:** Done dismisses it; Snooze removes it and
   sets another Alert an hour from then.
6. **Today's count in the drawer:** every Item on the Today page (Meals,
   Tasks, Reminders, Events, Workouts, anything), never Thoughts.
7. **"Stage 7b":** fine.

## Joe's answers (9 November, third round)

1. **The "New" button:** none of the five directions; keep it subtle, as
   today's, but without the speech bubble. Five variations on it.
2. **The popup:** not the second pass. Four or five variations, as a senior
   UI/UX designer would draw them: some without the Reminder / Thought
   switch, some keeping it; two fields, the title and when, easy to move
   between on a phone; quick times such as "In 1 hour".

## Joe's answers (9 November, fourth round)

1. **"New":** variation 5, one smart line, with no Reminder / Thought
   switch. No Alarm chip: tapping an Alert's pill opens the Alert dialog, as
   a Task's Reminder does, where it can be made an Alarm and its date and
   time changed. The quick times: "In 1 hour", the likeliest next time
   ("This evening", "Tomorrow morning") and "More". Pills are removed with
   Backspace or their ×; Alerts added become pills in the line. Save is
   "Save", with an icon at the top right saying Thought or Reminder.
2. **The button:** 5, the bell with a plus.
3. **A date with no time** ("call mum tomorrow"): 09:00.
4. **A time with no date that has passed today:** tomorrow. A Reminder
   can't be set in the past.
