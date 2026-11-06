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

## As built (5 November, Stage 7 step 4)

- Capacitor 8.5.3, `@capacitor/app` 8.1.2 and `@capacitor/browser` 8.0.5
  (the last releases at least two weeks old), pinned. `capacitor.config.ts`
  loads `https://joestables.uk`; its web directory is `native-shell/`,
  holding only the no-connection page and an empty `index.html`, so the
  app carries none of the web's code.
- `android/` is Capacitor's generated project (`uk.joestables.lifeos`),
  committed; what `npx cap sync` copies into it is ignored. The release
  build signs only when the workflow hands it the key's file and
  passwords; its version name is the tag's, its version code the run's
  number.
- A release is started by hand (Actions → Android → Run workflow, with a
  version), which tags `android-v<version>` itself: a cloud session can't
  push tags.
- `src/native/platform.ts` holds `isAndroidApp()`, with a unit test that
  it is false on the web. It reads the bridge Capacitor injects into the
  page (`window.Capacitor`) rather than importing Capacitor, so the web's
  bundle has none; `src/native/app.ts`, which does import it, is loaded
  only when the check is true, as its own chunk (the service worker
  precaches it with every other file, but the web never runs it).

## As built (5 November, step 5)

- The icon: the graph as a vector drawable (its colours, as `icon.svg`'s),
  a one-colour layer for themed icons, and legacy PNGs drawn from
  `public/`; the opening screen is Android's own, the icon on the theme's
  `--background` (`colors.xml`, held to the theme by `tokens:check`).
- Safe areas and the system bars: Capacitor 8's `SystemBars` passes
  Android's insets to the page's `env(safe-area-inset-*)`, which the web
  already uses (`viewport-fit=cover`), and colours the bars' icons for the
  theme; nothing of LifeOS's own.
- Back: an open popup, Sheet or menu (Base UI's `data-open`) is sent
  Escape, so it closes as it would on a computer; otherwise back in
  history; otherwise the app closes.
- Links: an App Links `intent-filter` for `https://joestables.uk`; a link
  opened from another app is navigated to in the page.
- A new APK: the site serves `/android.json` (`{ "version": … }`); when it
  is newer than the app's, the Android app Card in Settings shows Update
  ready, and a toast says so once per version; Install opens the latest
  GitHub release.
- LifeOS's own plugin, `LifeosNativePlugin` (Kotlin 2.2.21, registered in
  `MainActivity.kt`), reached through `src/native/lifeos.ts`; its first
  method keeps the screen on while Cooking where the web view has no
  Screen Wake Lock (`useWakeLock`).
- Text size: the web view's text zoom is pinned to 100% in
  `MainActivity.kt`, as Android otherwise scales the page's text by the
  phone's font size and it read larger than the web app in Chrome (Joe,
  5 November, on 0.1.0). The page's own sizes are the design system's.
