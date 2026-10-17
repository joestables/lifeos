# Food: Recipes, the Meal plan and Ingredients

*Stage 4, the `food` Module. **A first draft for Joe to refine**: Claude's
proposal, drawn from Joe's brief, the agreed ADRs and what v1's Recipes App
learned (`Recipes-PRD.md`, `Recipes-Explore-and-Labs-PRD.md` in the v1
repository). Everything here is **proposed** until Joe agrees it; the open
points are listed at the end. Shopping lists are Stage 4b and get their own
spec; what the Meal plan must leave room for is noted here.*

**In one line:** **Recipes** is my recipe library and the ideas I've saved;
**Meal plan** is where the week's meals are planned, and where the Ingredient
database lives ([ADR-0026](../../20-architecture/adr/0026-navigation-drawer.md),
Provisionally agreed).

## Decisions

### Recipes and Variations

- **The Recipe is the dish; the Variation is the way you make it**
  ([ADR-0011](../../20-architecture/adr/0011-recipe-and-variation.md),
  Provisionally agreed). The Recipe holds what identifies it in a grid:
  name, photo, cuisine, category, protein, carbs, each person's favourite.
  The Variation holds what could differ between an oven and an air-fryer
  version: ingredient lines, method, servings, times, sources, notes and the
  cook log. Every Recipe has at least one Variation; while it has only one,
  the page never mentions Variations except in its menu.
- **Recipes and ideas are one Type.** A Recipe is an **idea** (status
  *idea*) until it has ingredients and a method, or until I first cook it;
  then it joins the **library** (status *active*) by itself (Joe, 17
  October). An idea can be just a name, or a name and a link, a photo and a
  note.
- **A Variation's state is worked out from its cook log**
  (ADR-0011): *untried* (never cooked), *attempted* (cooked), *final* (I
  marked it "This is the one"). The Recipe shows its best Variation's state.
  Nothing else sets a state by hand, so it can't go stale.
- **Describing a Recipe**: cuisine (one), category (one: breakfast, lunch,
  dinner, side, sauce, dessert, baking, drink…), protein (any: chicken,
  tofu…) and carbs (any: rice, pasta…), each **optional**, from reference
  data edited in Settings and added to as I go
  ([ADR-0014](../../20-architecture/adr/0014-reference-data-and-labels.md),
  Provisionally agreed). v1 made category and cuisine mandatory and had to
  bend the rule for ideas; optional avoids that. Recipes don't take Labels.
- **Times and servings** are on the Variation: prep and cook minutes (total
  shown), and servings ("Serves 4"). Sources are links, any number.
- **A favourite is a per-person mark** (heart), as a Note is pinned
  ([data model](../../20-architecture/data-model.md#types)).
- **Recipes are green**, with Variations, Meals and Ingredients, and so are
  both pages ([ADR-0043](../../20-architecture/adr/0043-colour-by-type.md),
  Provisionally agreed).

### Ingredient lines and units

- **An ingredient line** is an amount, a unit, an Ingredient and a prep
  note ("200 g chorizo, sliced"), optionally in a group ("For the sauce")
  ([ADR-0012](../../20-architecture/adr/0012-ingredients-and-shopping-lists.md),
  Provisionally agreed). I type the line as I would write it; it is read
  into its parts, and the Ingredient is matched or made.
- **Amounts** may be left out ("salt"), may be a range ("1–2 tsp") or
  approximate ("~5 g"), and are written as decimals. Scaling multiplies both
  ends of a range.
- **Units are metric**: g and kg (weight); ml and l, tsp (5 ml), tbsp
  (15 ml) and cup (250 ml) (volume); and none, for a count ("2 onions") or
  an unmeasured line. Within a kind, units convert (250 g ↔ 0.25 kg; totals
  add up); weight and volume never convert into each other, so they sit side
  by side ("250 g + 1 cup"). Imperial amounts in an imported recipe are
  converted to metric as it comes in. No pantry yet (Joe, 17 October).

### Method, notes and cooking

- **The method is numbered steps**; notes are a few lines about this
  Variation (what to swap, what to do differently). Both are plain text with
  the same light formatting as a Note
  ([ADR-0046](../../20-architecture/adr/0046-note-bodies.md), Provisionally
  agreed).
- **A step can name another Recipe** — "make the katsu sauce" — which opens
  it. A component Recipe (a sauce, a pastry, a spice mix) is a Recipe like
  any other.
- **Cooking** is a mode of the Recipe's page: large text, the screen kept
  awake, servings scaled for this cook, ingredients and steps ticked off as
  I go, and timers started from a step that names a time. Finishing asks
  "How did it go?" (stars and a line, both optional) and logs the cook; I
  can leave without logging.
- **Every cook is a cook log entry** (who, when, stars, notes, and the Meal
  it was for, if any). "Cook it now", finishing Cooking, ticking a Meal done
  and "Log a cook" (for one already done) all write one (ADR-0011).

### The Meal plan

- **A Meal is an occurrence of a Variation** on a day, in a slot
  (breakfast, lunch, dinner, snack), with its own servings, linked by
  *uses* ([data model](../../20-architecture/data-model.md#definition--occurrence)).
  Quantities scale by the Meal's servings ÷ the Variation's.
- **A Meal can have no Recipe**: "Leftovers", "Out — Dishoom",
  "Takeaway". It fills the slot and adds nothing to a shopping list.
- **Leftovers of a Meal** ("Katsu curry, again") point at the Meal they come
  from: they show its name, log no cook of their own, and add nothing to a
  shopping list in 4b.
- **The week starts on Monday**, like Plan (Joe, 17 October). The page
  shows the slots I use; an empty slot shows its "+" on hover on a computer
  and under a day's "+" on a phone (Joe, 17 October).
- **Meals are on Plan too**, as every Schedulable Type is, and Plan's "+"
  can add one ([ADR-0029](../../20-architecture/adr/0029-plan-reads-core-items.md),
  Provisionally agreed). Meal plan is the place made for planning them.
- **Ticking a Meal done** ("eaten") logs a cook of its Variation; leftovers
  and Meals without a Recipe log nothing. A Meal from yesterday still not
  ticked asks in Inbox: "Did you have Katsu curry?" — Yes, No.
- **No Reminder by default** on a Meal.
- **From the Meal plan to a shopping list** is built in Stage 4b: "Make a
  shopping list" for the days I choose, one line per Ingredient per Meal,
  shown collated, staples offered as "Check you have"
  ([ADR-0012](../../20-architecture/adr/0012-ingredients-and-shopping-lists.md),
  Provisionally agreed; Joe, 17 October).

### Ingredients

- **An Ingredient is an Item**: name, aisle, default unit and a *staple*
  flag (ADR-0012). It is matched by name as I type a line; an exact match
  links by itself, a near one is offered, and a new name makes a new
  Ingredient.
- **Aisles** are where I buy it, in the order I walk the shop: Fruit & veg,
  Bakery, Meat & fish, Dairy & chilled, Cupboard, Frozen, Drinks, Household.
  A new Ingredient's aisle is guessed (by the AI when it is available, else
  Cupboard) and never asked for on the Recipe's page; the Ingredients tab is
  where it's corrected. v1 asked on the page and found it in the way.
- **The database is the Meal plan's Ingredients tab** (Joe, 17 October):
  every Ingredient by aisle, how many Recipes use it, and which.
- **One catalogue per Household**, once there is one, so we share one
  "Onion" (Joe, 17 October).

### Spaces and sharing

- **Recipes, Meals and Ingredients belong in the Household** once there is
  one ([data model](../../20-architecture/data-model.md#types)); until then
  they are Personal. A Recipe can be kept Personal. A Variation always has
  its Recipe's Space (ADR-0012).
- **Favourites and cook log entries are each person's own**: we each heart
  our own favourites, and each cook says who cooked it.

### AI

- **Recipe import comes first** (Joe, 17 October): from a link, or pasted
  text, into a Recipe I review before it is kept, in house style — metric,
  British English, decimals, prep moved from the ingredient into the method.
  It uses the core's one AI service
  ([principles](../../00-foundation/principles.md), 11) and my food
  preferences.
- **Food preferences** are a few lines in Settings ("no seafood; mild
  please"), mine alone, given to every AI feature.
- **Explore** (help me decide what to eat) **and Labs** (research and build
  a recipe in stages) come later.
- **Nothing depends on AI**: without it, import is unavailable (and says
  so) and everything else works.

## What the pages show

**Recipes.** A grid of Recipe cards (photo, name, cuisine, heart, state)
with two tabs, **Library** and **Ideas**; filters for cuisine, category,
protein, carbs, state and favourites; a search; sort by recently added,
recently cooked or A–Z. "New" offers *New recipe* and *Import from a link*.
A Recipe opens on its own page: the header (photo, name, Variation menu,
describing facts, times, servings, sources), then ingredients, method and
notes — three columns on a computer, stacked on a phone — and the cook log.
Its main action is **Start cooking**.

**Meal plan.** Two tabs. **Week**: the seven days, Monday first, each with
the slots I use and their Meals; ‹ Today › and a date, as on Plan. **Pressing
a Meal** opens it (servings, the Recipe, done, move, remove); a Meal drags
to another day or slot. **Ingredients**: the Ingredient database, by aisle,
with a search.

## Requirements

*Stage 4. Statuses: proposed → agreed → built → verified. All proposed.*

### RCP-001 — The recipe library

**As** Joe, **I want** to see my recipes as a grid of photos, **so that** I
can find one to cook.
Priority: Must · Status: proposed

Acceptance criteria
1. Given Recipes, then the Library tab shows every active Recipe I can see
   as a card — photo (or a quiet placeholder), name, cuisine, heart and its
   state — newest first.
2. Given I choose filters (cuisine, category, protein, carbs, state,
   favourites), then only matching Recipes show: any of the choices within a
   filter, all of the filters together; my filters are kept for next time.
3. Given I type in the page's search, then Recipes match by name, cuisine,
   protein, carbs or any ingredient ("chickpeas").
4. Given I sort by recently cooked, then the Recipe cooked most recently is
   first.

### RCP-002 — Ideas

**As** Joe, **I want** to save a dish I'd like to make with almost nothing
written, **so that** I don't forget it.
Priority: Must · Status: proposed

Acceptance criteria
1. Given New → New recipe, when I type only a name and save, then it is kept
   as an idea, in the Ideas tab.
2. Given an idea, then I can add a link, a photo and a note without writing
   ingredients or a method.
3. Given an idea, when it has at least one ingredient and one step, or I log
   a cook of it, then it moves to the Library by itself.
4. Given a Thought in Inbox ("miso salmon traybake"), when I sort it into a
   Recipe, then it becomes an idea, with any link in it kept as a source.

### RCP-003 — A Recipe's page

**As** Joe, **I want** a Recipe on one page I can read at a glance, **so
that** I can cook from it.
Priority: Must · Status: proposed

Acceptance criteria
1. Given a Recipe, then its page shows the photo, name, describing facts,
   prep and cook times, servings and sources, then ingredients, method and
   notes (three columns on a computer, stacked on a phone), then its latest
   cook log entry with the rest a press away.
2. Given I change the servings shown, then every amount scales, ranges at
   both ends, and the method says it is not scaled.
3. Given I edit any part, then it is kept as I go, offline too, as a Note
   is; Undo takes the last change back.
4. Given a photo from a file, the camera or a link, then it is stored
   reduced to about 250 KB.

### RCP-004 — Ingredient lines

**As** Joe, **I want** to type ingredients as I'd write them, **so that**
entering a recipe is quick.
Priority: Must · Status: proposed

Acceptance criteria
1. Given I type "200 g chorizo, sliced", then the line is read as 200, g,
   Chorizo, "sliced", and Chorizo is linked if it exists, offered if a near
   match does ("Chorizo sausage?"), or made new if not.
2. Given "1-2 tsp chilli flakes" or "~5 g salt" or "salt", then the range,
   the approximate amount and the unmeasured line are each kept as typed.
3. Given I change a line's unit within its kind (g → kg), then the amount
   converts; across kinds (g → ml), then it is flagged to check.
4. Given a heading line ("For the sauce"), then the lines under it are
   grouped.
5. Given lines, then I can reorder and delete them.

### RCP-005 — Method and notes

**As** Joe, **I want** numbered steps and notes, **so that** the method is
easy to follow.
Priority: Must · Status: proposed

Acceptance criteria
1. Given the method, then each step is numbered, and I can add, edit,
   reorder and delete steps.
2. Given I type "@" in a step, then I can name another Recipe, which opens
   from the step.
3. Given notes, then they take a Note's formatting.

### RCP-006 — Variations

**As** Joe, **I want** another way of making a dish under the same Recipe,
**so that** the grid shows the dish once.
Priority: Must · Status: proposed

Acceptance criteria
1. Given a Recipe, when I choose "Make a variation" and name it ("Air
   fryer"), then a new Variation starts as a copy of the current one and is
   then edited freely.
2. Given a Recipe with two or more Variations, then its page shows a
   Variation menu under the name, the default first, and the card in the
   grid is one card.
3. Given a Variation, then I can rename it, make it the default, or delete
   it; deleting the last one deletes the Recipe.
4. Given one Variation, then "Variation" appears nowhere but the menu that
   makes another.

### RCP-007 — Cooking

**As** Joe, **I want** a cooking mode, **so that** I can follow the recipe at
the hob.
Priority: Must · Status: proposed

Acceptance criteria
1. Given a Recipe in the library, when I press Start cooking, then the page
   shows its ingredients and steps in large text, the screen stays awake
   where the device allows, and the servings can be scaled for this cook.
2. Given Cooking, then I can tick ingredients and steps off, and a step that
   names a time ("simmer for 20 minutes") offers a timer, which alerts me
   when it ends.
3. Given I finish, then "How did it go?" asks for stars and a line, both
   optional; Log keeps a cook log entry, Don't log keeps nothing.
4. Given I leave the page or the phone sleeps, then Cooking is still there
   when I come back, until I finish or six hours pass.
5. Given an idea with nothing written, then Start cooking is unavailable,
   with the reason.

### RCP-008 — The cook log and a Recipe's state

**As** Joe, **I want** every cook recorded, **so that** I know what I've
tried, how it went and when I last made it.
Priority: Must · Status: proposed

Acceptance criteria
1. Given Cook it now, Log a cook (any date), finishing Cooking or ticking a
   Meal done, then a cook log entry is kept on the Variation: who, when,
   stars, notes, and the Meal if there was one.
2. Given a Variation never cooked, then it is *untried*; cooked, *attempted*;
   marked "This is the one", *final*; the Recipe shows its best Variation's.
3. Given the cook log, then it lists every cook, newest first, each with its
   person; I can change or delete my own entries and no one else's.
4. Given a Recipe, then the card and page show when it was last cooked and
   how many times.

### RCP-009 — Favourites

**As** Joe, **I want** to heart a Recipe, **so that** my favourites are easy
to find.
Priority: Must · Status: proposed

Acceptance criteria
1. Given a card or a Recipe's page, when I press the heart, then it is my
   favourite, and only mine; the favourites filter shows mine.
2. Given a Household, then I can also filter to the Recipes we both
   favourite.

### RCP-010 — Recipes offline and in Search

**As** Joe, **I want** my recipes in the kitchen with no signal, and found
by Search, **so that** they are there when I need them.
Priority: Must · Status: proposed

Acceptance criteria
1. Given no signal, then every Recipe I can see opens, cooks and logs, and
   changes are sent later; photos I have opened before show.
2. Given Search, then Recipes are found by name and by ingredient, with
   their photo and state.

### RCP-011 — Deleting and recovering

**As** Joe, **I want** a deleted Recipe recoverable, **so that** a mistake
isn't final.
Priority: Must · Status: proposed

Acceptance criteria
1. Given I delete a Recipe, then it goes to Recently deleted with its
   Variations and cook log, and Undo brings it back
   ([ADR-0032](../../20-architecture/adr/0032-delete-means-archive.md)).
2. Given a deleted Recipe with planned Meals, then those Meals stay, named,
   and say the Recipe was deleted.

### RCP-012 — Import a recipe

**As** Joe, **I want** to bring a recipe in from a link, **so that** I don't
type it out.
Priority: Should · Status: proposed

Acceptance criteria
1. Given New → Import from a link (or pasted text), then I see its progress
   in steps, and then a new Recipe, not yet kept, to review: name, photo,
   facts, times, servings, ingredient lines matched to Ingredients, method
   and source.
2. Given the recipe is imported, then it is in house style: metric, British
   English, decimals, prep moved from the line into the step, quantities
   repeated where a step first uses them.
3. Given I keep it, then the Recipe, its new Ingredients and its photo are
   saved together; cancelled, nothing is left.
4. Given an idea, when I import into it, then its ingredients, method and
   notes are filled and its name and facts stay as they were.
5. Given the AI is off, out of its monthly allowance or unreachable, then
   import is unavailable and says why, before I paste anything.

### RCP-013 — A Recipe's history

**As** Joe, **I want** to see what changed in a recipe, **so that** I know
why it tastes different.
Priority: Could · Status: proposed

Acceptance criteria
1. Given a Variation, then its log shows, among the cooks, each day it was
   changed and by whom, with a line saying what changed ("Salt 0.5 → 1 tsp;
   lemon removed from step 7"), from the activity log
   ([ADR-0030](../../20-architecture/adr/0030-activity-log-by-triggers.md),
   Provisionally agreed).

### ING-001 — The Ingredient database

**As** Joe, **I want** every ingredient in one place, **so that** aisles and
units are right everywhere.
Priority: Must · Status: proposed

Acceptance criteria
1. Given Meal plan → Ingredients, then every Ingredient shows under its
   aisle, aisles in shop order, each with how many Recipes use it; a search
   narrows them.
2. Given an Ingredient, then I can change its name, aisle, default unit and
   staple flag, and a rename shows in every Recipe at once.
3. Given an Ingredient, then I can see the Recipes that use it.
4. Given an Ingredient no Recipe uses, then I can delete it; one in use
   can't be deleted, and says where it is used.
5. Given two Ingredients that are the same ("Spring onion", "Scallions"),
   when I merge them, then every line points at the one kept.

### ING-002 — New Ingredients without stopping

**As** Joe, **I want** a new ingredient made as I type, **so that** writing a
recipe isn't interrupted.
Priority: Must · Status: proposed

Acceptance criteria
1. Given I type a line naming an ingredient that doesn't exist, then it is
   made with its aisle guessed and the line's unit as its default, and the
   Recipe's page asks nothing.
2. Given new Ingredients made since I last looked, then the Ingredients tab
   marks them, to check their aisle.

### MPL-001 — The week

**As** Joe, **I want** the week's meals on one page, **so that** I can plan
what we eat.
Priority: Must · Status: proposed

Acceptance criteria
1. Given Meal plan, then this week shows, Monday first, each day with the
   slots I use (from Settings; breakfast, lunch, dinner and snack by
   default) and their Meals: photo, name, servings, and the Variation when
   its Recipe has more than one.
2. Given ‹, ›, Today or a date, then that week shows; on a phone, one day
   at a time with the week's strip, as on Plan.
3. Given a Meal ticked done, then it shows done; a cancelled one is struck
   through.

### MPL-002 — Plan a Meal

**As** Joe, **I want** to put a recipe in a slot in two presses, **so that**
planning the week is quick.
Priority: Must · Status: proposed

Acceptance criteria
1. Given a slot's "+", then a search opens in place, already listing the
   Recipes I planned most recently; picking one adds a Meal of its default
   Variation, or offers its Variations when it has more than one.
2. Given a new Meal, then its servings are the Variation's, until I change
   them.
3. Given the "+", then I can instead type a Meal with no Recipe ("Out —
   Dishoom") or choose Leftovers of an earlier Meal that week.
4. Given ideas, then they can be planned too, and add nothing to a shopping
   list until they are written.
5. Given Plan's "+" on a day, when I choose Meal, then the same search adds
   it to that day, in the slot I choose.

### MPL-003 — Change a Meal

**As** Joe, **I want** to move, rescale or remove a Meal, **so that** the
plan follows the week as it really goes.
Priority: Must · Status: proposed

Acceptance criteria
1. Given a Meal, when I press it, then it opens: its Recipe (opening the
   Variation it planned), servings, notes, done, Cancel, Remove.
2. Given a computer, when I drag a Meal to another day or slot, then it
   moves, with Undo; on a phone, Move offers a day and slot.
3. Given I change a Recipe after planning it, then its Meals show the
   change.

### MPL-004 — Eating it

**As** Joe, **I want** a Meal I ate to count as cooked, **so that** the cook
log keeps itself.
Priority: Must · Status: proposed

Acceptance criteria
1. Given a Meal of a Recipe, when I tick it done, then a cook log entry is
   kept for its Variation, for that Meal and day, and "How did it go?" is
   offered.
2. Given leftovers or a Meal without a Recipe, when ticked, then no cook is
   logged.
3. Given yesterday's Meal not ticked, then Inbox asks "Did you have it?":
   Yes ticks it; No cancels it.

### MPL-005 — Settings for food

**As** Joe, **I want** to set the slots I plan and my food preferences,
**so that** the Meal plan and the AI fit how we eat.
Priority: Should · Status: proposed

Acceptance criteria
1. Given Settings → Food, then I choose which slots show on the Meal plan.
2. Given Settings → Food, then I write my food preferences, mine alone,
   given to every AI feature.
3. Given Settings → Food, then I edit the cuisines, categories, protein and
   carbs, and an entry in use can't be deleted.

### MPL-006 — Copy a week

**As** Joe, **I want** to start a week from an earlier one, **so that** a
week we liked is quick to repeat.
Priority: Could · Status: proposed

Acceptance criteria
1. Given a week, when I copy it to another, then its Meals are made again on
   the same days and slots, not done.

Non-goals (Stage 4): shopping lists (Stage 4b); a pantry ("what's in");
nutrition and macros ([roadmap](../../roadmap.md#later-opportunities));
converting weight to volume; Explore, Labs, dish images made by AI and
"plan my week" (later); sharing a Recipe with someone outside the Household;
selecting many Recipes at once.

## Open points for Joe

Claude's recommendation is in each; these are where v1's experience and
LifeOS's decisions differ, or where the brief didn't say.

1. **Who may edit a Household's Recipes?** v1 learned to make recipes each
   person's own: a Household could see, cook, heart and plan the other's,
   never edit them, and two people's "Hummus" were shown as one card. LifeOS
   so far puts shared Items in the Household Space, which both edit.
   *Recommended:* both edit, as with every shared Item; the cook log and the
   history (RCP-013) say who did what, and a Recipe can stay Personal.
2. **Ingredient catalogue before a Household.** *Recommended:* my Personal
   catalogue becomes the Household's when I create one; when someone joins
   with their own, Ingredients of the same name and aisle merge, and others
   are offered to merge (ING-001 5).
3. **Variation states.** v1 set its four states by hand (backlog, untried,
   attempted, recipe); ADR-0011 works them out from the cook log, with
   *final* marked. *Recommended:* ADR-0011's, as above.
4. **Slots.** Is a fixed set right (breakfast, lunch, dinner, snack), or
   would you rather plan days without slots, as v1 did?
5. **Timers and ticking off while cooking** (RCP-007 2) weren't in v1:
   keep, or simpler?
6. **What v1 had that this leaves out:** tags (beyond cuisine, category,
   protein and carbs); S/M/L card sizes; grouping the grid by category or
   cuisine; a recipe's "standard size" note on an Ingredient; the
   one-device editing lock; sharing a copy with anyone. *Recommended:* leave
   them out unless you miss them.
7. **What's new here:** Meals without a Recipe, leftovers, Inbox asking about
   yesterday's Meal, merging Ingredients, copying a week, a component Recipe
   named in a step. Keep each?
