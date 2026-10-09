# Environments

*Set up in Stage 1
([ADR-0003](../20-architecture/adr/0003-new-supabase-project.md), Provisionally agreed).*

| Environment | What it is |
|---|---|
| **v2 Supabase project** | `lifeos`, ref `nxydbufwuvsacayqoakh`, **London (eu-west-2)**, Postgres 17, created 9 October 2026. URL `https://nxydbufwuvsacayqoakh.supabase.co`. Free tier: pauses after a week idle; 1 GB file storage. |
| **v1 Supabase project** | *JoeStables LifeOS*, ref `faduazybenrtpswhdlhc`, Stockholm. **Paused.** Reference only; deleted once clearly not needed. |
| **Vercel** | Project `lifeos` in team `joestables1`, linked to the GitHub repository; a preview of every pull request. Vercel Authentication protects previews only; production is public. v1's project is retired with v1. |
| **Google Cloud** | Project `lifeos`, with the OAuth client used for Google sign-in ([integration setup](integration-setup.md#google-sign-in)). |
| **Local Supabase in CI** | Started inside GitHub Actions; every migration applied from empty, then the database tests. |
| **Stand-in Supabase** | What Playwright walks run against, as v1's `walk.mjs` does — never real data. |
| **Test account** | Email/password, created by hand, in its own Personal Space, for occasional smoke walks against the real project (nightly once Stage 2 is in daily use). |

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
  allowed in the environment's network settings.
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
