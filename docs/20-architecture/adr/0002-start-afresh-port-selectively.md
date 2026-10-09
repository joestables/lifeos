# ADR-0002: Start afresh, port selectively

**Status:** Accepted · 2026-10-09

## Context

v1 is a Shell with four Apps (Strength, Planner, Wardrobe, Recipes) in
React + TypeScript + MUI over Supabase. Moving to shadcn rewrites every
screen, and the new data model reshapes every table, so very little of the
current code would survive an in-place evolution.

## Decision

- **New codebase and a fresh database.**
- **No data migration.** The live data is tiny (≈23 tasks, 16 workouts, 22
  recipes) and isn't needed.
- **Port proven logic deliberately**, not by default:
  - recurrence: the TypeScript RRULE date expansion only — not v1's virtual
    occurrences or its SQL copy of the engine;
  - the notification / Web Push path and service worker;
  - the cache and optimistic-write pattern, or TanStack Query equivalents;
  - Strength's arithmetic: Epley e1RM, progression, readiness;
  - Wardrobe's colour algorithm and URL import;
  - Recipes' import and AI pieces, where still wanted.
- **A new repository** containing only `docs/` until the architecture is
  signed off. The v1 repository stays as reference.

## Consequences

- v1 stops when its Supabase project is paused in Stage 1
  ([ADR-0003](0003-new-supabase-project.md)). Between then and Stages 4–6,
  Recipes, Gym and Wardrobe are unavailable. Accepted: v1 is being wiped.
