# Environments

*Set up in Stage 1
([ADR-0003](../20-architecture/adr/0003-new-supabase-project.md), Provisionally agreed).*

| Environment | What it is |
|---|---|
| **v2 Supabase project** | `lifeos`, ref `nxydbufwuvsacayqoakh`, **London (eu-west-2)**, Postgres 17, created 9 October 2026. URL `https://nxydbufwuvsacayqoakh.supabase.co`. Session pooler: host `aws-0-eu-west-2.pooler.supabase.com`, port 5432, database `postgres`, user `postgres.nxydbufwuvsacayqoakh`. Free tier: pauses after a week idle; 1 GB file storage; no downloadable backups, and none taken ([backups](backups.md)). |
| **v1 Supabase project** | *JoeStables LifeOS*, ref `faduazybenrtpswhdlhc`, Stockholm. **Paused**, without a backup (Joe's choice); restorable from the dashboard for about 90 days. Reference only; deleted once clearly not needed. |
| **Vercel** | Project `lifeos` in team `joestables1`, linked to the GitHub repository; a preview of every pull request. **Production at `https://joestables.uk`** (from 25 October; `www.joestables.uk` redirects there; DNS on Cloudflare, an A record for the apex and a CNAME for `www`, both to Vercel), and still at `https://lifeos-bice-mu.vercel.app`. Its environment holds the two public Supabase values, `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (locally: `.env.local`, from `.env.example`). Vercel Authentication protects previews only; production is public. v1's project, `life-os`, gave up `joestables.uk` on 25 October and stays at `life-os-psi-roan.vercel.app` until it is retired with v1. |
| **GitHub** | Repository `joestables/lifeos`. Actions secret `SUPABASE_DB_PASSWORD`, unused since the backup was dropped. `master` is protected: a pull request and the three CI checks before merging ([CI](#ci)). |
| **Google Cloud** | Project `lifeos`, with the OAuth client used for Google sign-in ([integration setup](integration-setup.md#google-sign-in)). |
| **Local Supabase in CI** | Started inside GitHub Actions; every migration applied from empty, then the database tests. In a cloud session, `npm run db:test` does the same with the live project's Postgres image (`supabase/postgres`, from Docker Hub). |
| **Stand-in Supabase** | What Playwright walks run against — never real data. The e2e build points at `https://stand-in.supabase.co`, and `tests/e2e/stand-in.ts` answers its calls in the browser and can start a page signed in as a made-up person. `scripts/screenshot.mjs` does the same for screenshots (`SIGNED_IN`). |
| **Test account** | Email/password, created by hand (its address first listed in `core_private.password_accounts`), in its own Personal Space, for occasional smoke walks against the real project (a nightly one is deferred until the roadmap is complete). Not created yet. |

- **Secrets on the project:** in Vault only, set by Claude or made by the
  functions themselves: the project's URL (`project_url`), the nightly
  series run's secret (`series_secret`,
  [runbook](runbook.md#the-nightly-series-run)), the minute job's secret
  for `send-notifications` (`push_secret`), the Web Push keys
  (`vapid_public_key`, `vapid_private_key`, [runbook](runbook.md#notifications)),
  the calendar sync's and push's secret (`calendar_secret`) and each Google
  Calendar refresh token ([runbook](runbook.md#google-calendar)). None is in
  the repository. The only Edge Function secrets are Google's OAuth client
  ID and secret (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`), entered by Joe
  ([integration setup](integration-setup.md#google-calendar-stage-3)).
- The free tier allows two *active* projects (now `lifeos` and *doorbell*);
  paused projects don't count. There is no staging database.
- **Anyone can sign up with Google**; email/password sign-up is off, so the
  test account is created by hand
  ([ADR-0039](../20-architecture/adr/0039-accounts-contacts-households.md)).
- **Walking the app in a browser:** a background dev server and a
  session-start hook, because Claude Code crashed when it launched a dev
  server in previous sessions.

## CI

`.github/workflows/ci.yml`, on GitHub Actions. The free plan's 2,000
minutes a month are shared by every private repository, so CI runs only
where it earns its minutes (Joe, 18 October 2026):

- **Once per push to a pull request, and on `master` after a merge.** A
  branch without a pull request gets no CI; open a draft one to have it
  checked.
- **The checks first:** typecheck, lint, format, token check, unit tests,
  the ontology check and the build. The database and browser tests wait for
  them, and don't start if they fail.
- **Only documents changed** (`docs/`, `.claude/`, Markdown at the root):
  the database and browser tests are skipped.
- **Browser tests on pull requests only**, not on `master` after a merge.

A skipped job counts as passed for `master`'s protection.

**The Android app** has its own workflow, `.github/workflows/android.yml`
([ADR-0061](../20-architecture/adr/0061-the-android-app.md)): on a pull
request that touches `android/`, `src/native/`, `native-shell/`,
`capacitor.config.ts` or the lockfile, its Kotlin unit tests and a debug
build; run by hand with a version (or on an `android-v*` tag), a signed
release, attached to a GitHub release tagged `android-v<version>`. Claude's cloud sessions can't build it (Google's
Android SDK host isn't reachable), so a native change is checked there.

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
