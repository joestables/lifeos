# Meals: the Meal plan, Ingredients and Shopping

*Stage 4 (the Meal plan and Ingredients, in the `food` Module) and Stage 4b
(Shopping, in the `shopping` Module). **A draft for Joe to refine**, from
Joe's brief and answers of 17 October, with Claude's own suggestions marked
**(suggested)**. Everything is *proposed* until Joe agrees it. Recipes
themselves are in [recipes](recipes.md).*

**In one line:** **Meal plan** is where the week's meals are planned and the
Ingredient database lives; **Shopping** holds every shopping list, made by
hand or from the meal plan
([ADR-0026](../../20-architecture/adr/0026-navigation-drawer.md),
Provisionally agreed).

## Decisions

### The Meal plan

- **A Meal is a Recipe planned on a day**, in a slot — breakfast, lunch,
  dinner or snack — with its own servings. It uses one Variation (the
  default unless I pick another), linked by *uses*
  ([ADR-0011](../../20-architecture/adr/0011-recipe-and-variation.md),
  Provisionally agreed). Quantities scale by the Meal's servings ÷ the
  Variation's.
- **The week starts on Monday**, like Plan; the page shows the slots I use,
  an empty one offering "+" (Joe, 17 October).
- **(Suggested) A Meal without a Recipe** — "Out: Dishoom", "Takeaway" —
  fills a slot and adds nothing to a shopping list.
- **(Suggested) Leftovers:** a Meal can be "leftovers of" an earlier one, so
  a batch cooked Sunday feeds Monday's lunch; it buys nothing extra and logs
  no cook.
- **Meals are on Plan too**, as every Schedulable Type is, and Plan's "+"
  adds one ([ADR-0029](../../20-architecture/adr/0029-plan-reads-core-items.md),
  Provisionally agreed).
- **A Meal is ticked "eaten".** ADR-0011 has that log a cook too; Claude
  recommends it doesn't, since a cook is logged from Cooking with its
  verdict and snapshot ([recipes](recipes.md#the-log); open point 2). No
  Reminder by default.

### Ingredients

- **An Ingredient is an Item**: a name, an **aisle**, a default unit and a
  *staple* flag
  ([ADR-0012](../../20-architecture/adr/0012-ingredients-and-shopping-lists.md),
  Provisionally agreed). Many Recipes' lines point at one Ingredient.
- **The aisle is required**, one of six, in this order: **Fruit & Veg,
  Bakery, Protein, Chilled, Cupboard, Frozen** (Joe, 17 October). A shopping
  list is grouped in that order; a line with no Ingredient ("bin bags", a
  recipe line kept as typed) goes under **Other**, last.
- **The database is the Meal plan's Ingredients tab** (Joe, 17 October).
- **A staple** (salt, olive oil) isn't added to a list from the meal plan;
  it's offered as "Check you have" instead (ADR-0012). No pantry.

### Shopping

- **A Shopping list** is one Type, made by hand or from the meal plan
  ([ADR-0050](../../20-architecture/adr/0050-shopping-list.md),
  Provisionally agreed). It may have a date (then it's on Plan and ticked
  done when the shop is done) or none (a standing list).
- **From the meal plan:** "Make a shopping list" for the days I choose takes
  their Meals' ingredients into a new list, or into one I pick. Each line is
  *for* its Meal; lines for the same Ingredient show as one, totalled where
  the units allow ("Chicken thighs 1.2 kg · Katsu Thu, Curry Sat")
  (ADR-0012; Joe, 17 October).
- **Then I add more**, from the Ingredient database or typed.
- **A list follows its Meals:** removing a Meal from the plan, or moving it
  off the list's days, takes its unticked lines with it; a line I edited or
  ticked stays (ADR-0012).
- **Totals:** units of one kind add up (500 g + 1 kg = 1.5 kg; ml, l, tsp,
  tbsp together); weight and volume sit side by side; a range counts as its
  top; "~" carries into the total; an unmeasured line on top of a measured
  one shows "+" ("Salt 5 g +").
- **Shared lists update live**, so two people in a shop see each other's
  ticks ([principles](../../00-foundation/principles.md), 9).

## What the pages show

**Meal plan.** Two tabs. **Week**: Monday to Sunday, each day with its
slots and Meals (photo, name, servings); ‹ Today › and a date, as on Plan;
"Make a shopping list". On a phone, one day at a time with the week's strip.
**Ingredients**: the database by aisle, with a search.

**Shopping.** The lists — dated ones by date, then standing ones — each
opening to its lines by aisle, with ticking, adding and done.

## Requirements

*Statuses: proposed → agreed → built → verified. All proposed.*

### MPL-001 — The week

**As** Joe, **I want** the week's meals on one page, **so that** I can plan
what we eat.
Priority: Must · Status: proposed

Acceptance criteria
1. Given Meal plan, then this week shows, Monday first, each day with the
   slots I use and their Meals: photo, name, servings, and the Variation
   when the Recipe has more than one.
2. Given ‹, ›, Today or a date, then that week shows; on a phone, one day,
   with the week's strip.
3. Given Settings, then I choose which slots show (all four by default).

### MPL-002 — Plan a Meal

**As** Joe, **I want** to put a Recipe in a slot quickly, **so that**
planning the week takes minutes.
Priority: Must · Status: proposed

Acceptance criteria
1. Given a slot's "+", then a search opens in place, listing the Recipes I
   planned most recently first; choosing one adds a Meal of its default
   Variation, or offers its Variations when it has more than one.
2. Given a new Meal, then its servings are the Variation's until I change
   them.
3. Given Plan's "+" on a day, when I choose Meal, then the same search adds
   it to that day, in the slot I choose.
4. **(Suggested)** Given the "+", then I can type a Meal with no Recipe, or
   choose Leftovers of an earlier Meal.

### MPL-003 — Change a Meal

**As** Joe, **I want** to move, rescale or remove a Meal, **so that** the
plan follows the week as it really goes.
Priority: Must · Status: proposed

Acceptance criteria
1. Given a Meal, when I press it, then it opens: its Recipe (the Variation
   it planned), servings, eaten, Remove.
2. Given a computer, when I drag a Meal to another day or slot, then it
   moves, with Undo; on a phone, Move offers a day and slot.
3. Given a Meal on a shopping list, when I change its servings, then its
   unticked lines change with it.

### MPL-004 — Copy a week

**As** Joe, **I want** to start a week from an earlier one, **so that** a
good week is quick to repeat.
Priority: Could · Status: proposed

Acceptance criteria
1. Given a week, when I copy it to another, then its Meals are made again on
   the same days and slots.

### ING-001 — The Ingredient database

**As** Joe, **I want** to search and manage my ingredients, **so that** the
database stays useful as my recipes grow.
Priority: Must · Status: proposed

Acceptance criteria
1. Given Meal plan → Ingredients, then every Ingredient shows under its
   aisle, in aisle order, with how many Recipes use it; a search narrows
   them.
2. Given an Ingredient, then I change its name, aisle, default unit and
   staple flag; a rename shows in every Recipe at once.
3. Given an Ingredient, then I see which Recipes use it.
4. Given an Ingredient nothing uses, then I can delete it; one in use can't
   be deleted, and says where it is used.
5. **(Suggested)** Given two Ingredients that are the same ("Spring
   onions", "Scallions"), when I merge them, then every line points at the
   one I keep.

### ING-002 — Ingredients from a Recipe

**As** Joe, **I want** to add an ingredient to the database from the line
I'm typing, **so that** I don't stop writing the recipe.
Priority: Must · Status: proposed

Acceptance criteria
1. Given a recipe line naming something new, when I choose Add to
   ingredients, then it is made with the aisle I pick and the line's unit as
   its default, and the line links to it ([RCP-007](recipes.md#rcp-007--ingredient-lines)).
2. Given lines kept as typed, then the Ingredients tab lists them, to add
   to the database later in one go.

### SHP-001 — Shopping lists

**As** Joe, **I want** all my shopping lists in one place, **so that** I
know what to buy.
Priority: Must · Status: proposed (Stage 4b)

Acceptance criteria
1. Given Shopping, then my lists show: dated ones by date, then standing
   ones; done lists are a press away.
2. Given New list, then I name it, and may give it a date, a time and a
   place; a dated list shows on Plan.
3. Given a list, then its lines show grouped by aisle in aisle order, Other
   last; I tick lines as I go, ticked ones moving to the foot.
4. Given a dated list, when I tick it done, then it leaves the list of
   lists, with Undo.

### SHP-002 — A shopping list from the meal plan

**As** Joe, **I want** a list made from the meals I've planned, **so that**
I buy exactly what they need.
Priority: Must · Status: proposed (Stage 4b)

Acceptance criteria
1. Given the Meal plan, when I choose Make a shopping list and pick days,
   then each Meal's ingredients, scaled to its servings, go to a new list
   (dated the day before the first, which I can change), or to a list I
   pick.
2. Given the same Ingredient for two Meals, then it shows as one line with
   its total and the Meals it's for.
3. Given staples, then they aren't added; "Check you have" lists them, each
   added with a tap.
4. Given lines kept as typed in a recipe, then they're added under Other.
5. Given a Meal later removed or moved off the list's days, then its
   unticked lines go; lines I edited or ticked stay.

### SHP-003 — Add to a list

**As** Joe, **I want** to add anything to a list, **so that** one list holds
the whole shop.
Priority: Must · Status: proposed (Stage 4b)

Acceptance criteria
1. Given a list, when I type, then Ingredients are suggested, each joining
   its aisle; anything else is added under Other.
2. Given a line, then I can give it an amount and unit, which adds to any
   total from Meals.
3. Given a Thought in Inbox ("milk"), when I sort it into a Shopping list,
   then it becomes a list I name, or a line on one I pick.

### SHP-004 — Shopping together

**As** Joe, **I want** a list we share to update for both of us at once,
**so that** we don't buy things twice.
Priority: Should · Status: proposed (Stage 4b)

Acceptance criteria
1. Given a list in the Household, when one of us ticks or adds a line, then
   the other sees it within a second or two.
2. Given no signal in the shop, then ticks are kept and sent when it
   returns.

Non-goals: a pantry; nutrition and macros; prices; ordering online; AI
planning of the week (later).

## Open points for Joe

1. **Households** — see the [plan's question](../../50-progress/plans/stage-4.md#households).
2. **Does ticking a Meal eaten log a cook?** *Recommended:* no — a cook is
   logged from Cooking, with its verdict and snapshot; eaten only marks the
   plan.
3. **Which suggestions to keep:** Meals without a Recipe, Leftovers, merging
   Ingredients, copying a week.
4. **Where the list's date defaults:** the day before the first chosen day
   (SHP-002 1), or none?
