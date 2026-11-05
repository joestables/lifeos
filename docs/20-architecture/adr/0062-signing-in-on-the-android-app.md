# ADR-0062: Signing in on the Android app

**Status:** Provisionally agreed · 2026-11-05 (Joe)

## Context

Google refuses sign-in inside an app's web view, so the Android app
([ADR-0061](0061-the-android-app.md)) can't sign in the way the web does
(`signInWithOAuth`, returning to the page). Connecting Google Calendar
([ADR-0047](0047-google-calendar-sync.md)) is a Google sign-in too, run by
`calendar-connect` and `calendar-callback`, returning to an allowed
address ([AND-002](../../10-requirements/cross-cutting/android.md#and-002--sign-in-and-connect-google-calendar)).
The web must not change (AND-005).

## Decision

- **Through the phone's browser and back.** In the Android app, Sign in
  with Google asks Supabase for Google's address without leaving the page
  (`skipBrowserRedirect`), opens it in a Custom Tab (`@capacitor/browser`),
  and Google returns to `uk.joestables.lifeos://auth/callback`, which
  Android hands to the app. The app closes the tab and finishes sign-in in
  its own page.
- **PKCE in the app only.** The app's Supabase client uses the PKCE flow,
  so what comes back is a one-time code, exchanged by the page that holds
  its verifier; the web's client keeps its flow as it is.
- **Connecting Google Calendar** opens `calendar-connect`'s address in the
  same Custom Tab, with `uk.joestables.lifeos://settings` as where to
  return; `calendar-callback` allows that address beside the site's, and
  the app opens Settings with the outcome, as the web does.
- **Cancelling** (closing the tab) leaves the app where it was.
- **Setup:** `uk.joestables.lifeos://auth/callback` added to Supabase
  Auth's redirect addresses ([integration setup](../../40-operations/integration-setup.md)).
  No Android client is needed in Google Cloud: the sign-in is still the web
  client's, in a browser.

## Consequences

- A custom scheme, not an App Link, brings the browser back: Chrome hands a
  custom scheme to its app reliably, while a redirect to an `https` link
  can stay in the tab.
- Another app could claim the same scheme, but PKCE means a code caught
  that way is useless without the verifier, which never leaves the app.
- `calendar-callback`'s allowed returns gain one address; its database
  tests and the runbook follow.
