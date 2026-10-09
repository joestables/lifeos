# Migrations

*The tool is chosen in Stage 1. These rules are decided or proposed so far.*

- **One owner:** v2's migrations are timestamped files applied by one tool.
  v1's mirror-vs-live drift came from having two
  ([ADR-0003](../20-architecture/adr/0003-new-supabase-project.md),
  Accepted).
- **The lookup-table migration is generated** from the ontology package
  (`core.item_types`, `core.link_types`)
  ([ADR-0008](../20-architecture/adr/0008-registries-declared-in-code.md)).
- **Backwards-compatible: expand, then contract**, so the live app keeps
  working while a change rolls out — the free tier has no staging database.
  Changing the model follows expand → migrate → contract over separate
  releases ([ADR-0036](../20-architecture/adr/0036-changing-the-model-over-time.md)).
- **Fixed forward**, never edited after they've run.
- **CI applies every migration from empty**, then runs the database tests.
- **`get_advisors` runs after every migration.**
- The migrations list is generated, not hand-written.

(ADR-0035, Proposed, unless marked.)
