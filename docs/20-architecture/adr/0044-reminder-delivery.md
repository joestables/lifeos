# ADR-0044: How Reminders are delivered

**Status:** Proposed · 2026-10-11

## Context

[ADR-0023](0023-reminders.md) gives each Reminder a calculated `fires_at`;
the [reminders spec](../../10-requirements/cross-cutting/reminders.md)
asks for every notification within a minute, once per device, up to 12
hours late and no later, to every device a person has turned on, with Done
and Snooze where the platform has buttons, plus a morning digest and overdue
nudges. Web Push needs each message encrypted for its device and signed with
the app's VAPID key, which Postgres can't do. LifeOS is on Supabase's free
tier ([ADR-0003](0003-new-supabase-project.md)).

## Decision

- **A minute job in the database decides what is due.** `pg_cron` runs a
  database function every minute. It finds what has come due — Reminders
  whose `fires_at` has passed, each person's digest at their digest time in
  their home timezone, and overdue nudges at their default time when the
  digest is off — and writes one row per notification and device to
  `core.reminder_deliveries` (kind: *reminder*, *digest*, *overdue*). A
  unique key on the notification, its fire time and the device means a row
  is never written twice. Anything more than 12 hours late is written as
  *missed* instead.
- **An Edge Function sends them, only when there is something to send.**
  When rows are waiting, the job calls the `send-notifications` Edge
  Function through `pg_net`, with a secret kept in Vault. The function claims
  waiting rows (so two runs never take the same row), encrypts and sends each
  by Web Push with the VAPID key, and records the result: *sent*, *failed*
  (tried again next minute, until the 12 hours are up), or *gone*. A device
  the push service says is gone stops being sent to, and the failure goes to
  `ops.events` ([runbook](../../40-operations/runbook.md)).
- **Once on the device, even if a send is repeated.** Each message carries
  the delivery's id as its Web Push topic and its notification tag, so a
  repeat replaces the notification rather than adding a second.
- **Every Reminder goes to every device the person has turned on**
  (`core.push_devices`); there is no choosing per Reminder.
- **The notification carries what it needs.** Its title, the Item's time,
  the link that opens the Item (ITM-001), and — on platforms with buttons —
  Done (Completable Items only) and Snooze. Done and Snooze carry a token for
  that one delivery, so the service worker can act without the person's
  session: it sends the action to a `notification-action` Edge Function,
  which checks the token and makes the change as that person. With no
  signal, the service worker keeps the action and sends it when it can (or
  when LifeOS next opens). Snooze moves only that person's Reminder an hour
  on (`snoozed_until`).
- **Checked like any other job.** Each run of the function records a
  heartbeat in `ops.heartbeats`; the nightly health check reports a missing
  one.

## Consequences

- The app's service worker becomes LifeOS's own (receiving pushes and
  handling notification clicks and buttons), with the precaching it has now.
- A notification arrives a few seconds after its minute, not to the second;
  alarm-grade Reminders still need the Android wrapper (Stage 7).
- An idle minute costs one small query; the Edge Function runs only when
  something is sent, well inside the free tier.
- If the project is paused, nothing is sent; Joe's daily use keeps it awake.
- The VAPID private key and the cron secret are Edge Function secrets and
  Vault entries; the public key is in the app's build
  ([integration setup](../../40-operations/integration-setup.md#web-push)).
- Later, FCM for the Android wrapper is another kind of device, sent by the
  same function.
