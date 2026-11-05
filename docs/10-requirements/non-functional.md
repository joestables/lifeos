# Non-functional requirements

*Not yet written as requirements. This page records the constraints and
decisions known so far.*

## Performance

- **Visibility costs a few milliseconds.** Benchmarked on 10 October 2026
  (`scripts/bench-can-read.sh`: 7,600 seeded Items, 600 links, two people in
  a Household), median of 20 runs through row-level security: a week of Plan
  3–4 ms; every live Item 5–6 ms (5,600 and 3,200 rows). Checking one hop
  per row had cost 150–430 ms for every Item, so the policies work the rule
  out as sets, once per query
  ([ADR-0017](../20-architecture/adr/0017-enforcing-visibility.md)). Re-run
  on 18 October with Recipes seen through a Household (ADR-0052; 8,500
  Items, 1,200 links): a week of Plan 4–6 ms; every live Item 8–9 ms; a
  member reading 300 of my Recipes through the Household 5 ms. Re-run it
  when the rule or the data grows.
- Capture must be faster than Google Tasks or setting a phone alarm
  ([vision](../00-foundation/vision.md)).
- Shared Shopping lists update live; elsewhere, data refreshes on focus.

## Offline

See [offline](cross-cutting/offline.md).

## Privacy

- Anyone can sign up, but nobody sees another person's Items until one has
  invited the other into a Household and the invitation is accepted
  ([ADR-0039](../20-architecture/adr/0039-accounts-contacts-households.md)).
- Everything is personal data: if backups are taken, they go to private,
  encrypted storage ([backups](../40-operations/backups.md)).
- `ops.events` records the screen and the last few actions, never the content
  of your Items.
- The capture address (Stage 10) can only create Items in its owner's Personal Space and
  can read nothing.
- AI sees only what the person asking may see.
- Your data is exportable: everything you can see, as JSON, on demand.
- Browser walks never run against real data.
- A device keeps one person's data at a time: when someone else signs in
  there, what it kept for the last person goes first, and their unsent
  writes are never sent as anyone else
  ([ACC-003](cross-cutting/spaces-and-sharing.md#acc-003--sign-out)).

## Accessibility

Not yet written.

## Reminder reliability

- Web Push on Android, desktop and iOS home-screen apps (iOS 16.4+, no action
  buttons).
- On the Android app (Stage 7), Reminders are set on the phone to the
  minute, and a Reminder marked Alarm rings
  ([REM-010](cross-cutting/reminders.md#rem-010--on-time-on-the-android-app),
  [REM-011](cross-cutting/reminders.md#rem-011--an-alarm)).
- The web is unchanged by the Android app: every browser and screenshot
  test passes as before
  ([AND-005](cross-cutting/android.md#and-005--the-web-stays-as-it-is)).
- Deliveries are logged (`core.reminder_deliveries`), sent within a minute,
  once per device, and missed after 12 hours
  ([ADR-0044](../20-architecture/adr/0044-reminder-delivery.md),
  Provisionally agreed).

## Free-tier constraints

- No downloadable backups, and none taken for now (Joe's choice).
- 1 GB of file storage: photos are resized on the device before upload.
- The project pauses after a week idle.
