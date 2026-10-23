# Integration setup

*Each Integration's steps are written when it is built. Known so far:*

## Supabase Data API

| Where | Setting | State |
|---|---|---|
| Supabase → Project Settings → Data API → Exposed schemas | Add `core`, so the app can read its tables and call its write functions (`core_private` stays hidden) | Done (Joe), 10 October |
| Supabase → Project Settings → Data API → Exposed schemas | Add `food` (Stage 4), for the same reason (`food_private` stays hidden); needed before the Recipes page reads its data (plan step 5) | Done (Joe), 19 October |

The local and CI databases expose it through `supabase/config.toml`.

## Google sign-in

Google is how everyone signs up and signs in
([ADR-0039](../20-architecture/adr/0039-accounts-contacts-households.md)).


| Where | Setting | State |
|---|---|---|
| Google Cloud project `lifeos` → OAuth client | Created; client ID and secret entered in Supabase | Done (Joe) |
| … OAuth client → Authorized redirect URIs | `https://nxydbufwuvsacayqoakh.supabase.co/auth/v1/callback`, exactly | The first sign-in (10 October) reached Google and was refused ("this app's request is invalid"), the usual sign of a missing or mistyped redirect URI: to check (Joe) |
| … Google Auth Platform → Branding | App name `LifeOS`; support email Joe's; **no logo** (uploading one sends the app for verification); authorised domains `nxydbufwuvsacayqoakh.supabase.co` and `lifeos-bice-mu.vercel.app` | Done (Joe) |
| … Branding → App domain | Home page `https://lifeos-bice-mu.vercel.app`; privacy policy `https://lifeos-bice-mu.vercel.app/privacy`. Google requires both before the app can leave Testing | Done (Joe); the pages go live with the app's first deploy (plan step 9a) |
| … Google Auth Platform → Data Access | `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`; nothing else | Done (Joe) |
| … Google Auth Platform → Audience | **In production**, so anyone can sign in. Scopes: `openid`, `email`, `profile` only, which need no verification | Done (Joe) |
| … Verification centre | Optional *brand* verification, so the consent screen says "LifeOS" rather than the Supabase address. Sign-in works without it. Submit only once the home page and privacy page are live | Later |
| Supabase → Authentication → Sign In / Providers → Google | Enabled | Done (Joe) |
| Supabase → Authentication → URL Configuration | Site URL `https://lifeos-bice-mu.vercel.app`. Redirect URLs: `https://lifeos-bice-mu.vercel.app/**`, `https://lifeos-*-joestables1.vercel.app/**` (previews) and `http://localhost:5173/**`. A sign-in whose return address isn't listed goes to the Site URL instead | Done (Joe, 10 October). Before that, the Site URL was `http://joestables.uk` (v1's site) and production wasn't listed, so signing in on production landed there |

Email/password sign-up is blocked in the database, not by a dashboard
setting (Supabase's "allow new users to sign up" switch applies to Google
too): a trigger on `auth.users` refuses any sign-up whose provider is
`email`, unless its address is listed in `core_private.password_accounts`.
Claude adds the smoke-walk test account's address there before it is
created by hand.

## Web Push

New VAPID keys for v2
([ADR-0044](../20-architecture/adr/0044-reminder-delivery.md), Provisionally
agreed), made by `send-notifications` the first time it runs and kept in
Vault (`vapid_public_key`, `vapid_private_key`), so the private key is never
copied anywhere. The app reads the public key from the database
(`core.vapid_public_key`) when a device turns notifications on, so it needs
no build setting. The secret the minute job sends to the function is kept
only in Vault (`push_secret`), and the function asks the database whether a
call carries it. Nothing is typed into a dashboard. Changing the keys means
every device turns notifications on again.

## Google Calendar (Stage 3)

- Publish the Google app to **Production, unverified** (a warning screen,
  fine under 100 users); in *Testing* mode refresh tokens expire after 7
  days.
- Request `calendar.calendarlist.readonly` (listing my calendars) and
  `calendar.events` only ([ADR-0047](../20-architecture/adr/0047-google-calendar-sync.md)).
  Both are sensitive: an unverified app shows a warning screen and is
  capped at 100 users over the project's life.
- The sync level, incoming only or two-way, is chosen in LifeOS, not here.
- Connecting Calendar is a separate OAuth flow run by an Edge Function;
  tokens are kept server-side in Vault.

| Where | Setting | State |
|---|---|---|
| Google Cloud project `lifeos` → APIs & Services → Library | **Google Calendar API** enabled | Done (Joe, 16 October) |
| … Google Auth Platform → Data Access | Add `.../auth/calendar.calendarlist.readonly` and `.../auth/calendar.events`, beside the sign-in scopes | Done (Joe, 16 October) |
| … Google Auth Platform → Audience | Stays **In production** (unverified); nothing to change | Done |
| … Clients → the existing web client → Authorized redirect URIs | Add `https://nxydbufwuvsacayqoakh.supabase.co/functions/v1/calendar-callback`, exactly, beside the sign-in one | Done (Joe, 16 October) |
| Supabase → Edge Functions → Secrets | `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: the same web client's ID and secret | Done (Joe, 16 October); Claude never sees the secret. The client ID was checked as set from the function itself |

## Gemini (Stage 4)

- Gemini's **free tier only**: LifeOS never pays for AI
  ([ADR-0054](../20-architecture/adr/0054-the-ai-service-and-import.md)).
  The key's project must have **no billing linked**, or all of its use is
  charged.
- Only the `ai` Edge Function holds the key; the browser never sees it.
- On the free tier Google may use what is sent to improve its products, so
  `ai` sends public recipe pages, Pantry names and my lists' names, and a
  Variation's method only when I choose Fill from method.

| Where | Setting | State |
|---|---|---|
| Google AI Studio → Get API key | A key in a project with no billing | To do (Joe, before step 9) |
| Supabase → Edge Functions → Secrets | `GEMINI_API_KEY`: that key | Done (Joe, 23 October); Claude never sees it |
| Supabase → Edge Functions → Secrets (optional) | `AI_MODEL` and `AI_FALLBACK_MODEL` (Google's `gemini-flash-latest` and `gemini-flash-lite-latest` aliases when unset); `AI_DAILY_ALLOWANCE` (30 uses per person a day when unset); `AI_OFF=1` turns the AI off | Unset: the defaults hold |

## Capture address email (after Stage 9)

An inbound-email service in front of the capture address, chosen when
capture from outside the app is built
([ADR-0028](../20-architecture/adr/0028-capture-from-outside-the-app.md)):
Cloudflare Email Routing with an Email Worker (free; needs the domain's DNS
on Cloudflare) or Postmark's inbound webhook.

## Oura (Stage 8)

OAuth only; new apps are limited to 10 users; Gen3+ rings need an active Oura
Membership. Re-check before Stage 8.

## Health Connect (Stage 7–8)

Through the Android wrapper (e.g. `@capgo/capacitor-health`).

See [integrations](../10-requirements/cross-cutting/integrations.md) for
sources.
