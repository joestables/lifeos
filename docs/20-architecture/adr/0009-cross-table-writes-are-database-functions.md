# ADR-0009: Writes that span tables are database functions

**Status:** Provisionally agreed · 2026-10-09

## Context

Creating a Recipe writes `core.items`, `food.recipe`, its first Variation and
a *variation of* link; converting a Type swaps a detail row. Supabase's REST
API writes one table per request.

## Decision

Writes that span tables are database functions called over RPC
(`core.create_item`, `core.convert_item` …), each one transaction. The write
queue replays function calls, not table writes.

## Consequences

To be settled in the data-layer ADR in Stage 1.
