# ADR-0012: Ingredients and shopping lists

**Status:** Provisionally agreed · 2026-10-09

**Amended:** 2026-10-17 by [ADR-0050](0050-shopping-list.md) (one Shopping list Type) and Joe's answers and notes for Stage 4 (a shopping list made from the days I choose; a line is an amount, a unit and an ingredient, and may stay unlinked; six fixed aisles); 2026-10-18 by Joe's comments on the Stage 4 specs (optional subheadings; a Meal's lines protected) and [ADR-0051](0051-who-sees-food.md) (the Pantry, one catalogue for everyone; staples ours); 2026-10-23 by Joe's answers for step 9 (a Meal's own lines); 2026-10-24 by Joe's answers for Stage 4b (a food shop linked to Meals; Extra; Essentials); 2026-10-25 by Joe's first round (no Meals named under a row; what's needed on a shop by itself).

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
- **Ingredient lines** are child rows of a Variation (and, without
  subheadings, of a Meal, its own beside its Recipe's; Joe, 23 October): an amount, a unit and
  an ingredient — no prep note — under optional subheadings ("For the
  sauce"). The ingredient is linked to an
  Ingredient (a Pantry entry), chosen or added as the line is typed, or kept as typed text.
  A line kept as typed goes on a shopping list under *Other*.
- **Adding Meals' ingredients to a Shopping list** creates one line per
  ingredient per Meal, pointing at its Ingredient and *for* its Meal.
  - On the Meal plan, Select chooses Meals and Add to shop makes a new
    food shop of them; Shopping's New shop offers the plan's Meals to toggle.
    Meals are added or taken off later. Then I add more on Extra, from the
    Pantry or typed.
  - **Collation is a display rule, not merged data:** lines with the same
    Ingredient and compatible units show as one row ("Panko 250 g").
  - **Staples** aren't added from Meals; those the Meals use are offered
    on Extra. Out-of-stock staples and Required Essentials of the shop's
    Space are on the shop by themselves (Joe, 25 October).
  - **Generated lines follow their Meal:** a change to its ingredients or
    servings changes them; if it is removed or taken off the shop, its
    unticked lines go. A Meal's line isn't changed or deleted on the shop;
    more of it is added on Extra.
- **Lines without an Ingredient** stay possible ("bin bags", packing lists).
- **Who sees and edits** Recipes, Variations, the Pantry and lists is set by
  [ADR-0051](0051-who-sees-food.md): the catalogue is the Pantry, one for everyone in
  LifeOS, not Items in a Space; staples are each Household's.

## Consequences

- Removing or cancelling a Meal removes exactly its contribution.
- Open, for the Recipes spec: unit conversion (100 g + 1 cup), and whether a
  pantry ("what's in") is wanted later.
