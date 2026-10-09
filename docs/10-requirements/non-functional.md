# Non-functional requirements

*Not yet written as requirements. This page records the constraints and
decisions known so far.*

## Performance

- `core.can_read` runs for every row Plan reads, so it is benchmarked in
  Stage 1 on seeded data (a few thousand Items, a week of Plan)
  ([ADR-0017](../20-architecture/adr/0017-enforcing-visibility.md)).
- Capture must be faster than Google Tasks or setting a phone alarm
  ([vision](../00-foundation/vision.md)).
- Shared Lists and Shops update live; elsewhere, data refreshes on focus.

## Offline

See [offline](cross-cutting/offline.md).

## Privacy

- Anyone can sign up, but nobody sees another person's Items until they are
  Contacts and have both joined a Household
  ([ADR-0039](../20-architecture/adr/0039-accounts-contacts-households.md)).
- Everything is personal data: backups go to private, encrypted storage
  ([backups](../40-operations/backups.md)).
- `ops.events` records the screen and the last few actions, never the content
  of your Items.
- The capture address can only create Items in its owner's Personal Space and
  can read nothing.
- AI sees only what the person asking may see.
- Your data is exportable: everything you can see, as JSON, on demand.
- Browser walks never run against real data.

## Accessibility

Not yet written.

## Reminder reliability

- Web Push on Android, desktop and iOS home-screen apps (iOS 16.4+, no action
  buttons).
- Alarm-grade Reminders need the Android wrapper (Stage 7)
  ([overview](../20-architecture/overview.md#platforms)).
- Deliveries are logged (`core.reminder_deliveries`).

## Free-tier constraints

- No downloadable backups: a nightly `pg_dump` instead.
- 1 GB of file storage: photos are resized on the device before upload.
- The project pauses after a week idle.
