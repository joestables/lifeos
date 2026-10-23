# Meals: the Meal plan, the Pantry and Shopping

*Stage 4 (the Meal plan and the Pantry, in the `food` Module) and Stage 4b
(Shopping, in the `shopping` Module). **A draft for Joe to refine**, from
Joe's brief and answers (17 October) and his comments on the first round
(18 October), with Claude's own suggestions marked **(suggested)**.
Households themselves are core: [spaces and sharing](../cross-cutting/spaces-and-sharing.md).
Everything is *proposed* until Joe agrees it. Recipes themselves are in
[recipes](recipes.md).*

**In one line:** **Meal plan** is where the week's meals are planned, with
the **Pantry** of ingredients and household items; **Shopping** holds every
shopping list, made by hand or from the meal plan
([ADR-0026](../../20-architecture/adr/0026-navigation-drawer.md),
Provisionally agreed).

## Decisions

### The Meal plan

- **A week view** (Joe, 18 October). On a computer, laid out as Plan's week
  ([patterns](../../30-design/patterns.md#plan)); on a phone, the week's
  days stacked one under another. Meals drag between days and slots on
  both. The week starts on Monday.
- **Three fixed slots: Breakfast, Lunch, Dinner** (Joe, 18 October), the
  same for everyone, not set in Settings.
- **A Meal is a Recipe planned in a slot**, with its own servings. It uses
  one Variation (the default unless I pick another), linked by *uses*
  ([ADR-0011](../../20-architecture/adr/0011-recipe-and-variation.md),
  Provisionally agreed). Quantities scale by the Meal's servings ÷ the
  Variation's.
- **A Meal I type** — "Out: Dishoom", "Takeaway" — needs no Recipe (Joe,
  18 October).
- **A Meal can have its own ingredients** (Joe, 23 October): lines, as a
  Variation's are, chosen from the Pantry or kept as typed — Milk for a
  typed "Cornflakes", or garlic bread beside a Recipe's Meal. A typed Meal
  can also take **a link** to a recipe I want to try before it's one of
  mine: the AI reads the page's ingredients into the Meal's lines, and
  nothing else (no method, no Recipe). A Meal's own lines go to a shopping
  list as written, not scaled; a link sets the Meal's servings to the
  page's (Suggested).
- **Leftovers of a Meal** fill a later slot, marked as leftovers and named
  after the Meal they come from; they add nothing to a shopping list.
  Removing the first Meal removes its leftovers (Joe, 18 October).
- **A Meal is Personal or belongs to one of my Households**
  ([ADR-0051](../../20-architecture/adr/0051-who-sees-food.md),
  Provisionally agreed). A new Meal takes my default from Settings →
  Food (Personal, or one of my Households), and the week can be filtered to
  Personal, one Household or all (Joe, 18 October).
- **Ticking a Meal eaten logs no cook**: a cook is logged from Cooking
  ([recipes](recipes.md#the-log); Joe, 18 October). No Reminder by default.
- **Meals are on Plan too**, as every Schedulable Type is, and Plan's "+"
  adds one ([ADR-0029](../../20-architecture/adr/0029-plan-reads-core-items.md),
  Provisionally agreed).

### The Pantry

- **The Meal plan's Pantry tab** holds ingredients and household items ("bin
  bags", "kitchen roll"), shown apart (Joe, 18 October). Ingredients are
  offered in recipes and shopping lists; household items only in shopping
  lists. Both are one catalogue underneath.
- **One Pantry for everyone in LifeOS** (ADR-0051): anyone may add an entry,
  and everyone sees and uses it. Only the person who added an entry may
  change, merge or delete it; an entry any Recipe uses can't be deleted.
- **An entry has a name, an aisle and a default unit.** The aisle is one of
  **Fruit & Veg, Bakery, Protein, Chilled, Cupboard, Frozen**, in that order
  (Joe, 17 October); a new ingredient starts in Cupboard. A household item's
  aisle is **Household**, after Frozen, and only household items use it (Joe,
  18 October).
- **Staple and out of stock are each Household's**, not the entry's
  (ADR-0051): any member marks which entries are the Household's staples,
  and a staple that has run out as **out of stock**. Without a Household
  they are mine; my first Household starts with a copy of them, and I keep
  mine for Personal lists (Joe, 18 October). A list uses the staples of the
  Space it belongs to.
- **Merging two entries** that are the same ("Spring onions", "Scallions")
  keeps one, under a name I choose; at most two at a time, and only when I
  added both (Joe, 18 October).

### Shopping

- **A Shopping list** is one Type, made by hand or from the meal plan
  ([ADR-0050](../../20-architecture/adr/0050-shopping-list.md),
  Provisionally agreed). It may have a date (then it's on Plan, and ticked
  done when the shop is done) or none (a standing list).
- **Made from the meal plan**, for the days I choose: their Meals'
  ingredients, a Recipe's scaled to each Meal's servings and a Meal's own
  as written, go into a new list or one I pick. A new list is dated the day of its first Meal, and can be dragged on
  Plan (Joe, 18 October). Lines for the same ingredient show as one,
  totalled where the units allow ("Chicken thighs 1.2 kg · Katsu Thu, Curry
  Sat") ([ADR-0012](../../20-architecture/adr/0012-ingredients-and-shopping-lists.md),
  Provisionally agreed).
- **What the Meals need is protected** (Joe, 18 October): on a list made
  from the meal plan I can add lines and raise an amount, but not delete a
  Meal's line or lower it below what the Meals need. Removing a Meal from
  the plan, or moving it off the list's days, takes its unticked lines with
  it.
- **Grouping:** a list from the meal plan is grouped by aisle, lines without
  a Pantry entry under **Other**, last. A list made by hand can instead have
  my own subheadings, with lines under each (Joe, 18 October).
- **Staples** aren't added from Meals; the list shows **Staples not added**,
  each added with a tap. **Out-of-stock staples** are added to the next list
  I make, whether or not a Meal needs them (Joe, 18 October). **(Suggested)**
  Ticking one off on a list marks it in stock again.
- **A list is the Household's** if it holds any Household Meal's lines, and
  every member sees all of it, even its Personal Meals' lines (ADR-0051).
  For example: Sam plans a Household dinner, I plan a Personal lunch, and
  my list from the meal plan takes both; because it holds the Household
  dinner, Sam sees the whole list (Joe, 18 October). A list holding
  Meals of two of my Households is seen by both (Joe, 18 October). Shared lists update live
  ([principles](../../00-foundation/principles.md), 9).
- **Totals:** units of one kind add up (500 g + 1 kg = 1.5 kg; ml, l, tsp,
  tbsp together); weight and volume sit side by side; a range counts as its
  top; "~" carries into the total; an unmeasured line on top of a measured
  one shows "+" ("Salt 5 g +").

## What the pages show

**Meal plan.** Two tabs. **Week**: Monday to Sunday — columns on a computer,
days stacked on a phone — each day's Breakfast, Lunch and Dinner with their
Meals (photo, name, servings; leftovers marked); ‹ Today › and a date, as on
Plan; a filter for Personal, each Household or all; "New shopping list";
"Copy week" tucked in the week's menu. **Pantry**: ingredients by aisle, then
household items, staples and out-of-stock marked, with a search.

**Shopping.** The lists — dated ones by date, then standing ones — each
opening to its lines by aisle or by my subheadings, with ticking, adding and
done.

## Requirements

*Statuses: proposed → agreed → built → verified.*

### MPL-001 — The week

**As** Joe, **I want** the week's meals on one page, **so that** I can plan
what we eat.
Priority: Must · Status: built

Acceptance criteria
1. Given Meal plan on a computer, then this week shows as Plan's week does,
   Monday first, each day with Breakfast, Lunch and Dinner and their Meals:
   photo, name, servings, and the Variation when the Recipe has more than
   one.
2. Given a phone, then the same week shows with its days stacked, today's
   first in view.
3. Given ‹, ›, Today or a date, then that week shows.
4. Given leftovers, then they're marked as leftovers, with the Meal they
   come from.
5. Given the filter, then the week shows Personal Meals, one Household's,
   or all of mine.

### MPL-002 — Plan a Meal

**As** Joe, **I want** to put a Recipe in a slot quickly, **so that**
planning the week takes minutes.
Priority: Must · Status: built

Acceptance criteria
1. Given a slot's "+", then a search opens, listing the Recipes I planned
   most recently first, with my categories to narrow it (Dinner, Baking…);
   choosing one adds a Meal of its default Variation, or offers its
   Variations when it has more than one.
2. Given a new Meal, then its servings are the Variation's until I change
   them on the Meal, a change to the Variation's showing on the plan too
   (Joe, 23 October); cleared, they are the Variation's again. Its Space is my default from Settings → Food (Personal or one
   of my Households) until I change it.
3. Given the "+", then I can instead type a Meal ("Out: Dishoom"), or
   choose Leftovers of an earlier Meal.
4. Given Plan's "+" on a day, when I choose Meal, then the same search adds
   it to that day, in the slot I choose.

### MPL-003 — Change a Meal

**As** Joe, **I want** to move, rescale or remove a Meal, **so that** the
plan follows the week as it really goes.
Priority: Must · Status: built (4 with Shopping, Stage 4b)

Acceptance criteria
1. Given a Meal, when I press it, then it opens: its Recipe (the Variation
   it planned), servings, Personal or Household, eaten, its own
   ingredients, Remove.
2. Given a computer or a phone, when I drag a Meal to another day or slot,
   then it moves, with Undo.
3. Given a Meal with leftovers, when I remove it, then its leftovers go too,
   with Undo.
4. Given a Meal on a shopping list, when I change its servings, then what it
   needs on the list changes with it.
5. Given I tick a Meal eaten, then it shows eaten, and no cook is logged.

### MPL-006 — A Meal's own ingredients

**As** Joe, **I want** to give any Meal ingredients, or read them from a
recipe's link, **so that** what I'll shop for includes Meals that aren't
Recipes (Joe, 23 October).
Priority: Should · Status: built (lines going to a shopping list with Shopping, Stage 4b)

Acceptance criteria
1. Given a Meal that isn't leftovers, then I add, change, reorder and
   delete its own ingredient lines, as a Variation's
   ([RCP-007](recipes.md#rcp-007--ingredient-lines)) but with no
   subheadings: Cornflakes, then Milk from the Pantry.
2. Given a typed Meal, when I give it a link to a recipe and choose Get
   ingredients, then the page's ingredients, with their amounts and units,
   become the Meal's lines, matched to the Pantry or kept as typed, and its
   servings the page's; the link stays on the Meal, to open. When it had
   lines, I'm asked first, and Undo puts them back.
3. Given a page that isn't a recipe, or the AI unavailable, then I'm told
   so and the lines are unchanged.
4. Given a Recipe's Meal, then its own lines are extras beside the
   Recipe's, not part of it.
5. Given Copy week, then a Meal's own lines and link are copied with it.
6. Given a typed Meal without a picture, when I give it a link, then the
   page's picture becomes its photo; a Recipe's Meal shows its Recipe's
   photo, and leftovers the photo of the Meal they are of, on the plan
   (Joe, 23 October).

### MPL-005 — My default for new Meals

**As** Joe, **I want** to choose where new Meals go, **so that** I don't set
it on every Meal.
Priority: Should · Status: built

Acceptance criteria
1. Given Settings → Food, then I choose Personal or one of my Households as
   the default for new Meals; Personal until I choose.

### MPL-004 — Copy a week

**As** Joe, **I want** to start a week from an earlier one, **so that** a
good week is quick to repeat.
Priority: Could · Status: built

Acceptance criteria
1. Given Copy week in the week's menu (not on the page itself), when I
   choose another week, then the Meals are made again on the same days and
   slots.

### PAN-001 — The Pantry

**As** Joe, **I want** to search and manage the Pantry, **so that** it stays
useful as my recipes grow.
Priority: Must · Status: built

Acceptance criteria
1. Given Meal plan → Pantry, then ingredients show under their aisles, in
   aisle order, with how many Recipes use each (on a computer), then household items apart;
   staples and out-of-stock are marked; a search narrows them.
2. Given New, then I add an ingredient or a household item: a name, an
   aisle (Cupboard to start) and a default unit.
3. Given an entry I added, then I change its name, aisle and default unit,
   and a rename shows in every Recipe at once; someone else's I can't
   change.
4. Given an entry I added that nothing uses, then I can delete it, with
   Undo; one in use can't be deleted, and says where it is used: the
   Recipes, then the Meals whose own lines use it (MPL-006), or "Used in
   something deleted" when only a deleted Recipe or Meal does.
5. Given an entry, then I see which Recipes use it.

### PAN-002 — Staples and out of stock

**As** Joe, **I want** to mark staples, and a staple that's run out, **so
that** I buy it on the next shop.
Priority: Must · Status: built (1; 2 and 3 with Shopping, Stage 4b)

Acceptance criteria
1. Given any entry, then any member of the Household ticks it as one of the
   Household's staples, or unticks it; without a Household, as mine. In
   two or more, the Pantry shows the staples of where my new Meals go
   (Settings → Food; MPL-005).
2. Given a staple, when I mark it out of stock, then it is added to the next
   shopping list I make, whether or not a Meal needs it.
3. **(Suggested)** Given an out-of-stock staple on a list, when I tick it
   off, then it is in stock again.

### PAN-003 — Merge two entries

**As** Joe, **I want** to merge two entries that are the same thing, **so
that** the Pantry has one of each.
Priority: Should · Status: built

Acceptance criteria
1. Given an entry, when I merge it into another I choose, then the one
   chosen is kept, with its name and aisle, and every recipe, Meal and list
   line points at it (Joe, 23 October).
2. Given more than two selected, or one I didn't add, then Merge isn't
   offered.

### PAN-004 — Entries from a Recipe

**As** Joe, **I want** to add to the Pantry from the line I'm typing, **so
that** I don't stop writing the recipe.
Priority: Must · Status: built

Acceptance criteria
1. Given a recipe or Meal line naming something new, when I choose Add to
   the Pantry, then I choose its aisle (Cupboard to start) and default unit
   (the line's to start), and the line links to it ([RCP-007](recipes.md#rcp-007--ingredient-lines)).
   A line kept as typed offers the same from its mark (Joe, 23 October).
2. Given lines kept as typed in my Recipes, then the Pantry lists them by
   name, to add one at a time or all at once (in Cupboard); each line then
   uses the new entry.
3. Given an entry with no default unit, when a line using it is given a
   unit, then that unit becomes its default (Joe, 23 October).

### SHP-001 — Shopping lists

**As** Joe, **I want** all my shopping lists in one place, **so that** I
know what to buy.
Priority: Must · Status: proposed (Stage 4b)

Acceptance criteria
1. Given Shopping, then my lists show: dated ones by date, then standing
   ones; done lists are a press away.
2. Given New list, then I name it, and may give it a date, a time and a
   place; a dated list shows on Plan.
3. Given a list made by hand, then I add subheadings and lines under them,
   and reorder both.
4. Given any list, then I tick lines as I go, ticked ones moving to the foot
   of their group.
5. Given a dated list, when I tick it done, then it leaves the list of
   lists, with Undo.

### SHP-002 — A shopping list from the meal plan

**As** Joe, **I want** a list made from the meals I've planned, **so that**
I buy exactly what they need.
Priority: Must · Status: proposed (Stage 4b)

Acceptance criteria
1. Given the Meal plan, when I choose New shopping list and pick days,
   then each Meal's ingredients — its Recipe's, scaled to its servings, and
   its own as written (MPL-006) — go to a new list dated the day of the
   first Meal, or to a list I pick.
2. Given the same ingredient for two Meals, then it shows as one line with
   its total and the Meals it's for, grouped by aisle; lines kept as typed
   in a recipe go under Other.
3. Given staples a Meal needs, then they aren't added, and Staples not added
   lists them, each added with a tap.
4. Given out-of-stock staples, then they're added, whether or not a Meal
   needs them.
5. Given a Meal later removed or moved off the list's days, then its
   unticked lines go.

### SHP-003 — Add to a list

**As** Joe, **I want** to add anything to a list without breaking what the
Meals need, **so that** one list holds the whole shop.
Priority: Must · Status: proposed (Stage 4b)

Acceptance criteria
1. Given a list, when I type, then Pantry entries are suggested, each
   joining its aisle (or my subheading); anything else is added as typed,
   under Other.
2. Given a line, then I can give it an amount and unit, which adds to any
   total from Meals.
3. Given a Meal's line, then I can't delete it or lower its amount below
   what the Meals need; I can raise it.
4. Given a Thought in Inbox ("buy milk, bread, eggs"), when I sort it into a
   Shopping list, then a new list is made with milk, bread and eggs as its
   lines, split at the commas, "buy" dropped.

### SHP-004 — Shopping together

**As** Joe, **I want** a list we share to update for both of us at once,
**so that** we don't buy things twice.
Priority: Should · Status: proposed (Stage 4b)

Acceptance criteria
1. Given a list holding any Household Meal's lines, then every member of
   the Household sees it.
2. Given a shared list, when one of us ticks or adds a line, then the other
   sees it within a second or two.
3. Given no signal in the shop, then ticks are kept and sent when it
   returns.

Non-goals: tracking stock beyond staples' out of stock; nutrition and
macros; prices; ordering online; AI planning of the week (later); a
Meal's method, or turning a Meal's link into a Recipe (Joe, 23 October).

## Open points for Joe

None at present.
