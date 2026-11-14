# ADR-0064: The Today widget

**Status:** Provisionally agreed · 2026-11-05 (Joe)

**Amended:** 2026-11-11 by [ADR-0065](0065-reminders-alerts-and-the-day.md) (Stage 7b, step 10a): the cards are Today's list rather than Plan's day (TDY-006 1): overdue Tasks first, then the day from Anytime to Evening, every Type Today shows (Week's hidden Types are Week's alone), a Reminder on each day an Alert of mine falls at its first time that day. `src/lib/today-widget.ts` makes them from `todayList`, and `core.device_plan` from `core_private.today_cards`; `ends` also says when a Reminder's last Alert of the day and a Meal's part of the day are gone (since 14 November the widget mutes no Meal, as Today fades none, and `src/lib/today-widget.ts` gives a Meal none). A change to anything dated before today tells the phone to look, as overdue Tasks and those left from an earlier day are on it. From 0.1.13 the date opens `/today` and "+" `/week?add=1` (TDY-006 2); `/plan?add=1`, which earlier versions open, goes to Week.

## Context

[WID-002](../../10-requirements/cross-cutting/android.md#wid-002--todays-plan-on-the-home-screen)
(agreed 5 November) puts today's Plan on the Android home screen: the
day's cards in Plan's order, its Types and colours, the Types I show on
Plan; a change on the phone within seconds and one made elsewhere within a
minute or two; the last known with no signal; the new day at midnight;
"+" to add as Plan does; no checkboxes. A widget is native Android UI: it
can't run LifeOS's React code, and it updates while the app is closed.

## Decision

- **Jetpack Glance**, in LifeOS's native plugin
  ([ADR-0061](0061-the-android-app.md)): a resizable widget showing the
  date, "+", and a scrolling list of cards (icon, title, time or "All
  day"; done ones struck through, ended ones muted — amended 14 November,
  Joe: done is struck through, never faded) or "Nothing planned".
- **What it shows is kept on the phone**, as today's and tomorrow's cards,
  so it shows without signal and turns to the new day at midnight with
  nothing to fetch.
- **Two sources write it:**
  - **The app**, whenever what's on today or tomorrow changes on the
    phone, hands the native side the cards as Plan works them out
    (`src/lib/plan.ts`, [ADR-0049](0049-plans-read.md)); within seconds,
    offline too.
  - **The server**, for a change made elsewhere: a change to a Schedulable
    Item on today or tomorrow marks the Android devices of everyone who
    can read it, and the minute run sends each a "look again" data message
    (as for Reminders, [ADR-0063](0063-notifications-on-the-android-app.md));
    the native side asks `device-plan`, with the device's secret, for the
    two days' cards.
  
  A refresh every 30 minutes (the least Android allows) and on opening
  the app catch anything missed.
- **`device-plan` reads as `core.plan_items` does** for the device's
  person: the same Items, days and hidden Types (`core.people`), through a
  private function that checks the secret and the visibility rule, and
  orders the cards by Plan's rules, so the widget orders nothing itself.
  Database tests check its order against Plan's examples (PLN-001, PLN-008).
- **Taps open the app** on a path: a card on its Item's (ITM-001), the
  date on `/plan` today, "+" on `/plan` today with its "+" pressed
  (PLN-006).
- **The design system's tokens and icons, generated for Android**: the
  colours a widget uses (Type colours, text, surfaces; dark and light) and
  the Types' Lucide icons are written into Android's resources from
  `tokens.md`'s values and `TYPE_ICONS`, and `tokens:check` fails if they
  drift. A Widgets section in the design system comes first (step 3).

## Consequences

- Plan's order is written twice, in TypeScript on the device and in SQL
  for `device-plan`, as `core.plan_items` already repeats Plan's days.
  Database tests hold the SQL to the spec; a change to Plan's order
  changes both, in the same pull request.
- "Look again" messages for the widget and for Reminders share one mark
  per device, so a busy minute sends one message.
- A card's text is Plan's own; the widget adds no detail (an Event's
  place, a due date) to keep it to a glance.

## As built (6 November, Stage 7 step 10)

- **Glance 1.1.1** (`TodayWidget.kt`), with Compose's compiler plugin for
  Kotlin 2.2.21. What it shows is kept as JSON on the phone
  (`PlanStore.kt`), read each time it draws, with a stamp in its Glance
  state bumped whenever they change so a running widget redraws: each day's cards as `src/lib/today-widget.ts` makes
  them (id, Type, colour, title, Plan's time, done, when an Event ends);
  `core.device_plan` answers the same shape, and its database tests use
  the unit tests' examples.
- **Written by the app** (`TodayWidgetFeed`, mounted in the app only)
  whenever the two days' cards change on the phone; **fetched** from
  `device-plan` with the Reminders, by the same worker, on a look, on
  opening, at midnight and with Android's half-hourly update. The look
  shares the Reminders' mark: statement triggers on `core.items` (made,
  changed or deleted near today, for everyone who can read it) and on
  `core.people` (the Types shown on Plan, or the timezone).
- **Taps** open joestables.uk links in the app: a card `/item/<id>`, the
  date `/plan`, "+" `/plan?add=1`: Plan with its own "+" open on today,
  whether or not Plan was already open. An Add list on the widget itself
  was tried (0.1.8–0.1.10, Joe, 7 November): a Glance callback flipping it
  in the widget's Glance state, the Types handed over by the app, first as
  a scrolling list, then as a grid; on Joe's phone it never showed its
  Types, so, as he chose, "+" went back to opening Plan's (0.1.11). A link that opens the app from closed goes
  to its page as a notification's tap does, by the `appUrlOpen` Capacitor
  keeps for the page; not by its launch URL as well, which made it go
  twice and again on every reload (0.1.12).
- **Within what a widget can draw:** a done or ended card's text and icon
  are muted and struck through, as Android widgets can't fade by opacity;
  the hairline edge is a 1dp ring of `--hairline` behind the card fill;
  LifeOS's font (Joe, 6 November): the date and notes as small TextView
  layouts (`res/layout/widget_*.xml`) through Glance's `AndroidRemoteViews`,
  as Glance draws text only in the phone's fonts; inside the scrolling list,
  where those layouts don't show (0.1.9's Add list was empty), the words
  are drawn as pictures in the font at the phone's density
  (`WidgetText.kt`), cut to the room they have, in white, tinted where
  they show by the theme's colour, so they follow the phone from dark to
  light. The day is the phone's. A card's title is the
  Item's title, else its first line of body as written.
- Signed out (no device), it says "Sign in to LifeOS" and opens the app.

