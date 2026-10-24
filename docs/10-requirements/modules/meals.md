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
- **Staples and Essentials are each Space's lists on Shopping → Food**,
  not set in the Pantry (Joe, 24 October; until Stage 4b's step 5 the
  Pantry still marks staples and out of stock, as built in Stage 4). Each
  Household has one of each, and so do I for Personal. **Staples** are
  long-life goods I expect to have (salt), any of which I may mark **out
  of stock**; **Essentials** are what we buy most shops (milk), any of
  which I may mark **Required**. Both are Pantry entries, with no amounts
  (ADR-0051).
- **Merging two entries** that are the same ("Spring onions", "Scallions")
  keeps one, under a name I choose; at most two at a time, and only when I
  added both (Joe, 18 October).

### Shopping

- **Shopping has three tabs** (Joe, 24 October): **Food**, food shops and
  each of my Spaces' Essentials; **Lists**, shopping that isn't food
  (Screwfix, Boots, a birthday); and **Online**, items watched for their
  price, which comes later
  ([roadmap](../../roadmap.md#later-opportunities)). Lists that aren't
  shopping (packing, DIY jobs) are Notes with a checklist.
- **A Shopping list** is one Type, a food shop or a list
  ([ADR-0050](../../20-architecture/adr/0050-shopping-list.md),
  Provisionally agreed). Either may have a date (then it's on Plan) or none.
  A food shop's lines are grouped by aisle, Pantry entries (ingredients and
  household items) or typed, those without an entry under **Other**, last.
  A list's are typed, or the Pantry's household items, under my own
  subheadings.
- **A food shop is linked to Meals**, any number (Joe, 24 October). Every
  ingredient of each comes onto it: its Recipe's, scaled to the Meal's
  servings, and its own, from an import or added by hand (MPL-006). When a
  Meal's ingredients or servings change, the shop follows; when a Meal is
  removed, or taken off the shop, its unticked lines go. A Meal is on one
  open food shop at most (Joe, 24 October).
- **A new food shop** (Joe, 24 October) is made two ways. On the Meal plan,
  **Select** chooses Meals, then **Add to shop** makes a new shop of them,
  dated the day of the first. On Shopping → Food, **New shop** opens with
  the plan's Meals from today, those on no open shop, each toggled on or
  off. Meals are added or taken off later from the shop. A shop's date can
  be dragged on Plan (Joe, 18 October).
- **All · Meals · Extra** at the top of a food shop (Joe, 24 October).
  **All** is the whole shop by aisle: lines for one ingredient show as one,
  totalled where the units allow ("Chicken thighs 1.2 kg · Katsu Thu, Curry
  Sat") ([ADR-0012](../../20-architecture/adr/0012-ingredients-and-shopping-lists.md),
  Provisionally agreed). **Meals** is each Meal with its lines, and
  adding or taking off a Meal. **Extra** is what I added by hand, then what
  I may add with +.
- **What the Meals need is protected:** a Meal's line on a shop follows its
  Meal and isn't changed or deleted there. To buy more I add the ingredient
  on Extra, and All shows the total (Joe, 18 October; 24 October, in place
  of raising a Meal's line).
- **Extra offers, none added by itself** (Joe, 24 October), each of my
  Spaces under its name, the shop's own Space first:
  - **Needed**: out-of-stock staples and Required Essentials, marked so;
  - **Essentials**: the rest of each Space's Essentials;
  - **Staples the Meals use**: the shop's Space's staples that its Meals
    need, never added, highlighted so I can check I have them.
- **Back in stock:** ticking a line added from a Space's Needed clears its
  out of stock or Required there; any other line whose entry is out of
  stock or Required in the shop's own Space clears it there. Nothing else
  changes (Joe, 24 October).
- **A shop is for one Space**, Personal or a Household (Joe, 24 October):
  the Household of its first Household Meal to start, then mine to change.
  Its Meals may be from any of my Spaces, and everyone in its Space sees all
  of it, its Personal Meals' lines too (ADR-0051). For example: I live
  mostly at my girlfriend's and cook, but don't buy, at my parents'. Our
  shop is our Household's; my parents' out of stock shows under theirs on
  Extra, to add if I choose. Shared lists update live
  ([principles](../../00-foundation/principles.md), 9).
- **Done:** ticking the last line offers **Done**; **Complete list** is in a
  list's menu at any time, asking first when lines are unticked. A done
  list leaves the lists, with Undo (Joe, 24 October).
- **No repeating lists** (Joe, 24 October): Essentials do that job.
- **Totals:** units of one kind add up (500 g + 1 kg = 1.5 kg; ml, l, tsp,
  tbsp together); weight and volume sit side by side; a range counts as its
  top; "~" carries into the total; an unmeasured line on top of a measured
  one shows "+" ("Salt 5 g +").

## What the pages show

**Meal plan.** Two tabs. **Week**: Monday to Sunday — columns on a computer,
days stacked on a phone — each day's Breakfast, Lunch and Dinner with their
Meals (photo, name, servings; leftovers marked); ‹ Today › and a date, as on
Plan; a filter for Personal, each Household or all; Select, to choose
Meals and Add to shop;
"Copy week" tucked in the week's menu. **Pantry**: ingredients by aisle, then
household items, with a search.

**Shopping.** Tabs **Food**, **Lists** and, later, **Online**. Food: the
food shops, dated ones by date, then undated, then each of my Spaces'
Staples and Essentials, with out of stock and Required marked;
each shop opening to All · Meals · Extra, with ticking, adding and Done.
Lists: the other lists, the same way, by my subheadings. Done lists are a
press away on each.

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
Priority: Must · Status: built (4 by the database, Stage 4b)

Acceptance criteria
1. Given a Meal, when I press it, then it opens: its Recipe (the Variation
   it planned), servings, Personal or Household, eaten, its own
   ingredients, Remove.
2. Given a computer or a phone, when I drag a Meal to another day or slot,
   then it moves, with Undo.
3. Given a Meal with leftovers, when I remove it, then its leftovers go too,
   with Undo.
4. Given a Meal on a food shop, when I change its servings or its
   ingredients, then what it needs on the shop changes with it (SHP-002).
5. Given I tick a Meal eaten, then it shows eaten, and no cook is logged.

### MPL-006 — A Meal's own ingredients

**As** Joe, **I want** to give any Meal ingredients, or read them from a
recipe's link, **so that** what I'll shop for includes Meals that aren't
Recipes (Joe, 23 October).
Priority: Should · Status: built (its lines go onto a food shop, Stage 4b)

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
   a search narrows them.
2. Given New, then I add an ingredient or a household item: a name, an
   aisle (Cupboard to start) and a default unit.
3. Given an entry I added, then I change its name, aisle and default unit,
   and a rename shows in every Recipe at once; someone else's I can't
   change.
4. Given an entry I added that nothing uses, then I can delete it, with
   Undo; one in use can't be deleted, and says where it is used: the
   Recipes, then the Meals today or later whose own lines use it
   (MPL-006), or "Used in a deleted recipe" when only a deleted Recipe
   does. A past or deleted Meal doesn't keep it: its line keeps the name,
   as typed (Joe, 24 October).
5. Given an entry, then I see which Recipes use it.

### PAN-002 — Staples and out of stock

Replaced by [SHP-005](#shp-005--staples-and-essentials) (Joe, 24 October):
staples and out of stock move from the Pantry to Shopping → Food. Built in
Stage 4 (marking staples and out of stock in the Pantry, the Space's
staples those of where my new Meals go); removed with Stage 4b's step 5.

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

**As** Joe, **I want** all my shopping in one place, **so that** I know
what to buy.
Priority: Must · Status: built (3 but reordering, which is to come)

Acceptance criteria
1. Given Shopping, then Food shows my food shops and Lists my other lists:
   dated ones by date, then undated; done ones a press away. Online comes
   later.
2. Given New shop or New list, then I name it, and may give it a date
   (no time or place; Joe, 24 October) and, for a shop, its Space; a dated
   one shows on Plan. New shop also offers the
   plan's Meals from today, those on no open shop, each toggled on or off
   (SHP-002).
3. Given a food shop, then its lines are grouped by aisle, Other last; given
   a list, then I add subheadings and lines under them, and reorder both.
4. Given any list, then I tick lines as I go, ticked ones moving to the foot
   of their group.
5. Given I tick the last line, then Done is offered; given Complete list in
   its menu, then it asks first if lines are unticked. A done list leaves
   the lists, with Undo.
6. Given a food shop, then I choose its Space, Personal or one of my
   Households; it starts as the Household of its first Household Meal.

### SHP-002 — A food shop from the Meal plan

**As** Joe, **I want** a food shop made from the Meals I've planned, **so
that** I buy exactly what they need.
Priority: Must · Status: built for 2–6 (a shop made with New shop, Meals added on its Meals tab); 1 in Stage 4b's step 6

Acceptance criteria
1. Given the Meal plan, when I choose Select (the week's PageAction; a
   long press stays for dragging on a phone), tap Meals and press Add to
   shop in the SelectionBar, then a new food shop is made of them, dated the
   day of the first.
2. Given a Meal on a shop, then all its ingredients are on it: its Recipe's,
   scaled to its servings, and its own (MPL-006); staples aren't.
3. Given the same ingredient for two Meals, then All shows it as one line,
   with its total and the Meals it's for.
4. Given Meals, then I add one to the shop or take one off; a Meal is on one
   open food shop at most.
5. Given a Meal's servings or ingredients change, then the shop follows;
   given a Meal removed or taken off, then its unticked lines go. Ticked
   lines stay as they are.
6. Given Meals in the top bar, then each Meal shows with its own lines.

### SHP-003 — Extra

**As** Joe, **I want** to add anything to a food shop, and be offered what
runs out, **so that** one shop holds everything.
Priority: Must · Status: built for 1–4; 5 in Stage 4b's step 8

Acceptance criteria
1. Given a shop, when I type, then Pantry entries are suggested, household
   items too, each joining its aisle; anything else is added as typed,
   under Other. It shows on Extra and in All.
2. Given a Meal's line, then I can't change or delete it on the shop; adding
   the same ingredient on Extra adds to the total in All.
3. Given Extra, then it offers, under each of my Spaces' names, the shop's
   own first: Needed (out-of-stock staples and Required Essentials), then
   the other Essentials, each added with +; and highlights the staples its
   Meals use, never added.
4. Given a line added from a Space's Needed, when I tick it, then its out
   of stock or Required is cleared there; given any other line out of stock
   or Required in the shop's own Space, then there.
5. Given a Thought in Inbox ("buy milk, bread, eggs"), when I sort it into a
   Shopping list, then a new one is made with milk, bread and eggs as its
   lines, split at the commas, "buy" dropped; a food shop when any line
   matches a Pantry ingredient, else a list. Or they're added to a list I
   pick (Joe, 24 October).

### SHP-004 — Shopping together

**As** Joe, **I want** a list we share to update for both of us at once,
**so that** we don't buy things twice.
Priority: Should · Status: built for 1 and 3; 2 in Stage 4b's step 7

Acceptance criteria
1. Given a list in a Household, then every member sees all of it, its
   Personal Meals' lines too.
2. Given a shared list, when one of us ticks or adds a line, then the other
   sees it within a second or two.
3. Given no signal in the shop, then ticks are kept and sent when it
   returns.

### SHP-005 — Staples and Essentials

**As** Joe, **I want** each Household's long-life goods and everyday buys
kept in one place, **so that** I'm offered what runs out, and milk every
shop, without visiting the Pantry.
Priority: Must · Status: built

Acceptance criteria
1. Given Shopping → Food, then each of my Spaces' Staples and Essentials
   show, Personal and each Household; any member adds Pantry entries to
   them or takes them off.
2. Given a staple, then I mark it out of stock, or not; given an Essential,
   then I mark it Required, or not.
3. Given either list, then it is never ticked or done; it feeds every food
   shop's Extra (SHP-003 3), and staples aren't added from Meals (SHP-002
   2).
4. Given my first Household, then it starts with a copy of my staples; I
   keep mine for Personal shops.

Non-goals: tracking stock beyond out of stock and Required; repeating lists;
Online's price alerts (later); nutrition and
macros; prices; ordering online; AI planning of the week (later); a
Meal's method, or turning a Meal's link into a Recipe (Joe, 23 October).

## Open points for Joe

None at present.
