# ADR-0012: Ingredients and shopping lists

**Status:** Provisionally agreed · 2026-10-09

**Amended:** 2026-10-17 by [ADR-0050](0050-shopping-list.md) (one Shopping list Type) and Joe's answers and notes for Stage 4 (a shopping list made from the days I choose; a line is an amount, a unit and an ingredient, and may stay unlinked; six fixed aisles); 2026-10-18 by Joe's comments on the Stage 4 specs (optional subheadings; a Meal's lines protected) and [ADR-0051](0051-who-sees-food.md) (the Pantry, one catalogue for everyone; staples ours).

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
  an ingredient — no prep note — under optional subheadings ("For the
  sauce"). The ingredient is linked to an
  Ingredient (a Pantry entry), chosen or added as the line is typed, or kept as typed text.
  A line kept as typed goes on a shopping list under *Other*.
- **Adding Meals' ingredients to a Shopping list** creates one line per
  ingredient per Meal, pointing at its Ingredient and *for* its Meal.
  - "New shopping list" on the Meal plan takes the days I choose into a
    new Shopping list, or adds them to one I pick; then I add more, from the
    Ingredient database or typed.
  - **Collation is a display rule, not merged data:** lines with the same
    Ingredient and compatible units show as one row ("Panko 250 g · Katsu
    Thu, Schnitzel Sat").
  - **Staples** are offered unticked ("Check you have: soy sauce") rather
    than added.
  - **Generated lines follow their Meal:** if it is removed or moved off
    the list's days, its unticked lines go. What the Meals need is
    protected: a Meal's line can't be deleted or lowered below it, only
    raised.
- **Lines without an Ingredient** stay possible ("bin bags", packing lists).
- **Who sees and edits** Recipes, Variations, the Pantry and lists is set by
  [ADR-0051](0051-who-sees-food.md): the catalogue is the Pantry, one for everyone in
  LifeOS, not Items in a Space; staples are each Household's.

## Consequences

- Removing or cancelling a Meal removes exactly its contribution.
- Open, for the Recipes spec: unit conversion (100 g + 1 cup), and whether a
  pantry ("what's in") is wanted later.
