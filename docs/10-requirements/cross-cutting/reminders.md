# Reminders and notifications

*Stage 2 (Web Push); Stage 7 (exact alarms on Android). Requirements not yet
written; this page records the decisions they build on.*

## Decisions

- **Reminders attach to any Item**, relative to one of its times or at a
  fixed time; defaults per Type; a Task's default follows its do-on date at
  the person's default time (09:00 unless changed); per person; a Thought with
  a date gets one ([ADR-0023](../../20-architecture/adr/0023-reminders.md),
  Provisionally agreed).
- **Anchors per Type** are tabled in the
  [data model](../../20-architecture/data-model.md#time-fields-per-schedulable-type).
- **Delivery** records what was sent, when (`core.reminder_deliveries`), to
  each person's push devices (`core.push_devices`: Web Push, later FCM).

## Candidate requirements

- **Notifications that do something:** *Done* and *Snooze* straight from the
  notification on Android and desktop. iOS Web Push shows no buttons, so on
  the iPhone a notification opens the Item (re-check before Stage 2).
- **Overdue nudges.**
- **A morning digest** at a time each person sets (v1's 07:00 daily
  summary), which is Inbox in one notification.
- **Later, with the native wrapper:** alarm-grade Reminders
  ([overview](../../20-architecture/overview.md#platforms)) and location
  Reminders ("near Tesco").
