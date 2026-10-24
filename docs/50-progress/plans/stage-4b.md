# Plan: Stage 4b — Shopping

**Outcome** ([roadmap](../../roadmap.md)): Joe and his girlfriend shop
together from LifeOS. **Shopping** holds all their shopping lists: made by
hand, or made from the Meal plan's days with more added from the Pantry or
typed. One **Shopping list** Type takes the place of List and Shop
([ADR-0050](../../20-architecture/adr/0050-shopping-list.md)). A dated list
is on Plan with no Plan work
([ADR-0029](../../20-architecture/adr/0029-plan-reads-core-items.md)). What
the Meals need is protected, and a shared list updates live for both of
them.

**State:** started 24 October 2026, after Stage 4 closed (Joe, 24 October;
[its plan](stage-4.md)). The Shopping specs were drafted with Stage 4's
(step 1 there): [meals](../../10-requirements/modules/meals.md#shopping)
SHP-001–004 and what they change in Plan, items, Search, Inbox and
Households. Step 1 is Joe agreeing them, after the
[questions below](#questions-for-the-specs).

## Steps

Steps marked **Joe** need Joe's go-ahead or action before Claude does them.
Every step that builds a screen follows the [design system](../../30-design/README.md)
checklist and brings its own Playwright walks, citing the requirements it
verifies. The walks use a stand-in for Supabase, Realtime included.

| # | Step | State | Produces |
|---|---|---|---|
| 1 | **Joe** — specs: Shopping lists (SHP-001), from the Meal plan (SHP-002), adding (SHP-003), shopping together (SHP-004); and what they change elsewhere: dated lists on Plan ([PLN-008](../../10-requirements/views/plan.md#pln-008--meals-and-shopping-lists-on-plan) 2, 4, 5), opening, deleting and converting ([ITM-006](../../10-requirements/cross-cutting/items.md#itm-006--food-items) 1, 3, 5, 6), Search ([SRC-003](../../10-requirements/cross-cutting/search.md#src-003--find-recipes-and-shopping-lists) 2), a list's Space ([HSH-003](../../10-requirements/cross-cutting/spaces-and-sharing.md#hsh-003--several-households) 2), servings on a list ([MPL-003](../../10-requirements/modules/meals.md#mpl-003--change-a-meal) 4), staples on a list ([PAN-002](../../10-requirements/modules/meals.md#pan-002--staples-and-out-of-stock) 2, 3) | Drafted with Stage 4's specs (18 October), all *proposed*. Next: Joe's answers to the [questions](#questions-for-the-specs), then his agreement | [meals](../../10-requirements/modules/meals.md#shopping) (SHP-*), changes to Plan, items, Search, Inbox, spaces and sharing |
| 2 | Decisions: how a list's lines from Meals are held and kept in step with the Meals (one row per Meal and ingredient, shown as one line; made and removed by the database when a Meal changes, or by the app); totals in `packages/food` ([ADR-0053](../../20-architecture/adr/0053-quantities-and-units.md)); live updates with Supabase Realtime, the first in LifeOS ([ADR-0042](../../20-architecture/adr/0042-data-layer.md), [principles](../../00-foundation/principles.md) 9); repeating lists, if Joe wants them | — | ADRs, or amendments to ADR-0052 and ADR-0053 |
| 3 | **Joe** — design, with Claude design: Shopping (the lists, New list), a list (by aisle, or by my subheadings; ticking; adding with Pantry suggestions; Staples not added; done), New shopping list on the Meal plan (choosing days, a new list or one I pick), a list's card on Plan. Into the design spec first, then the shared components, with the screenshot tests refreshed | — | [design system](../../30-design/README.md), components |
| 4 | Schema: the `shopping` Module — Shopping list in the ontology; `shopping.shopping_list` and `shopping.lines`; lists readable, ticked and added to through their Meals ([ADR-0052](../../20-architecture/adr/0052-food-in-the-database.md)); a Meal's lines protected; the write functions; the generated data model; database tests | — | Migrations, database tests |
| 5 | Shopping page: the lists, New list, a list made by hand (subheadings, lines, reordering, ticking, done with Undo), adding with Pantry suggestions, dated lists on Plan, deleting and recovering, Search; Shopping joins the drawer (`shopping-cart`) | — | Code, tests citing SHP-001, SHP-003, PLN-008, ITM-006, SRC-003 |
| 6 | From the Meal plan: New shopping list (choosing days; a new list dated the first Meal's day, or one I pick), each Meal's lines scaled to its servings and its own as written, lines for one ingredient shown as one with their total and Meals, grouped by aisle with Other last, Staples not added, out-of-stock staples added, the list following the Meals as they change, a Meal's lines protected | — | Code, tests citing SHP-002, SHP-003, MPL-003, PAN-002 |
| 7 | Shopping together: a list holding a Household Meal's lines seen by every member; ticks and new lines shown to the other within a second or two; ticks with no signal kept and sent when it returns | — | Code, tests citing SHP-004, HSH-003 |
| 8 | A Thought or Note sorted into a Shopping list: split at the commas (a Note's lines or checklist), "buy" dropped, each line matched to the Pantry where it can be | — | Code, tests citing SHP-003 4, ITM-006 5–6 |
| 9 | Left from Stage 4, if Joe agrees ([question 6](#questions-for-the-specs)): saving a recipe idea from another app on Android ([RCP-003](../../10-requirements/modules/recipes.md#rcp-003--save-an-idea-from-another-app), [ADR-0055](../../20-architecture/adr/0055-sharing-into-lifeos.md)) | — | Code, tests citing RCP-003 |
| 10 | **Joe** — uses Shopping in a real shop; what he trips over is fixed | — | Code, tests |

Each step's code goes into the specs' status as it lands (*built*, then
*verified* when a test citing the ID passes).

## Questions for the specs

Claude's recommendation is given with each question.

1. **Repeating lists.** ADR-0050 left open whether unticked lines carry
   over to a repeating list's next occurrence. *Recommended:* Shopping
   lists don't repeat in 4b. A standing list ("Household essentials") does
   that job, and a list from the Meal plan is made fresh each week. That
   settles the roadmap's open question; repeats can come later if they are
   missed.
2. **A standing list after a shop.** A standing list is never done, so its
   ticked lines pile up. *Recommended:* "Clear ticked" in its menu removes
   them, with Undo.
3. **Ticking an out-of-stock staple** (marked *Suggested* in the Pantry
   spec). *Recommended:* yes, ticking it on a list marks it in stock again.
4. **A Meal changed after its list is made.** SHP-002 5 covers a Meal
   removed or moved off the list's days. *Recommended:* a change to its
   servings, Variation or own lines updates its unticked lines too, and a
   Meal added on the list's days adds its lines. Ticked lines stay as they
   are.
5. **A list's done.** *Recommended:* ticking the last line offers "Done"
   for a dated list. It is never done by itself.
6. **Android's share target** (RCP-003, a Must from Stage 4) isn't built.
   *Recommended:* build it here as step 9, since it is small and Stage 4
   closed without it.

## Done when

- Every **Must** requirement in this stage's specs is *verified* (a test
  citing its ID passes).
- Joe and his girlfriend do a week's shop from a list made from the Meal
  plan, both ticking as they go.
- No two documents conflict.
