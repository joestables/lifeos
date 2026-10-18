# ADR-0052: Food in the database

**Status:** Provisionally agreed · 2026-10-18

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
  with detail tables `food.recipe`, `food.variation`, `food.meal`,
  `shopping.shopping_list`.
- **Child rows:** `food.variation_lines` (amount, top of a range,
  approximate, unit, a Pantry entry or typed text, an optional subheading,
  position), `food.variation_steps`, `food.cooks` (who, when, verdict,
  notes, servings, and a JSON **snapshot** of the Variation as cooked),
  `shopping.lines` (with the Meal each is *for*).
- **Recipes seen through a Household:** `readable_item_ids()` gains one
  path: Recipes and Variations whose owner shares any Household with me. A
  Recipe and its author's Variations stay in the author's Personal Space.
  **Writes stay owner-only**, as for every Item.
- **My Variation of your Recipe** is mine: in my Personal Space, linked to
  your Recipe by *variation of*. `food.add_variation()` checks I can read
  the Recipe, then makes the copy and the link.
- **Shopping lists seen through their Meals:** a list is readable, and its
  lines can be ticked and added to, by anyone who can read a Meal any of
  its lines is for, as well as by its own Space. A trigger refuses deleting
  a Meal's line or lowering it below what the Meals need
  ([ADR-0053](0053-quantities-and-units.md)).
- **The Pantry is not Items:** `food.pantry` (name, kind: ingredient or
  household, aisle, default unit, added by). Every signed-in person reads
  and adds; only whoever added an entry changes or deletes it; a delete is
  refused while any line points at it. `food.merge_pantry()` checks the
  merger added both, then repoints every line, everyone's.
- **Staples:** `food.staples` (Space, entry, out of stock), changed by
  anyone who can read the Space.
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
  editing it, adding and keeping a Variation, a list seen through a Meal,
  the Pantry's rules, and a Meal's protected lines.
