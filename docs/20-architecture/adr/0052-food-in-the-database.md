# ADR-0052: Food in the database

**Status:** Provisionally agreed · 2026-10-18
**Amended:** 2026-10-23 by Joe's answers for step 9 (a Meal's own lines and link); 2026-10-24 by Joe's answers for Stage 4b (a food shop in its own Space, its Meals' lines unchanged on it).

## Context

The Stage 4 specs ([recipes](../../10-requirements/modules/recipes.md),
[meals](../../10-requirements/modules/meals.md)) and
[ADR-0051](0051-who-sees-food.md) set who sees and edits food. This decides
how the schema holds it and how the database enforces it
([ADR-0017](0017-enforcing-visibility.md),
[ADR-0009](0009-cross-table-writes-are-database-functions.md)).

## Decision

- **Recipe, Variation, Meal and Shopping list are Items** (`core.items`),
  declared in `packages/ontology` under the `food` and `shopping` Modules,
  with detail tables `food.recipe`, `food.variation`, `food.meal` (with an
  optional `source` link for a typed Meal),
  `shopping.shopping_list`.
- **Child rows:** `food.variation_lines` (amount, top of a range,
  approximate, unit, a Pantry entry or typed text, an optional subheading,
  position), `food.variation_steps`, `food.meal_lines` (a Meal's own
  lines, shaped as a Variation's but with no subheadings; written by
  whoever may edit the Meal), `food.cooks` (who, when, verdict,
  notes, servings, and a JSON **snapshot** of the Variation as cooked),
  `shopping.lines` (with the Meal each is *for*).
- **Recipes seen through a Household:** `readable_item_ids()` gains one
  path: Recipes and Variations whose owner shares any Household with me. A
  Recipe and its author's Variations stay in the author's Personal Space.
  **Writes stay owner-only**, as for every Item.
- **My Variation of your Recipe** is mine: in my Personal Space, linked to
  your Recipe by *variation of*. `food.add_variation()` checks I can read
  the Recipe, then makes the copy and the link.
- **Shopping lists are in their own Space** (amended 24 October): a food
  shop's Space is chosen, and everyone in it reads, ticks and adds; the
  Meals it is linked to bring their lines, whatever their Space. A Meal's
  lines aren't changed or deleted on the shop: they follow the Meal. How
  they are held and kept in step: [ADR-0057](0057-shopping-in-the-database.md)
  (rows the database writes).
- **The Pantry is not Items:** `food.pantry` (name, kind: ingredient or
  household, aisle, default unit, added by). Every signed-in person reads
  and adds; only whoever added an entry changes or deletes it; a delete is
  refused while any line points at it. `food.merge_pantry()` checks the
  merger added both, then repoints every line, everyone's.
- **Staples:** `food.staples` (Space, entry, out of stock), changed by
  anyone who can read the Space; from Stage 4b,
  a `kind` on it, staple or Essential, its out of stock meaning Required for
  an Essential ([ADR-0057](0057-shopping-in-the-database.md)).
- **Lists of values** (categories, cuisines, tags, protein, carbs) are each
  person's, in `food.values`; browsing pools those of everyone in my
  Households, the same name counting once.
- **Unique names** are checked by the function that creates or renames a
  Recipe: refused if a Recipe I can read already has it, ignoring case and
  spaces. Names that clash only because people joined are left alone.
- **Leaving and deleting a Household** are database functions: they copy
  the heading of each Recipe the leaver has Variations under, move those
  Variations to the copy, and make shared Items Personal to their creators
  ([ADR-0016](0016-sharing-and-visibility.md)).
- **The activity log grows to food:** triggers on the detail tables and
  child rows, so a Recipe's log can say "Salt 1 → 2 tsp"
  ([ADR-0030](0030-activity-log-by-triggers.md) allows this).
- **Slots** are narrowed to breakfast, lunch and dinner.
- **Photos** go to Supabase Storage through `core.attachments`, made WebP
  of about 250 KB on the device first.
- **The data model's Types table and diagrams are generated** from the
  ontology from now, as [ADR-0036](0036-changing-the-model-over-time.md)
  planned; `npm run check` fails when they are stale.

## Consequences

- The `can_read` benchmark is re-run with the Household path; if it slows
  past the [non-functional](../../10-requirements/non-functional.md#performance)
  limit, a table of Household peers kept by triggers replaces the lookup.
- Database tests cover each path: seeing a Household member's Recipe, not
  editing it, adding and keeping a Variation, a list in its Space, the
  Pantry's rules, and a Meal's lines following it onto a shop.
