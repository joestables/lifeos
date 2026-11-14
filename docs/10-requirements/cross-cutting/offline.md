# Offline

*Stage 1. The requirements are at the end; the decisions they build on come
first.*

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
- **How it is built** — every write a database function, the queue an
  outbox in IndexedDB, the read cache kept in IndexedDB (dropped once when
  its shape changes, so an older build's copy is never misread):
  [ADR-0042](../../20-architecture/adr/0042-data-layer.md), Provisionally agreed.

## Requirements

*Stage 1. Statuses: proposed → agreed → built → verified. In Stage 1 these are
verified by data-layer and database tests; Playwright checks join in Stage 2,
when there are screens to create Items from.*

### OFF-001 — Write without a connection

**As** a person with no signal, **I want** what I create or change to be
saved at once, **so that** a bad connection never loses a thought.
Priority: Must · Status: verified

Acceptance criteria
1. Given I have no connection, when I create or edit an Item, then the
   change shows immediately and is marked as not yet sent once it has
   waited 3 seconds; one sent within them is never marked, so a change made
   with a connection doesn't flash "Not sent yet" (Joe, 14 November).
2. Given writes are waiting, when the connection returns, then they are sent
   in order without my doing anything (on iOS, when the app is next open).

### OFF-002 — No duplicates on retry

**As** a person on a flaky connection, **I want** a retried write to count
once, **so that** I never see the same Item twice.
Priority: Must · Status: verified

Acceptance criteria
1. Given a create is sent, and sent again after a timeout, then exactly one
   Item exists, with the ID the device made.

### OFF-003 — Two people's edits both survive

**As** one of two people editing the same Item, **I want** each of our
changes kept unless we changed the same field, **so that** a late offline
edit doesn't undo someone else's work.
Priority: Must · Status: verified

Acceptance criteria
1. Given device A changes an Item's title while offline and device B changes
   its do-on date online, when A's write arrives, then the Item has A's
   title and B's date.
2. Given both change the title, then the one the server receives last wins.

### OFF-004 — A write that can't be saved is not lost silently

**As** a person using LifeOS, **I want** to know when a change couldn't be
saved, **so that** I can redo it.
Priority: Should · Status: verified

Acceptance criteria
1. Given the server permanently rejects a queued write, then the Item shows
   that the change wasn't saved, and `ops.events` records the failure with
   the screen and last few actions — never the Item's content.
2. Given I've seen that a change wasn't saved, then I can clear it, and the
   Item shows what was saved.

### OFF-005 — Read what I've already loaded

**As** a person with no signal, **I want** to see the Items I've already
opened, **so that** I'm not locked out of my own data.
Priority: Should · Status: verified

Acceptance criteria
1. Given I have loaded Items while online, when I lose the connection, then
   those Items still show, marked as possibly out of date.

Non-goals (Stage 1): a sync engine (PowerSync + TanStack DB) unless the queue
proves not enough ([ADR-0031](../../20-architecture/adr/0031-offline-and-concurrent-edits.md));
Background Sync on iOS, which doesn't exist.
