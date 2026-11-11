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
Joe agreed the whole design on 9 November, and step 1's specs the same day; step 2's decision, ADR-0065, the same day. Steps 4–10c are built; step 11, Joe using it, is next.

## Steps

Steps marked **Joe** need Joe's go-ahead or action before Claude does them.
Every step that builds a screen follows the [design system](../../30-design/README.md)
checklist.

| # | Step | State | Produces |
|---|---|---|---|
| 1 | **Joe** — specs: the Reminder Type (a title, Alerts, Repeat; Personal only; blue; not Completable; leaves Today at the end of its day; Thought → Reminder, Reminder ↔ Task and Event); Alerts (the rename of an Item's Reminders); Today (views/inbox.md becomes views/today.md); Week (views/week.md); Plan (views/plan.md: Tasks, Events, Reminders, Recurring; no Completed, Labels or sub-tasks; a new Task on today, its alert an hour from now); Notes' Thoughts tab; capture ("New": Thoughts and Reminders); the digest without Thoughts; the glossary, data model and capability map | Drafted 9 November, after Joe agreed the design: [today, reminders and plan](../../10-requirements/cross-cutting/today-reminders-plan.md) (RMD-001–006, ALR-001, TDY-001–006, NEW-001–006, WEK-001–002, PLA-001–007, NTE-005), with two open points; each spec it changes points to it, and the glossary, data model (the Reminder Type to come), capability map and index. Joe agreed Claude's choices and answered both points the same day (no Repeat from "New"; one Snooze for every Type, no Done on Events), and agreed the spec. **Done** | Specs |
| 2 | Decisions: an ADR for the Reminder Type and Alerts, superseding parts of ADR-0020 (a reminder is not a Type), ADR-0023 (a Thought with a date gets one), ADR-0026 (the drawer's pages), ADR-0027 (capture) and ADR-0037 (Thoughts wait in Inbox); where a Reminder's times live so Week shows it on each of its days and still reads `core.items` (ADR-0029); Labels and sub-tasks removed | Drafted 9 November: [ADR-0065](../../20-architecture/adr/0065-reminders-alerts-and-the-day.md) (Provisionally agreed): the `reminder` Type; its days its Alerts' days, `do_on`/`do_at` its next Alert (amended in step 5: its Alerts hang on its `do_on`); Alerts by name in the database and the code (`core.alerts`), the Android app's wire names kept until its next APK; `takes_alerts`; one Snooze, Done for Completable Items and Reminders; no Alert in the past; Labels for Notes and Thoughts, sub-tasks dropped; `/today`, `/week`, `/plan` and the redirects; Today on the device; "New" in `packages/capture`. Joe agreed it, the full rename to Alerts included, 9 November. **Done** | ADRs |
| 3 | **Joe** — design: how "New" works, and the button that opens it; Today; Week with Reminders; Plan's four tabs; a Reminder, its Alerts and New reminder; New task; Notes' Thoughts; the widget as Today | First pass 9 November, with five ways "New" could work (A two tabs, B one line, C choose first, D quick times, B + D recommended); Joe chose A, refined: opening on Reminder, the time understood and taken out of the title as Alerts (and a Repeat), "+ Alert" with quick times, Alarm as a chip; and five directions for the button (today's ghost "New", a solid "+ New", a round "+", Reminder split from Thought, a box reading "Remind me to…"). Second pass the same day; Joe liked neither, and asked for variations: five of the popup (some keeping the switch, some not; a title and a When field, quick times such as "In 1 hour", the time understood and kept out of the title) and five quieter variations on today's button with another icon. Third pass the same day; Joe chose 5, one smart line, and the bell-plus button, with tweaks ([fourth round](#joes-answers-9-november-fourth-round)); drawn as chosen the same day, the other variations removed from the page and the spec. Third pass: drawn from the real components on `/design-stage-7b` (development and preview builds only; `DESIGN_PAGE=design-stage-7b scripts/design-shots.mjs` takes its screenshots), dark and light, desktop and phone, on the [design canvas](https://claude.ai/artifact/EqX4D326Apjs5aGVF2W4Gs). Drafts in the spec: ItemRow `past`; ReminderList's `noun`; CaptureButton's `look="bell"` (AppShell's `captureLook`); NewDialog, SmartLine, SavesAs, QuickChip, ChipRow and AddAlertMenu. Joe agreed it all, 9 November. **Done** | [design system](../../30-design/README.md) |
| 4 | Alerts by name: `core.reminders` becomes `core.alerts`, `core.reminder_deliveries` `core.alert_deliveries`, their columns, functions, triggers and policies to match; the app's code and the Edge Functions too (ADR-0065 4). No behaviour changes. What old clients and the installed APK call keeps working: the old function names as wrappers and `core.reminders` as a view, until step 10 takes them away. Migration, database tests, advisors | Built 9 November ([#76](https://github.com/joestables/lifeos/pull/76)): migration `stage7b_alerts`, applied as `20261109225036`, and `ontology` as `20261109225050` (the advisors: nothing new, `core.alert_deliveries` in place of `core.reminder_deliveries`); the function definitions generated from the migrations and checked against the live database's by hash; the old names kept (wrappers, the `core.reminders` view, generated Settings columns; `alerts_rename_test`); `device-reminders` and `notification-action` redeployed. The live data checked after: 302 Alerts, all read through the old view too; the minute job running clean. **Done** | Migration, code, Edge Functions |
| 5 | The Reminder Type: in the ontology (stage 7.5; `takes_alerts`); its days its Alerts' days, in `src/lib/plan.ts`; its popup (title, Alerts, Repeat, never its last Alert); conversions to and from Task and Event, from a Thought; New task on today with its Alert an hour on (PLA-006) | Built 9 November ([#77](https://github.com/joestables/lifeos/pull/77)): migration `stage7b_reminder_type`, applied as `20261109235154`, and `ontology` as `20261109235204` (the advisors: nothing new). The `reminder` Type, `item_types.takes_alerts` (the database refuses an Alert on a Note; a Thought keeps taking them until step 8), and its Alerts hung on its `do_on` rather than a trigger keeping `do_on` as its next Alert (ADR-0065 amended), so moving or repeating it moves them; on a schedule only. On Week from its Alerts, on each day one falls, with that day's times, faded once all have gone (RMD-003); a day's "+" makes one (New reminder: a title, its first Alert an hour from now today, else my default time, more if wanted, a Repeat); its popup's Alerts never lose the last, nor take a time gone. `core.convert_item` converts a Thought, Task or Event into one (its Alerts to come kept, else one an hour from now) and back (at its next Alert); a Note doesn't become one, being more than a title. New task on today, its default Alert an hour on when gone by. Database tests `reminder_type_test`; walks in `plan.spec.ts`, `tasks.spec.ts`. **Done** | Migration, code |
| 6 | The pages: Today (`/today`, TDY-001–005), Week (`/week`, WEK-001–002), Plan (`/plan`, PLA-001–005, New reminder there too), the drawer, the redirects from `/inbox`, `/tasks` and `/plan?add=1`; Notes' Thoughts tab (NTE-005); a Reminder's Alarm with its alarm clock on its card (RMD-003 1) | Built 10 November ([#78](https://github.com/joestables/lifeos/pull/78)). **Today** (`src/lib/today.ts`): overdue Tasks, then Week's today of every Type in Anytime, Morning, Afternoon and Evening, Meals by slot; done and past stay, faded; a Task left from an earlier day stays (as on Plan's Tasks); Thoughts only as "5 thoughts to sort", opening Notes' Thoughts; the drawer counts it. **Week** is Plan renamed (`/week`), a Reminder's Alarm with its clock on its card. **Plan** is Tasks reshaped: Tasks, Events, Reminders and Recurring tabs (`src/lib/plan-lists.ts`), no Completed or Label pills, a Task ticked today staying in Today, the action following the tab. **Notes** has Notes and Thoughts tabs, Labels under both; a Thought converts to a Reminder, a Task or a Note in one action. `/inbox`, `/tasks` and `/plan?day=`/`?add=1` redirect. Task rows convert from their menu. Migration `stage7b_series_reminders` (applied as `20261110155215`; the advisors: nothing new): the nightly series run no longer closes a Reminder's past occurrences (a Reminder has no *cancelled*), which would have failed the whole run. Specs moved into [today](../../10-requirements/views/today.md), [week](../../10-requirements/views/week.md), [plan](../../10-requirements/views/plan.md) and [notes](../../10-requirements/views/notes.md); Inbox's spec replaced. The widget's date opens Plan until step 10. **Done** | Code, migration |
| 7 | "New": the bell-plus button, one smart line, Alert pills, quick times, `packages/capture` reading several times and keeping them out of the title (NEW-001–006) | Built 10 November ([#79](https://github.com/joestables/lifeos/pull/79)): `readLine` in `packages/capture` (several times, "and 9pm" the same day, "tues", "thurs", "weds", a date alone at my default time, a time gone today tomorrow, "tonight" and "this weekend" as the quick times, nothing in the past, "every" no Repeat); the line's Alerts as pills, the words leaving for them once a whole word follows or on Save, × or Backspace removing them, a pill opening the Alert dialog with Alarm; In 1 hour, the likeliest next time and More (`src/lib/new-line.ts`); SavesAs; Labels for a Thought only. CaptureDialog and its switch to Task are gone, and Settings' "Dated thoughts" with them (ALR-001 2, its database part with step 8). The bell-plus button everywhere. **Done** | Code |
| 8 | Thoughts lose Alerts (ALR-001): none made from a Thought's date, none on Thoughts or Notes in the database, Settings' Thought default gone, the digest without Thoughts; Joe's data (19 Thoughts' Alerts gone off removed, 3 to come converted to Reminders, the Note's removed) | Built 10 November ([#80](https://github.com/joestables/lifeos/pull/80)): migration `stage7b_thoughts_lose_alerts`, applied as `20261110200905`, and `ontology` as `20261110200921` (a Thought's `takes_alerts` false; the advisors: nothing new). The digest counts no Thoughts and opens Today; the Thought default leaves my settings; `convert_item` takes the time a Thought's text names (`p_alert_at`), as a Thought can no longer hold it as an Alert, and gives a Reminder its Alert once it is one; a Thought's popup has no Alerts. Joe's data, counted 10 November: 3 Thoughts with an Alert to come (the two sports massages on 24 November, Julian Medical on 2 December) became Reminders, their titles as written; the other 36 Alerts on Thoughts (active, ticked off and deleted) and Notes were removed; counted after, none is left on a Thought or a Note. **Done** | Migration, code |
| 9 | Labels off Tasks and Events, sub-tasks gone (PLA-007): `uses_labels`, `core.subtasks` dropped, their fields and components; Joe's data (the "Work" Label on 18 Events, one Task's sub-tasks) | Built 10 November ([#81](https://github.com/joestables/lifeos/pull/81)): migration `stage7b_labels_and_subtasks`, applied as `20261110213408`, and `ontology` as `20261110213425` (`uses_labels` false for Tasks and Events; the advisors: nothing new). `core.subtasks`, its functions and `has_subtasks` dropped; a repeat's occurrences take no Labels (`make_occurrences`, and `label_ids` gone from the patterns); Labels and Sub-tasks gone from TaskDetails, New task and EventDetails, SubtaskList and the sub-task writes with them. Joe's data, counted 10 November: the "Work" Label on 18 Events and one repeating Event's pattern, "Work" and "Home" on 5 Tasks, and one Task's two sub-tasks ("Test Note"), deleted; counted after, none left. **Done** | Migration, code |
| 10a | Notifications and the widget, on the server and in the web app, so the installed Android app has them without a release (Joe, 11 November: the Actions minutes ran out, and one release waits for the end of the stage): a Reminder's notification says its Alert's time, with Done (it only clears it) and Snooze (RMD-005); the widget's cards as Today lists them (TDY-006 1), in the web app and `core.device_plan`; `core.plan_items` placing a Reminder by its Alerts (ADR-0065 2) | Built 11 November ([#83](https://github.com/joestables/lifeos/pull/83)): migration `stage7b_reminder_notifications_and_widget`, applied as `20261111121610` (the advisors: nothing new): `act_on` takes Done on a Reminder and changes nothing; `notification_payload` gives a Reminder its Alert's time and Done; `core_private.today_cards` is Today's list (overdue Tasks first, the day from Anytime to Evening, a repeating Task's next only, a Reminder on each day an Alert falls, at its first time), which `device_plan` answers for today and tomorrow; `alert_at` works out an Alert's time as the app does; `near_today` reaches back for overdue Tasks. `widgetDays` made from `todayList`. Database tests `reminder_notifications_test`, `today_widget_test`. **Done** | Migration, code |
| 10b | The old names from step 4 dropped from the database (ADR-0065 4): what the installed Android app calls is the Edge Functions, which use the new ones, so this needs no release; checked first in the API logs that nothing still asks for them | Built 11 November ([#84](https://github.com/joestables/lifeos/pull/84)): the last request by an old name was on 10 November at 19:36 UTC, from Joe's phone before it took the new web build; none since. Migration `stage7b_old_names_gone`, applied as `20261111184957` (the advisors: nothing new): `core.reminders` (the view), Settings' `default_reminder_time` and `reminder_defaults`, and the eight wrappers dropped; `update_settings` takes only the new names. `alerts_rename_test` checks they are gone. **Done** | Migration |
| 10c | The Android app's next release (Joe made the repository public on 11 November, so Actions has minutes again): the widget's date opening `/today` and "+" `/week?add=1` (TDY-006 2); the wire names read and sent by their new names (`device-alerts`, `alert`), the old ones kept as a fallback; `public/android.json` raised and the release run; once it is installed, the old wire names dropped | 0.1.13 built 11 November ([#85](https://github.com/joestables/lifeos/pull/85)): `device-alerts` (new) and `notification-action` taking `alert` too, deployed; the site hands the app `alertsUrl` and, for 0.1.12, `remindersUrl`; the app reads `alert` (else `reminder`, in what it kept) and `alertsUrl` (else device-reminders' as device-alerts'), and sends `alert`; the widget's date opens `/today`, "+" `/week?add=1`. Released 11 November as [android-v0.1.13](https://github.com/joestables/lifeos/releases/tag/android-v0.1.13). Joe's phone on 0.1.13 the same evening (`device-alerts` called from 20:48, `device-reminders` last at 20:38), the old wire names left the server ([#87](https://github.com/joestables/lifeos/pull/87)): `device-reminders` answers 410 Gone, `notification-action` takes `alert` only, the site hands only `alertsUrl`. **Done** | Native code, Edge Functions, release |
| 11 | **Joe** — uses it daily; what he trips over is fixed | To do | Code |

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
