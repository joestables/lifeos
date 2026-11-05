# Plan: Stage 7 — the Android app and widgets

**Outcome** ([roadmap](../../roadmap.md)): LifeOS is installed on Joe's
Android phone as an app, loading the live site. It has two home-screen
widgets, **Capture a thought** and **Today** (the day's Plan);
notifications through Firebase Cloud Messaging (FCM) with Done and
Snooze; Reminders on time to the minute even when the phone is idle, and
Alarms that ring; and LifeOS in the share sheet. Phone alarms can go. **The
web version is unchanged:** a computer, an iPhone and an installed web app
on Android work exactly as they do now, and every browser test still
passes.

**State:** started 5 November 2026. Joe asked for it after the Gym was
complete (Stage 5's step 11). He wants it before Wardrobe (Stage 6), and
before the rest of Stage 5 (Goals and the measures registry) and Stage
4b's last steps. The plan was written after a feasibility talk with Joe
that day ([what it found](#what-the-feasibility-talk-found)). Joe answered
its questions the same day ([his answers](#joes-answers-5-november)), and
step 1's spec is drafted for his agreement:
[the Android app](../../10-requirements/cross-cutting/android.md) (AND-001–005,
WID-001–002) and [reminders](../../10-requirements/cross-cutting/reminders.md)
REM-010–011, with three open points.

## Steps

Steps marked **Joe** need Joe's go-ahead or action before Claude does them.
Every step that builds a screen follows the [design system](../../30-design/README.md)
checklist. **The web must not break.** Every step runs `npm run check`,
`npm run build` and the browser and screenshot tests unchanged. Code used
only by the Android app sits behind one check (running in the Android app
or not), and its web side keeps doing what it does today. Native code is
checked by hand on Joe's phone, because the browser tests can't reach it.

| # | Step | State | Produces |
|---|---|---|---|
| 1 | **Joe** — specs: the Android app (installing and updating; signing in and connecting Google Calendar; Back, links and offline; sharing in; the web unchanged); notifications on Android by FCM, on time, and Alarms ([reminders](../../10-requirements/cross-cutting/reminders.md) amended); the two widgets | Drafted 5 November from Joe's answers: [the Android app](../../10-requirements/cross-cutting/android.md) (AND-001–005, WID-001–002, three open points), REM-001 4, REM-010–011, RCP-003 5; Health Connect moved to Stage 8 and the Thought widget from Stage 10 across the roadmap, capability map, capture spec, ADR-0028, integrations and overview. For Joe to agree | Specs (AND-*, WID-*, REM-010–011) |
| 2 | Decisions: the Android app (Capacitor; loading the live site (Joe, 5 November); the web first-class; native code behind one check in `src/native/`; installed as an APK, not from Play; the signing key; built by CI); sign-in through the system browser and back by a link into the app (Supabase's PKCE flow); FCM as a kind of device in `core.push_devices`, sent by `send-notifications` ([ADR-0044](../../20-architecture/adr/0044-reminder-delivery.md) amended); exact alarms set on the phone from an FCM data message and checked again whenever the app opens; widgets (Jetpack Glance; the app writes what they show to the phone's own storage; when they refresh); [ADR-0034](../../20-architecture/adr/0034-stack.md), [ADR-0055](../../20-architecture/adr/0055-sharing-into-lifeos.md) and the [overview](../../20-architecture/overview.md#platforms) amended | — | ADRs |
| 3 | **Joe** — design, with Claude design: each widget at its sizes, dark and light; the notification's look and buttons; the app icon as Android masks it and the opening screen. Into the design spec first: a **Widgets** section (components and patterns) and the tokens a widget uses, copied into Android's resources and kept in step by `tokens:check` | — | [design system](../../30-design/README.md) |
| 4 | Toolchain: Capacitor added (`capacitor.config.ts`, `android/`); `src/native/` with the one check; a GitHub workflow that builds a signed APK when asked, not on every pull request, to save Actions minutes; the Android SDK in the cloud environment's setup script if a session can build there; the signing key made and kept as a GitHub secret (**Joe** adds it). The workflow is checked to build. | — | Config, CI |
| 5 | The app runs: the live site or the bundle (step 2's choice), offline as the web app is, the back button, links opening in the app, status bar and safe areas, the opening screen. **Joe** installs it ([integration setup](../../40-operations/integration-setup.md)) | — | Code |
| 6 | Sign-in and Google Calendar: both open the system browser and come back to the app by a link; the Android client in Google Cloud and the link added to Supabase's redirect list (**Joe**, in the dashboards, if no tool can) | — | Code, integration setup |
| 7 | Notifications by FCM: the Firebase project (free; **Joe** makes it, or Claude walks him through it); its sending key in Vault; an FCM device kind (migration, database tests); `send-notifications` sends to FCM devices as well as Web Push ones; Done and Snooze as native actions calling `notification-action`; turning notifications on in the Android app's Settings. The web keeps Web Push | — | Migration, Edge Function, code |
| 8 | Reminders on time and Alarms (REM-010–011): `USE_EXACT_ALARM`; an FCM data message sets or moves the phone's copy when a Reminder is made, changed, snoozed or deleted; all of them checked again when the app opens; one notification, not two; Alarm on a Reminder (a column, migration, database tests; the popup's switch, on the web too), ringing over the lock screen until stopped; a Cooking timer's end ([ADR-0056](../../20-architecture/adr/0056-cooking-on-the-device.md)) too | — | Migration, code, Edge Function |
| 9 | Sharing into LifeOS from the Android app: Android's share handler sends what was shared to the same code as `/share`, keeping a recipe Idea at once ([ADR-0055](../../20-architecture/adr/0055-sharing-into-lifeos.md)) | — | Code |
| 10 | The Capture a thought widget (WID-001): a bar on the home screen opening the app's own capture with the keyboard up, back to the home screen once saved | — | Native code, code |
| 11 | The Today widget (WID-002): the app keeps today's Plan on the phone whenever it changes, and an FCM message says when it changed elsewhere; the day's cards in Plan's order, its Types and colours, scrolling, sized by Joe; a card opens its Item, the date opens Plan; the new day at midnight | — | Native code, code, Edge Function |
| 12 | **Joe** — uses the Android app daily; what he trips over is fixed | — | Code, tests |

Each step's code goes into the specs' status as it lands (*built*, then
*verified*: by a test citing the ID where a test can reach it, by Joe on
his phone where it can't).

## Joe's answers (5 November)

To the five questions asked with the plan, each with Claude's
recommendation:

1. **The live site or a bundle:** the live site. Every deploy reaches the
   phone at once; the Android-only code is checked on the phone before a
   release that touches it.
2. **What counts as an alarm:** as recommended. Every Reminder arrives on
   time on the Android app, and a Reminder marked **Alarm** rings until
   stopped, over the lock screen
   ([REM-011](../../10-requirements/cross-cutting/reminders.md#rem-011--an-alarm)).
3. **Widgets:** no Recovery widget. Two only: **Capture a thought**
   (moved from Stage 10) and **Today**, the day's Plan.
4. **Health Connect:** moved to Stage 8, with Cardio.
5. **The order:** Stage 7 now, before Wardrobe (Stage 6), Goals and the
   measures registry (Stage 5's step 12) and Stage 4b's last steps.

## What the feasibility talk found

Joe asked on 5 November whether widgets and an Android app were possible,
whether the web version would be affected, and what it would cost.

- **Widgets need the Android app.** An installed web app can't put a
  widget on an Android home screen (Chrome offers web-app widgets only on
  Windows). A widget is native Android UI, so it can't run the React
  code: the app hands it what it shows.
- **Capacitor, as ADR-0034 planned.** It runs LifeOS's own code inside an
  Android app, with plugins for native features. A Trusted Web Activity
  would give the app but no shared storage for widgets and no alarms. A
  native rewrite would throw away the code and the one design system.
- **The web is unchanged.** Desktop, the iPhone, and the installed web app
  keep the website, its manifest, its service worker and Web Push. Only
  the Android app takes different routes, in four places:
  - sign-in and connecting Google Calendar (Google blocks sign-in inside
    an app's web view, so both go through the system browser);
  - notifications (Web Push doesn't work in the web view, so FCM);
  - sharing in (Android's share handler, not the manifest's);
  - widgets and alarms, which only the Android app has.
  
  On Android, Joe uses the app in place of the installed web app, so
  shares and notifications don't arrive twice.
- **No costs.** FCM, Firebase's free plan, Capacitor, Android Studio and
  its SDK, Jetpack Glance and Health Connect are free. The APK is
  installed directly, so no Play account is needed. Android's developer
  verification reaches the UK in 2027, and its free hobbyist account
  (up to 20 devices) covers it. `send-notifications` stays inside
  Supabase's free tier. GitHub Actions minutes are the one thing to
  watch, hence building the APK only when asked.
- **The stack fits.** Vite, React, TanStack, Base UI, Tiptap, IndexedDB,
  the write queue and every package run unchanged in Android's web view,
  which uses the same Chrome engine. Keeping the screen awake while
  Cooking is to check on the phone, with a plugin if needed.
