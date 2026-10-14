# ADR-0014: Reference data and Labels

**Status:** Provisionally agreed · 2026-10-09

**Amended:** 2026-10-10 by Joe, writing the Stage 2 specs (Labels only on the Types that declare them; on Notes they filter, not head). 2026-10-13 by Joe, using Stage 2 (Thoughts take Labels; Labels filter Tasks and Inbox rather than group Tasks). 2026-10-14 by Joe, writing the Stage 3 specs (Events take Labels).

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
  - **Thoughts** — given a Label as they are captured, or later; Inbox is
    filtered by them, and a Thought keeps its Labels when it is sorted
    into a Note or a Task.
  - **Tasks** — labels play the part of Google Tasks' lists (Home, Work,
    Car); the Tasks View **filters** by them, in each of its views.
  - **Notes** — labels **filter** the Notes View, like Google Keep; a
    Note's own title is its heading.
  - **Events** (Stage 3) — labelled like Tasks, including Events from
    Google Calendar, whose Labels stay in LifeOS.
  - **One way to filter**: each page shows my Labels as pills; choosing one
    or more shows what has any of them.
  - **Wardrobe** — whether v1's collections become labels on garments is
    decided in Stage 6.
- **Areas** are replaced by Labels, which can serve as areas if wanted.
- **No Project Type for now**; Labels first.

## Consequences

A Project Type can come later if grouping Tasks needs more than Labels.
