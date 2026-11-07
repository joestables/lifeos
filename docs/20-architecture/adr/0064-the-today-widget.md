# ADR-0064: The Today widget

**Status:** Provisionally agreed · 2026-11-05 (Joe)

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
  day"; done ones faded and struck through) or "Nothing planned".
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
  date `/plan`. "+" shows the Add list on the widget itself (Joe, 7
  November: a Glance callback flips it in the widget's own Glance state,
  read as it draws, as a widget still running doesn't run its setup again;
  kept in the app's own storage at first, a tap changed nothing on Joe's
  phone), its Types
  handed over by the app with the cards (`plannedTypes`, as Plan's "+"),
  each opening `/plan?add=<type>`: Plan opens that Type's new popup on
  today, whether or not Plan was already open, and the widget closes its
  list. Before the app has given its Types, "+" opens `/plan?add=1`,
  Plan's own "+". A link that opens the app from closed now
  goes to its page too (Capacitor's launch URL), as a notification's tap
  does.
- **Within what a widget can draw:** a done or ended card's text and icon
  are muted and struck through, as Android widgets can't fade by opacity;
  the hairline edge is a 1dp ring of `--hairline` behind the card fill;
  LifeOS's font (Joe, 6 November): the date and notes as small TextView
  layouts (`res/layout/widget_*.xml`) through Glance's `AndroidRemoteViews`,
  as Glance draws text only in the phone's fonts; inside the scrolling list,
  where those layouts don't show (0.1.9's Add list was empty), the words
  are drawn as pictures in the font at the phone's density
  (`WidgetText.kt`), cut to the room they have. The Add list is a grid of
  Types two to a row rather than a scrolling list. The day is the phone's. A card's title is the
  Item's title, else its first line of body as written.
- Signed out (no device), it says "Sign in to LifeOS" and opens the app.

