# Runbook

*Proposed ([ADR-0035](../20-architecture/adr/0035-preventing-catching-fixing-bugs.md)).
Filled in as each piece is built.*

## Stage 1 cut-over from v1

1. Take one `pg_dump` of v1.
2. Pause the v1 project. It stops working at once, Recipes and Gym included.
   A paused free project can, as far as is known, be restored from the
   dashboard for about 90 days; after that only its backup can be
   downloaded.
3. Create the v2 project in London (eu-west-2).
4. Delete v1 once it is clearly not needed.

## Noticing problems

- **`ops.events`** is the one errors table:
  - the app reports uncaught errors, React error-boundary catches, and writes
    the queue gave up on (with the screen and the last few actions, never
    the content of your Items);
  - Edge Functions, `pg_cron` jobs and Integration syncs report failures to
    the same table.
- It is queryable by Claude through the Supabase MCP, so "what broke this
  week?" is one question.
- **No in-app bug reporting.** Joe reports a problem by telling Claude, which
  reads `ops.events` to find it.
- **A nightly health check** (a `pg_cron` job) looks at the last day's
  events, failed jobs, the backup and Integration connections, and notifies
  Joe only when something is wrong. A broken Integration also shows in Inbox.
- **A nightly smoke walk** of production with the test account confirms that
  sign-in, capture and Inbox still work — added once Stage 2 is in daily use.

## Recovering

- **A bad deploy:** Vercel's instant rollback.
- **A bad migration:** fix forward; never edit a migration that has run.
- **Something deleted:** undo (deleted means archived).
- **Data loss:** restore the nightly backup ([backups](backups.md)).
