# Integration setup

*Each Integration's steps are written when it is built. Known so far:*

## Google sign-in

The existing Google sign-in client is reused; its redirect URL changes to the
v2 project's.

## Web Push

New VAPID keys for v2.

## Google Calendar (Stage 3)

- Publish the Google app to **Production, unverified** (a warning screen,
  fine under 100 users); in *Testing* mode refresh tokens expire after 7
  days.
- Request `calendar.events` only.
- Connecting Calendar is a separate OAuth flow run by an Edge Function;
  tokens are kept server-side in Vault.

## Capture address email (Stage 2)

An inbound-email service in front of the capture address (Cloudflare Email
Routing, Postmark or Mailgun inbound), chosen in Stage 2.

## Oura (Stage 8)

OAuth only; new apps are limited to 10 users; Gen3+ rings need an active Oura
Membership. Re-check before Stage 8.

## Health Connect (Stage 7–8)

Through the Android wrapper (e.g. `@capgo/capacitor-health`).

See [integrations](../10-requirements/cross-cutting/integrations.md) for
sources.
