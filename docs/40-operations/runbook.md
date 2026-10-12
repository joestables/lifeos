# Runbook

*Provisionally agreed ([ADR-0035](../20-architecture/adr/0035-preventing-catching-fixing-bugs.md)).
Filled in as each piece is built.*

## Stage 1 cut-over from v1

1. Pause the v1 project. It stops working at once, Recipes and Gym included.
   Joe chose not to take a `pg_dump` first. A paused free project can, as
   far as is known, be restored, or its backup downloaded, from the
   dashboard for about 90 days.
2. Create the v2 project in London (eu-west-2).
3. Delete v1 once it is clearly not needed.

Done 9 October 2026.

## Noticing problems

- **`ops.events`** is the one errors table (schema `ops`, not exposed to the
  API):
  - the app reports uncaught errors, screens that crash, and writes the
    server refused, through `core.report_event`, with the screen, the build
    and the last ten actions — pages visited and the kind of control
    clicked, never its text or the content of your Items
    (`src/data/report.ts`). A report that can't be sent waits for the next
    try;
  - Edge Functions, `pg_cron` jobs and Integration syncs report failures to
    the same table.
- It is queryable by Claude through the Supabase MCP, so "what broke this
  week?" is one question.
- **No in-app bug reporting.** Joe reports a problem by telling Claude, which
  reads `ops.events` to find it.
- **A nightly health check** (`pg_cron`, 03:00 UTC, `ops.health_check()`)
  looks at the last day's events, failed jobs and the heartbeats of jobs
  outside the database (from Stage 2, Reminder sending and the nightly
  series run; Integration connections join when there are some), and records what it finds in `ops.health_runs`. **Nobody is
  notified** (Joe, 10 October): Joe checks, or asks Claude "any problems?",
  and Claude reads `ops.health_runs` and `ops.events`. Notifications can be
  added later. A broken Integration also shows in Inbox.
- **A nightly smoke walk** of production with the test account confirms that
  sign-in, capture and Inbox still work — added once Stage 2 is in daily use.

## The nightly series run

Repeating Tasks are made ahead by the `extend-series` Edge Function
([ADR-0045](../20-architecture/adr/0045-extending-series.md)):

- **When:** `pg_cron` job `nightly-series`, 02:00 UTC, calls it through
  `pg_net` with the project's URL and a shared secret from Vault
  (`project_url`, `series_secret`); the function refuses any call whose
  secret the database doesn't confirm (`core.series_secret_ok`), so the
  secret lives only in Vault.
- **What it does:** makes each series' occurrences up to 12 weeks ahead (and
  the one after), the next of a Task repeated after it's done if nothing
  made it, then skips untouched occurrences overtaken by a newer due one,
  and records its heartbeat (`ops.heartbeats`, `extend-series`). A failure
  goes to `ops.events`; the 03:00 health check reports a heartbeat that is
  late or failed.
- **Checking it:** `select * from ops.heartbeats` and
  `select * from cron.job_run_details where jobid = (select jobid from cron.job where jobname = 'nightly-series') order by start_time desc limit 5`.
- **Running it by hand:** the same `net.http_post` as the job; running it
  twice does no harm.
- **Deploying it:** Claude deploys `supabase/functions/extend-series`
  through the Supabase MCP with `packages/recurrence`'s files, without JWT
  checks (it checks its own secret). Changing the secret is one Vault
  update. A missed night changes nothing anyone
  sees: 12 weeks are already made.

## Recovering

- **A bad deploy:** Vercel's instant rollback.
- **A bad migration:** fix forward; never edit a migration that has run.
- **Something deleted:** undo, or recover it from Settings (deleted means
  archived).
- **Data loss:** no backups are taken for now, so it can't be restored
  ([backups](backups.md)).
