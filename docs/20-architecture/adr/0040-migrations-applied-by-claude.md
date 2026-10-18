# ADR-0040: Migrations are applied by Claude through the Supabase MCP

**Status:** Provisionally agreed · 2026-10-09

**Amended:** 2026-10-18 by Joe (CI runs on pull requests, not on every push).

## Context

[ADR-0003](0003-new-supabase-project.md) asks for one owner of migrations:
timestamped files applied by one tool. Joe doesn't run anything in Supabase
himself; Claude works in cloud sessions, where the Supabase MCP connector is
available but direct connections to the project are not.

## Decision

- **Migration files live in `supabase/migrations/`**, named
  `<version>_<name>.sql`, as the Supabase CLI expects.
- **Only Claude applies them to the live project**, with the MCP tool
  `apply_migration`, one file per call. The file is then named with the
  version the project records (`list_migrations`), so the repository and the
  project's migration history always match.
- **CI applies the same files from empty** to a local Supabase with the
  Supabase CLI, then runs the database tests. The CLI never writes to the live
  project.
- After every migration: `get_advisors` (security and performance).
- Nobody changes the schema in the dashboard or through `execute_sql`.

## Consequences

- One tool writes to the live schema, so it can't drift from the repository.
- A migration is applied only after CI has passed on the commit that adds
  it. CI runs on pull requests, so the branch needs one, a draft at least
  ([CI](../../40-operations/environments.md#ci)).
- If the MCP connector is unavailable, migrations wait; they are never pasted
  into the dashboard.
