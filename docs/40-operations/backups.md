# Backups

*Set up in Stage 1.*

- **v1:** none taken; Joe paused it as it was. Restorable from the
  dashboard for about 90 days after pausing
  ([ADR-0003](../20-architecture/adr/0003-new-supabase-project.md)).
- **v2, nightly:** the free tier has no downloadable backups, so a nightly
  `pg_dump` runs from GitHub Actions, through Supabase's connection pooler in
  **session mode** (the direct connection is IPv6-only), to **private,
  encrypted storage**, because it is all personal data.
- **Restored once** into a scratch project when first set up, so restoring is
  known to work before it's needed.
- The nightly health check looks at the backup: the backup job records each
  run in `ops.heartbeats`, and a run that failed or is more than 26 hours old
  is reported ([runbook](runbook.md#noticing-problems)).

([ADR-0003](../20-architecture/adr/0003-new-supabase-project.md), Provisionally agreed;
restore test: [ADR-0035](../20-architecture/adr/0035-preventing-catching-fixing-bugs.md),
Provisionally agreed.)

## Sources

[Supabase free tier limits](https://www.jetadmin.io/blog/supabase-pricing-2026-guide-to-plans-limits-and-real-world-costs/)
