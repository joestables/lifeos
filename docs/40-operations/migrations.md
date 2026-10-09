# Migrations

*How the schema changes.*

- **One owner:** v2's migrations are files in `supabase/migrations/`,
  applied to the live project only by Claude, with the Supabase MCP's
  `apply_migration`; each file is named with the version the project records.
  v1's mirror-vs-live drift came from having two tools
  ([ADR-0003](../20-architecture/adr/0003-new-supabase-project.md),
  [ADR-0040](../20-architecture/adr/0040-migrations-applied-by-claude.md),
  Provisionally agreed).
- **The lookup-table migration is generated** from the ontology package
  (`core.item_types`, `core.link_types`)
  ([ADR-0008](../20-architecture/adr/0008-registries-declared-in-code.md)).
- **Backwards-compatible: expand, then contract**, so the live app keeps
  working while a change rolls out — the free tier has no staging database.
  Changing the model follows expand → migrate → contract over separate
  releases ([ADR-0036](../20-architecture/adr/0036-changing-the-model-over-time.md)).
- **No ad-hoc schema changes.** Every schema change is a migration file in
  the repository, applied by the one tool — never pasted into the dashboard or run
  through `execute_sql` ([environments](environments.md#claude-cloud-sessions)).
- **Fixed forward**, never edited after they've run.
- **CI applies every migration from empty** to a local Supabase with the
  Supabase CLI, then runs the database tests. A migration is applied to the
  live project only after its pull request's CI has passed.
- **`get_advisors` runs after every migration.**
- The migrations list is generated, not hand-written.

(ADR-0035, Provisionally agreed, unless marked.)
