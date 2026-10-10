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
  looks at the last day's events, failed jobs and the backup's heartbeat
  (Integration connections join when there are some), and records what it
  finds in `ops.health_runs`. Telling Joe when something is wrong comes with
  the nightly backup (plan step 13). A broken Integration also shows in
  Inbox.
- **A nightly smoke walk** of production with the test account confirms that
  sign-in, capture and Inbox still work — added once Stage 2 is in daily use.

## Recovering

- **A bad deploy:** Vercel's instant rollback.
- **A bad migration:** fix forward; never edit a migration that has run.
- **Something deleted:** undo, or recover it from Settings (deleted means
  archived).
- **Data loss:** restore the nightly backup ([backups](backups.md)).
