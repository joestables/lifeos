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
  Supabase CLI, then runs the database tests (`supabase/tests`, pgTAP). A
  migration is applied to the live project only after CI has passed on the
  commit that adds it — CI runs on pull requests, so the branch needs one, a
  draft at least ([CI](environments.md#ci)).
- **In a cloud session**, `npm run db:test` does the same against the same
  Postgres image as the live project, run in Docker (the CLI's other images
  can't be fetched there). That image has no Storage tables, so
  `scripts/db-storage-stand-in.sql` makes the two the migrations use
  (`storage.buckets`, `storage.objects`) first; CI's Supabase has the real
  ones.
- **TypeScript types are generated** from the migrations
  (`npm run db:types`, into `src/data/database.types.ts`); CI fails if they
  are out of date ([ADR-0042](../20-architecture/adr/0042-data-layer.md)).
- **Files are written with a provisional version**, then renamed to the
  version the project records once applied
  ([ADR-0040](../20-architecture/adr/0040-migrations-applied-by-claude.md)).
- **No `drop` where an `alter` will do.** The Supabase MCP's
  `apply_migration` waits for a confirmation it can't show when a statement
  looks destructive (`drop policy`, for one), and times out without running
  anything (`delete`, even inside a function body, does it too).
  `alter policy … using (…)` changes a policy in place. Where a `delete` is
  needed, the migration is split so the rest applies through the tool, and
  Joe runs the remainder once in the SQL editor, the file with an `insert`
  into `supabase_migrations.schema_migrations` at its end so the history
  matches: the confirmation reaches him, but his approval never gets back
  to the tool (21 October, `stage4_household_invites` and
  `stage4_household_leaving`).
- **Every function is granted to the roles that call it, and to no one
  else.** Nothing is executable by PUBLIC (functions made by `postgres` start
  with no grant), so a migration that adds a function grants it to
  `authenticated` or `service_role` itself; `core_privileges_test.sql`
  fails if any LifeOS function is open to PUBLIC or to people signed out.
- **`get_advisors` runs after every migration.**
- The migrations list is generated, not hand-written.

(ADR-0035, Provisionally agreed, unless marked.)
