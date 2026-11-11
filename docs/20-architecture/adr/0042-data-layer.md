# ADR-0042: The data layer

**Status:** Provisionally agreed · 2026-10-09

**Amended:** 2026-10-14 by the Stage 3 plan (Lists, and their live updates,
moved to Stage 4b).

## Context

[ADR-0031](0031-offline-and-concurrent-edits.md) asks for a write queue with
IDs made on the device; [ADR-0009](0009-cross-table-writes-are-database-functions.md)
says the queue replays database-function calls; [ADR-0034](0034-stack.md)
puts TanStack Query behind one data layer. The
[offline requirements](../../10-requirements/cross-cutting/offline.md#requirements)
(OFF-001–005) and ACC-003 (sign-out) are what it must satisfy.

TanStack Query can persist paused mutations, but resuming them after a reload
needs a default function per mutation, and it offers no queue to show, give
up on or clear. TanStack DB's offline outbox does all of that, but only for
TanStack DB collections, whose core is still pre-1.0.

## Decision

- **One data layer.** `src/data/` is the only code that talks to Supabase;
  screens use its hooks. A lint rule stops `@supabase/supabase-js` being
  imported anywhere else.
- **Reads:** TanStack Query, selecting from tables and views under RLS. The
  cache is kept in IndexedDB, so Items already loaded show with no signal,
  marked as possibly out of date (OFF-005). It is kept under a shape
  version (`CACHE_SHAPE`, the persister's buster), raised whenever a kept
  query's data changes shape, so a device holding the old shape starts
  afresh rather than reading it as the new (from Stage 7b, when Settings'
  renamed field crashed a page reading what an older build had kept). Data refreshes on focus and on
  reconnecting. **A table read whole is read a page at a time** (`allRows`,
  1000 rows a page, the Data API's most), in a stable order ending in a
  unique column, so nothing past the first thousand rows is silently left
  out.
- **Every write is a database function**, not only writes that span tables:
  one per action (`core.create_item`, `core.update_item`,
  `core.archive_item`, `core.convert_item`, `core.link_items` …).
  - Functions run as the caller (`security invoker`), so RLS stays the one
    check on who may do what. The app never writes to tables directly
    (the lint rule above).
  - **Creates are idempotent:** the device makes the ID, and a repeat is
    ignored (OFF-002).
  - **Updates send only the fields that changed**, as a patch; the server
    applies it when it arrives, so last write wins field by field (OFF-003).
- **The write queue is our own outbox in IndexedDB**:
  - Each entry is one function call. Entries are sent one at a time, in
    order, by one tab (Web Locks).
  - Entries waiting to be sent are laid over the query cache, so a change
    shows at once, survives a reload and is marked as not yet sent (OFF-001).
  - A network failure or server error retries with backoff (1 s, 2 s, 4 s …
    up to a minute), and at once when the browser says it is back online or
    the app comes back into view (OFF-001 2), even if a send was still
    failing at that moment. A rejection
    marks the entry failed and keeps it: the Item and `SyncStatus` show it,
    and `ops.events` records it without the Item's content (OFF-004).
  - Once an entry is sent, the queries it touched are refreshed.
- **Signing out** warns about unsent writes, then clears the queue and the
  cache (ACC-003).
- **TypeScript types for tables and functions are generated** from the
  database after each migration.

## Consequences

- A few hundred lines of queue code that LifeOS owns, tested with unit tests
  citing OFF-001–005.
- Each new action needs a database function, in a migration.
- No live updates in Stage 1; shared Shopping lists added them in Stage 4b:
  Supabase Realtime telling the data layer which queries to refresh
  (`useLiveShopping`, [ADR-0057](0057-shopping-in-the-database.md)).
- If the queue proves not enough, TanStack DB with its offline outbox (or
  PowerSync) replaces it behind the same hooks
  ([ADR-0031](0031-offline-and-concurrent-edits.md)).
