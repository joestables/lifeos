# ADR-0007: Storage shape

**Status:** Proposed · 2026-10-09

## Context

Every View filters Items of many Types by the same few fields (Type, Space,
status, time), while each Type has its own details.

## Decision

- **The graph is modelled in Postgres**: a shared core table plus per-type
  detail tables ("class table inheritance"), plus a links table. Details in
  the [data model](../data-model.md#storage-shape).
  - `core.items` holds only the fields every View filters on.
  - Detail tables are 1:1 with Items, in their Module's schema.
  - **Child rows** belong to one Item and are not Items. Something is an Item
    if it needs to be linked, scheduled, shared or searched on its own.
- **Status is one small core set** — `idea | active | done | cancelled` —
  each Type using a subset with its own labels. Only Completable Types use
  *done*; a Note's Unsorted / Filed is a flag on its detail table. Finer
  states live in the detail table.
- **IDs are UUIDv7, made on the device**; server-side inserts use a small SQL
  function (Postgres 17 has no built-in `uuidv7()`).
- **Time fields per Schedulable Type** are fixed by a table, and a `CHECK`
  per Type refuses the fields it doesn't use.

Rejected: one table per Type with no core (every View would union ten
tables); one table with everything in JSON (the database can enforce
nothing); RDF/SPARQL triple stores and graph databases such as Neo4j (too
heavy for a personal app, a second database, not hosted by Supabase).

## Consequences

- Plan and the other Views read one table.
- A write made offline needs no round trip for its ID, and a sync engine can
  be added later without a rewrite.
- The graph can be exported whenever wanted (visualisation, AI).
