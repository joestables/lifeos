# ADR-0018: Changing an Item's Type

**Status:** Provisionally agreed · 2026-10-09

**Amended:** 2026-10-09 by [ADR-0037](0037-thoughts.md) (Thoughts).

## Context

Capture makes a Thought by default, so sorting — turning a Thought into what
it really is — is an everyday action.

## Decision

**Change in place, governed by rules in the ontology.**

- **Thought → any Capturable Type** (Note, Task, Event, List, Shop, Recipe,
  Goal, Garment): always, in place — this is how the Inbox is sorted. The
  Item keeps its id, links, Reminders and history.
- **Note → any other Capturable Type:** in place too (a Note that turns out
  to be a List).
- Between closely related Types whose fields map cleanly: in place —
  **Task ↔ Event, List ↔ Shop**.
- Anything else: **"create from"** — a new Item linked by *became*, so
  nothing is destroyed.
- Links the new Type doesn't allow are listed for a decision, never silently
  dropped. The activity log records every conversion.
- An idea becoming real is a **status change** (*idea* → *active*), not a
  conversion: a recipe idea is already a Recipe.

Other options considered: always create-new-and-link; multiple Types per Item
(Tana-style supertags); no conversion; type set once only.

## Consequences

A conversion is not a link; *became* is only for "create from".
