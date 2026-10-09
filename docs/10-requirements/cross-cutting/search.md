# Search

*Stage 2. Requirements not yet written; this page records the decisions they
build on.*

## Decisions

- **Postgres full-text search** over titles, bodies and labels from Stage 2;
  **vector search (pgvector)** later, for "find things like this" and for AI
  ([principles](../../00-foundation/principles.md)).
- Search is a **Screen**, reached from the drawer header
  ([ADR-0026](../../20-architecture/adr/0026-navigation-drawer.md),
  Accepted).
- Each Module declares its search contribution
  ([contracts](../../20-architecture/contracts.md#moduledefinition)).
