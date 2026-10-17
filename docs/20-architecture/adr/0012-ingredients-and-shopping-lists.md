# ADR-0012: Ingredients and shopping lists

**Status:** Provisionally agreed · 2026-10-09

**Amended:** 2026-10-17 by [ADR-0050](0050-shopping-list.md) (one Shopping list Type) and Joe's answers and notes for Stage 4 (a shopping list made from the days I choose; a line is an amount, a unit and an ingredient, and may stay unlinked; six fixed aisles).

## Context

Each Variation has ingredients; a Meal uses one Variation; the Meal's
ingredients should be collated onto a shopping list.

## Decision

- **Ingredient is a Type** (Food): one catalogue entry per real ingredient,
  with an aisle (Fruit & Veg, Bakery, Protein, Chilled, Cupboard, Frozen), a
  default unit and a *staple* flag. It is an Item
  because many lines point at it, and because it is worth searching and
  linking ("which recipes use chickpeas?", a pantry later, AI suggestions).
  Same pattern as Exercise in Fitness.
- **Ingredient lines** are child rows of a Variation: an amount, a unit and
  an ingredient — no prep note, no group. The ingredient is linked to an
  Ingredient, chosen or added as the line is typed, or kept as typed text.
  A line kept as typed goes on a shopping list under *Other*.
- **Adding Meals' ingredients to a Shopping list** creates one line per
  ingredient per Meal, pointing at its Ingredient and *for* its Meal.
  - "Make a shopping list" on the Meal plan takes the days I choose into a
    new Shopping list, or adds them to one I pick; then I add more, from the
    Ingredient database or typed.
  - **Collation is a display rule, not merged data:** lines with the same
    Ingredient and compatible units show as one row ("Panko 250 g · Katsu
    Thu, Schnitzel Sat").
  - **Staples** are offered unticked ("Check you have: soy sauce") rather
    than added.
  - **Generated lines follow their Meal:** if it is cancelled or moved after
    the shop, its unticked lines are removed or moved; edited or ticked lines
    stay.
- **Lines without an Ingredient** stay possible ("bin bags", packing lists).
- **A Variation always has its Recipe's Space.** A trigger keeps them equal;
  moving a Recipe moves its Variations.

## Consequences

- Removing or cancelling a Meal removes exactly its contribution.
- Open, for the Recipes spec: unit conversion (100 g + 1 cup), and whether a
  pantry ("what's in") is wanted later.
