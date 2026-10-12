# ADR-0045: Where repeating Items are made

**Status:** Provisionally agreed · 2026-10-11

## Context

[ADR-0021](0021-time.md) makes repeats real occurrences over a rolling
window, and [ADR-0022](0022-repeating-items.md) says one dependency-free
TypeScript engine makes them, on the device when a series is created and in
a nightly Edge Function, with no SQL copy. What remains is where the engine
lives, what runs it each night, and who makes the next occurrence of a
Task repeated *after completion*.

## Decision

- **The engine is a package**, `packages/recurrence`: plain TypeScript with
  no dependencies and no Node or browser APIs, so the app and Supabase's
  Edge Functions (Deno) import the same files. It is unit-tested, with v1's
  cases ported, clock changes included.
- **The device makes what it can, at once.** Making a series writes the
  series and its first window of occurrences in one database function call,
  offline too (the write queue sends it later). Ticking a Task repeated
  after completion writes its next occurrence in the same call.
- **A nightly Edge Function makes the rest.** `pg_cron` calls
  `extend-series` through `pg_net` at 02:00 UTC (before the 03:00 health
  check), with a secret kept in Vault. For each series it:
  - makes occurrences up to 12 weeks ahead, in the series' timezone, and
    always the first one beyond, so a yearly Task's next exists once this
    one is ticked (the device's first window is the same);
  - makes the next occurrence of an after-completion series whose last one
    is done and has none open, if nothing made it then;
  - closes untouched occurrences older than a series' newest due one as
    *skipped*. The app hides those already, so nothing waits on the run.
- **Days, not instants.** The engine works in calendar days; an
  occurrence's do-on date and time are local, so the clocks changing can't
  move it, and its Reminder's instant is worked out by the database in the
  person's timezone.
- **Running twice does no harm.** An occurrence is unique by its series and
  the date the series made it for (`occurrence_on`, which stays put when the
  occurrence is moved), and the window is recorded in `generated_until`, so
  a re-run or a device and the function making the same occurrence still
  leave one.
- **The function writes through database functions**
  ([ADR-0009](0009-cross-table-writes-are-database-functions.md)), records a
  heartbeat in `ops.heartbeats`, and reports failures to `ops.events`.
- **Edge Functions live in `supabase/functions/`** and are deployed by
  Claude through the Supabase MCP, as migrations are
  ([ADR-0040](0040-migrations-applied-by-claude.md)), with the engine's
  files included.

## Consequences

- A missed night changes nothing anyone sees: 12 weeks are already made, and
  the Tasks View and Inbox show a series' next open occurrence only.
- A daily series holds about 84 future Items; that is small.
- The engine runs in three places (the app, `extend-series`, and
  `notification-action` when a Task is done from a notification;
  [ADR-0044](0044-reminder-delivery.md)), always the same code.
- Rejected: a GitHub Actions schedule (a service key outside Supabase, and
  loose timing); a SQL copy of the engine (v1's drift).
