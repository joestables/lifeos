# ADR-0061: The Android app

**Status:** Provisionally agreed · 2026-11-05 (Joe)

## Context

Joe wants LifeOS as an app on his Android phone, for what an installed web
app can't do: Reminders on time and Alarms, and a home-screen widget
([the Android app](../../10-requirements/cross-cutting/android.md),
AND-001–005, agreed 5 November). [ADR-0034](0034-stack.md) planned
Capacitor for this. Joe chose to load the live site (5 November), and the
web must not change (AND-005). He installs the app himself; Google Play
isn't needed.

## Decision

- **Capacitor**, current major version (8), in `android/` beside the web
  app. The app id is `uk.joestables.lifeos`, and it is called LifeOS.
- **It loads the live site.** `server.url` is `https://joestables.uk`, so
  every deploy reaches the phone, and the service worker keeps it working
  offline as the installed web app does. A small page bundled in the app
  (`server.errorPath`) says there's no connection when the very first
  launch has no signal.
- **The web never runs the Android app's code.** One check,
  `isAndroidApp()` in `src/native/`, decides; everything native is reached
  only through `src/native/`, and its plugins are imported only inside the
  app, so the web's bundle and behaviour are unchanged. Where the two
  differ (sign-in, notifications, sharing in, keeping the screen awake),
  the web's path is the existing code, untouched.
- **LifeOS's own native code, as one small Capacitor plugin**
  (`LifeosNative`, Kotlin, in `android/`), for what no plugin does as
  needed: FCM messages handled while the app is closed, exact alarms and
  Alarms ([ADR-0063](0063-notifications-on-the-android-app.md)), the widget
  ([ADR-0064](0064-the-today-widget.md)), sharing in, and keeping the
  screen awake. Capacitor's own `@capacitor/app` and `@capacitor/browser`
  handle Back, links into the app and the sign-in browser.
- **Sharing in** ([AND-004](../../10-requirements/cross-cutting/android.md#and-004--share-into-lifeos-from-the-app)):
  the app's activity takes Android's `SEND` of text, and opens `/share`
  with the title, text and link, as the manifest's share target does on
  the web ([ADR-0055](0055-sharing-into-lifeos.md)); everything after that
  is the same code.
- **Back** goes back in the app's history, which closes a popup, Sheet or
  menu first; from the first page it leaves the app.
- **Links into the app:** `https://joestables.uk` links open in the app,
  through Android App Links, verified by `/.well-known/assetlinks.json` on
  the site (the app's signing certificate's fingerprint, not a secret).
- **Keeping the screen awake while Cooking:** the web's Screen Wake Lock
  where the web view has it, else the plugin keeps the screen on while the
  page asks.
- **Installed as an APK, not from Play.** A GitHub workflow builds it,
  signed with LifeOS's key: by hand or on an `android-v*` tag, attaching
  it to a GitHub release, and checking a debug build on pull requests that
  touch `android/` or `src/native/`, so Actions minutes go only where
  needed. The signing key is made once by Joe, kept in his password
  manager and as Actions secrets; it never enters the repository. Android's
  developer verification reaches the UK in 2027; its free hobbyist
  account covers LifeOS then.
- **Telling Joe about a new APK** (AND-001 2): the site serves the native
  version it expects (`/android.json`); when the app's is older, it says a
  new version is ready, linking to the release. A change to the web code
  alone needs none.

## Consequences

- Capacitor treats `server.url` as a development setting, and Play would
  refuse it; neither matters for an app Joe installs himself. A deploy
  reaches Android and the web together, so a change touching the Android
  app's code is checked on the phone before it is merged.
- Native code can't be reached by the browser tests. Its logic that can
  be tested without a phone has Kotlin unit tests, run by the workflow;
  the rest is checked by Joe on his phone, and the spec's statuses say
  which.
- Claude's cloud sessions don't build the APK (no Android SDK there); the
  workflow does, and its result is read from the pull request.
- Losing the signing key means installing the app afresh, losing only
  what the phone hadn't sent.
- On Joe's phone the app takes the installed web app's place, so a share
  or a notification doesn't arrive twice.
