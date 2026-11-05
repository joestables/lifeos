# ADR-0056: Cooking on the device

**Status:** Provisionally agreed · 2026-10-18

**Amended:** 2026-11-05 by [ADR-0063](0063-notifications-on-the-android-app.md) (in the Android app, a timer's end is set on the phone, to the second, and not asked of the server).

## Context

Cooking keeps the screen awake, offers a timer on a step that names a time,
and is still there after leaving the page
([RCP-011](../../10-requirements/modules/recipes.md#rcp-011--cooking)).

## Decision

- **The screen stays awake** with the Screen Wake Lock API, asked for again
  whenever the page is shown, since the browser lets it go when hidden.
  Chrome on Android supports it; on an iPhone's home-screen app it is
  reliable only from iOS 18.4.
- **Cooking is kept on the device**: the Variation, the servings, and any
  timers, so leaving and coming back finds it as it was.
- **Timers come from the step's words** ("simmer for 20 minutes", "10-15
  mins", taking the lower end), parsed by `packages/food`
  ([ADR-0053](0053-quantities-and-units.md)). The countdown runs on the
  device, to the second.
- **The alert when it ends** sounds on the page when it's open. So that it
  isn't missed with the screen on another app, starting a timer also asks
  the server for a one-off notification at its end, sent by the Reminder
  run within the minute ([ADR-0044](0044-reminder-delivery.md)); stopping
  the timer or finishing Cooking cancels it.

## Consequences

- Without signal the notification can't be scheduled; the on-page alert
  still sounds while the page is open.
- Nothing here needs AI.
