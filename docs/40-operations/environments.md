# Environments

*Nothing is created yet: no database is needed during requirements. The v2
environments are set up in Stage 1
([ADR-0003](../20-architecture/adr/0003-new-supabase-project.md), Provisionally agreed).*

| Environment | What it is |
|---|---|
| **v2 Supabase project** | New, in **London (eu-west-2)**. Created in Stage 1. Free tier: pauses after a week idle; 1 GB file storage. |
| **v1 Supabase project** (*JoeStables LifeOS*, Stockholm) | Backed up and paused when Stage 1 starts; deleted once clearly not needed. |
| **Vercel** | v2's own project; a preview of every pull request. v1's project is retired with v1. |
| **Local Supabase in CI** | Started inside GitHub Actions; every migration applied from empty, then the database tests. |
| **Stand-in Supabase** | What Playwright walks run against, as v1's `walk.mjs` does — never real data. |
| **Test account** | Email/password, created by hand, in its own Personal Space, for occasional smoke walks against the real project (nightly once Stage 2 is in daily use). |

- The free tier allows two *active* projects (currently *JoeStables LifeOS*
  and *doorbell*); paused projects don't count. There is no staging
  database.
- **Sign-ups are turned off**; accounts are made only by invitation.
- **Walking the app in a browser:** a background dev server and a
  session-start hook, because Claude Code crashed when it launched a dev
  server in previous sessions.

## Claude cloud sessions

Most work happens in Claude Code cloud sessions, and **Claude runs SQL for
Joe** through the Supabase MCP connector rather than handing SQL over to
paste.

- **The connector** is connected to Joe's claude.ai account; the session's
  proxy authenticates it. No Supabase keys live in the repository.
- **Permissions:** [`.claude/settings.json`](../../.claude/settings.json)
  pre-approves the Supabase tools Claude needs day to day — running SQL,
  applying migrations, listing, advisors, logs, type generation, docs — under
  **both** names the server registers (`mcp__Supabase__…` and
  `mcp__org-connector-mcp_supabase_com_88FE637B__…`). Project-level actions
  (creating, pausing or restoring a project; branches; deploying Edge
  Functions; secrets) still ask first. If the server registers a new tool or
  name, add it under every name.
- **The permission mode** is picked from the dropdown beside the prompt box;
  the allowlist only stops prompts for the tools it names.
- **Which project:** until Stage 1 creates v2, the only live project is v1,
  which is reference only — read it, never write to it.

## What changes with the new project ref

- the redirect URL on the Google sign-in client (the client is reused);
- Supabase sign-in settings;
- Vercel env vars;
- new VAPID keys for push;
- signing in again.
