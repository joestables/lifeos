# ADR-0018: Changing an Item's Type

**Status:** Accepted · 2026-10-09

## Context

Capture makes a Note by default, so triage — turning a Note into what it
really is — is an everyday action.

## Decision

**Change in place, governed by rules in the ontology.**

- Note → any Capturable Type: always, in place. The Item keeps its id, links
  and history.
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
