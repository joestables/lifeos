# Environments

*Set up in Stage 1
([ADR-0003](../20-architecture/adr/0003-new-supabase-project.md), Provisionally agreed).*

| Environment | What it is |
|---|---|
| **v2 Supabase project** | `lifeos`, ref `nxydbufwuvsacayqoakh`, **London (eu-west-2)**, Postgres 17, created 9 October 2026. URL `https://nxydbufwuvsacayqoakh.supabase.co`. Session pooler: host `aws-0-eu-west-2.pooler.supabase.com`, port 5432, database `postgres`, user `postgres.nxydbufwuvsacayqoakh`. Free tier: pauses after a week idle; 1 GB file storage; no downloadable backups, and none taken ([backups](backups.md)). |
| **v1 Supabase project** | *JoeStables LifeOS*, ref `faduazybenrtpswhdlhc`, Stockholm. **Paused**, without a backup (Joe's choice); restorable from the dashboard for about 90 days. Reference only; deleted once clearly not needed. |
| **Vercel** | Project `lifeos` in team `joestables1`, linked to the GitHub repository; a preview of every pull request. Its environment holds the two public Supabase values, `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (locally: `.env.local`, from `.env.example`). Vercel Authentication protects previews only; production is public. v1's project is retired with v1. |
| **GitHub** | Repository `joestables/lifeos`. Actions secret `SUPABASE_DB_PASSWORD`, unused since the backup was dropped. `master` is protected: a pull request and the three CI checks before merging. |
| **Google Cloud** | Project `lifeos`, with the OAuth client used for Google sign-in ([integration setup](integration-setup.md#google-sign-in)). |
| **Local Supabase in CI** | Started inside GitHub Actions; every migration applied from empty, then the database tests. In a cloud session, `npm run db:test` does the same with the live project's Postgres image (`supabase/postgres`, from Docker Hub). |
| **Stand-in Supabase** | What Playwright walks run against — never real data. The e2e build points at `https://stand-in.supabase.co`, and `tests/e2e/stand-in.ts` answers its calls in the browser and can start a page signed in as a made-up person. `scripts/screenshot.mjs` does the same for screenshots (`SIGNED_IN`). |
| **Test account** | Email/password, created by hand (its address first listed in `core_private.password_accounts`), in its own Personal Space, for occasional smoke walks against the real project (nightly once Stage 2 is in daily use). |

- **Secrets on the project:** in Vault only, set by Claude or made by the
  functions themselves: the project's URL (`project_url`), the nightly
  series run's secret (`series_secret`,
  [runbook](runbook.md#the-nightly-series-run)), the minute job's secret
  for `send-notifications` (`push_secret`) and the Web Push keys
  (`vapid_public_key`, `vapid_private_key`, [runbook](runbook.md#notifications)).
  None is in the repository, and none is an Edge Function secret.
- The free tier allows two *active* projects (now `lifeos` and *doorbell*);
  paused projects don't count. There is no staging database.
- **Anyone can sign up with Google**; email/password sign-up is off, so the
  test account is created by hand
  ([ADR-0039](../20-architecture/adr/0039-accounts-contacts-households.md)).
- **Walking the app in a browser:** a background dev server and a
  session-start hook, because Claude Code crashed when it launched a dev
  server in previous sessions.

## Claude cloud sessions

Most work happens in Claude Code cloud sessions. **Claude runs SQL and
applies migrations for Joe** through the Supabase MCP connector; Joe doesn't
run anything in Supabase himself
([ADR-0040](../20-architecture/adr/0040-migrations-applied-by-claude.md)).

- **Connectors:** Supabase, GitHub and Vercel are connected to Joe's
  claude.ai account; the session's proxy authenticates them. No keys live in
  the repository.
- **Network:** the environment's policy blocks direct connections to
  `*.supabase.co` and `*.vercel.app`, so a cloud session reaches the live
  project only through the connectors. That is enough for SQL, migrations,
  advisors and logs; smoke walks against production would need those hosts
  allowed in the environment's network settings. `ui.shadcn.com` is blocked
  too, so the shadcn CLI can't fetch components; they are copied from
  shadcn's source on GitHub (`apps/v4/registry/bases/base`), which is
  reachable, as is npm. Docker runs (start `dockerd` first); images come
  from Docker Hub and `mcr.microsoft.com` (Playwright's image for the browser
  tests), as `public.ecr.aws` is blocked.
- **Permissions:** Joe wants no approval prompts for any Supabase action
  (Edge Function deploys included), nor for Vercel or GitHub.
  [`.claude/settings.json`](../../.claude/settings.json) allows the whole
  servers: `mcp__Supabase`, `mcp__org-connector-mcp_supabase_com_88FE637B`
  (the same Supabase connector under its second name), `mcp__Vercel` and
  `mcp__github`. Claude can't edit this file itself (the session's safety
  check stops it changing its own permissions), so Joe makes such changes.
  A change takes effect in the next session.
- **The permission mode** is picked from the dropdown beside the prompt box;
  the allowlist only stops prompts for the tools it names.
- **Which project:** writes go to `lifeos` (`nxydbufwuvsacayqoakh`) only.
  The connector can also see v1 and *doorbell*: never write to either.

## What changed with the new project

- A new Google Cloud project and OAuth client, whose redirect URI is the v2
  project's;
- Supabase sign-in settings;
- Vercel env vars;
- new VAPID keys for push;
- signing in again.
