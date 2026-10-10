# ADR-0014: Reference data and Labels

**Status:** Provisionally agreed · 2026-10-09

**Amended:** 2026-10-10 by Joe, writing the Stage 2 specs (Labels only on the Types that declare them; on Notes they filter, not head).

## Context

Two kinds of thing are neither Items nor child rows: a Module's small lookup
lists, and groupings across Items (v1's tags, collections, and the idea of
Areas such as Health, Home, Money).

## Decision

- **Reference data**: lookup tables in the Module's schema, edited in
  Settings, not linked or searched as Items — muscle groups, equipment and
  recovery settings (Fitness); cuisines, categories, protein, carbs and units
  (Food); category, brand, colour, size and fit (Wardrobe).
- **Labels** replace tags, per Space, on the Types that declare them — not
  every Type ([data model](../data-model.md#types)). One set serves them
  all:
  - **Tasks** — labels group Tasks, like Google Tasks' lists (Home, Work,
    Car); the Tasks View filters and groups by them.
  - **Notes** — labels **filter** the Notes View, like Google Keep; a
    Note's own title is its heading.
  - **Wardrobe** — whether v1's collections become labels on garments is
    decided in Stage 6.
- **Areas** are replaced by Labels, which can serve as areas if wanted.
- **No Project Type for now**; Labels first.

## Consequences

A Project Type can come later if grouping Tasks needs more than Labels.
