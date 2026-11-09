# ADR-0065: The Reminder Type, Alerts, and the pages around the day

**Status:** Provisionally agreed · 2026-11-09 (Joe, the full rename to Alerts included)

## Context

Stage 7b's spec, [Today, Reminders and Plan](../../10-requirements/cross-cutting/today-reminders-plan.md)
(agreed by Joe on 9 November), makes a **Reminder** a Type of its own — a
title, its Alerts and a Repeat, not Completable, Personal only, on each day
it has an Alert — and calls an Item's notifications **Alerts**. Thoughts
lose theirs; Tasks and Events lose Labels, and Tasks sub-tasks. Inbox
becomes **Today**, Plan **Week**, Tasks **Plan**, and "New" one smart line
making Thoughts and Reminders.

Several earlier decisions said otherwise: a reminder is not a Type
([ADR-0020](0020-task-event-reminder.md)); a Thought with a date gets one
([ADR-0023](0023-reminders.md)); the drawer's pages
([ADR-0026](0026-navigation-drawer.md)); capture makes a Thought with a
switch to Task ([ADR-0027](0027-quick-capture.md)); Plan reads only
`core.items` ([ADR-0029](0029-plan-reads-core-items.md)); Thoughts wait in
Inbox ([ADR-0037](0037-thoughts.md)); Thoughts, Notes, Tasks and Events
share Labels ([ADR-0014](0014-reference-data-and-labels.md)).

The hard question is where a Reminder's days live. Every other Schedulable
Type is on Plan by one date on `core.items` (`starts_at`, `do_on`,
`due_on`), but a Reminder can alert on Tuesday and Thursday, and its
Alerts are rows in `core.reminders`, each person's own.

## Decision

1. **A Reminder is a core Type**, `reminder` in the ontology (stage 7.5):
   Schedulable and Capturable; not Completable or Shareable; status
   *active* only; Personal; blue; no Labels, mark, sub-tasks or place; no
   default Alert (it is always made with one). Its time fields are
   `do_on` and `do_at`.

2. **A Reminder's days are its Alerts' days.** It is on each local date
   that one of its Alerts fires (`fires_at`, so a Snooze moves it too).
   `src/lib/plan.ts` and `core.plan_items` place it so, reading
   `core.reminders` for this one Type; Today, Week, Plan's Reminders tab
   and the widget all use that. **`do_on` and `do_at` hold its next Alert**
   (the last, once all have gone off), kept by a trigger on its Alerts, so
   it sorts, converts and reads like a Task without reading its Alerts.
   ADR-0029 is amended: Plan reads `core.items`, and for Reminders their
   Alerts. *Rejected:* each Alert an Item of its own (a Reminder would be
   several Items); a separate table of a Reminder's days (a second copy of
   what its Alerts already say).

3. **A Reminder always has an Alert, in the app.** Its popup won't remove
   the last, and "New" makes a Reminder only with one. The database doesn't
   refuse a Reminder without Alerts — the write queue sends an Item before
   its Alerts — and one so left shows on no day until it has one.

4. **Alerts, by name, everywhere but the wire.** The table, its functions
   and the app's code take the name: `core.reminders` becomes
   `core.alerts`, `core.reminder_deliveries` `core.alert_deliveries`,
   their functions and the TypeScript to match (`ReminderList` →
   `AlertList`, `useReminders` → `useAlerts`), so `reminder` in the code
   means only the Type. What an installed Android app already reads and
   sends — the `device-reminders` function's address and fields, the
   notification payload, Done and Snooze's — keeps its names until a new
   APK reads both, then follows. *Alternative:* keep the storage names and
   rename only what people see; cheaper, but `core.reminders` would hold
   Alerts while `core.items` holds Reminders, which the glossary rule (its
   terms in the code) forbids.

5. **Which Types take Alerts is the ontology's**: Tasks, Events, Meals,
   Shopping lists and Reminders (`item_types.takes_alerts`); the
   database refuses an Alert on any other (a Thought, a Note). Converting
   an Item into a Type that takes none drops its Alerts; Undo restores the
   Type, not them. The Thought default goes from Settings
   (`reminder_defaults`) and the ontology.

6. **Snooze is one thing for every Type**: that Alert's `snoozed_until`, an
   hour from the press, for its person, as now
   ([ADR-0044](0044-reminder-delivery.md)). **Done** is offered for a
   Completable Item (it is ticked) and a Reminder (the notification goes,
   nothing changes); an Event has none. The payload says which.

7. **No Alert in the past.** The Alert dialog won't save one, and "New"'s
   reading rolls a time forward (a time gone today means tomorrow; a date
   with no time means the person's default time). The database doesn't
   check: an Alert anchored to a date that moves into the past is already
   handled by delivery (REM-004 6).

8. **Labels are for Notes and Thoughts**: `uses_labels` false for Tasks and
   Events, so the database refuses new ones; their Labels are deleted.
   **Sub-tasks go**: `core.subtasks` is dropped with `has_subtasks`, and
   the sub-task component with them. ADR-0014 is amended.

9. **The pages and their addresses** (ADR-0026 amended): the drawer opens
   **Today** (`/today`), then **Week** (`/week`), **Plan** (`/plan`),
   Notes and the rest. `/inbox` goes to `/today`, `/tasks` to `/plan`, and
   `/plan?add=1` — which widgets before the next APK open — to
   `/week?add=1`. The widget's date opens `/today` in the next APK.

10. **Today is worked out on the device**, as Week is
    ([ADR-0049](0049-plans-read.md)): `src/lib/today.ts` takes the day's
    Items by Week's rules, adds overdue Tasks, and groups them into
    Anytime, Morning, Afternoon and Evening. The widget's feed
    ([ADR-0064](0064-the-today-widget.md)) is Today's list, and
    `device-plan` gives the same; the drawer's count is its length.

11. **"New" is the capture parser's** (`packages/capture`,
    [ADR-0027](0027-quick-capture.md) amended): it returns a title and the
    Alerts it found (several, "and 9pm"), the words for them taken out;
    the rules for a date with no time, a time gone and a weekday; and the
    quick times for a moment (In 1 hour, This evening before 17:00,
    Tomorrow morning after). Capture makes Thoughts and Reminders only; its
    switch to Task goes.

12. **Thoughts are sorted on Notes** (ADR-0037 amended): its Thoughts tab
    is where Inbox's Thoughts group was; Today says only how many wait;
    the morning digest counts none.

## Consequences

- One migration (step 4) adds the Type, renames the Alert tables and
  functions, adds `takes_alerts`, drops sub-tasks and the Labels on Tasks
  and Events, and changes Joe's data as the plan says: the 19 Thoughts'
  Alerts already gone off removed, the 3 still to come converted to
  Reminders, the Note's removed.
- The Edge Functions that read Alerts (`send-notifications`,
  `notification-action`, `device-reminders`, `device-plan`) are redeployed
  with the migration; the Android app keeps working through the old names
  until its next release, which reads the new ones and opens `/today`.
- ADR-0014, 0020, 0023, 0026, 0027, 0029 and 0037 each say what this one
  changes.
