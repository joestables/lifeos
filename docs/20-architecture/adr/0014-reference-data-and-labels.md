# ADR-0014: Reference data and Labels

**Status:** Proposed · 2026-10-09

## Context

Two kinds of thing are neither Items nor child rows: a Module's small lookup
lists, and groupings across Items (v1's tags, collections, and the idea of
Areas such as Health, Home, Money).

## Decision

- **Reference data**: lookup tables in the Module's schema, edited in
  Settings, not linked or searched as Items — muscle groups, equipment and
  recovery settings (Fitness); cuisines, categories, protein, carbs and units
  (Food); category, brand, colour, size and fit (Wardrobe).
- **Labels** replace tags, on any Item, per Space:
  - **Tasks** — labels group Tasks, like Google Tasks' lists (Home, Work,
    Car); the Tasks View filters and groups by them.
  - **Notes** — labels are the **headings** of the Notes View, like Google
    Keep: notes appear under each of their labels, unlabelled ones under
    "Other".
  - **Wardrobe** — v1's collections become labels on garments.
- **Areas** are replaced by Labels, which can serve as areas if wanted.
- **No Project Type for now**; Labels first.

## Consequences

A Project Type can come later if grouping Tasks needs more than Labels.
