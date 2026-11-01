# Integration setup

*Each Integration's steps are written when it is built. Known so far:*

## Supabase Data API

| Where | Setting | State |
|---|---|---|
| Supabase → Project Settings → Data API → Exposed schemas | Add `core`, so the app can read its tables and call its write functions (`core_private` stays hidden) | Done (Joe), 10 October |
| Supabase → Project Settings → Data API → Exposed schemas | Add `food` (Stage 4), for the same reason (`food_private` stays hidden); needed before the Recipes page reads its data (plan step 5) | Done (Joe), 19 October |
| Supabase → Project Settings → Data API → Exposed schemas | Add `shopping` (Stage 4b), for the same reason (`shopping_private` stays hidden); needed before the Shopping page reads its data (plan step 5) | Done (Joe), 24 October |
| Supabase → Project Settings → Data API → Exposed schemas | Add `fitness` (Stage 5), for the same reason (`fitness_private` stays hidden); needed before the Gym reads its data (plan step 6) | Done (Joe), 1 November |

The local and CI databases expose it through `supabase/config.toml`.

## The address: joestables.uk

| Where | Setting | State |
|---|---|---|
| Cloudflare DNS for `joestables.uk` | An A record for the apex and a CNAME for `www`, both to Vercel (v1's, kept as they were) | Done |
| Vercel → project `life-os` (v1) → Settings → Domains | Remove `joestables.uk` and `www.joestables.uk`: a domain is on one project at a time, and the Vercel tools Claude has can add one but not remove it | Done (Joe, 25 October) |
| Vercel → project `lifeos` → Domains | `joestables.uk`, and `www.joestables.uk` redirecting to it (308) | Done (Claude, 25 October): both verified, the site and its manifest served |

## Sharing into LifeOS

| Where | Setting | State |
|---|---|---|
| Android | Install LifeOS from Chrome (menu → Add to Home screen → Install); it then shows as "LifeOS" in the share sheet. An install made before 25 October needs installing again to pick up the share target | To do (Joe) |
| iPhone | The Shortcut below | To do (Joe) |

### iOS Shortcut: Save to LifeOS

An iPhone can't offer a web app in its share sheet, so a Shortcut opens New
idea with the link ([ADR-0055](../20-architecture/adr/0055-sharing-into-lifeos.md)):

1. In Shortcuts, make a new Shortcut named **Save to LifeOS**.
2. In its details, turn on **Show in Share Sheet**, receiving **URLs**,
   **Safari web pages** and **Text**.
3. Add **URL Encode**, encoding the **Shortcut Input**.
4. Add **Open URLs** with
   `https://joestables.uk/recipes?tab=ideas&share=` followed by
   the **URL Encoded Text**.

It opens in Safari, so sign in to LifeOS in Safari once.

## Google sign-in

Google is how everyone signs up and signs in
([ADR-0039](../20-architecture/adr/0039-accounts-contacts-households.md)).


| Where | Setting | State |
|---|---|---|
| Google Cloud project `lifeos` → OAuth client | Created; client ID and secret entered in Supabase | Done (Joe) |
| … OAuth client → Authorized redirect URIs | `https://nxydbufwuvsacayqoakh.supabase.co/auth/v1/callback`, exactly | The first sign-in (10 October) reached Google and was refused ("this app's request is invalid"), the usual sign of a missing or mistyped redirect URI: to check (Joe) |
| … Google Auth Platform → Branding | App name `LifeOS`; support email Joe's; **no logo** (uploading one sends the app for verification); authorised domains `nxydbufwuvsacayqoakh.supabase.co`, `joestables.uk` and `lifeos-bice-mu.vercel.app` | Done (Joe; `joestables.uk` added 25 October) |
| … Branding → App domain | Home page `https://joestables.uk`; privacy policy `https://joestables.uk/privacy` (until 25 October the `lifeos-bice-mu.vercel.app` ones). Google requires both before the app can leave Testing | Done (Joe); the pages go live with the app's first deploy (plan step 9a) |
| … Google Auth Platform → Data Access | `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`; nothing else | Done (Joe) |
| … Google Auth Platform → Audience | **In production**, so anyone can sign in. Scopes: `openid`, `email`, `profile` only, which need no verification | Done (Joe) |
| … Verification centre | Optional *brand* verification, so the consent screen says "LifeOS" rather than the Supabase address. Sign-in works without it. Submit only once the home page and privacy page are live | Later |
| Supabase → Authentication → Sign In / Providers → Google | Enabled | Done (Joe) |
| Supabase → Authentication → URL Configuration | Site URL `https://joestables.uk`. Redirect URLs: `https://joestables.uk/**`, `https://www.joestables.uk/**`, `https://lifeos-bice-mu.vercel.app/**`, `https://lifeos-*-joestables1.vercel.app/**` (previews) and `http://localhost:5173/**`. A sign-in whose return address isn't listed goes to the Site URL instead | Done (Joe, 10 October; `joestables.uk` on 25 October). Before that, the Site URL was `http://joestables.uk` (v1's site) and production wasn't listed, so signing in on production landed there |

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
| Supabase → Edge Functions → Secrets (optional) | `AI_MODEL` and `AI_FALLBACK_MODEL` (Google's `gemini-flash-lite-latest` and `gemini-flash-latest` aliases when unset); `AI_DAILY_ALLOWANCE` (30 uses per person a day when unset); `AI_OFF=1` turns the AI off | Unset: the defaults hold |

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
