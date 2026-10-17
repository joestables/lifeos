# Plan: Stage 4 — Recipes and the Meal plan

**Outcome** ([roadmap](../../roadmap.md)): Joe's recipes live in LifeOS,
shared with his girlfriend. **Recipes** holds the recipe library and the
ideas he has saved; **Meal plan** is where meals are planned, and holds the
Ingredient database that Recipes draw on. Meals appear on Plan with no Plan
work ([ADR-0029](../../20-architecture/adr/0029-plan-reads-core-items.md)).
Cooking is logged, with or without a Meal
([ADR-0011](../../20-architecture/adr/0011-recipe-and-variation.md)). The
shared AI service and food preferences arrive, and Contacts and Households
turn sharing on. **Shopping** follows in Stage 4b.

**State:** started 17 October 2026. Joe's brief is below; the drawer
already has its new order, with Cardio as a blank page (this plan's pull
request). Joe agreed every recommendation below (17 October). Step 1 is
under way: Claude's first draft of the Recipes, Meal plan and Ingredients
spec is written for Joe to refine over several rounds; Shopping lists
replacing List and Shop is decided
([ADR-0050](../../20-architecture/adr/0050-shopping-list.md)).

## Steps

Steps marked **Joe** need Joe's go-ahead or action before Claude does them.
Every step that builds a screen follows the [design system](../../30-design/README.md)
checklist and brings its own Playwright walks, citing the requirements it
verifies. The AI service is never called from a browser walk: the walks use
a stand-in, as they do for Supabase.

| # | Step | State | Produces |
|---|---|---|---|
| 1 | **Joe** — specs: the Recipes page (library and ideas, a Recipe and its Variations, states, the log, Cooking, import, sharing ideas in); the Meal plan (Meals by slot, the Ingredient database); Shopping for Stage 4b; food preferences; Households, or something lighter; and what they change in capture, Inbox, items, Search, Plan and Reminders | Joe agreed the recommendations 17 October; ADR-0050 (one Shopping list Type) agreed, ADR-0010 superseded, every document naming List or Shop updated. A first draft drawn partly on v1's Recipes spec was withdrawn at Joe's wish (he wants first principles, not v1). Second draft, from [Joe's notes](#joes-notes-17-october), with Claude's suggestions marked: [recipes](../../10-requirements/modules/recipes.md) (RCP-001–017) and [meals](../../10-requirements/modules/meals.md) (MPL-001–004, ING-001–002, SHP-001–004), all *proposed*; ADR-0011 (states set on each Variation, a cook's snapshot), ADR-0012 (a line is an amount, a unit and an ingredient; six aisles), ADR-0014 (Recipes' tags) and ADR-0028 (Android's share target in Stage 4) amended. Next: Joe's rounds on both, and [Households](#households) | [recipes](../../10-requirements/modules/recipes.md) (RCP-*), [meals](../../10-requirements/modules/meals.md) (MPL-*, ING-*, SHP-*), changes to [spaces and sharing](../../10-requirements/cross-cutting/spaces-and-sharing.md), [capture](../../10-requirements/cross-cutting/capture.md), [Inbox](../../10-requirements/views/inbox.md), [items](../../10-requirements/cross-cutting/items.md), [search](../../10-requirements/cross-cutting/search.md), [Plan](../../10-requirements/views/plan.md) |
| 2 | Decisions: one shopping-list Type in place of List and Shop (done with step 1: [ADR-0050](../../20-architecture/adr/0050-shopping-list.md)); unit conversion and a pantry; the shared AI service (where it runs, which model, what it may read); recipe import; how Contact search avoids revealing who has an account ([ADR-0039](../../20-architecture/adr/0039-accounts-contacts-households.md)); the generated data model with the first Module ([ADR-0036](../../20-architecture/adr/0036-changing-the-model-over-time.md)) | — | ADRs |
| 3 | **Joe** — design, with Claude design: the Recipes grid and a Recipe (Variations, ingredient lines, method, cook log); the Meal plan's week and its slots; the Ingredient database; adding a Meal from a Recipe; Meal cards on Plan; the drawer icons for Meal plan and Shopping. Into the design spec first, then the shared components, with the screenshot tests refreshed | — | [design system](../../30-design/README.md), components |
| 4 | Schema: the `food` Module — Recipe, Variation, Meal, Ingredient in the ontology; ingredient lines, method steps and the cook log as child rows; a Variation keeping its Recipe's Space; reference data (cuisines, aisles); the generated data model; database tests | — | Migrations, database tests |
| 5 | Recipes page: the library and ideas, a Recipe, its Variations, the cook log and "Cook it now", favourites, Recipes in Search | — | Code, tests citing RCP-* |
| 6 | Ingredients: the database on the Meal plan page; ingredient lines matched to an Ingredient or creating one | — | Code, tests citing ING-* |
| 7 | Meal plan: Meals by slot over a week, from a Recipe's Variation, servings scaling the quantities; Meals on Plan; ticking a Meal done logs a cook | — | Code, tests citing MPL-* |
| 8 | The shared AI service and food preferences; the AI features the specs keep: import first, then filling ingredients from a method | — | Edge Function, code, tests |
| 9 | **Joe** — sharing with his girlfriend, the way Joe chooses ([Households](#households)), so Recipes, Meals, Ingredients and shopping lists can be shared | — | Code, tests citing ACC-* |
| 10 | **Joe** — uses Recipes and the Meal plan; what he trips over is fixed | — | Code, tests |

Each step's code goes into the specs' status as it lands (*built*, then
*verified* when a test citing the ID passes).

## Joe's brief (17 October)

- **Stage 3 is done**; Stage 4, Recipes, is next.
- **Recipes** is one page: my recipe library and the ideas I've saved.
- **Meal plan** is another: where the meal plan is made, and where the
  Ingredient database is shown, which Recipes reference.
- **Shopping** is a third: all my shopping lists. A shopping list is made by
  hand, or made from the meal plan with the option to add more — from the
  Ingredient database or typed — that aren't in the meal plan.
- **The List Type can go**, I believe: these will all be shopping lists.
- **The drawer's new order:** Inbox, Plan, Tasks, Notes (yellow), Gym (red),
  Cardio (red; added now as a blank page), Recipes (green), Meal plan
  (green), Shopping (yellow), Goals, Wardrobe. Done in this plan's pull
  request for the pages that exist: Cardio moved up beside Gym, out of
  "Later" ([ADR-0026](../../20-architecture/adr/0026-navigation-drawer.md)
  amended). Meal plan and Shopping join when they are built.

## Questions for the specs

Each has Claude's recommendation. **Joe agreed all eleven as recommended
(17 October)**, and asked Claude to draft the Recipes spec first, to find
what his brief might have missed.

1. **Shopping lists in place of List and Shop.** A Shop was a List with a
   date, a place and a done state, on Plan with its own Reminder
   (ADR-0010). *Recommended:* one Type, **Shopping list**: it may have a
   date (and time and place), and then it is on Plan, reminds me and is
   ticked done when the shop is done; without a date it is a standing list
   ("Household essentials"). ADR-0010 is superseded.
2. **Lists that aren't shopping** (packing for Lisbon, DIY). *Recommended:*
   a Note with a checklist — Notes already have checklists
   ([notes](../../10-requirements/views/notes.md)). A Thought sorts into a
   Shopping list rather than a List. Nothing is lost: List was never built.
3. **Is Shopping still Stage 4b, or part of Stage 4?** *Recommended:*
   keep it as 4b, straight after: Recipes and the Meal plan are usable
   first, and shopping lists then come with Households already on, so a list
   can be shared and update live while we're both in the shop.
4. **The Ingredient database on the Meal plan page.** *Recommended:* the
   page has two tabs, **Week** and **Ingredients**. An Ingredient has a
   name, an aisle, a default unit and a *staple* flag (ADR-0012), and lives
   in the Household once there is one, so we share one catalogue.
5. **The Recipes page.** *Recommended:* a grid of Recipe cards (photo,
   name, cuisine, favourite), with two tabs, **Library** (active) and
   **Ideas** (status *idea*), filtered by cuisine and favourites. An idea
   can be just a name and a link; it joins the library when it has
   ingredients and a method, or when I first cook it.
6. **The Meal plan's week.** *Recommended:* Monday first, like Plan; each
   day the slots I use, each Meal chosen from a Recipe with its servings.
   Which slots do you plan — dinner only, or breakfast, lunch, dinner and
   snacks? *Recommended:* all four, empty slots shown only on hover (a
   computer) or under a "+" (a phone).
7. **From the meal plan to a shopping list** (built in 4b, decided now so
   the Meal plan fits it). *Recommended:* "Make a shopping list" on the
   week, for the days I choose: one new list, lines collated by Ingredient
   (ADR-0012), staples offered as "Check you have"; then I add more from the
   Ingredient database or by typing. It can add to an existing list instead.
8. **Unit conversion and a pantry.** *Recommended:* no conversion yet —
   the same unit adds up, different units sit side by side ("250 g + 1
   cup"); no pantry.
9. **Which v1 AI features come back in Stage 4** (Explore, Labs, dish
   images, recipe import)? *Recommended:* recipe import first, from a link
   or pasted text; the others later.
10. **Gym and Cardio "red".** Their colour is coral, a red-orange
    ([tokens](../../30-design/tokens.md)), kept apart from the true red that
    means overdue and delete (ADR-0043). *Recommended:* keep coral. If you
    want it redder, it can move towards red, but not onto it.
11. **Finance** wasn't in your order. *Recommended:* it stays at the foot
    under "Later", as now.

## Joe's notes (17 October)

Rough notes, for Claude to shape, not copy; and **first principles rather
than v1**: v1's Recipes documents aren't to be drawn on.

- **Two specs:** `recipes.md` for the Recipes page; `meals.md` for the Meal
  plan, the Ingredient database and shopping.
- **Recipes page:** two tabs for now, Recipes (Draft and Complete, as cards
  with photos) and Ideas (as a list). Archived Recipes are reached from
  Settings.
- **States:** Idea, Draft, Complete, Archived, set on each Variation; the
  Recipe's is the highest of its Variations'.
- **A Recipe's heading:** category, cuisine, tags, protein, carbs; edited
  apart from a Variation's content. Each Variation has its own name, state,
  ingredients, method, notes, time, servings and sources; one is the
  default; a new one is a duplicate.
- **Ideas** need only a title, a link or a note; shared from TikTok or
  elsewhere straight in; a link saved before is warned about; bulk promote,
  archive and delete; an Idea becomes a Draft keeping everything.
- **The library:** search; filter by category, cuisine, tags, protein, carbs
  and favourites; sort and group; my own favourites; select many.
- **Getting recipes in:** by hand; imported from a web page as a Draft,
  rewritten in my style.
- **Modes:** read, edit and cooking. Cooking scales servings (ingredients
  only, not the method's numbers).
- **Ingredient lines:** an amount, a unit and an ingredient, nothing else;
  autocomplete with link-or-create; a line may stay outside the database;
  the list can be generated from the method by AI.
- **"@" references** to my own Recipes in the method or notes, up to three
  suggestions, buttons outside editing (Cooking too).
- **A log per Recipe:** Variations made, changed and deleted, heading edits,
  and cooks with notes and a verdict; a cook keeps a snapshot of what was
  cooked.
- **Ingredients:** a required aisle, in this order: Fruit & Veg, Bakery,
  Protein, Chilled, Cupboard, Frozen. Categories, cuisines, tags, protein
  and carbs kept in Settings.
- **Households:** not decided; Joe is the main user, his girlfriend an
  occasional one.

## Households

Joe hasn't decided how Households should work, or whether something
lighter would do: he is the main user, his girlfriend an occasional one.
The current design ([ADR-0016](../../20-architecture/adr/0016-sharing-and-visibility.md),
[ADR-0039](../../20-architecture/adr/0039-accounts-contacts-households.md))
gives each person a Personal Space and lets two people share a Household
Space. Three ways forward, for Joe to choose:

1. **A Household, as designed.** She signs in with Google; Recipes, Meals,
   Ingredients and shopping lists live in the Household; both of us edit
   them; lists update live. *Most capable; the most to build* (Contacts,
   invitations, leaving).
2. **Lighter: one Household, no Contacts.** Joe's account invites her
   directly by email; there is only ever one Household; no Contact
   requests or leaving rules yet. *The same use, about half the building*;
   ADR-0039 would be amended.
3. **Lightest: share links.** A shopping list or a Recipe can be opened by
   link, without an account; a shared list can be ticked. *Almost nothing to
   build, nothing for her to sign up to; anyone with the link can see it.*

*Recommended:* **2**, built late in the stage (step 9), so Recipes and the
Meal plan don't wait on it. Everything in the specs works the same for one
person or two.

## Done when

- Every **Must** requirement in this stage's specs is *verified* (a test
  citing its ID passes).
- Joe's recipes are in LifeOS, he plans the week's meals on the Meal plan,
  and his girlfriend sees the Household's Recipes and Meals.
- No two documents conflict.
