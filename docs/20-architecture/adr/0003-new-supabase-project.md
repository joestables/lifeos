# ADR-0003: A new Supabase project

**Status:** Provisionally agreed · 2026-10-09

**Amended:** 2026-10-09 by [ADR-0039](0039-accounts-contacts-households.md) (open sign-up with Google).

## Context

The free tier allows two *active* projects (currently *JoeStables LifeOS* and
*doorbell*); paused projects don't count. Building beside v1 would have meant
managing v1's 138 migration-history rows, its 5 `pg_cron` jobs, 2 storage
buckets, 2 triggers on `auth.users` and 14 Edge Functions. v1 also suffered
mirror-vs-live migration drift from having two tools apply migrations.

## Decision

- **A new Supabase project**, not building beside v1. No database is needed
  during requirements. When Stage 1 starts:
  1. take one `pg_dump` of v1 — cheap insurance, and reference for porting;
  2. **pause** the v1 project (it stops working at once). A paused free
     project can, as far as is known, be restored from the dashboard for
     about 90 days; after that only its backup can be downloaded. Delete it
     once it is clearly not needed;
  3. create the v2 project in **London (eu-west-2)** — v1 is in Stockholm.
- **One owner for migrations:** timestamped files applied by one tool,
  chosen in Stage 1.
- **v2 gets its own Vercel project**; v1's is retired with it.
- **Design for the free tier:** a nightly `pg_dump` from GitHub Actions to
  private, encrypted storage; photos resized on the device (1 GB storage);
  the project pauses after a week idle.
- **Walking the app in a browser:** a background dev server and a
  session-start hook; Playwright walks against a **stand-in Supabase**, never
  real data; occasional smoke walks against the real project use an
  email/password test account, created by hand, in its own Personal Space,
  with **email/password sign-up turned off** (people sign up with Google,
  [ADR-0039](0039-accounts-contacts-households.md)).

## Consequences

- v2's migrations start clean.
- A new project ref changes: the redirect URL on the Google sign-in client
  (the client is reused), Supabase sign-in settings, Vercel env vars, new
  VAPID keys for push, and signing in again.
