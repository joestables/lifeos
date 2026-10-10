# Backups

*Decided in Stage 1.*

- **v1:** none taken; Joe paused it as it was. Restorable from the
  dashboard for about 90 days after pausing
  ([ADR-0003](../20-architecture/adr/0003-new-supabase-project.md)).
- **v2: none for now** (Joe, 10 October 2026). The free tier has no
  downloadable backups, so data lost from the `lifeos` project can't be
  restored. Revisit when the data matters more or the project moves off
  the free tier.
- **If backups return:** a nightly `pg_dump` from GitHub Actions through
  Supabase's connection pooler in **session mode** (the direct connection is
  IPv6-only; the pooler's details are in
  [environments](environments.md)), to **private, encrypted storage**,
  because it is all personal data; restored once when first set up; each run
  recorded in `ops.heartbeats`, where the nightly health check already
  reports a run that failed or is more than 26 hours old
  ([runbook](runbook.md#noticing-problems)).

([ADR-0003](../20-architecture/adr/0003-new-supabase-project.md) and
[ADR-0035](../20-architecture/adr/0035-preventing-catching-fixing-bugs.md),
Provisionally agreed.)

## Sources

[Supabase free tier limits](https://www.jetadmin.io/blog/supabase-pricing-2026-guide-to-plans-limits-and-real-world-costs/)
