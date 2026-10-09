# ADR-0033: Architecture principles

**Status:** Provisionally agreed · 2026-10-09

**Amended:** 2026-10-09 by [ADR-0037](0037-thoughts.md) (Thoughts).

## Context

LifeOS must be enhanceable (goal 4) without building machinery nobody uses
yet (goal 2 wins over goal 4).

## Decision

Adopt the twelve architecture principles in
[principles.md](../../00-foundation/principles.md): a small stable core plus
Modules that declare what they contribute; one Postgres schema per area; one
pattern for every Integration; an activity log; a measures registry; device
features behind one interface; AI across the whole app; general only when a
second real use needs it; live updates where two people share a thing;
Postgres full-text search, then pgvector; one AI service in the core; your
data is exportable.

The core is built from four real Types (Thought, Note, Task, Event); each Module's
Types are added in that Module's stage.

## Consequences

Adding a Module changes neither the core nor other Modules. The app-code
boundary between Modules needs a lint rule or one typed client per Module.
