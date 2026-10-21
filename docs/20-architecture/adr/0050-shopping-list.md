# ADR-0050: One Shopping list Type, in place of List and Shop

**Status:** Provisionally agreed · 2026-10-17

Supersedes [ADR-0010](0010-shop-is-its-own-type.md).

## Context

ADR-0010 made two Types: a List (packing, DIY) and a Shop (a List with a
date, a place and a done state). Neither was built. On 17 October Joe set
out a Shopping page holding all his shopping lists, made by hand or from the
meal plan, and asked whether the List Type could go
([Stage 4 plan](../../50-progress/plans/stage-4.md#questions-for-the-specs),
questions 1 and 2).

## Decision

- **One Type, Shopping list**, in a Module renamed `shopping` (from
  `lists`). It holds lines, each with an optional Ingredient and an optional
  *for* pointer (a Meal or an Event).
- **A date is optional.** With a date (and a time and place if I like) a
  Shopping list is on Plan, reminds me if I ask, and is ticked done when the
  shop is done: what ADR-0010 called a Shop. Without one it is a standing
  list ("Household essentials").
- **It is Shareable and Capturable**, Household by default; yellow, with
  Thoughts and Notes ([ADR-0043](0043-colour-by-type.md)).
- **Lists that aren't shopping** (packing for Lisbon, DIY) are Notes with a
  checklist, which Notes already have. A Thought sorts into a Shopping list,
  not a List.
- **No list templates.** A standing list does their job for shopping; a
  packing Note can be duplicated.

## Consequences

- No List ↔ Shop conversion, no *from template* link, and no List template
  → List occurrence.
- Open, for the Shopping spec (Stage 4b): on a repeating Shopping list,
  whether unticked lines carry over to the next occurrence.
- Amends [ADR-0012](0012-ingredients-and-shopping-lists.md) (where a Meal's
  ingredients go) and [ADR-0013](0013-occurrences-snapshot-their-definition.md)
  (no list templates).
