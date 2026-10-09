# Offline

*Requirements not yet written; this page records the decisions they build
on.*

## Decisions

- **A write queue first, IDs made on the device**; PowerSync + TanStack DB
  only if the queue isn't enough
  ([ADR-0031](../../20-architecture/adr/0031-offline-and-concurrent-edits.md),
  Provisionally agreed).
- **The queue replays database-function calls**, not table writes
  ([ADR-0009](../../20-architecture/adr/0009-cross-table-writes-are-database-functions.md),
  Provisionally agreed).
- **Last write wins, field by field**, by the time the server receives it;
  the queue sends only the fields that changed.
- **Capture works with no signal:** the parser is deterministic and never
  needs an LLM ([CAP-001](capture.md#cap-001--capture-a-thought-in-one-line)
  criterion 4).
- **iOS has no Background Sync**, so queued writes send when the app is next
  open.
- Writes the queue gives up on are reported to `ops.events`
  ([runbook](../../40-operations/runbook.md)).
