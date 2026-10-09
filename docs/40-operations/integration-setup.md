# Integration setup

*Each Integration's steps are written when it is built. Known so far:*

## Google sign-in

Google is how everyone signs up and signs in
([ADR-0039](../20-architecture/adr/0039-accounts-contacts-households.md)).


| Where | Setting | State |
|---|---|---|
| Google Cloud project `lifeos` → OAuth client | Created; client ID and secret entered in Supabase | Done (Joe) |
| … OAuth client → Authorized redirect URIs | `https://nxydbufwuvsacayqoakh.supabase.co/auth/v1/callback` | To check (Joe) |
| … Google Auth Platform → Branding | App name `LifeOS`; support email Joe's; **no logo** (uploading one sends the app for verification); authorised domain `nxydbufwuvsacayqoakh.supabase.co` | To check (Joe) |
| … Google Auth Platform → Audience | **In production**, so anyone can sign in (Testing allows only listed test users). Scopes: `openid`, `email`, `profile` only, which need no verification | To check (Joe) |
| Supabase → Authentication → Sign In / Providers → Google | Enabled | Done (Joe) |
| Supabase → Authentication → URL Configuration | Site URL: the production URL. Redirect URLs: the production URL, `http://localhost:5173/**` and the Vercel previews (`https://lifeos-*-joestables1.vercel.app/**`) | Done (Joe) |

Email/password sign-up is blocked as part of building ACC-001, not by a
dashboard setting: Supabase's "allow new users to sign up" switch applies to
Google too.

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
