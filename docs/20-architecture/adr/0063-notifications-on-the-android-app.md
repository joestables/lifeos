# ADR-0063: Notifications, on time, and Alarms on the Android app

**Status:** Provisionally agreed · 2026-11-05 (Joe)

## Context

[ADR-0044](0044-reminder-delivery.md) sends every notification by Web
Push from a minute run, a few seconds after its minute, and planned FCM
for the Android app as "another kind of device". Web Push doesn't work in
the app's web view. The agreed spec asks for more on the Android app: each
Reminder at its minute even when the phone is idle or without signal, one
notification not two
([REM-010](../../10-requirements/cross-cutting/reminders.md#rem-010--on-time-on-the-android-app)),
and Alarms that ring until stopped
([REM-011](../../10-requirements/cross-cutting/reminders.md#rem-011--an-alarm)).
A notification decided by the server can't be on time to the minute with
the phone asleep; one set on the phone can.

## Decision

- **The Android app is an `fcm` device** in `core.push_devices` (the kind
  is already allowed): its FCM token as the endpoint, labelled "Android
  app", turned on in Settings as any device is (REM-001 4). Registering
  also gives the device a **secret**, kept by the app's native side and
  stored only as a hash, so the native side can read what it needs without
  the person's session.
- **The phone sets its own Reminders.** The app's native side asks a
  `device-reminders` Edge Function, with its secret, for every firing of
  its person's Reminders in the next 7 days, and any up to 12 hours late
  not yet shown, each with what the notification says (worked out as for
  Web Push), whether it is an Alarm, whether it can be Done, and a token
  for Done and Snooze. It sets an exact alarm for each
  (`USE_EXACT_ALARM`, `setExactAndAllowWhileIdle`; an Alarm by
  `setAlarmClock`), replacing what it had. So a Reminder arrives at its
  minute with the phone asleep, and with no signal once set (REM-010 1, 3).
- **The server says when to look again.** A change that moves, adds or
  removes a firing for a person (a Reminder made, changed, snoozed or
  deleted; its Item done, archived, moved, or no longer readable to them)
  marks that person's Android devices as needing it. The minute run sends
  each such device one high-priority FCM data message saying only "look
  again" (no titles), at most one a minute, through `send-notifications`;
  FCM holds it for a phone without signal until it returns. The native
  side asks again, then also whenever the app opens and once a day, so the
  week's horizon rolls on (REM-010 2).
- **One notification, not two.** The minute run still writes the delivery
  row for an Android device's Reminder (for the record and the health
  check) but marks it *on device* and sends nothing; the phone is the only
  sender (REM-010 4). The **digest and overdue nudges**, worked out as
  they are sent, go to the Android device as FCM data messages carrying
  what to show, shown by the native side with Done and Snooze.
- **All FCM messages are data messages,** handled by the native side
  (LifeOS's own `FirebaseMessagingService`), so they work with the app
  closed and are shown in LifeOS's own notification channels.
- **Done and Snooze** call `notification-action`, as the service worker
  does; for a firing set on the phone, its token is a signature over the
  Reminder, its fire time and the device (a Vault secret), checked there,
  so nothing is stored per firing. Snooze also moves the phone's alarm an
  hour at once; with no signal, the press is kept and sent when signal
  returns (WorkManager), as on the web.
- **An Alarm** (a new `alarm` flag on a Reminder, off by default, set in
  the Reminder's settings on any device) rings on the Android app: an
  alarm-clock alarm opening a full-screen screen over the lock screen,
  sound on the alarm stream (so silent and Do Not Disturb don't stop it)
  and vibration, until Stop, Snooze or Done (REM-011 2, 4). Elsewhere it is
  an ordinary notification (REM-011 3).
- **A Cooking timer's end** on the Android app is set on the phone
  directly, to the second, and isn't asked of the server
  ([ADR-0056](0056-cooking-on-the-device.md); REM-010 5).
- **Sending FCM:** `send-notifications` sends by FCM's HTTP v1 API with a
  service account's key kept in Vault, as the VAPID keys are; the Firebase
  project is on the free plan. A token FCM says is gone stops the device,
  as a gone Web Push endpoint does.

## Consequences

- Web Push, its devices and its service worker are untouched; the web
  works exactly as before (AND-005).
- Two new Edge Functions read as a device (`device-reminders`, and
  `device-plan` for the widget, [ADR-0064](0064-the-today-widget.md)),
  each through a private database function that checks the device's
  secret and reads as its person under the one visibility rule
  (`core_private.readable_by`). Removing the device in Settings, or
  signing out there, revokes it.
- A Reminder changed elsewhere while the phone is off reaches it when it's
  back, or on the next look; until then the phone may show one it would
  no longer send. Rare, and the look on opening closes the gap.
- The phone holds the titles of the next week's Reminders in the app's
  private storage.
- Android limits an app to about 500 alarms; 7 days of a person's
  Reminders sit far below it, and the request is capped.
- Android 14 grants full-screen alarms only to alarm and calling apps on
  Play; installed directly, LifeOS asks Joe once to allow them in its
  settings if Android hasn't.
- Schema: the device's secret and its "look again" mark on
  `core.push_devices`, *on device* as a delivery status, `alarm` on
  `core.reminders`; with database tests, in steps 7 and 8.

## As built (6 November, Stage 7 step 7)

- **Firebase project** `lifeos-b2793` (Joe, free plan); the app's
  `android/app/google-services.json` (not a secret: it ships in the APK);
  the service account's key in Vault as `fcm_service_account`, read only
  by `send-notifications` through `core.fcm_service_account()`.
- **Registering:** `core.register_fcm_device` keeps the phone's FCM token as
  an `fcm` device, "Android app"; Settings' Turn on asks Android
  (`POST_NOTIFICATIONS`) and registers it. When the app opens, a token FCM
  has changed since is registered in the old one's place. Signing out
  removes the device and ends the token; someone else signing in ends it.
- **Sending, until step 8:** the minute run still decides what is due for
  the Android app too; `core.claim_deliveries` now says each device's kind,
  and `send-notifications` sends an `fcm` device a high-priority data
  message (collapsed by its delivery) with what Web Push would say, signed
  in to Google as the service account. A 404 or `UNREGISTERED` marks the
  device gone. Setting Reminders on the phone itself, and Alarms, are step
  8; until then Reminders arrive as on the web, within the minute.
- **On the phone:** `LifeosMessagingService` shows each message in the
  Reminders, Morning digest or Overdue group (Alarms made ready for step
  8), the small icon tinted with the Item's Type colour (a `colour` the
  payload now carries; `colors.xml` held to the theme by `tokens:check`), a
  tap opening the Item by its joestables.uk link; Done and Snooze go to
  `notification-action` through WorkManager, so a press with no signal is
  sent when signal returns.

## As built (6 November, Stage 7 step 8a)

- **The device's secret:** made by `core.device_secret` when the app
  turns notifications on (registering directly, not through the write
  queue, as it needs signal anyway); only its SHA-256 is kept. A phone on
  0.1.2 learns its device and secret the next time the app opens.
- **What the phone reads:** `device-reminders` → `core.device_reminders`,
  the device's person's Reminders from 12 hours ago to a week ahead
  (the same rules as the minute run: open, readable, not set in the
  past; at most 400), each with the notification's words.
- **Look again:** statement triggers on `core.reminders` (made, changed,
  deleted) and on `core.items` (done, archived, brought back) mark the
  person's devices; the minute run wakes `send-notifications` for a mark
  as for a delivery, and it sends each a `{ type: 'look' }` data message.
  The phone also fetches when the app opens and once a day.
- **On the phone:** each firing an exact alarm
  (`setExactAndAllowWhileIdle`; `USE_EXACT_ALARM`, or
  `SCHEDULE_EXACT_ALARM` before Android 13), shown at its minute, one up
  to 12 hours late shown at once, none twice; set again after a restart,
  an update or a change of clock from what the phone kept, with no signal.
- **Done and Snooze** for a Reminder the phone set are proved by the
  device's secret, not a signed token per firing as planned: the secret
  already proves the person, so nothing is signed or stored per firing
  (`core.reminder_for_action`, `core.act_on_reminder`, sharing
  `core_private.act_on` with `act_on_delivery`). Snooze with no signal
  also sets the alarm an hour on, on the phone.
- **One notification:** the minute run records an Android app device's
  Reminder as *on device*; only a device with a secret (0.1.3 and later)
  is, so a phone still on 0.1.2 is sent its Reminders as before.
- **A device gets only what comes due after it was turned on**, found
  when Joe turned notifications on in 0.1.2 at 10:34 and was sent the
  09:00 and 10:30 Reminders already delivered to Chrome.
- Alarms, the full-screen screen and a Cooking timer set on the phone
  are step 8b.

## As built (6 November, Stage 7 step 8b)

- **The flag:** `alarm` on `core.reminders`, off by default, set by
  `add_reminder` and `update_reminder` on any device (the Reminder
  dialog's Alarm switch) and carried by a repeated Item's template to each
  occurrence. Web Push's notification is unchanged (REM-011 3).
- **What the phone reads:** `device_reminders` adds `alarm` and the Item's
  Type to each firing; two of an Item's Reminders at one minute are one
  firing, an Alarm if either is.
- **On the phone:** an Alarm is set by `setAlarmClock` (shown as the next
  alarm in the status bar and on the lock screen), and the alarm opens the
  Alarm screen (`AlarmActivity`) itself, over the lock screen or whatever
  is on screen, as the clock's alarm screen does; it rings from there.
  Opened only by the notification's full-screen intent, as first built,
  Android showed it as a notification while the phone was in use (Joe, 0.1.4).
  When it rings,
  `AlarmService`, a foreground service of the `systemExempted` type that
  apps holding `USE_EXACT_ALARM` may run for alarms, plays the phone's
  alarm sound on the alarm stream, looping, and vibrates, and posts the
  Alarms group's notification with a full-screen intent to `AlarmActivity`
  (the AlarmScreen) and Stop, Snooze 1 hour and Done. Stop ends it; Snooze
  and Done go as any other press. As the clock's alarms do, it falls quiet
  after ten minutes and is left as an ordinary notification; one more than
  ten minutes late (the phone was off) is shown as an ordinary one.
- **Full-screen permission:** Android 14 may not allow it to an app
  installed directly; Settings shows "Full-screen alarms · Not allowed ·
  Allow" in the app until it does, opening Android's setting. Without it,
  the Alarm still rings, as a heads-up notification.
- **A Cooking timer's end** (REM-010 5): the page hands the phone every
  running timer whenever one starts, pauses, resumes or stops
  (`setTimers`); each end is an exact alarm, to the second, shown as a
  notification in the Reminders group, and set again after a restart.

