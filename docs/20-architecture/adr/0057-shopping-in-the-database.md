# ADR-0057: Shopping in the database, and live

**Status:** Provisionally agreed · 2026-10-24 (Joe)

## Context

The Shopping specs ([meals](../../10-requirements/modules/meals.md#shopping),
SHP-001–005, agreed 24 October) leave four things to Stage 4b's step 2
([plan](../../50-progress/plans/stage-4b.md)):

- how a food shop's lines from its Meals are held, and kept in step as the
  Meals change;
- where each Space's Staples and Essentials are kept;
- totals;
- live updates, the first in LifeOS
  ([ADR-0042](0042-data-layer.md), [principles](../../00-foundation/principles.md) 9).

The shape the specs force:

- **A food shop is for one Space.** Everyone in it sees all of it, even
  lines from a Meal they can't read: my Personal lunch, or a Meal of my
  parents' Household on our shop ([ADR-0051](0051-who-sees-food.md)).
- **A Meal's lines follow it.** They change when its servings, Variation or
  own lines change, and go when it is removed or taken off. They are never
  changed on the shop.
- **Ticks are shared**, made with no signal, and survive the Meals changing.

There were two ways to hold a Meal's lines:

1. **Work them out on the device** from the Meals and Recipes, storing only
   ticks and Extra. But my girlfriend's device would then have to read my
   Personal Meals, my parents' Meals and their Recipes. That means a new
   read path through the shop for every food table, and a tick keyed to
   something that has no row.
2. **Rows the database writes**, in the shop's Space. RLS stays one rule
   (the shop's Space), a tick is a column on a row, and Realtime has rows
   to send.

## Decision

- **`shopping.shopping_list(item_id, kind)`** (a date only, as `do_on`: no time or place, ADR-0050), `kind` food or list,
  a Shopping list being an Item in the `shopping` Module
  ([ADR-0052](0052-food-in-the-database.md)).
- **`shopping.list_meals(list_id, meal_id)`** links a food shop to its
  Meals: its own table, not `core.links`, because readers of the shop
  needn't be able to read the Meal. A Meal is on one open food shop at
  most, checked by the function that adds it. `shopping.meals_of(list)`
  (security definer, checking I can read the list) gives each Meal's name,
  day and slot for the Meals tab and for "Katsu Thu".
- **`shopping.lines`**: `position`, `heading` (a list's subheading), Pantry
  entry or typed `text`, `qty`, `qty_max`, `approx` and `unit` (as a
  Variation's line), `checked`, and:
  - `meal_id` and `source_id` on a Meal's line: the Meal it is for, and the
    Variation's or Meal's own line it came from;
  - `needed_space_id` on a line added from a Space's Needed, saying which
    Space its out of stock or Required is cleared in (SHP-003 4).
- **A Meal's lines are written by the database.**
  `shopping_private.refresh_meal(meal)` (security definer) works out the
  Meal's lines and writes them into its open shop:
  - its Variation's lines scaled by the Meal's servings over the
    Variation's, plus the Meal's own lines; leftovers have none;
  - it runs from triggers when a Meal's servings, Variation (its *uses*
    link), own lines or state change, when it is deleted or taken off
    a shop, and when a Variation's lines or servings change (for each Meal
    on an open shop using it);
  - **unticked lines are replaced, ticked lines left as they are**
    (SHP-002 5): a ticked line whose Meal then needs more stays ticked,
    and nothing is added for the difference.
  - Scaling is multiplication only. Units, totals and rounding stay on the
    device ([ADR-0053](0053-quantities-and-units.md)).
  - Staples are written like any line. The device hides the shop's Space's
    staples from All and Meals, and shows them under Staples the Meals use.
    So changing the Staples list or the shop's Space rewrites nothing.
- **Extra's lines and ticks are written through the write queue**, like
  every other write ([ADR-0042](0042-data-layer.md)).
  - Ticking a row in All ticks every line under it, in one call.
  - A Meal's line refuses any change but its tick.
  - Ticking a line clears its out of stock or Required, as SHP-003 4 says,
    in the same call.
- **Offline,** a Meal added to a shop shows lines worked out on the device
  from what it holds, with the same scaling, until the server's arrive and
  replace them. A Meal the device can't read shows no lines until then.
- **Staples and Essentials:** `food.staples` gains a `kind`, staple or
  Essential, and its `out_of_stock` means needed: out of stock for a staple,
  Required for an Essential. An entry is one or the other in a Space, not
  both. Anyone who can read the Space changes it, as before. (As built, step
  4: first written as a new `food.space_entries`; the table keeps its name
  so the Pantry built in Stage 4 keeps working until step 5 takes its
  staple marks away: expand, then contract.)
- **Totals** are `packages/food`'s, as ADR-0053 sets. All collates by Pantry
  entry, or by a typed line's text ignoring case. Units of one kind add up;
  others sit side by side.
- **Live updates: Supabase Realtime's Postgres Changes** on
  `shopping.lines`, `shopping.list_meals` and `shopping.shopping_list`.
  - Realtime checks RLS for each subscriber, so a change reaches only
    those who can read the list.
  - The app subscribes only while Shopping or a shop is open, filtered to
    that shop's id on a shop's page.
  - On a change, the data layer refreshes that query, rather than applying
    the change itself. So unsent writes stay laid over it as they are now,
    and there is one way in for data.
  - On reconnecting, it refreshes too, so nothing missed while away is
    lost.
  - Two people and one list are far inside Realtime's free limits, so
    Broadcast, which scales further for large rooms, isn't needed.

## Consequences

- One trigger function on several tables, with database tests for each
  change it follows: servings, Variation, own lines, a Variation's lines,
  removal, taking off, and ticks kept. `refresh_meal` deletes rows, so its
  migration is run by Joe in the SQL editor, as before
  ([migrations](../../40-operations/migrations.md)).
- A Meal's lines on a shop are copies. A Pantry rename shows at once,
  since they point at the entry, but a past shop no longer changes when
  its Meals do (only open shops are refreshed).
- The tables join the `supabase_realtime` publication. Realtime's Postgres
  Changes doesn't check RLS on deletes, and sends only the deleted row's
  id. The app then refreshes, so nothing more is shown.
- The browser walks' stand-in grows Realtime: a second page's change
  arriving.
- Amends [ADR-0052](0052-food-in-the-database.md) (lines held as rows the
  database writes; staples gain their kind) and
  [ADR-0042](0042-data-layer.md) (live updates arrive).

## As built (24 October, plan step 4)

- Migrations `stage4b_shopping_schema` (the tables, RLS, the writes that
  don't delete, `food.staples.kind`, the Realtime publication) and
  `stage4b_shopping_refresh` (`refresh_meal` and its triggers, taking a
  Meal off, deleting a line, merges moving shopping lines), split because
  the second's deletes are run by Joe in the SQL editor.
- A guard trigger lets only the database write, change or remove a Meal's
  line (a transaction setting, `shopping.refreshing`, marks its own
  writes); people change only its tick.
- A Pantry entry deleted leaves its shopping lines as typed, with its name,
  as a past Meal's lines are; a merge moves them.
- Ticking a line, with `shopping.tick`, clears out of stock or Required in
  the same call. Taking a staple or Essential off reuses
  `food.set_staple(…, false)`; `food.keep_entry` keeps one, of a kind.
- `shopping.meals_of(list)` names a shop's Meals for its readers.
- Database tests: `shopping_test` (31).
