# ADR-0013: Occurrences snapshot their definition

**Status:** Provisionally agreed · 2026-10-09

## Context

A pattern recurs across the product: a **definition** and its dated
**occurrences** (Variation → Meal, Workout template → Workout, Outfit →
Outfit worn, List template → List, series → occurrence). Strength v1 called
snapshots "the heart of the model": when a workout starts, it freezes each
exercise's name, target weight and reps as they stood at that moment, so
June's sets are judged against June's target even after August's raise.

## Decision

The definition → occurrence pattern is named once and reused by every Module.
**An occurrence copies the values it needs from its definition when it starts
or is created, and history is read from the copy**, never from the
definition's current values. What each occurrence copies is tabled in the
[data model](../data-model.md#definition--occurrence).

## Consequences

- Planning is mostly creating occurrences of definitions.
- Snapshots copy values, not other Items: an Outfit worn's garment snapshot
  holds garment ids ([ADR-0017](0017-enforcing-visibility.md)).
