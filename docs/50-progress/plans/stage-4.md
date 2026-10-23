# Plan: Stage 4 — Recipes and the Meal plan

**Outcome** ([roadmap](../../roadmap.md)): Joe's recipes live in LifeOS,
shared with his girlfriend. **Recipes** holds the recipe library and the
ideas he has saved; **Meal plan** is where meals are planned, and holds the
Pantry of ingredients and household items that Recipes and shopping lists
draw on. Meals appear on Plan with no Plan
work ([ADR-0029](../../20-architecture/adr/0029-plan-reads-core-items.md)).
Cooking is logged, with or without a Meal
([ADR-0011](../../20-architecture/adr/0011-recipe-and-variation.md)). The
shared AI service and food preferences arrive, and Households
turn sharing on. **Shopping** follows in Stage 4b.

**State:** started 17 October 2026. Joe's brief is below; the drawer
already has its new order, with Cardio as a blank page (this plan's pull
request). Joe agreed every recommendation below (17 October). Step 1 is
under way: the [recipes](../../10-requirements/modules/recipes.md) and
[meals](../../10-requirements/modules/meals.md) specs are in their third
draft, after [Joe's comments](#joes-comments-18-october), for further rounds;
Shopping lists replacing List and Shop is decided
([ADR-0050](../../20-architecture/adr/0050-shopping-list.md)), and so is who
sees and edits food ([ADR-0051](../../20-architecture/adr/0051-who-sees-food.md)).
**The Recipes design is drawn without looking at v1**; v1's backend code may
be looked at only when the features are built (Joe, 18 October).

## Steps

Steps marked **Joe** need Joe's go-ahead or action before Claude does them.
Households come before the AI service (steps 8 and 9 swapped; Joe, 21
October).
Every step that builds a screen follows the [design system](../../30-design/README.md)
checklist and brings its own Playwright walks, citing the requirements it
verifies. The AI service is never called from a browser walk: the walks use
a stand-in, as they do for Supabase.

| # | Step | State | Produces |
|---|---|---|---|
| 1 | **Joe** — specs: the Recipes page (library and ideas, a Recipe and its Variations, states, the log, Cooking, import, sharing ideas in); the Meal plan (Meals by slot, the Ingredient database); Shopping for Stage 4b; food preferences; Households, or something lighter; and what they change in capture, Inbox, items, Search, Plan and Reminders | Joe agreed the recommendations 17 October; ADR-0050 (one Shopping list Type) agreed, ADR-0010 superseded, every document naming List or Shop updated. A first draft drawn partly on v1's Recipes spec was withdrawn at Joe's wish (he wants first principles, not v1). Second draft, from [Joe's notes](#joes-notes-17-october), with Claude's suggestions marked: [recipes](../../10-requirements/modules/recipes.md) (RCP-001–017) and [meals](../../10-requirements/modules/meals.md) (MPL-001–004, ING-001–002, SHP-001–004; second draft), all *proposed*; ADR-0011 (states set on each Variation, a cook's snapshot), ADR-0012 (a line is an amount, a unit and an ingredient; six aisles), ADR-0014 (Recipes' tags) and ADR-0028 (Android's share target in Stage 4) amended. Third draft after [Joe's comments](#joes-comments-18-october), 18 October: recipes RCP-001–018, meals MPL-001–004, PAN-001–004, SHP-001–004; ADR-0051 (who sees and edits food) agreed; ADR-0011, 0012, 0016, 0017 and 0021 amended. Next: Joe's further rounds, and Households, settled 18 October ([Households](#households)). Fourth draft after [Joe's answers](#joes-answers-18-october): HSH-001–004 in spaces and sharing; recipes and meals updated; ADR-0039 amended (no Contacts) | [recipes](../../10-requirements/modules/recipes.md) (RCP-*), [meals](../../10-requirements/modules/meals.md) (MPL-*, ING-*, SHP-*), changes to [spaces and sharing](../../10-requirements/cross-cutting/spaces-and-sharing.md), [capture](../../10-requirements/cross-cutting/capture.md), [Inbox](../../10-requirements/views/inbox.md), [items](../../10-requirements/cross-cutting/items.md), [search](../../10-requirements/cross-cutting/search.md), [Plan](../../10-requirements/views/plan.md) |
| 2 | Decisions: one shopping-list Type ([ADR-0050](../../20-architecture/adr/0050-shopping-list.md), done with step 1); how food is held and shared in the database; units and totals; the AI service and import; sharing into LifeOS; Cooking's wake lock and timers; the generated data model ([ADR-0036](../../20-architecture/adr/0036-changing-the-model-over-time.md)) | Joe agreed ADR-0052, 0053, 0055 and 0056 (18 October; ADR-0030, 0036 and 0044 amended to match, and the data model's food rows updated); ADR-0054 rewritten for Gemini's free tier and, at Joe's word, the AI given the Pantry to match lines itself — awaiting Joe's agreement. Written 18 October: [ADR-0052](../../20-architecture/adr/0052-food-in-the-database.md) (food Items and child rows, Recipes seen through a Household, lists seen through their Meals, the Pantry and staples, unique names, leaving, the activity log for food, the generated data model), [ADR-0053](../../20-architecture/adr/0053-quantities-and-units.md) (lines as typed; one `packages/food` for parsing, scaling, totals; one shared case table for the database's check), [ADR-0054](../../20-architecture/adr/0054-the-ai-service-and-import.md) (one `ai` Edge Function with named tasks on **Gemini's free tier, never billed** — Joe won't pay for AI, as in v1 — a free Flash model named in configuration, JSON checked against each task's schema, YouTube watched as video, only public pages and Pantry entries sent, the AI matching lines to the Pantry, nothing saved by the AI, a daily allowance per person and an off switch; `link-preview`; first written for a paid model, rewritten the same day at Joe's word), [ADR-0055](../../20-architecture/adr/0055-sharing-into-lifeos.md) (Android's share target; an iOS Shortcut later), [ADR-0056](../../20-architecture/adr/0056-cooking-on-the-device.md) (wake lock, timers on the device with a pushed alert). Re-checked from search: Gemini's free limits are reported between 20 and 1,500 requests a day and change often, free-tier content may be used by Google, linking billing makes all use charged, and public YouTube links can be given as video; TikTok's oEmbed needs no token; Instagram's hasn't since June 2026 but gives no thumbnail; Web Share Target works for an installed app on Android, not on an iPhone; Wake Lock on Android, and in an iPhone's home-screen app from iOS 18.4. The Contact-search question went with Contacts (ADR-0039 amended) | ADRs |
| 3 | **Joe** — design, with Claude design: the Recipes grid and a Recipe (Variations, ingredient lines, method, cook log); the Meal plan's week and its slots; the Pantry; adding a Meal from a Recipe; Meal cards on Plan; the drawer icons for Meal plan and Shopping. Into the design spec first, then the shared components, with the screenshot tests refreshed | First pass 18 October on a [design canvas](https://claude.ai/artifact/6GfJTp2G1BF6n573dqHxpy) (private to Joe), drawn from the real components on `/design-stage-4` (development and preview builds only; `DESIGN_PAGE=design-stage-4 scripts/design-shots.mjs` takes its screenshots), dark and light, computer and phone: the library, Filters, New recipe and Import; Ideas, selecting and a new Idea; a recipe (mine and a Household member's), comparing Variations; editing a Variation (lines as typed, Pantry suggestions, @ references) and its heading; Cooking, scaled and finished; the Meal plan's week (a row per slot), adding, dragging and a Meal; the Pantry and a new entry; Settings → Households and Food, a Household, inviting. Drafted in `@/components/lifeos` with it: RecipeCard, RecipeGrid, RecipePhoto, StarRating, IngredientList, MethodSteps, StepEditor, TimerChip, ServingsStepper, LogEntry, RecipeFact, MealCard, MealSlot, AddMealButton, MealWeek, MealDay; LabelChips may drop its tag icon; PlanToolbar's Day / Week is optional. Photos are placeholders (no photo library reachable from the session). Seven questions for Joe, answered the same day; the second pass follows them: S / M / L card sizes, Filters in a column on the left (FilterPanel), separate amount, unit and ingredient boxes (IngredientLineEditor, SubheadingEditor), phone Cooking as one long page, a Staple toggle on every Pantry row (PantryRow), an invitation only in Settings → Households; then a polish pass over every screen; a third pass puts the filters in one Card (an Accordion for all but State and Category; a Sheet on a phone) and adds selecting several Recipes (SelectionBar). Joe agreed it on 18 October, with Cooking's ingredients not ticked off; then written into the design spec (components.md: the food components, FilterPanel, SelectionBar, Accordion's `sm`; patterns.md: Recipes, the Meal plan, Settings' Households and Food, the drawer's icons) and onto `/design`, its screenshots refreshed. **Done** | [design system](../../30-design/README.md), components |
| 4 | Schema: the `food` Module — Recipe, Variation and Meal in the ontology; ingredient lines (with subheadings), method steps and the cook log (with its snapshot) as child rows; the Pantry, one catalogue for everyone, and each Household's staples; Recipes seen through their author's Household and Variations added by members (ADR-0051); slots narrowed to breakfast, lunch and dinner (the Stage 1 schema allows snack); reference data; the generated data model; database tests | Written 18–19 October: the ontology gains the `food` Module (Recipe, Variation, Meal; *uses* and *variation of*); migrations, applied to `lifeos` on 19 October with the advisors clean of anything new: `stage4_food_schema` (the `food` schema: Pantry, staples, each person's lists, the detail tables, lines, steps and cooks; Recipes and Variations readable through a Household; slots narrowed), `stage4_food_rules` (detail rows made with their Item; Recipes kept Personal; unique Recipe names; states worked out, never back to Idea, archiving and bringing back; a Thought or Note sorted into a Recipe becomes an Idea; the activity log for food), then the write functions in `stage4_food_writes` (Recipes, Variations, lines, steps, cooks), `stage4_food_meals` and `stage4_food_pantry` (the Pantry, staples, lists) — split so each fits the Supabase tool's time limit — and the `ontology` lookup rows; `npm run data-model` generates the data model's Types table and metamodel, and `npm run check` now runs it and the ontology check; database tests `food_test` (50); the can_read benchmark re-run with the Household path (5 ms for 300 Recipes, so no table of peers). Left for later steps: photos with `core.attachments` (step 5), leaving and deleting a Household (step 8), a Meal's protected shopping lines (Stage 4b). Joe exposed `food` in the Data API on 19 October; the advisor then lists `add_variation`, `merge_pantry` and `set_meal_variation` as security-definer functions anyone signed in can call, which is intended: each checks what the caller may see or edit, and `food_test` covers it. **Done** | Migrations, database tests |
| 5 | Recipes page: the library and ideas, a Recipe, its Variations, the cook log and "Cook it now", favourites, Recipes in Search | Built 19 October: `packages/food` (parsing, scaling, rounding, timers) and the food data layer (reads, queued writes, unsent changes laid over, the log read from the activity log); the library (filters, search, sort, group, S / M / L, kept on the device; choosing several, with a long press on a phone), Ideas, New recipe (the heading Dialog) and New idea; a Recipe's page (Variations, facts, the log with what changed, "@" references kept as `@[Name](id)`), its heading, editing a Variation (lines read as typed, Pantry suggestions, adding to the Pantry, subheadings, steps, reordering, "@" suggestions), duplicating and comparing Variations; Cooking (wake lock, servings, the step I'm on, timers on the device that alert from any page, kept on the device) and logging a cook, now or for a day, with its snapshot, and changing my verdict; Settings → Food → Archived recipes; Recipes in Search by name, tag or ingredient, with their state; a Thought or Note sorted into a Recipe. `APP_STAGE` is 4, offering only Stage 4's Types built so far (Recipe and Variation: Meal waits for step 7). Walks in `recipes.spec.ts` against a stand-in that knows food. Then photos (20 October): `core.attachments` and Storage's private `photos` bucket, in migration `stage4_photos` (applied, advisors clean of anything new; `photos_test`, 12), a photo made WebP of about 250 KB on the device from a file, the camera or a link, in Edit heading, New recipe and New idea, shown on cards and the Recipe's page and kept by the service worker for offline. Joe's round on a phone (20 October): Add to the Pantry asks the aisle; ingredient lines read name, amount, unit, on one line, and drag by their handle on a phone; subheadings set as they read; the editor's fields two across on a phone with Done at the foot; every field kept when the page goes some other way (swiped back); sources removed by an X; the log says "Edited", with a note its maker may add (migration `stage4_change_notes`, applied; `change_notes_test`, 6), See all twenty at a time; a smaller photo on a phone with the details beside it; a bigger heart; an Idea opens in a popup with notes only, is deleted not archived, and is sorted; a Draft needs a category and a cuisine; the selection bar's actions at the foot of a phone; Dialogs scroll when taller than the screen. A bug hunt after it (21 October): a new line or subheading no longer shows or saves twice; a copied Variation's lines and steps take ids the app chose, so edits made before it is sent aren't refused, and a change's note is written only through `note_change` (migration `stage4_copy_ids_and_notes`, applied; `change_notes_test`, 9); a name closed with Escape is kept; Edit heading keeps as it goes; Make it the default only on my own Variation; a photo chosen with no signal says so at once; Ideas' Select only on my own; the Fab back after choosing; Reset with only State set; each cook in progress kept apart; and Button's `link` and `ghost-destructive` and Badge's X in place of hand-made buttons. Left: photos in Search's results; the timer's notification from the server when LifeOS is closed (ADR-0056, a database change); Created by, "· Sam" and whose Variation (built in step 8b); Fill from method and Import with the AI (step 9); Settings' lists (RCP-018 1) | Code, tests citing RCP-* |
| 6 | The Pantry, on the Meal plan page: entries, staples and out of stock, merging two; ingredient lines matched to a Pantry entry or adding one | Built 21 October: Meal plan joins the drawer (`utensils`), the Pantry alone until the week (step 7); ingredients by aisle and household items apart, with how many Recipes use each, searched and narrowed to staples or out of stock; New entry and Edit entry; Recipes that use it; Merge with… (two I added); Delete with Undo, or refused naming where it is used; staples and out of stock (in amber, a new `--warning`; ADR-0043 amended), a Household's from step 8b; names kept as typed in my Recipes, added one at a time or all at once; a line's unit the default of an entry added from it. No migration: the step 4 schema had it all. Walks in `pantry.spec.ts` | Code, tests citing PAN-* |
| 7 | Meal plan: a week of Breakfast, Lunch and Dinner (Plan's week on a computer, stacked days on a phone, dragging on both); Meals from a Recipe's Variation, typed, or leftovers; servings scaling the quantities; Meals on Plan | Built 21 October: the Meal plan's Week and Pantry tabs; the week Monday first (MealWeek on a computer, MealDays down a phone opening on today), with other weeks; a slot's "+" plans a Recipe (planned lately first, my categories with the slot's chosen, a Recipe's Variations when it has several), a Meal typed, or leftovers of the week before; a Meal opens over the page (eaten, its Recipe and Variation, servings, what it is leftovers of and its own leftovers; Move to…, Add leftovers…, Remove taking its leftovers, with Undo); dragging between slots with a mouse, or by pressing and holding on a phone, with Undo; Copy this week…; Meals on Plan in slot order with their slot, Plan's "+" → Meal, and dragging on Plan keeping the slot. `meal` is among the Types built. No migration: the step 4 schema had every write. Built with Households (step 8b): whose Meals show, For, and Settings → Food's default (MPL-005); for Shopping (4b): New shopping list and servings on a list (MPL-003 4). Walks in `meal-plan.spec.ts` | Code, tests citing MPL-* |
| 8 | **Joe** — Households: create, invite by email, owner and members, several per person, leave (HSH-001–004); then food shared as ADR-0051 sets | 8a built 21 October: migrations `stage4_households` (members' roles, `core.space_invites`, the people of my Spaces readable by name) and `stage4_household_make` applied by the tool, `stage4_household_invites` and `stage4_household_leaving` run by Joe in the SQL editor (their `delete`s wait on a confirmation the tool never receives; [migrations](../../40-operations/migrations.md)); advisors clean of anything new but the intended security-definer functions and a second read policy on `core.people`; `households_test` (33): making (my first Household takes my staples), renaming, inviting by email, joining, declining, withdrawing, leaving, removing and deleting, the shared Items each person made becoming theirs and Variations moving to their author's copy of the Recipe (ADR-0051). Settings → Households (invitations first, with Join and Decline) and a Household's page (Members, Invite, Withdraw, Remove; Rename and Delete for the owner, Leave for a member), the data layer laying unsent Household writes over what is shown and fetching everything again after joining or parting; CardRow gains `destructive`. Walks in `households.spec.ts`. 8b built 21 October: migration `stage4_meal_space` (where my new Meals go, `core.people.meal_space_id`, only to one of my Spaces; applied, advisors clean of anything new; `meal_space_test`, 7); Settings → Food's "New meals are for"; a new Meal goes there, leftovers where their Meal is; the week's Show (All my meals, Personal, each Household; kept on the device), a lock on Personal Meals among Household ones and a Household's name among two or more; a Meal's For, moving its leftovers too; the Pantry's staples those of where new Meals go; Created by in the library, "By Sam" on a member's Recipe, "(Sam's)" on a member's Variation, "· Sam" in the Meal picker; a Household's Item says so on Plan. Fixed on the way: my settings read by my id (#19). A bug hunt after it (#21): only an Item's maker moves it to another Space (migration `stage4_space_moves`, applied; `meal_space_test`, 9), so a member can't take someone else's Household Meal into their own Space, and For shows only on my own Meals; a Household made offline lists me as "You". Walks in `food-sharing.spec.ts`. Left: a card saying whose a Recipe is when two share a name (RCP, rare: only from before joining) | Code, tests citing HSH-*, MPL-*, PAN-* |
| 9 | **Joe** — a Gemini key with no billing ([integration setup](../../40-operations/integration-setup.md#gemini-stage-4)); then the shared AI service on Gemini's free tier; the AI features the specs keep: import first, then filling ingredients from a method | 9a, specs, 23 October: [Joe's answers](#joes-answers-23-october) written in — New (New recipe, New idea, Import) on both tabs; Import from a link into a Draft Variation; Fill from method replacing the lines; a Meal's own ingredients, and a typed Meal's link read for its ingredients (MPL-006, new); cups kept; v1's style rules adapted; RCP-007 5 and RCP-014 agreed; ADR-0054, 0053, 0052 and 0012 amended; the design spec's Import, Check the import, the two card buttons and the Meal's Ingredients. 9b built 23 October: migrations `stage4_ai` (each use of the AI an `ai` row in `ops.events`, a daily allowance per person, `core.ai_take` for the service role only; `food.keep_import`, keeping an import all together, or into my Idea) and `stage4_cup` (cup, 250 ml), applied, advisors clean of anything new; `ai_test` (14); cup in `packages/food`; the `ai` Edge Function (`status`, `recipe.import`: a page's structured recipe data and readable text, a YouTube video watched, a TikTok caption, an Instagram caption; Joe's style rules from v1 adapted, in `rules.ts`, with the prompt's version on each use; the reply checked against its schema, Pantry references checked; the page's picture), its unit tests with a fake fetch (12); New (New recipe, New idea, Import) on both tabs and the Fab, Import saying why when the AI can't be used, the Import Dialog (progress, saved before, several recipes, not a recipe), Check the import, an Idea's Import from its link; walks in `import.spec.ts` (7). 9c built 23 October: `recipe.fill_lines` in the `ai` function (the method, its "@" references as names, the lines checked against the Pantry; prompt version 2026-10-23.2), unit tests (14); in Edit variation, Fill from method (asked first over lines, Skeletons while it runs, Undo) and, on a Draft, Import from a link (the Import Dialog, saying it replaces what is there; lines, method, and servings, times and notes where empty, the link added; Undo); the editor's fields follow changes made elsewhere, so an import isn't written over when the page is left; walks in `import.spec.ts` (11). 9d built 23 October: migration `stage4_meal_lines` (a Meal's link, `food.meal_lines` and their adding and changing; applied by the tool, advisors clean of anything new) and `stage4_meal_lines_removing` (removing a line, and merges moving Meals' lines, run by Joe in the SQL editor for its deletes); `meal_lines_test` (11); `meal.ingredients` in the `ai` function (a link's lines and servings only; unit tests, 18); the Meal's popup's Ingredients ("Extra ingredients" on a Recipe's Meal): a typed Meal's Link with Get ingredients, asked first over lines, with Undo, and lines from the Pantry as a Variation's (the ingredient row shared with editing a Variation); Copy week copies a Meal's lines and link; walks in `meal-ingredients.spec.ts` (6). Left: a Meal's lines on a shopping list (Stage 4b); deleting a Pantry entry a Meal uses names only the Recipes | Specs; Edge Function, code, tests |
| 10 | **Joe** — uses Recipes and the Meal plan; what he trips over is fixed | Started 23 October: Joe's first list fixed, and a production bug hunt ([#27](../pull-requests.md#27--stage-4-fixes-from-joes-first-use-and-a-bug-hunt)) | Code, tests |

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

## Joe's comments (18 October)

On the second draft. Folded into the specs and ADRs, recorded here in
short:

- **Recipes:** filter Draft · Complete · All; an Idea needs only its name,
  with any number of links; comparing Variations kept; no way back to Idea
  once a Variation has ingredients or a method; Cooking keeps the screen
  awake and offers timers, without showing each step's ingredients;
  applying a cook's notes dropped; import from a video link kept, from a
  photo dropped; Joe's recipe style kept in the code, which Joe will give
  Claude; optional ingredient subheadings.
- **Sharing Recipes:** everyone in a Household with me sees all my Recipes,
  can't edit them, but can add their own Variations, which they keep if
  they leave.
- **The Pantry** (the Meal plan's tab, renamed from Ingredients): holds
  ingredients and household items; one for everyone in LifeOS, each entry
  changed only by whoever added it, none deleted while a Recipe uses it; a
  new entry's aisle is Cupboard; staples, and a staple out of stock added to
  the next list; merging two at most, choosing the name.
- **Meal plan:** a week view, Plan's design on a computer, stacked days on
  a phone, dragging on both; slots fixed at Breakfast, Lunch, Dinner; the
  "+" narrowed by category; typed Meals and leftovers (removed with their
  Meal); Meals Personal or the Household's; ticking a Meal eaten logs no
  cook.
- **Shopping:** what the Meals need can't be deleted or lowered; lists from
  the meal plan by aisle, lists by hand with my own subheadings; staples not
  added are shown, to add; a list holding any Household Meal is the
  Household's; a list is dated the day of its first Meal; a Thought becomes
  a list split at its commas.
- **v1:** the design is drawn without it; its backend code may be looked at
  when building.

## Households

Settled by Joe (18 October), after three options were put to him (Contacts
first as designed, inviting by email, or share links without accounts):

- **No Contacts.** Anyone creates a Household and is its **owner**; the
  owner invites existing or future LifeOS users by email; **members** can't
  invite. A person may be in **several Households**
  ([ADR-0039](../../20-architecture/adr/0039-accounts-contacts-households.md),
  amended).
- **Households are core**, for every Module: their requirements (HSH-001–004)
  are in [spaces and sharing](../../10-requirements/cross-cutting/spaces-and-sharing.md),
  not in the food specs.
- **What food shares** is [ADR-0051](../../20-architecture/adr/0051-who-sees-food.md):
  Recipes seen by everyone in any Household with their author, a Created by
  filter and pooled lists for browsing, Variations kept on leaving and never
  merged back, staples per Household, a default Space for new Meals in
  Settings and a Household filter on the Meal plan.

## Joe's answers (18 October)

To the third draft's open points: a leaver's Variations go under a copy of
the Recipe's heading, separate if they rejoin, the only way two Recipes can
share a name; a Created by filter (in a Household), and every Household
member's categories, cuisines, tags, protein and carbs pooled for browsing;
a Household aisle for household items, kept apart from ingredients; only
someone who added both entries merges them; staples per Household, any
member changing them; a default Space for new Meals in Settings, and a
Household filter on the Meal plan; Households as above; Copy week kept but
tucked away; Android for sharing now, an iPhone later, which must follow.

## Joe's answers (18 October, later)

The owner can't leave a Household, only delete it, for every member;
Recipes of the same name that two people had before joining both stay,
each saying whose; a list from the meal plan takes Household and Personal
Meals alike, and holding a Household Meal makes the whole list seen by the
Household; Joe's recipe style is already in v1's code, and he'll say where
when import is built. A list holding Meals of two Households is seen by
both.

## Joe's answers (23 October)

Joe gave v1's import prompt, rules and schema as a starting point. New
recipe, New idea and Import stay as three, under one "New" on both tabs.
A Draft Variation imports its ingredients and method from a link, leaving
the heading (asking before replacing). Fill from method replaces all the
lines. Any Meal can have its own ingredients from the Pantry (Cornflakes,
then Milk), and a typed Meal can take a link from which only its
ingredients are read — no "From a link" in the "+", and no "Make it a
recipe", since a Meal's link brings ingredients only. Cups are kept;
v1's standard pack size is dropped; sending the method for Fill from
method is fine.

## The rest of step 1 (18 October)

What the food specs change elsewhere, drafted for Joe, all *proposed*:
[capture](../../10-requirements/cross-cutting/capture.md) (sorting a
Thought into a Recipe Idea or a Shopping list; capture itself stays
Thoughts and Tasks; the share target for recipe ideas first),
[Inbox](../../10-requirements/views/inbox.md) (food puts nothing in Inbox,
Joe's decision), [items](../../10-requirements/cross-cutting/items.md)
(ITM-006: how food Items open, delete, recover and convert; Pantry entries
aren't Items), [search](../../10-requirements/cross-cutting/search.md)
(SRC-003: Recipes, Ideas and Shopping lists) and
[Plan](../../10-requirements/views/plan.md) (PLN-008: Meals and dated
Shopping lists on Plan, added from a day's "+", dragged); and
[reminders](../../10-requirements/cross-cutting/reminders.md) (Meals and
Shopping lists have no default Reminder).

## Done when

- Every **Must** requirement in this stage's specs is *verified* (a test
  citing its ID passes).
- Joe's recipes are in LifeOS, he plans the week's meals on the Meal plan,
  and his girlfriend sees the Household's Recipes and Meals.
- No two documents conflict.
