# Integration setup

*Each Integration's steps are written when it is built. Known so far:*

## Supabase Data API

| Where | Setting | State |
|---|---|---|
| Supabase → Project Settings → Data API → Exposed schemas | Add `core`, so the app can read its tables and call its write functions (`core_private` stays hidden) | To do (Joe), before the data layer (plan step 8) |

The local and CI databases expose it through `supabase/config.toml`.

## Google sign-in

Google is how everyone signs up and signs in
([ADR-0039](../20-architecture/adr/0039-accounts-contacts-households.md)).


| Where | Setting | State |
|---|---|---|
| Google Cloud project `lifeos` → OAuth client | Created; client ID and secret entered in Supabase | Done (Joe) |
| … OAuth client → Authorized redirect URIs | `https://nxydbufwuvsacayqoakh.supabase.co/auth/v1/callback` | To check: proved by the first sign-in |
| … Google Auth Platform → Branding | App name `LifeOS`; support email Joe's; **no logo** (uploading one sends the app for verification); authorised domains `nxydbufwuvsacayqoakh.supabase.co` and `lifeos-bice-mu.vercel.app` | Done (Joe) |
| … Branding → App domain | Home page `https://lifeos-bice-mu.vercel.app`; privacy policy `https://lifeos-bice-mu.vercel.app/privacy`. Google requires both before the app can leave Testing | Done (Joe); the pages go live with the app's first deploy (plan step 9a) |
| … Google Auth Platform → Data Access | `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`; nothing else | Done (Joe) |
| … Google Auth Platform → Audience | **In production**, so anyone can sign in. Scopes: `openid`, `email`, `profile` only, which need no verification | Done (Joe) |
| … Verification centre | Optional *brand* verification, so the consent screen says "LifeOS" rather than the Supabase address. Sign-in works without it. Submit only once the home page and privacy page are live | Later |
| Supabase → Authentication → Sign In / Providers → Google | Enabled | Done (Joe) |
| Supabase → Authentication → URL Configuration | Site URL: the production URL. Redirect URLs: the production URL, `http://localhost:5173/**` and the Vercel previews (`https://lifeos-*-joestables1.vercel.app/**`) | Done (Joe) |

Email/password sign-up is blocked in the database, not by a dashboard
setting (Supabase's "allow new users to sign up" switch applies to Google
too): a trigger on `auth.users` refuses any sign-up whose provider is
`email`, unless its address is listed in `core_private.password_accounts`.
Claude adds the smoke-walk test account's address there before it is
created by hand.

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
