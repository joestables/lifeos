# ADR-0069: Lists on Notes; the Meal plan and Shopping as Recipes' tabs

**Status:** Provisionally agreed · 2026-11-20 (Joe)

Amends [ADR-0026](0026-navigation-drawer.md) (the drawer),
[ADR-0050](0050-shopping-list.md) (a Shopping list is a food shop),
[ADR-0018](0018-changing-an-items-type.md) (a Note doesn't become a List),
[ADR-0043](0043-colour-by-type.md) (a food shop is green) and
[ADR-0057](0057-shopping-in-the-database.md) (no lists in `shopping`).

## Context

On 20 November Joe took the Meal plan and Shopping out of the drawer, with
Cardio, Goals, Finance and "Later". Food is planned, stocked and shopped
for from one page, Recipes. Shopping's Other tab held lists that weren't
food (Screwfix, Boots, packing); they belong with Notes, and needn't be
dated. Joe answered the questions that followed the same day.

## Decision

1. **The drawer** is Today, Week, Plan, Notes, Gym, Recipes and Wardrobe.
   A page joins it once its stage builds it; until then it isn't there at
   all (no "Later" group). Cardio's, Goals' and Finance's stages stay on
   the roadmap, and their blank pages are left unlinked.
2. **Recipes has five tabs:** Recipes, Ideas, Week, Pantry and Shop
   (`/recipes?tab=week|pantry|shop`). Week and Pantry are the Meal plan's
   tabs as they were, the Pantry's Pending still a page of its own; Shop is
   Shopping's Food. The page's action is New recipe on Recipes and Ideas,
   none on Week, New entry on Pantry and New shop on Shop. `/meal-plan` and
   `/shopping` open the same tab as before; a food shop's page stays at
   `/shopping/<id>`, back to Shop.
3. **A Shopping list is a food shop.** It is green, with Recipes and
   Meals, and no longer Capturable: a Thought or a Note doesn't become one.
   Shop shows the open shops only; a done shop leaves it, with no "Done
   shops", and Search still finds it.
4. **List is a new Type** in the core: a name and its lines, under my own
   subheadings, ticked as I go, on Notes' third tab, **Lists**. It has no
   date and isn't on Week or Plan. It is yellow with Notes and Thoughts,
   pinned and labelled as a Note is, and shown as a NoteCard of its first
   unticked lines. Unlike a Note it is **Shareable**: Personal to start, or
   a Household's, its members reading and ticking it, live. It is
   Completable: ticking its last line asks whether to complete it, and
   Complete list asks first while lines aren't ticked; a done List leaves
   Lists, and Search finds it.
5. **A Thought converts into a List** in place, named as it was; a Note
   doesn't (its text isn't lines), and a List converts into nothing.
6. **In the database:** a List is an Item of Type `list` with its lines in
   `core.list_lines(list_id, position, heading?, text?, checked)`, written
   by `core.add_list_line`, `update_list_line`, `remove_list_line` and
   `tick_list_lines`, read through its Item's Space and sent live by
   Realtime. A line is typed, never a Pantry entry. The lists on Shopping →
   Other became Lists, their ids, names, Spaces, lines and ticks kept, a
   household item's line kept by its name.

## Consequences

- `shopping.shopping_list.kind` is `food` for every shop from here, and
  `shopping.update_list` is used by nothing; both go in a later migration,
  once no app still sends them (expand, then contract;
  [migrations](../../40-operations/migrations.md)).
- A packing or DIY list can be a List now, as well as a Note with a
  checklist; Lists are what's shared.
- Search finds a List by a line on it on the device, as it does a food
  shop ([SRC-003](../../10-requirements/cross-cutting/search.md)).
