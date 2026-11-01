# Pull requests

Newest first. Each entry is added in its own pull request.

## [#56](https://github.com/joestables/lifeos/pull/56) — The Gym's schema, calculations, settings and exercise library

Branch `claude/eloquent-darwin-gudbuj` · 2026-11-01

**What it did**
- **Stage 5 steps 1–3:** the Gym spec (GYM-001–022, with Joe's recovery
  engine as Annex A), ADR-0058 and ADR-0059, and the design, agreed by Joe
  over four passes (design canvas, `/design-stage-5`, the Gym section of
  `/design`, components and patterns).
- **The ontology's `fitness` Module:** Exercise, Workout template and
  Workout, always Personal, coral; a Workout planned for a day (`do_on`)
  and completable; a Workout *follows* its template.
- **The schema (step 4):** equipment, the twenty built-in muscle groups,
  each person's muscle settings and Gym settings; `fitness.exercise` and
  `fitness.workout`; an Exercise's muscle groups (one primary), a
  template's exercises, a workout's entries and sets (a quick set has no
  numbers); the rules (Personal only, unique Exercise names, one workout in
  progress, equipment and groups of the owner's, stage and status
  together); the activity log; 22 write functions, and six removals for
  Joe to run. 53 database tests in `fitness_test`.
- **`packages/fitness` (step 5):** the recovery engine exactly as Annex A
  (a workout applied on its own, or the last 60 days replayed), strength,
  the best set, Beat current and the PR, template coverage, weekly targets,
  average frequency, an exercise's progression and Stalled, a muscle
  group's lines, and what to do next; weights in whole grams. 70 unit
  tests, Annex A's tables value by value. Joe's Stalled rule adds
  Workouts to stall to the Gym settings (`stage5_workouts_to_stall`).
- **Settings → Gym and the exercise library (step 6):** Preferred RIR
  and Workouts to stall; Equipment, Muscle groups and their targets,
  Recovery and Archived exercises; the Gym's three tabs, with Progression →
  Exercises the library (search, filters, sort; the chosen Exercise beside
  the list or on its own page) and New, Edit and Archive exercise. The data
  layer for the Gym, the stand-in's fitness tables, 18 browser tests.

**Documents touched:** gym, ADR-0058, ADR-0059, the data model, glossary,
components, patterns, tokens, the design system's README, integration
setup (the `fitness` schema to expose), the Stage 5 plan, the roadmap.

**Left for later:** templates, workouts, recovery and progression (steps 7–10).

## [#54](https://github.com/joestables/lifeos/pull/54) — Leftovers when a Meal moves, ticks offline, faded Recipes

Branch `claude/kind-dijkstra-kf2zvz` · 2026-10-27

**What it did**
- **A Meal moved** (the week's drag, Move to…, Plan's drag) goes anywhere;
  its leftovers at or before where it goes are removed, and Undo brings
  them back (`leftoversBefore`).
- **Ticks offline:** `stage4b_meal_line_ids` gives a Meal's line on a shop
  the id `shopping_private.line_id(list, meal, source)` (MD5) every time
  it is written; the app works out the same (`mealLineId`), so a line
  ticked before its Meal is sent, or after the Meal rewrote its lines, is
  the line ticked; and such a tick now shows at once (the ticks were laid
  over before the unsent Meal's lines were). Database tests in
  `meal_line_ids_test`.
- **Choosing several Recipes:** a Household member's fades, saying whose,
  as Meals that can't be chosen do.

**Documents touched:** meals (MPL-003 2, SHP-004 3), recipes (RCP-004 1),
ADR-0057, the data model, components (RecipeCard), patterns (moving a
Meal), the Stage 4b plan.

**Left for later:** nothing from Joe's list.

## [#53](https://github.com/joestables/lifeos/pull/53) — Lost imports, New variation, a second bug hunt

Branch `claude/kind-dijkstra-kf2zvz` · 2026-10-26

**What it did**
- **An import lost after a deploy:** opened on old code, the new service
  worker took over and its old files went; when the import finished,
  Check the import's code couldn't load, the page reloaded and the import,
  held only in memory, was gone. It is now held for the tab
  (`import-store`), and a reload for new code lands on the page being
  opened (`reloadForNewCode(href)`).
- **Import closed while it works** on Recipes goes on, as a Variation's
  does: a toast with Check it (or Choose) when it's read.
- **New variation** (RCP-009 5): an empty Draft of mine, named, opened to
  fill.
- **Bug hunt**, every Shopping, Meal plan and Recipes file read: a name
  taken by an archived Recipe or an Idea says so (it was "You already have
  a recipe with this name", for one out of sight); eaten Meals aren't
  offered for a shop (New shop ticked them); a ticked line's × on All,
  which did nothing, is gone; Shop details won't save an empty name;
  Delete recipe on a Recipe's own page.

**Documents touched:** recipes (RCP-004, RCP-006 6, RCP-009 5, RCP-014 1),
meals (SHP-002 4), patterns (a Recipe's menu, Complete list), the Stage 4b
plan.

**Left for later:** the findings reported to Joe and not fixed.

## [#52](https://github.com/joestables/lifeos/pull/52) — Joe's second round: review and bug hunt

Branch `claude/kind-dijkstra-kf2zvz` · 2026-10-26

**What it did**
- Reviewed Shopping, Recipes and the Meal plan at both widths in dark
  mode, and read their code.
- A name chosen on a Recipe that only a Household member's list had now
  goes onto my own list too, so Recipe lists shows it (RCP-006 5).
- Add a meal offers only the categories of Recipes I can plan, matched
  whatever their case: a category of Ideas alone, or one on my list that
  nothing uses, no longer leads to "No recipes match" (MPL-002 1).

**Documents touched:** recipes (RCP-006 5), meals (MPL-002 1), patterns
(adding a Meal), the Stage 4b plan.

**Left for later:** Joe uses it in a real shop.

## [#51](https://github.com/joestables/lifeos/pull/51) — Settings → Food: Recipe lists

Branch `claude/kind-dijkstra-kf2zvz` · 2026-10-26

**What it did**
- `stage4b_value_settings`: `food.move_value_uses` moves my Recipes
  (archived and deleted too) from one name to another, a tag once in its
  place; `food.rename_value` now renames on my Recipes too; neither is
  logged on each Recipe (`food.quiet`); a Recipe restored from Recently
  deleted puts its names back on its author's lists. Database tests in
  `value_settings_test`. Advisors: nothing new.
- Settings → Food → Recipe lists: a Card per list with counts, New,
  Rename (onto another name, a merge, asked first) and Delete (not while
  in use). Laid over at once, my Recipes only.

**Documents touched:** recipes (RCP-018), ADR-0052, the data model,
patterns (Settings), the Stage 4b plan.

**Left for later:** the UI review and bug hunt.

## [#50](https://github.com/joestables/lifeos/pull/50) — Import: the right cuisine

Branch `claude/kind-dijkstra-kf2zvz` · 2026-10-26

**What it did**
- BBC Good Food's easy chicken curry came in as Chinese. The model now
  writes `dishCuisine`, where the dish comes from, before `cuisineName`,
  and `ai` keeps `dishCuisine` (as my list spells it, else in Title Case),
  so a near miss from my list never wins (`cuisineOf`, with a test).
- The rules' Category and Cuisine section rewritten, with worked examples;
  `PROMPT_VERSION` 2026-10-26.1. `ai` deployed as one bundled file
  (version 7).

**Documents touched:** recipes (RCP-014 8), ADR-0054, the runbook, the
Stage 4b plan.

**Left for later:** Settings → Food, the UI review and bug hunt.

## [#49](https://github.com/joestables/lifeos/pull/49) — Add a meal: Recently viewed

Branch `claude/kind-dijkstra-kf2zvz` · 2026-10-26

**What it did**
- `stage4b_recent_views`: `food.recent_views`, each person's own (RLS),
  a row per Recipe moved on by `food.view_recipe` (the later view wins, so
  a view sent late by the queue never moves it back); it goes with its
  Recipe. Database tests in `recent_views_test`.
- Opening a Recipe's page records a view through the write queue
  (`viewRecipe`, `useRecentViews`).
- Add a meal: the search and categories (none chosen), then Recently
  viewed, three Recipes; every match only while searching or narrowing.
  Much smaller on both widths.

**Documents touched:** data model, meals (MPL-002 1), patterns (adding a
Meal), the Stage 4b plan.

**Left for later:** the AI's cuisines, Settings → Food, the UI review and
bug hunt.

## [#48](https://github.com/joestables/lifeos/pull/48) — Joe's second round: quick fixes

Branch `claude/kind-dijkstra-kf2zvz` · 2026-10-26

**What it did**
- Pantry: Show → Number of recipes (on a phone too); on a phone Pending
  beside whose, the ToggleGroup its own width.
- Shopping: ticked lines stay put; Lists is Other, without done lists;
  Complete list in a row's menu, asking first (shared `completeList`,
  `CompleteListDialog`); a new list is laid over the Items at once, so its
  page never flashes "This can't be found".
- Meal plan: the phone's Show select 160px; dragged cards don't turn (Plan
  too); "28 Sept – 4 Oct" on a phone; a phone's day is its "+" and its
  Meals saying their slot (MealSlotRow gone); Meals that can't be chosen
  fade and say why; Recipes using an entry spaced in their Dialog.
- Dialogs focus themselves; New dialogs' first field opts in with
  `data-autofocus`.
- Walks: shared `mealCards` and `addMeal` for both layouts; new walks for
  Complete from a row, ticks staying, and focus.

**Documents touched:** components (Dialog, PlanCard, MealCard, MealDay,
PantryRow), patterns (Meal plan, Pantry, Shopping), meals (SHP-001 1, 4,
5; SHP-002 1; MPL-001 2; MPL-002 1; PAN-001 1; decisions, pages),
glossary, ADR-0050, the Stage 4b plan.

**Left for later:** Recently viewed in Add a meal, the AI's cuisines,
Settings → Food, the UI review and bug hunt.

## [#47](https://github.com/joestables/lifeos/pull/47) — Shopping: what's needed on the shop by itself, Extra in two columns

Branch `claude/kind-dijkstra-kf2zvz` · 2026-10-25

**What it did**
- A shop's Space's out-of-stock staples and Required Essentials are on
  every open food shop by themselves, in All and Extra, worked out on the
  device; ticking one stores and ticks it (clearing needed), × unmarks it.
- Extra: Add staples (the staples its Meals use, the out-of-stock ones
  Added) over Add essentials (every Space's, once, the Required ones
  Added) on the left, Added on the right; on a phone Added first.
  OfferRow is now a fixed-width Add / Added Pill. Other Spaces'
  out-of-stock staples are no longer offered.
- Fixed: a staple showed Added when only a Meal's line had it.
- A shop's "2 of 27" counts All's rows; All names no Meals under a row; a
  line I added comes off with an ×.
- `stage4b_live_space_entries`: `food.space_entries` joins the Realtime
  publication, so marks made on another device reach an open shop.

**Documents touched:** components (ShoppingLine, OfferRow), patterns
(a shop's All and Extra), meals (decisions, SHP-002 3, SHP-003 1, 3,
SHP-005 3), ADR-0012, ADR-0050 and ADR-0057 amended, the Stage 4b plan.

**Left for later:** step 10 goes on: Joe shops with it.

## [#46](https://github.com/joestables/lifeos/pull/46) — The Pantry: sorts, Show, Pending, Staples and Essentials

Branch `claude/kind-dijkstra-kf2zvz` · 2026-10-25

**What it did**
- Staples and Essentials moved from Shopping → Food to the Pantry: whose
  (Personal or a Household), All · Staples · Essentials, and on every
  entry KeepToggles (a new component): Staple (`package`) and Essential
  (`star`), one or the other, with its Out of stock or Required pill; one
  taken off while only those show leaves with Undo.
- Sorts in a SortMenu: By aisle, Recently used (the latest Recipe, Meal or
  shop with it), Most popular (Recipes and Meals using it) and A–Z, either
  way round; Show the aisle and default unit on each row. Kept on the
  device.
- Pending, a page of its own (its count on the button), holds the names
  kept as typed.
- Shopping → Food shows only the shops.

**Documents touched:** components (PantryRow, KeepToggles, KeptRow),
patterns (the Pantry, Pending, Shopping), meals (decisions, pages,
PAN-001 1, PAN-002, PAN-004 2, SHP-005 1–2), glossary, ADR-0050 and
ADR-0051 amended, the Stage 4b plan.

**Left for later:** Shopping's part of Joe's first round (added by
themselves, Extra's two columns).

## [#45](https://github.com/joestables/lifeos/pull/45) — Meal plan: photos that stay, a phone's week that fits

Branch `claude/kind-dijkstra-kf2zvz` · 2026-10-25

**What it did**
- Planning a Meal no longer reloads every photo: each photo's signed link
  is kept on its own, and only paths without one are asked for (a walk
  that fails on the old code).
- On a phone, a slot's "+" opens the Add a meal Dialog with that slot
  chosen; the Popover drew under the page's days, so a tap could land on
  the page.
- A phone's week: the toolbar's Show and Select on a row of their own, so
  the dates show whole; each slot a new MealSlotRow (its name, fainter,
  beside its Meals; a compact "+"), Meals as one-line MealCards (`row`),
  dates 16px and days further apart (Joe chose this of two layouts).
- The lock marks a Personal Meal only when the week has Household Meals.
- Copy week removed (MPL-004, MPL-006 5).

**Documents touched:** components, patterns, meals (MPL-001 2, 6;
MPL-002 1; MPL-004; MPL-006 5), the Stage 4b plan.

**Left for later:** the Pantry and Shopping parts of Joe's first round.

## [#44](https://github.com/joestables/lifeos/pull/44) — Recipes: filters that stay put, sorts either way round

Branch `claude/kind-dijkstra-kf2zvz` · 2026-10-25

**What it did**
- Choosing a filter moves nothing: the FilterPanel's collapsed groups are
  exactly 36px, their count Badge inside; a filter's values show a muted
  `plus` that the tick replaces, so a pill never widens or rewraps its row
  (the Meal plan's Add meal categories too); a phone's Filters count sits
  on the button's corner.
- The State filter reads All · Draft · Complete (All to start).
- **SortMenu**, a new component: the sort and its arrow; in the menu the
  active one shows its arrow, and choosing it again reverses it. The
  library and Ideas use it; a sort kept from before keeps its way.

**Documents touched:** components, patterns, recipes (RCP-001 2, 6;
RCP-002 2), the Stage 4b plan (Joe's first round, step 10).

**Left for later:** the Meal plan, the Pantry and Shopping parts of Joe's
first round, each its own pull request.

## [#43](https://github.com/joestables/lifeos/pull/43) — joestables.uk live

Branch `claude/kind-dijkstra-kf2zvz` · 2026-10-25

**What it did**
- Recorded the move: Joe took `joestables.uk` off v1's project, and Claude
  added it to `lifeos` with `www` redirecting to it; both verified, the
  site and its manifest served.

**Documents touched:** integration setup.

**Left for later:** Joe installs LifeOS again from `https://joestables.uk`
on his phones.

## [#42](https://github.com/joestables/lifeos/pull/42) — LifeOS at joestables.uk

Branch `claude/kind-dijkstra-kf2zvz` · 2026-10-25

**What it did**
- Google Calendar connecting trusts `joestables.uk` (and `www.`) as the
  app's address, and falls back to `https://joestables.uk/settings`;
  `calendar-connect` and `calendar-callback` redeployed, each as one
  bundled file.
- The address moved in the docs: environments, integration setup (Supabase
  and Google settings Joe changed, the domain move, the iOS Shortcut),
  runbook.

**Documents touched:** environments, integration setup, runbook.

**Left for later:** Joe removed the domain from v1's Vercel project and
Claude added it to `lifeos` the same day (recorded in the next pull
request).

## [#41](https://github.com/joestables/lifeos/pull/41) — Stage 4b, step 9: sharing a recipe in

Branch `claude/kind-dijkstra-kf2zvz` · 2026-10-25

**What it did**
- Android: the manifest's `share_target` opens `/share`, which keeps an
  Idea at once, offline too, and shows "Saved as an idea", or "Already
  saved" with Open for a link saved before (on the device, or on the
  server with signal); signed out, it carries on after sign-in.
- `link-preview` answers the link's name as well as its picture, and the
  device fills shared Ideas' names and photos when there's signal.
  Deployed by the tool as one bundled file (`scripts/bundle-function.mjs`).
- iPhone: New idea opens with a link from `/recipes?tab=ideas&share=…`, for
  an iOS Shortcut whose steps are in integration setup.
- Unit tests and walks.

**Documents touched:** ADR-0055 (as built), ADR-0054, runbook, integration
setup (sharing, the iOS Shortcut), recipes spec (RCP-003), design patterns,
plans/stage-4b.md.

**Left for later:** Joe installs LifeOS again on Android, makes the
Shortcut and tries both; step 10, Joe uses Shopping.

## [#40](https://github.com/joestables/lifeos/pull/40) — Stage 4b, step 8: a Thought or Note made a food shop

Branch `claude/kind-dijkstra-kf2zvz` · 2026-10-25

**What it did**
- Convert to offers Shopping list only to a Thought or Note naming a
  Pantry ingredient (Joe, 25 October); it becomes a food shop, its lines
  read from its text and matched to the Pantry, or its lines go onto an
  open food shop chosen in a small Dialog.
- `writtenLines` reads the text: commas, line breaks, a list's last "and",
  bullets and checkboxes, "buy", amounts and plurals.
- Unit tests and walks.

**Documents touched:** meals spec (SHP-003), items spec (ITM-006), ADR-0050,
design patterns (Convert to), plans/stage-4b.md.

**Left for later:** step 9, sharing a recipe in from Android and an iOS
Shortcut; step 10, Joe uses Shopping.

## [#39](https://github.com/joestables/lifeos/pull/39) — Stage 4b, step 7: shopping together, live

Branch `claude/kind-dijkstra-kf2zvz` · 2026-10-25

**What it did**
- `useLiveShopping`: while Shopping or a list is open, Supabase Realtime's
  Postgres Changes on the shopping tables refresh what they touch, so
  another device's ticks, lines and Meals arrive within a second or two;
  deletes counted only when they name a line or list on the device; joining
  again after a dropped connection refreshes everything.
- The browser walks' stand-in answers Realtime's websocket; walks for
  another device's changes arriving and a tick made with no signal.

**Documents touched:** ADR-0057 (as built), ADR-0042, meals spec (SHP-004),
plans/stage-4b.md.

**Left for later:** step 8, a Thought or Note made a Shopping list; two
people on the real database when Joe uses it (step 10).

## [#38](https://github.com/joestables/lifeos/pull/38) — Stage 4b, step 6: a food shop from the Meal plan

Branch `claude/kind-dijkstra-kf2zvz` · 2026-10-24

**What it did**
- The Meal plan's Select: a SelectionBar in the week's toolbar, MealCards
  chosen (not eaten Meals, leftovers, or Meals on another open shop), and
  Add to shop making a new food shop of them, dated the first one's day,
  which opens.
- Walks: Select and Add to shop; a Meal on a shop not offered again; a Meal
  rescaled and the shop following; a Meal taken off and added back.

**Documents touched:** meals spec (SHP-002 built), design patterns and
components (MealCard's choosing, SelectionBar), plans/stage-4b.md.

**Left for later:** step 7, Realtime; step 8, a Thought or Note made a
Shopping list.

## [#37](https://github.com/joestables/lifeos/pull/37) — Stage 4b, step 5: the Shopping page

Branch `claude/kind-dijkstra-kf2zvz` · 2026-10-24

**What it did**
- `food.staples` renamed `food.space_entries`, `out_of_stock` now `needed`:
  `stage4b_space_entries` applied by the tool;
  `stage4b_space_entries_removing` (drops `set_staple`, adds
  `remove_entry`, merges moving staples and Essentials) for Joe in the SQL
  editor. The Pantry's staple marks removed (PAN-002).
- The shopping data layer: lists, lines, a shop's Meals, space entries,
  queued writes laid over offline, a Meal's lines worked out on the device
  until the server's arrive; totals in `packages/food`.
- Shopping in the drawer: Food (shops; each Space's Staples and Essentials,
  out of stock and Required) and Lists; New shop and New list; a shop's
  page with All, Meals and Extra; a list's page with subheadings; ticking,
  Done and Complete list with Undo; deleting with Undo.
- Dated lists on Plan, moved by dragging; Plan's "+" → Shopping list;
  Search finding a list by a line.
- Walks `shopping.spec.ts`; database tests updated for space entries;
  design screenshots updated for the Pantry without staples.

**Documents touched:** ADR-0057 (as built), ADR-0052, data model,
integration setup, meals spec (SHP-001–005, MPL-003, MPL-006 statuses),
Plan, Search and items specs, design patterns and components,
plans/stage-4b.md.

**Left for later:** Joe runs `stage4b_space_entries_removing`; reordering
a list's lines; step 6, a shop from the Meal plan's Select; step 7,
Realtime; step 8, a Thought or Note made a Shopping list.

## [#36](https://github.com/joestables/lifeos/pull/36) — Stage 4b, step 4: the shopping schema

Branch `claude/kind-dijkstra-kf2zvz` · 2026-10-24

**What it did**
- Shopping list in the ontology, in a new `shopping` Module (stage 4b).
- Migrations `ontology` and `stage4b_shopping_schema`, applied by the tool:
  lists, a food shop's Meals and lines, each through the list's Space;
  guards on a Meal's lines; the write functions; staples' kind; the
  Realtime publication.
- `stage4b_shopping_refresh`, for Joe in the SQL editor: a Meal's lines
  written by the database as it changes, taking a Meal off, deleting a
  line, merges moving shopping lines.
- `shopping_test` (31); the generated types include `shopping`.

**Documents touched:** ADR-0057 (as built), ADR-0052, data model,
integration setup, plans/stage-4b.md.

**Left for later:** Joe runs `stage4b_shopping_refresh` and exposes
`shopping` in the Data API; step 5, the Shopping page.

## [#35](https://github.com/joestables/lifeos/pull/35) — Stage 4b, step 3: the Shopping design agreed

Branch `claude/kind-dijkstra-kf2zvz` · 2026-10-24

**What it did**
- Joe's two changes: New shop asks Name, Date and For only, and no
  Shopping list has a time or place (ADR-0050, ADR-0057, the data model,
  SHP-001, PLN-008); Shopping's Food and Lists at one reading width,
  `max-w-3xl`, now a rule in patterns' page anatomy.
- The design written into the spec: patterns' Shopping section and the
  Meal plan's Select; the drafted components made final in components.md;
  ShoppingLine, OfferRow, KeptRow, MealCard's choosing and Badge's
  `warning` on `/design`, its screenshots refreshed.

**Left for later:** step 4, the database.

## [#34](https://github.com/joestables/lifeos/pull/34) — Stage 4b, step 3: the Shopping design, first pass

Branch `claude/kind-dijkstra-kf2zvz` · 2026-10-24

**What it did**
- ADR-0057 agreed by Joe; step 2 done.
- `/design-stage-4b` (development and preview builds only): Shopping's Food
  and Lists tabs, New shop, a shop's All, Meals and Extra, everything
  ticked, Complete list, a list, the Meal plan's Select and Add to shop,
  and "Saved as an idea", drawn from the real components; screenshots on a
  [design canvas](https://claude.ai/artifact/KZyE2VPa3jTsVZ4mjxanGk) for
  Joe.
- Drafted components, in components.md as Stage 4b drafts: ShoppingLine,
  OfferRow, KeptRow, MealCard's choosing, Badge's `warning`.

**Left for later:** Joe's comments on the design, then the design spec
(patterns) and the screenshot tests.

## [#33](https://github.com/joestables/lifeos/pull/33) — Stage 4b, step 2: Shopping in the database

Branch `claude/kind-dijkstra-kf2zvz` · 2026-10-24

**What it did**
- Step 1 closed: Joe agreed the Shopping specs.
- [ADR-0057](../20-architecture/adr/0057-shopping-in-the-database.md)
  (Proposed): a Meal's lines on a food shop are rows the database writes
  as the Meal changes, ticked ones kept; a shop's Meals in
  `shopping.list_meals`; staples and Essentials in `food.space_entries`;
  totals on the device; live updates by Supabase Realtime, refreshing the
  queries they touch.
- ADR-0052, ADR-0042, the data model and the ADR index amended.

**Left for later:** Joe's agreement to ADR-0057; the design (step 3).

## [#32](https://github.com/joestables/lifeos/pull/32) — Stage 4b: making a shop, and staples beside Essentials

Branch `claude/kind-dijkstra-kf2zvz` · 2026-10-24

**What it did**
- A food shop is made from the Meal plan's Select and Add to shop, or from
  Shopping → Food's New shop offering the plan's Meals to toggle; Meals are
  added or taken off afterwards.
- Staples move from the Pantry to Shopping → Food, each Space's list beside
  its Essentials; a staple may be out of stock, an Essential Required, and
  Extra offers both first. PAN-002 is replaced by SHP-005; the Pantry's
  built marks go in step 5.
- Joe's agreement to the earlier suggestions recorded, their marks removed.

**Documents touched:** meals (Pantry, Shopping, PAN-001, PAN-002,
SHP-001–005), recipes (RCP-003), ADR-0050, 0051, 0052, 0012, patterns
(the Meal plan's PageAction, the Pantry, Settings → Food), glossary,
plans/stage-4b.md.

**Left for later:** Joe's agreement to the specs; step 2's decisions.

## [#31](https://github.com/joestables/lifeos/pull/31) — Stage 4b: the Shopping specs, third draft

Branch `claude/kind-dijkstra-kf2zvz` · 2026-10-24

**What it did**
- Joe's answers written in: Shopping's Food, Lists and Online (later) tabs;
  a food shop linked to Meals and following their ingredients; All · Meals ·
  Extra; each Space's Essentials; out of stock and Essentials offered on
  Extra by Space, staples the Meals use highlighted; back in stock in the
  Space the line came from; a food shop for one Space; Done and Complete
  list; no repeating lists.
- A recipe shared from Android kept as an Idea with nothing to press, and
  an iOS Shortcut opening New idea filled in (RCP-003, in Stage 4b).
- Claude's suggestions marked: a Meal on one open food shop at most; a
  Meal's line not changed on a shop, more added on Extra; a sorted Thought
  a food shop when a line matches the Pantry; a link shared twice not saved
  again.

**Documents touched:** meals (Pantry, Shopping, PAN-002, MPL-003, SHP-001–005),
recipes (RCP-003), items (ITM-006), spaces and sharing, ADR-0050, 0051,
0052, 0053, 0012, 0055, 0028, data model, glossary, capability map, ADR-0026's
drawer, roadmap, plans/stage-4b.md.

**Left for later:** Joe's agreement to the specs; step 2's decisions.

## [#30](https://github.com/joestables/lifeos/pull/30) — Stage 4b plan: Shopping

Branch `claude/kind-dijkstra-kf2zvz` · 2026-10-24

**What it did**
- Stage 4 marked done (Joe, 24 October), with what it left listed in its
  plan.
- Wrote the [Stage 4b plan](plans/stage-4b.md): ten steps from the specs to
  Joe shopping with it, and six questions for the specs with Claude's
  recommendations (no repeating lists in 4b, Clear ticked on a standing
  list, ticking an out-of-stock staple, a Meal changed after its list is
  made, a list's done, Android's share target carried over).
- RCP-017's status corrected to built (it was built in Stage 4's step 8).

**Documents touched:** plans/stage-4.md, plans/stage-4b.md, roadmap,
docs/README, CLAUDE.md, recipes (RCP-017).

**Left for later:** Joe's answers and agreement to the specs (step 1).

## [#29](https://github.com/joestables/lifeos/pull/29) — Stage 4, step 10 closed

Branch `claude/kind-dijkstra-kf2zvz` · 2026-10-24

**What it did**
- The Import Dialog's Import is primary, beside Cancel at the bottom right.
- Add to the Pantry opens with the Dialog itself focused, so a phone's
  keyboard stays down.
- Step 10 closed: Joe is happy with Recipes and the Meal plan for now.

## [#28](https://github.com/joestables/lifeos/pull/28) — Stage 4: Joe's second list

Branch `claude/kind-dijkstra-kf2zvz` · 2026-10-24

**What it did**
- Pantry delete warns only of Meals today or later. Before an entry goes,
  the lines of past, deleted or cancelled Meals become typed with its name
  (migration `stage4_past_meal_lines`, `past_meal_lines_test` (3)).
- The AI names the dish's own cuisine before looking at my list: Pad Thai
  is Thai, not Chinese (`PROMPT_VERSION` 2026-10-24.1, `ai` version 6).
- Check the import on a phone: its lines and steps were jammed together
  with no gap; they are now spaced as editing a Variation's, with "Add an
  ingredient" and "Add a step".
- Lines matching no Pantry entry carry the `package-plus` mark, opening Add
  to the Pantry with the AI's aisle. They are added on Keep; a line left
  unadded is kept as typed. No "New" badge.
- No mark on a line in the Pantry; the `package-plus` mark only on one
  that isn't.
- In the method, Backspace in an empty step removes it, when editing and
  on Check the import; Enter starts the next step on both.
- Popup buttons are as wide as their words and sit at the bottom right, on
  a phone too.
- The Idea popup opens without the keyboard. Its Delete and Make it a
  draft share a line, with Done under them on a phone.

## [#27](https://github.com/joestables/lifeos/pull/27) — Stage 4: fixes from Joe's first use, and a bug hunt

Branch `claude/kind-dijkstra-kf2zvz` · 2026-10-23

**What it did**
- Joe's list (23 October):
  - deleting a Pantry entry names the Meals that use it too;
  - Import is never greyed while the AI is asked;
  - Import from a link goes on when its Dialog is closed, the Cards
    loading until it is kept;
  - Dialogs scroll: ScrollArea's viewport is a flex child, so a Dialog's
    body no longer grows past it; with a mouse the scrollbar always shows;
  - the log's "Edited" is for ingredients and method only;
  - a Recipe's Meal follows its Variation's servings;
  - Meals show their Recipe's photo, or a typed Meal's picture from its
    link (`link-preview`, new: not AI);
  - Merge into…, keeping the chosen entry's name and aisle;
  - editing's columns equally wide;
  - a typed line's mark adds it to the Pantry, with a default unit;
  - an entry's default unit is learnt from its first line with one
    (migration `stage4_default_units`, `default_units_test` (5)) and
    fills a new line;
  - decimals, never fractions;
  - steps aren't dragged;
  - no units in the Pantry list;
  - Cooking picks out no step.
- The bug hunt, of production and the code:
  - a write sent again by a reload, whose own id was then taken, was
    refused (seen once, `create_recipe`); now it counts as sent;
  - a page's code gone with a deploy crashed the page; it reloads once
    instead;
  - the browser's ResizeObserver notice is no longer reported;
  - a Pantry entry used only by a deleted Recipe or Meal was queued for
    deleting and refused; now it says so instead;
  - the Meal's popup put its old servings back on closing after Get
    ingredients.
- Checked and clean:
  - every function the app calls exists in production, with its
    arguments and permission;
  - every column it selects exists;
  - food data has no orphans, and no photo without its file;
  - no new security advisories.

## [#26](https://github.com/joestables/lifeos/pull/26) — Stage 4, step 9d: a Meal's own ingredients and link

Branch `claude/kind-dijkstra-kf2zvz` · 2026-10-23

**What it did**
- Migrations `stage4_meal_lines` (applied by the tool) and
  `stage4_meal_lines_removing` (run by Joe, its deletes): a typed Meal's
  link, `food.meal_lines` with RLS as the Meal's, never on leftovers;
  merges move Meals' lines too. `meal_lines_test` (11).
- `meal.ingredients` in the `ai` Edge Function: a link's ingredient lines
  and servings only.
- The AI asks Flash-Lite first, then Flash (Joe, 23 October).
- The Meal's popup: Ingredients ("Extra ingredients" on a Recipe's Meal),
  a typed Meal's Link with Get ingredients and Undo, lines from the Pantry;
  Copy week copies them (MPL-006). The ingredient row is shared with
  editing a Variation.

## [#25](https://github.com/joestables/lifeos/pull/25) — The AI answers sooner, and says when it took too long

Branch `claude/kind-dijkstra-kf2zvz` · 2026-10-23

**What it did**
- Joe's first imports stuck on "Writing it up", then said "The AI needs a
  connection": Gemini, thinking at its default, ran past the function's
  two minutes. The `ai` function (version 3) now asks for little thinking
  in whichever form the model takes, sends less of a page that has
  structured recipe data, gives up after 100 seconds as "took too long",
  and logs each call's time.
- The app says "The AI took too long" for a long wait cut off, and "needs
  a connection" only with no signal.

## [#24](https://github.com/joestables/lifeos/pull/24) — Stage 4, step 9c: Fill from method, and Import into a Draft

Branch `claude/kind-dijkstra-kf2zvz` · 2026-10-23

**What it did**
- `recipe.fill_lines` in the `ai` Edge Function: the lines a Variation's
  method uses, in Joe's line rules, checked against the Pantry.
- Edit variation: Fill from method in Ingredients (RCP-007 5) and, on a
  Draft, Import from a link in Method (RCP-014 10), each replacing what is
  there after asking, with Undo; lines matching no Pantry entry kept as
  typed (RCP-014 11).
- The editor's servings, times, notes and sources follow changes made
  elsewhere. Walks in `import.spec.ts`.

## [#23](https://github.com/joestables/lifeos/pull/23) — Stage 4, step 9b: the AI service and Import

Branch `claude/kind-dijkstra-kf2zvz` · 2026-10-23

**What it did**
- Migrations `stage4_ai` and `stage4_cup`, applied: a daily AI allowance
  per person counted in `ops.events`; `food.keep_import`, which keeps an
  imported Draft (or my Idea imported into) with its new Pantry entries
  and list names, all together; cup as a unit (250 ml). `ai_test` (14).
- The `ai` Edge Function on Gemini's free tier: `status` and
  `recipe.import`, reading a page, a YouTube video or a TikTok or Instagram
  caption, written in Joe's style (v1's rules adapted, `rules.ts`), the
  reply checked before use. Unit tests (12).
- New (New recipe, New idea, Import) on both tabs; the Import Dialog;
  Check the import; an Idea's Import from its link (RCP-014 1–9, 11).
  Walks in `import.spec.ts`; the Recipes walks use the New menu.

## [#22](https://github.com/joestables/lifeos/pull/22) — Stage 4, step 9a: specs for the AI features

Branch `claude/kind-dijkstra-kf2zvz` · 2026-10-23

**What it did**
- Wrote in Joe's answers of 23 October: "New" (New recipe, New idea,
  Import) on both tabs; Import from a link into a Draft Variation
  (RCP-014 10–11); Fill from method replacing the lines (RCP-007 5); a
  Meal's own ingredients, and a typed Meal's link read for its ingredients
  (MPL-006, new); cups kept; v1's style rules adapted.
- Amended ADR-0054 (tasks, the rules, the method sent, unmatched lines),
  ADR-0053 (cup), ADR-0052 (`food.meal_lines`, a Meal's link) and ADR-0012;
  the design spec's Import, Check the import, the card buttons and the
  Meal's Ingredients; the plan's step 9 split into 9a–9d.

## [#21](https://github.com/joestables/lifeos/pull/21) — Bug hunt after Households: only its maker moves an Item to another Space

Branch `claude/kind-dijkstra-kf2zvz` · 2026-10-21

**What it did**
- A member could change the For of someone else's Household Meal to their
  own Personal, and its maker lost it. The database now refuses moving
  someone else's Item to another Space, except back to its maker's own
  Personal Space, which leaving a Household does (migration
  `stage4_space_moves`; `meal_space_test`, 9); a Meal's For shows only on
  my own (HSH-003 3, new).
- A Household made offline listed me as "You (you)": now "You".

## [#20](https://github.com/joestables/lifeos/pull/20) — Stage 4, step 8b: food shared through Households

Branch `claude/kind-dijkstra-kf2zvz` · 2026-10-21

**What it did**
- Where my new Meals go (MPL-005): `core.people.meal_space_id`, set only to
  one of my Spaces (migration `stage4_meal_space`; `meal_space_test`, 7),
  chosen in Settings → Food with a Household. New Meals go there; leftovers
  go where their Meal is.
- The week's Show (MPL-001 5): All my meals, Personal or one Household,
  kept on the device; a lock on Personal Meals among Household ones, and a
  Household's name on its Meals among two or more (HSH-003 1).
- A Meal's For (MPL-003 1, HSH-003 2), moving its leftovers with it.
- The Pantry's staples are those of where new Meals go (PAN-002 1), so a
  Household's staples are shared by its members.
- Recipe authors: Created by in the library (RCP-001 5), "By Sam" first
  among a member's Recipe's facts, "(Sam's)" on a member's Variation, and
  "· Sam" in the Meal picker. On Plan, a Household's Item ends its line
  with the Household's name.
- New: `SpaceSelect` (Personal or a Household); MealCard's Household
  name. Walks in `food-sharing.spec.ts`.

## [#19](https://github.com/joestables/lifeos/pull/19) — Settings read by my id, not the first person I can see

Branch `claude/kind-dijkstra-kf2zvz` · 2026-10-21

**What it did**
- My settings were read as the first row of `core.people`, right only while
  I could read no one else's. Since Households (#18) I read the people of
  my Households, so it could have been another member's timezone and
  Reminder settings. They are now asked for by my id.

## [#18](https://github.com/joestables/lifeos/pull/18) — Stage 4, step 8a: Households

Branch `claude/kind-dijkstra-kf2zvz` · 2026-10-21

**What it did**
- Steps 8 and 9 swapped in the plan (Joe, 21 October): Households before
  the AI.
- The database (HSH-001, HSH-002, HSH-004; ADR-0016, ADR-0039, ADR-0051):
  members are owners or members; invitations by email wait for that
  address to sign in; I see the people of my Households by name. Making
  a Household (my first takes a copy of my staples), renaming, inviting,
  withdrawing, joining, declining, leaving, removing and deleting, each
  a function that checks who may. Parting makes the shared Items someone
  made theirs, and moves a Variation whose author no longer shares a
  Household with its Recipe's author onto their own copy of its heading.
  Four migrations, two run by Joe in the SQL editor because their
  `delete`s wait on a confirmation the tool never receives.
- Settings → Households: invitations first, with the Household's name,
  who sent it, Decline and Join (icons on a phone), then each Household
  I'm in. A Household's page: Members (Invite, pending invitations with
  Withdraw, Remove for the owner), Rename and Delete for the owner, Leave
  for a member, each asking first and saying what happens.
- The data layer reads Households, members and invitations, lays unsent
  Household writes over them, and fetches everything again after joining
  or parting. CardRow gains `destructive`.
- Database tests `households_test` (33); walks in `households.spec.ts`.

## [#17](https://github.com/joestables/lifeos/pull/17) — Stage 4, step 7: the Meal plan's week

Branch `claude/kind-dijkstra-kf2zvz` · 2026-10-21

**What it did**
- The Meal plan has Week and Pantry tabs. The week runs Monday to Sunday:
  MealWeek on a computer, MealDays down a phone opening on today; other
  weeks by ‹, ›, Today or a date (MPL-001).
- A slot's "+" plans a Meal (MPL-002): my Recipes, planned lately first,
  narrowed by a search and my categories (the slot's chosen), a Recipe's
  Variations when it has several; a Meal typed; or leftovers of the week
  before. A new Meal serves what its Variation does.
- A Meal opens over the page (MPL-003): eaten (no cook logged), its Recipe
  and Variation, servings, what it is leftovers of and its own leftovers;
  Move to…, Add leftovers… and Remove, which takes its leftovers, with
  Undo. Meals drag between slots with a mouse, or by pressing and holding
  on a phone, with Undo. Copy this week… makes a week's Meals again in
  another (MPL-004).
- On Plan (PLN-008): Meals in slot order, their slot where a time would
  be; Plan's "+" → Meal; dragging to another day keeps the slot.
- The data layer reads Meals and lays unsent ones, their servings and the
  Variation they use over what is shown. New: `PickRow`, and MealSlot and
  MealWeek as places to let a dragged Meal go. No migration.
- Spec first: the week's gaps (moving on a phone, the picker's modes, the
  Meal popup's menu, Copy this week, Plan's Add a meal) in `patterns.md`.

## [#16](https://github.com/joestables/lifeos/pull/16) — Stage 4, step 6: the Pantry

Branch `claude/kind-dijkstra-kf2zvz` · 2026-10-21

**What it did**
- Meal plan joins the drawer after Recipes; until the week (step 7) it is
  the Pantry alone, with "New entry" ending its toolbar on a computer.
- The Pantry (PAN-001): ingredients in a Card per aisle, in aisle order,
  then household items, each with how many Recipes use it on a computer;
  a search and All, Staples and Out of stock. New entry and Edit entry
  (an ingredient or household item, name, aisle, default unit; a name the
  Pantry has refused), Recipes that use it, and Delete with Undo, refused
  for an entry in use with where it is used.
- Staples and out of stock (PAN-002 1), kept in my personal Space until
  Households; Out of stock in amber, a new `--warning` token: amber, like
  red and green, keeps its usual meaning (ADR-0043 amended; Joe, 21
  October). Merge with… for two entries I added (PAN-003), nothing chosen
  to start.
- From a Recipe (PAN-004): an entry added from a line takes its unit as
  default; names kept as typed in my Recipes are listed, added one at a
  time or all at once, their lines then using the entry.
- The data layer reads staples and my Space, and lays unsent changes,
  deletions, merges and staples over what is shown. No migration.
- Spec first: the Pantry's menus, dialogs and kept-as-typed list in
  `patterns.md`; PAN-001 4 and PAN-004 2 made exact in `meals.md`.

## [#15](https://github.com/joestables/lifeos/pull/15) — Stage 4: Recipes — specs, decisions, design, the food schema and the Recipes page

Branch `claude/kind-dijkstra-kf2zvz` · 2026-10-17 to 2026-10-21

**What it did**
- Wrote [Stage 4's plan](plans/stage-4.md) from Joe's brief: Recipes (the
  library and saved ideas) and Meal plan (planning Meals, and the Ingredient
  database) as their own pages, with Shopping — shopping lists made by hand
  or from the meal plan — as a third, in Stage 4b. Its first step is the
  specs, with eleven questions for Joe, among them shopping lists replacing
  the List and Shop Types.
- The drawer's new order: Inbox, Plan, Tasks, Notes, Gym, Cardio, Recipes,
  Goals, Wardrobe, then Finance under "Later". Cardio moved out of "Later"
  as a blank coral page (`/cardio`); Meal plan and Shopping join when built.
  ADR-0026 amended (the pages and their order), ADR-0043 (Meal plan green,
  Shopping yellow), the drawer pattern, the Notes spec (no longer "Notes,
  Lists and Ideas"), the capability map, roadmap, docs index and
  `CLAUDE.md` follow; the drawer's Playwright walk checks the new order.

- Joe agreed all eleven recommendations. ADR-0050: one Shopping list Type,
  in place of List and Shop (ADR-0010 superseded; ADR-0012 and ADR-0013
  amended); the `lists` Module becomes `shopping`; the glossary, data
  model, capability map, Modules list, design system, specs and other ADRs
  follow.
- A first draft of the food spec drew partly on v1's Recipes documents; Joe
  wanted first principles instead, so it was withdrawn. The second draft,
  from Joe's notes with Claude's suggestions marked, is two specs:
  [recipes](../10-requirements/modules/recipes.md) (RCP-001–017) and
  [meals](../10-requirements/modules/meals.md) (MPL-001–004, ING-001–002,
  SHP-001–004), all *proposed*. ADR-0011 (states Idea, Draft, Complete,
  Archived, set on each Variation; a cook keeps a snapshot), ADR-0012 (a
  line is an amount, a unit and an ingredient; six aisles), ADR-0014
  (Recipes' tags) and ADR-0028 (Android's share target in Stage 4) amended;
  the data model, glossary, capture spec and roadmap follow. The plan sets
  out three ways to share with Joe's girlfriend.

- Joe's comments on the second draft folded in (third draft): recipes
  RCP-001–018 (Draft · Complete · All; ideas need only a name; no way back
  to Idea; Cooking's timers and wake lock; import from a video link; Joe's
  recipe style in code; optional ingredient subheadings; Household members
  see each other's Recipes and add their own Variations) and meals
  MPL-001–004, PAN-001–004, SHP-001–004 (the Pantry of ingredients and
  household items, one for everyone; staples and out of stock; three fixed
  slots; typed Meals and leftovers; a Meal's lines protected on a list;
  subheadings on lists by hand; a Thought split at commas into a list).
  ADR-0051 (who sees and edits food); ADR-0011, 0012, 0016, 0017 and 0021
  amended; the data model, glossary (Pantry, Slot), capture, Plan, sharing
  spec, design tokens and roadmap follow.

- Joe's answers to the third draft: Households settled — no Contacts; an
  owner invites by email; members can't invite; several Households per
  person; core, for every Module (HSH-001–004 in spaces and sharing;
  ADR-0039 amended). Recipes: unique names but for copies kept on leaving,
  a Created by filter and pooled lists in a Household, iPhone sharing to
  follow. Meals: a Household aisle for household items, kept apart; merging
  only by whoever added both; staples per Household; a default Space for
  new Meals in Settings and a Household filter; Copy week tucked away.

- Joe's later answers: an owner can't leave a Household, only delete it
  for everyone (HSH-004; ADR-0039); same-named Recipes from before joining
  both stay; a list holding a Household Meal is seen whole by the
  Household; the recipe style is in v1's code, to be pointed to later; a list holding Meals of two
  Households is seen by both.

- The rest of step 1: capture (sorting a Thought into a Recipe Idea or a
  Shopping list), Inbox (food puts nothing there, Joe), items (ITM-006),
  search (SRC-003) and Plan (PLN-008), all *proposed*.

- Merged `master` (#14, CI's fewer minutes) into the branch.
- Step 2's decisions, as Proposed ADRs for Joe: ADR-0052 (food in the
  database), ADR-0053 (quantities and units), ADR-0054 (the AI service and
  recipe import, on Gemini's free tier, never billed — first written for a
  paid model, rewritten at Joe's word), ADR-0055 (sharing into LifeOS), ADR-0056 (Cooking on the
  device), with the facts they rest on re-checked.

- Joe agreed ADR-0052, 0053, 0055 and 0056; ADR-0030, 0036 and 0044
  amended to match; the data model's food rows follow. ADR-0054: the AI
  is given the Pantry and judges each line's match or a new entry (Joe).

- Joe agreed ADR-0054 (Gemini's free tier, the AI matching lines to the
  Pantry). Step 3's first design pass: Stage 4's screens drawn from the real
  components on `/design-stage-4`, on a [design canvas](https://claude.ai/artifact/6GfJTp2G1BF6n573dqHxpy)
  for Joe, with the food components drafted in `@/components/lifeos`
  (recipe cards and grid, ingredient list, method steps, timers, the log,
  meal cards and the aligned week); `scripts/design-shots.mjs` takes any
  stage's design page.

- Step 3's second pass, on Joe's answers: S / M / L card sizes; Filters
  always showing in a column on the left (FilterPanel); separate amount,
  unit and ingredient boxes (IngredientLineEditor, SubheadingEditor);
  Cooking on a phone as one long page; a tap-to-toggle Staple (and Out of
  stock) on every Pantry row (PantryRow); an invitation only in Settings →
  Households. Then a polish pass over every screen: back links, the phone
  recipe's title, slot names once down the week, a lock for the Personal
  exception, form-height selects, a dash for no unit, Settings rows aligned.

- Third pass, on Joe's notes: the filters in one Card (State and Category
  open, the rest an Accordion, collapsed, with a count), and on a phone in
  a Sheet; selecting several Recipes (Select on a computer, a long press on
  a phone) with a shared SelectionBar, Ideas too; the phone toolbar without
  S / M / L and with Group beside Sort; the Pantry's recipe count hidden on
  a phone. RCP-001 and PAN-001 follow.

- Joe agreed the design (Cooking's ingredients aren't ticked off). Into
  the design spec: components.md gains the food components (RecipePhoto to
  PantryRow), FilterPanel, SelectionBar and Accordion's `sm`; patterns.md
  gains Recipes, the Meal plan, Settings' Households and Food, and the
  drawer's icons for Meal plan and Shopping. `/design` shows them, its
  screenshots refreshed. The Meal plan's action is "New shopping list"
  everywhere (meals.md, ADR-0012).

- Step 4, the schema: the ontology's `food` Module (Recipe, Variation,
  Meal; *uses*, *variation of*); the `food` schema with its rules and write
  functions; Recipes and Variations seen through a Household, read-only;
  the data model's Types table and metamodel generated from the ontology;
  database tests for every path ADR-0052 names; the visibility benchmark
  re-run.

- Step 5, Recipes: the library and Ideas, a Recipe's page with its
  Variations and log, editing a Variation and its heading, comparing,
  Cooking with timers and logging a cook, favourites, Archived recipes in
  Settings, Recipes in Search, and a Thought or Note sorted into a Recipe.
  New in the design spec, with the components: Suggestions, RecipePanel,
  RecipeColumns, VariationFieldsCard and FilterLayout; PageHeader's
  eyebrow and trailing controls; the editors kept as they are left and
  reordered by their handle; a card's long press. `APP_STAGE` is 4,
  offering Stage 4's Types only as they are built. The stand-in Supabase
  knows the food schema.

- Recipe photos: `core.attachments` and a private Storage bucket
  (migration `stage4_photos`, applied; `photos_test`); a photo made WebP of
  about 250 KB on the device, from a file, the camera or a link; shown on
  cards and a Recipe's page, and kept for offline. `npm run db:test` makes
  Storage's two tables on the bare image first.

- Joe's round on a phone: an aisle for a new Pantry entry; ingredient
  lines name first and on one line, dragged on a phone; subheadings as
  they read; the editor's fields two across, Done at the foot, nothing
  typed lost on a swipe back; a source's X; "Edited" in the log, with the
  maker's own note (migration `stage4_change_notes`), and See all twenty
  at a time; the phone's heading with a smaller photo; a bigger heart; an
  Idea in a popup, notes only, deleted not archived, sorted; a category
  and cuisine required from Draft; a refined selection bar on a phone;
  Dialogs that scroll.

- A production bug hunt after it: new lines saved once; a copied
  Variation's rows keep the ids the app gave them (migration
  `stage4_copy_ids_and_notes`, which also makes `note_change` the only
  way to write a note); a name closed with Escape kept; Edit heading kept
  as it goes; Make it the default, Ideas' Select and Reset fixed; a photo
  with no signal says so; cooks in progress kept apart; Button `link` and
  `ghost-destructive`, and Badge's X, for the hand-made buttons.

**Left for later**
- Photos in Search's results; the timer's notification from the server;
  steps 6 onwards; Joe's
  further rounds on the specs.

## [#14](https://github.com/joestables/lifeos/pull/14) — CI: fewer GitHub Actions minutes

Branch `claude/stoic-ramanujan-9attfe` · 2026-10-18

**What it did**
- GitHub warned that 90% of the month's 2,000 Actions minutes were used:
  each push cost about 11 (three jobs, each rounded up; the browser tests
  7), a push to a pull request ran CI twice, and document-only pushes ran
  everything.
- CI now runs once per push to a pull request and on `master` after a
  merge; the database and browser tests wait for the checks and are skipped
  when only documents change; the browser tests run on pull requests only
  ([CI](../40-operations/environments.md#ci)).
- A migration needs a pull request, a draft at least, before CI can pass
  for it: ADR-0040 and ADR-0035 amended; migrations, environments and
  CLAUDE.md follow. ADR-0035's `main` corrected to `master`.

## [#13](https://github.com/joestables/lifeos/pull/13) — Stage 3: Plan, Events and Google Calendar

Branch `claude/kind-babbage-p00wl4` · 2026-10-14 to 2026-10-17

**What it did**
- Closed Stage 2 (Joe, 14 October); its nightly smoke walk stays deferred.
- Wrote [Stage 3's plan](plans/stage-3.md) from Joe's brief: Plan shows
  every Schedulable Type, filtered by Type, a week on a computer (or a day)
  and a day on a phone; Events, repeating, with the Task ↔ Event switch;
  Google Calendar, incoming only or two-way, always Personal. Its first
  step is the specs, with eleven questions for Joe.
- Moved Lists, Shops and list templates (with live updates and ingredients
  to shopping lists) to a new Stage 4b, after Recipes: the roadmap,
  capability map, data model, Modules list and Notes spec follow, and
  ADR-0042 (live updates) and ADR-0036 (the generated data-model now comes
  with the first Module, `food`, in Stage 4) are amended.
- Drafted Stage 3's specs with Joe's answers: [Plan](../10-requirements/views/plan.md#requirements)
  (PLN-001–007), a new [Events](../10-requirements/cross-cutting/events.md#requirements)
  spec (EVT-001–006) and [Google Calendar](../10-requirements/cross-cutting/integrations.md#google-calendar)
  (GCL-001–006), all *proposed*. Capture stays Thoughts and Tasks
  (ADR-0027 amended); Events take Labels (ADR-0014 amended); capture,
  Inbox, items, Reminders, Search, the data model, glossary and capability
  map follow.
- Joe agreed the specs; step 2's decisions written as Proposed ADRs:
  ADR-0047 (how Google Calendar comes in), ADR-0048 (two-way), ADR-0049
  (how Plan reads a week), with Google's rules re-checked; Joe agreed them.
- Step 3's first design pass: Stage 3's screens drawn from the real
  components on `/design-stage-3`, on a design canvas for Joe, with the
  Plan components drafted (PlanWeek, PlanDay, PlanToolbar, WeekStrip,
  AddToDay; PlanCard extended). A second pass after Joe's comments, closer
  to the first Plan design, with "Link a task" on an Event; agreed, and
  written into the design spec (components, patterns) and `/design`.
- Step 4, the schema: an Event's place, Labels and default Reminder; all-day
  Events as dates; Task ↔ Event mapping times; repeating Events;
  `core.plan_items`; Plan's hidden Types; Google Calendar's connections,
  calendars and references, with Google's fields locked on incoming
  calendars. 35 database tests. Applied to the live project on 15 October
  in eleven smaller migrations (`stage3_columns` … `stage3_plan_items`,
  `ontology`), since the connector timed out on larger ones.
  `stage3_convert` (Task ↔ Event mapping times), which the connector holds
  for a confirmation that never reaches the session (it contains a
  `DELETE`), was run by Joe in the SQL editor, checked and recorded.
- Step 5, Events in the app: the Event popup and "New event" (from Plan's
  main action until Plan is built), times kept as dates when all day, an
  end before the start refused; place, notes, Labels; Reminders before an
  Event starts or on its day at a time, its notification saying when and
  where (two small migrations), and the Event default in Settings; the
  Task ↔ Event switch, and a Thought sorted into an Event; Events in
  Search; Tasks *for* an Event, linked or made there, shown on the Task.
  The design spec gains EventTimesField and the Event's Reminder choices.
- Step 6, repeating Events: Repeat on an Event (on a schedule only), each
  occurrence at its time in London either side of the clocks changing,
  shown at once offline; one occurrence changed alone, or the repeat
  stopped from one on; a repeating Event found once in Search. Undoing a
  new repeating Task or Event now takes its repeat with it.
- Step 7, Plan: the week on a computer and the day (a phone's, and a
  computer's when chosen), each Item on its days, the Type filter kept on
  every device, previous, Today, next and any date; adding a Task or an
  Event on a day; dragging to another day with Undo. ADR-0049 amended: Plan
  places Items from what the device holds (for Joe to confirm).
- Steps 8 and 9, Google Calendar incoming: Joe set up Google Cloud; five
  migrations and three Edge Functions (`calendar-connect`,
  `calendar-callback`, `calendar-sync` every five minutes), live; Settings
  connects, sets each calendar Off or Incoming, syncs and disconnects;
  Events from Google are read-only on Plan and in their popup, with "Open
  in Google Calendar"; a broken connection shows in Inbox and the health
  check. ADR-0047's as-built choices recorded for Joe to confirm.
- Step 10, Google Calendar two-way: an outbox on the server filled by
  triggers on Events and their series, and the `calendar-push` Edge
  Function, woken each minute while something waits, sending each Event (a
  repeating one as one Google repeating event) to its calendar, with
  retries and a later change winning; incoming sync recognises what LifeOS
  sent. Four migrations and the function, live; 16 database tests and unit
  tests against a stand-in for Google. Settings offers Two-way and "New
  events go to"; an Event from a two-way calendar is editable and
  draggable. ADR-0048's as-built choices recorded for Joe to confirm.
- Step 11, Joe's first round: "Default calendar" (with None) in place of
  "New events go to", and a Calendar field on a new Event; a Task's and an
  Event's popup one height on a phone (440px), scrolling inside; TimeField
  a Select of quarter hours. Then a bug hunt of Plan and Calendar, its
  findings fixed: Events made in LifeOS stay on disconnecting; a Task
  switched from an Event isn't deleted by Google; changes made mid-push
  aren't lost; Google's older cancellations, changed repeats, deleted
  repeats and repeats made from Events handled; Plan's midnight ends, a new
  Event's start time and dragging while loading fixed. Six migrations and
  four Edge Functions, live; 19 database tests, unit tests and walks.
- After Joe's report: the app's read of my calendars was refused the new
  `made_in_lifeos` column, so Settings lost its Google Calendar card or
  offered Connect; granted, tested, and Settings now says when it can't
  load. No empty "…" menu. Connecting Google Calendar is finished in the
  app by the person who began it (`calendar_received`, `calendar_finish`);
  `calendar-callback` and `calendar-connect` redeployed.
- Stage 3 closed (Joe, 17 October): plan, roadmap and CLAUDE.md say so;
  the as-built choices in ADR-0047, 0048 and 0049 carried to the roadmap's
  open questions for Joe to confirm.

## [#12](https://github.com/joestables/lifeos/pull/12) — Stage 2, step 14: Labels as filters, Thoughts ticked off

Branch `claude/laughing-babbage-maqg0k` · 2026-10-13

**What it did**
- Joe's second round from using LifeOS (plan step 14), each specified
  first in the design system:
  - `LabelChips`: my Labels as pills to choose, any number at once, kept in
    the page's address. On Notes they replace the Label tabs; on Tasks they
    replace By label, sit under the view Tabs, stay chosen across views and
    are given to a "New task"; on Inbox they sit at the top (INB-007).
  - Capture shows the Labels as pills, given to the Thought or Task saved
    (CAP-009).
  - Thoughts take Labels, shown in their row and set in their popup, and
    kept when sorted (ADR-0014 amended).
  - A Thought has a checkbox, as a Task does: ticked off, it is *done* and
    leaves Inbox, with Undo; a Thought's notification offers Done
    (INB-006, REM-005; ADR-0037 amended).
  - Inbox's "To sort" is "Thoughts"; the morning digest says "4 thoughts".
  - Done Tasks are struck through: a line-through didn't reach the title's
    button in a row.
- Converting keeps the status where the new Type has it, else active, as
  ADR-0019 says (a done Thought made a Note is an active Note).
- Two migrations (conversion's status, the digest; the generated ontology:
  Thought is Completable, with *done* and Labels), a new database test file,
  and browser tests for each change on desktop and phone.
- Live: the migrations are applied as `20261013190144` and `20261013190156`;
  the advisors found nothing new.

## [#11](https://github.com/joestables/lifeos/pull/11) — Stage 2, step 14: Joe's first round, and a bug hunt

Branch `claude/kind-dijkstra-1kv0xt` · 2026-10-12

**What it did**
- Joe's first round from using LifeOS (plan step 14). The changes, each
  specified first in the design system:
  - Convert's toast has Undo (ITM-004 3).
  - Whatever can be pressed shows the pointing hand.
  - Capture is "New" with a speech bubble at the top right of every page,
    no longer in the drawer (`CaptureButton`).
  - Pull to refresh on a phone (`PullToRefresh`): the page scrolls in its
    own box, which the browser's can't reach.
  - Search is a popup on a phone too, closed by a tap outside; the Search
    page is gone.
  - A checkbox fills with its tint on hover.
  - "New task" opens a new Task with every field, kept on Save
    (`NewTaskDialog`, sharing `TaskFields` with the Task popup; TSK-001 4).
  - Notes sit in a masonry, like Keep.
  - The drawer says nothing while all is saved.
  - "New task" and "New note" sit just after the Tabs (`PageAction`,
    `TabsRow`).
- A bug hunt across the app and database, with fixes:
  - A default Reminder no longer comes back or doubles when a date moves.
  - A Reminder already past when it was set isn't sent.
  - Converting keeps a Thought's Reminder when Tasks get no default.
  - Refused changes can be cleared (OFF-004 2).
  - Signing out stops this device's notifications (ACC-003 3).
  - N and / don't fire in menus.
  - A Label made twice offline is one Label.
  - Undo of "done" restores Someday and takes away a repeat's next
    occurrence.
  - A fixed Reminder is read in the home timezone.
  - The date picker closes after a pick.
  - Settings' times are kept on leaving the field.
  - Two fixes to the nightly run and the notification sender.
  - The full list is in the [plan](plans/stage-2.md#bug-hunt-12-october).
- Plan step 13, the nightly smoke walk, is deferred until the roadmap is
  complete; Stage 2 is provisionally closed (Joe, 12 October), with step
  14's fixes still coming.
- The Notes masonry places cards from what they show, so they never
  jump; the design screenshot test waits for its page to be drawn (it
  sometimes caught a blank page).
- One migration (undoing a conversion, the default Reminder, past
  Reminders, Label aliases, the nightly run, stuck notifications), 12 new
  database tests, and browser tests for each change on desktop and phone.
- Live: the migration is applied as `20261012214527`; the advisors found
  nothing new.

## [#10](https://github.com/joestables/lifeos/pull/10) — Stage 2, step 12: Search

Branch `claude/kind-dijkstra-1kv0xt` · 2026-10-12

**What it did**
- Plan step 12. Search opens from a button beside the brand in the drawer,
  or with / on a computer: over the page on a computer (`CommandDialog`),
  as its own page on a phone, which keeps what was typed in its address so
  going back from a result finds it again.
- Results come as I type, from `core.search_items` (step 4's full-text
  search over titles, Labels and bodies), best match first, grouped by
  Type, each with its TypeTile, its title and one line — the body line it
  found, the Labels that matched, or a Task's dates — the words matched in
  bold. They are shown as the device has them, so unsent changes count; a
  repeating Task shows once. The arrow keys and Enter, or a tap, open the
  Item where its Type opens.
- Offline, or with the server out of reach, the Items on the device are
  searched the same way, and Search says "Offline · Results may be
  incomplete". Searches are never kept on the device.
- New in the design spec first: Command's states and keys, the drawer's
  Search button, and a Search section in patterns. Command is on the
  design-system page.
- 16 unit tests and 4 browser tests (desktop and phone; / on a computer
  only). No migration: the database's part came with step 4.

## [#9](https://github.com/joestables/lifeos/pull/9) — Stage 2, step 11: Reminders and notifications

Branch `claude/kind-dijkstra-1kv0xt` · 2026-10-12

**What it did**
- Plan step 11
  ([ADR-0044](../20-architecture/adr/0044-reminder-delivery.md)). Each
  minute `pg_cron` queues what has come due, one row per notification and
  device: Reminders (up to 12 hours late, then recorded as missed), each
  person's morning digest at their digest time ("2 overdue · 3 today · 4 to
  sort", skipped when nothing needs them), and, for those without a digest,
  one nudge per overdue Task at their default time. When rows wait it wakes
  `send-notifications`, which sends them by Web Push (topic and tag so a
  repeat replaces itself, high urgency) and records each: sent, failed and
  tried again, gone (the device stops being sent to, and `ops.events` says
  so), skipped (done or deleted meanwhile) or missed.
- Done and Snooze on a notification go to `notification-action` with the
  delivery's token; Done on a Task repeated after completion makes its
  next with the engine; Snooze brings it back in an hour, for me only.
- LifeOS's own service worker (vite-plugin-pwa's injectManifest): the
  offline files as before, the notification (its title, time and buttons),
  a tap that opens the Item in the window already open, and presses made
  with no signal kept and sent later.
- Settings gains Notifications (this device's "Turn on", each device with
  its switch and Remove; "Add LifeOS to your Home Screen first" in an
  iPhone's browser) and Reminders (default time, dated Tasks and Thoughts,
  the morning digest and its time). Inbox offers to turn notifications on
  while no device has them, with "Not now". A Task's popup lists its
  Reminders, each changed or removed, and adds them on its do-on or due
  date or at a set time; a Thought's at a set time. A repeating Task's own
  Reminders go to each occurrence. A dated Thought's Reminder respects the
  Thought default.
- New in the design spec first: ReminderList, ReminderDialog, Alert's
  action, the Settings cards and Inbox's offer. ADR-0044 now says the VAPID
  keys are made by the sender and kept in Vault, every secret is checked
  by the database (nothing typed into a dashboard), and the health check
  looks for notifications waiting over an hour.
- 29 database tests, 9 tests of the two functions, 10 unit tests and 9
  browser tests (each on desktop and phone). A browser can't be made to
  show a real notification in a test, so what a push becomes is a unit
  test, and a real one on each device is checked by hand.
- Live: the migration is applied as `20261012105115`; `send-notifications`
  and `notification-action` are deployed; Vault holds `push_secret` (made in
  the database) and the VAPID keys, which the sender made on its first run;
  `minute-notifications` runs each minute. A call to `notification-action`
  with a wrong token is refused. The security advisor's note that signed-in
  people can call `core.vapid_public_key` is meant: it returns only the
  public key a device subscribes with.

## [#8](https://github.com/joestables/lifeos/pull/8) — Stage 2, step 10: repeating Tasks

Branch `claude/kind-dijkstra-1kv0xt` · 2026-10-12

**What it did**
- Plan step 10. `packages/recurrence`, the one repeat engine
  ([ADR-0045](../20-architecture/adr/0045-extending-series.md)), ported from
  v1 with its cases and no dependencies, now in calendar days: daily, every
  weekday, weekly on chosen days, every N days, weeks, months or years,
  monthly on a date, the nth or last weekday or the last day, yearly
  (skipping 29 February), an end by date or count, after completion, and
  the window a run makes. The app and the Edge Function import the same
  files.
- A Task's Repeat field opens the Repeat Dialog (the first RadioGroup of
  `cards`: on a schedule, or after it's done). The device works out twelve
  weeks of occurrences and the one after, and `core.set_repeat` writes the
  series and them in one call, offline too. Changing the repeat of an
  occurrence starts a new series from it, keeping occurrences I had
  changed; "Don't repeat" stops it there. Ticking a Task repeated after
  it's done makes its next (`core.complete_occurrence`).
- Only a series' next open occurrence shows, in Tasks and Inbox; one
  overtaken by a newer due one is skipped unless I changed it. Rows show
  the repeat ("Weekly"); the Recurring view lists each repeating Task once,
  on a schedule then after it's done, with its repeat in full. Occurrences
  a repeat took away stay out of Recently deleted (ITM-003).
- The nightly run: the `extend-series` Edge Function, called at 02:00 UTC
  by the `nightly-series` job through `pg_net` with a secret in Vault, keeps
  every series twelve weeks ahead, makes a missing after-completion next,
  skips overtaken occurrences and records its heartbeat, which the health
  check now watches ([runbook](../40-operations/runbook.md#the-nightly-series-run)).
- ADR-0045 now says each window includes the first occurrence beyond it,
  so ticking a yearly Task still shows the next, and that the engine works
  in days. 38 engine tests, 27 database tests, 5 tests of the nightly run,
  11 more unit tests and 5 browser tests (each on desktop and phone).
- Live: the migration is applied as `20261012024305`; `extend-series` is
  deployed; Vault holds `project_url` and `series_secret` (made in the
  database, never copied out); a run by hand made the heartbeat, and a call
  with the wrong secret was refused. The secret is checked against Vault by
  the database, so nobody types a copy into the dashboard. `pg_net` was left
  in `public`: moving it hangs on the live project
  ([runbook](../40-operations/runbook.md#the-nightly-series-run)).

## [#7](https://github.com/joestables/lifeos/pull/7) — Stage 2, step 9: Tasks

Branch `claude/kind-dijkstra-1kv0xt` · 2026-10-12

**What it did**
- Plan step 9, the Tasks page: All tasks (Overdue, Today, Tomorrow, each
  remaining day of the week by name, Later, No date, Someday), By label (an
  open group per Label, then No label; each Label's group ends with "Add a
  task", which gives the new Task that Label, its date understood) and
  Completed (most recently changed first: the database keeps no done
  time). "New task" opens capture as a Task. The Recurring view comes with
  repeating Tasks (step 10).
- A Task's row, shared with Inbox: tick done (with Undo; unticked in
  Completed it is open again), time, "Since Thu", due (red once passed),
  Labels, sub-tasks "2/5", Tomorrow and the star on hover, and a "…" menu
  with Tomorrow, Someday and Delete.
- The Task popup: its title and notes kept as typed, do-on date and time
  (a time with no day opens the Calendar to ask for one), due date,
  Labels from the LabelPicker, sub-tasks (tick, rename, remove, add), the
  star. Someday clears the do-on date; a date makes it active again.
- New in the design spec first: DateField, TimeField, SubtaskList, AddRow,
  TaskDetails, and a Tasks section in patterns. The app reads sub-tasks.
- Found on the way: By label's groups were all closed when they arrived
  after the page was drawn; the do-on Calendar stayed open after asking
  for a time's day; the stand-in's session expired when a test's clock ran
  ahead of the real one. 7 unit tests and 7 browser tests (each on desktop
  and phone).

## [#6](https://github.com/joestables/lifeos/pull/6) — Stage 2, step 8: Notes

Branch `claude/kind-dijkstra-1kv0xt` · 2026-10-11

**What it did**
- [ADR-0046](../20-architecture/adr/0046-note-bodies.md), chosen by Joe: a
  Note's body is Markdown, edited in place with TipTap (lists, checklists,
  bold, italic, links; no headings, quotes or code), loaded only when a
  Note opens (about 145 KB compressed). A round-trip test keeps the editor
  from changing what it is given. The data model says an Item's body is
  Markdown.
- Plan step 8, the Notes page: Tabs of the Labels my Notes have; Pinned,
  then Others, most recently changed first, as NoteCards in a grid (the
  start of the body as it reads, cut after 8 lines; Labels at the foot);
  "No notes yet". "New note" opens an empty Note with its title ready to
  type, kept only once something is typed. A Note opens in a 640px popup
  on a computer and on its own page on a phone, its title and body edited
  in place and kept as they are typed (a short pause, then the write
  queue; on closing or leaving at once). Its Labels are given from the
  LabelPicker, where a new one can be made. An untitled Note's first line
  stands in without its Markdown marks.
- New in the design spec first: NoteCard and NoteGrid, NoteEditor,
  LabelPicker, ItemDialog's 640px and editable title, ItemPage's editable
  title, and a Notes section in patterns.
- Found on the way: TipTap's focus command waits a frame, so what was typed
  straight after Enter in the title could land in the wrong place; the
  body is now focused at once. Ticking a checklist line no longer moves
  the keyboard focus. Checklist lines use the editor's own markup, styled
  like the Checkbox: CI's phone runs showed Enter on an empty checklist line
  not leaving the list with a custom line component, because on Chrome for
  Android the editor reads Enter from the page's change. 11 unit tests (the reader, the round trip) and 6
  browser tests (each on desktop and phone).

## [#5](https://github.com/joestables/lifeos/pull/5) — Stage 2, step 7: Inbox

Branch `claude/kind-dijkstra-1kv0xt` · 2026-10-11

**What it did**
- Plan step 7, the Inbox: Overdue (only a due date makes a Task overdue),
  Today (timed first) and To sort (Thoughts, newest first, with when they
  were captured and any Reminder), each hidden when empty, and "Nothing
  needs you". A repeating Task shows only its next open occurrence. Tick a
  Task done or move it to tomorrow, with Undo. A Thought becomes a Task or
  a Note in one action (buttons on hover; on a phone the "…" menu, or a
  swipe right to make it a Task), or is deleted with Undo. Made a Task,
  its dates are read as they were meant when it was captured, its title
  loses them, and a Reminder at the same moment as the Task's own is
  removed rather than kept twice (added to INB-002); the "…" menu's
  Convert to does the same. Inbox's count is in the drawer. Tapping a row
  opens its Item.
- The app now reads my Reminders. New in the design spec first: ItemRow's
  hover actions, "…" menu and tap to open; SwipeAction; SectionLabel's red
  Overdue. 6 unit tests (groups, dates) and 6 browser tests (each on
  desktop and phone); a captured Thought is now checked to show in Inbox at
  once, so CAP-001 is verified.

## [#4](https://github.com/joestables/lifeos/pull/4) — Stage 2, step 6: capture in the app

Branch `claude/kind-dijkstra-1kv0xt` · 2026-10-11

**What it did**
- Plan step 6, capture in the app. Capture opens over any page from the
  drawer's button or N on a computer, the top bar or Inbox's Fab on a
  phone, and leaves the page as it was. It makes a Thought unless switched
  to Task. A new package, `packages/capture`, reads dates with chrono-node
  and the spec's rules (the coming weekday, today included; "next week" is
  Monday; "may", "sun", "march" only next to a number or after "on"; "due"
  and "by" for deadlines; date words out of a Task's title), so the capture
  address can share it later. A dated Thought is offered as a Task ("Task,
  Fri 18:00?") and, kept as a Thought, gets a Reminder at that time or my
  default time, in my timezone; a Task shows the dates it will be saved
  with. A toast says what was made, with Undo. The app now reads my
  settings (timezone, default Reminder time). New in the design spec,
  first: the CaptureDialog, Input `lg`, a Capture section in patterns, and
  toasts above the Fab on a phone (found on the walk: a toast covered it).
  One rule added to CAP-003: "at 6" with no am or pm is 18:00. 33 parser
  tests, 2 date tests and 6 browser tests (each on desktop and phone).

## [#3](https://github.com/joestables/lifeos/pull/3) — Stage 2, steps 1–5: specs, design, schema, working with Items

Branch `claude/kind-dijkstra-1kv0xt` · 2026-10-10 to 2026-10-11

**What it did**
- Wrote the [Stage 2 plan](plans/stage-2.md), shaped like Stage 1's, with
  five questions for Joe, since answered.
- Drafted the Stage 2 requirements, all *proposed*: capture (CAP-001–008),
  Inbox (INB-001–005), Notes (NTE-001–005), Tasks with repeats
  (TSK-001–011), Reminders (REM-001–009), working with Items (ITM-001–007)
  and Search (SRC-001–003). New specs: `views/notes.md`, `views/tasks.md`,
  `cross-cutting/items.md`.
- Re-checked before Stage 2: iOS Web Push still shows no notification
  buttons; Gemini can't post to a custom address. Recorded in the reminders
  and capture specs and the roadmap.
- The capability map, roadmap, docs index and `CLAUDE.md` say Stage 2 is in
  progress; the data model marks a Note's colour as an open question
  (colour means Module).

- Joe's answers (10 October), and every document they touch:
  - Capture from outside the app (CAP-005–008, an Android widget) deferred
    to a new Stage 10, after every other stage: ADR-0027 and 0028 amended;
    roadmap, capability map, overview, integration setup, data model and
    non-functional updated.
  - Capture opens over any page and leaves you where you were; on a phone,
    from a button in the top bar (patterns and components).
  - Specs rewritten without implementation detail. Items open on their own
    page or in a popup; one Recently deleted page; no Recent; marks per Type
    (Notes pinned, Tasks starred, Recipes favourited); Labels on Notes and
    Tasks only, filtering Notes rather than heading them (ADR-0014
    amended); Notes have no *idea* status (ADR-0037 amended); steps became
    sub-tasks; Reminders go to every registered device.
  - Colour by Type, with no Module name above page titles: ADR-0043, and
    ADR-0041 amended. The design-language, glossary, data model and
    `CLAUDE.md` state the new rule; tokens, components and patterns carry a
    note until the colours are designed (plan step 3).
  - The data model's Types table gains each Type's colour, Labels and mark;
    `core.stars` and `core.recent` became `core.marks`; `task_steps` became
    `subtasks`.

- Designed every Stage 2 screen (plan step 3, first pass) on a design
  canvas, desktop and phone, dark and light, from the design system's tokens
  and components, with proposed values for the Type colours. Nothing in the
  design spec or code changes until Joe has commented.

- Second design pass after Joe's comments (plan step 3): the standard
  shadcn Sidebar, one place and style for each page's main action, no hint
  text, Tasks opening as a centred popup, the Tasks views All Tasks, By
  Label, Recurring and Completed, ScrollArea instead of browser scrollbars,
  and a fixed stylesheet bug that made primary buttons unreadable. The Tasks
  and Notes specs say how their Items open and which views the Tasks page
  has.

- Joe agreed the specs and the second pass (11 October), with sentence case
  for the Tasks views and main actions and a "+" only on a phone's floating
  buttons; every Stage 2 requirement is now *agreed*.
- Plan step 2: [ADR-0044](../20-architecture/adr/0044-reminder-delivery.md)
  (how Reminders are delivered) and
  [ADR-0045](../20-architecture/adr/0045-extending-series.md) (where
  repeating Items are made), both *Proposed*; the data model, overview,
  reminders spec, non-functional, runbook and integration setup cite them.

- Plan step 3: the agreed designs went into the design system — Type colour
  tokens with text and foreground values that reach 4.5:1, `TypeScope`,
  `TypeTile`, `TypeBadge`, `TypeDot` and a coloured Checkbox in place of the
  Module components; shadcn's standard Sidebar (256px, full height);
  ScrollArea for the page and the drawer, with a thin themed scrollbar for
  anything else; the phone's Fab; PageHeader's main action; no kicker; and
  in the spec, how Items open, RadioGroup `cards`, Command, the empty state
  and no hint text. ADR-0026 amended: Settings opens from your row. The
  design-page screenshots were refreshed and looked at, and the shell walked
  in dark and light, desktop and phone.

- Joe agreed ADR-0044 and ADR-0045 (11 October): both are now
  *Provisionally agreed*, and every document citing them says so.
- Six app icon options on the design canvas, each shown as the icon,
  Android's round crop, on dark and light home screens, in a browser tab and
  as the drawer's mark.

- Joe chose option C, the graph. It is in the design spec (patterns, "The
  app icon"; `BrandMark` in components), as `public/icon.svg` and
  `public/favicon.svg` with the PNGs drawn from them, in the manifest
  (`any` and `maskable`), as the favicon and Apple touch icon, and as the
  brand mark in the drawer, the phone's top bar and sign-in.

- Plan step 4, the Stage 2 schema. The ontology package gains each Type's
  colour, Labels, mark, sub-tasks and default Reminder, and a Note loses
  its *idea* status. Three migrations: Labels (one set per Space, "home" is
  "Home"), marks, sub-tasks, series with one occurrence per date made,
  Reminders whose `fires_at` follows the Item in the person's timezone (a
  dated Task's default Reminder made and removed by a trigger), push
  devices, deliveries kept from the app, each person's settings, a hand-made
  order, `touched_at` kept by triggers, and full-text search; then the write
  functions for all of them and `search_items`. 74 new database tests
  (Labels, marks and sub-tasks 27; Reminders and devices 26; series and
  search 21). The app reads every Item column but the search index.
  Applied to the live project after CI passed; then the security advisor
  showed every LifeOS function was executable by PUBLIC: Stage 1's
  per-schema "revoke from public" can't work in Postgres. A fourth
  migration revokes it and changes the default for everything `postgres`
  makes; `core_privileges_test.sql` keeps it so. Signed-out visitors could
  never reach them (no usage on the schemas).
- After applying: the advisors show no function open to people signed out.
  Left as they are: `register_device` runs as its owner, by design (a
  browser's push endpoint moves to whoever registers it); deliveries,
  heartbeats and health runs have row-level security and no policies, so
  only the jobs read them; leaked-password protection is off, as only the
  test account can use a password.

- Plan step 5, working with Items. Every Item has a link of its own,
  `/item/<id>`; a Thought or Task opens in a Dialog over the page
  (`?item=<id>`, so Back closes it), a Note too on a computer and on a page
  of its own on a phone; an unknown link says "This can't be found". The
  Dialog and page carry the Type's tile and name, the star or pin, and a
  "…" menu with Convert to (only Types the app has, from the ontology's new
  `stage`) and Delete, which says so with Undo. Settings, reached from your
  row in the drawer: Labels (a Card on a computer, its own page on a phone:
  new, rename, delete with a count), Recently deleted (newest first, Restore
  with Undo) and Sign out. An offline notice tops every page. New shared
  components, specified first: ItemDialog, ItemPage, BackLink, CardRow,
  EmptyState, a large TypeTile, ItemRow's always-shown control, PageHeader's
  back link. The data layer reads deleted Items too, and Labels, Label
  links and marks, each laid over by unsent writes; a new database function
  `convert_item`. Found on the way: reopening the app within 30 seconds of
  a change showed the device's copy without asking the server — it now
  always refreshes on start. 12 unit tests and 8 browser tests (each on desktop and
  phone) added; the stand-in Supabase now keeps the writes it is sent.
- Before merging: the items browser test moves between pages inside the
  app after a write, as a reload a moment after Undo could come before the
  write was stored (it failed CI once on a slow runner).

**Left for later**
- Merged mid-stage, at Joe's request, so production shows the work so far.
- The build (plan steps 6–14): capture in the app, the Inbox, Notes and
  Tasks lists, series' occurrence functions (step 10) and the notification
  job (step 11).

## [#2](https://github.com/joestables/lifeos/pull/2) — Phone menu button; Supabase URL settings

Branch `claude/stage-1-foundation` · 2026-10-10

**What it did**
- Signing in on production landed on `joestables.uk`: Supabase's Site URL
  was v1's site and production wasn't an allowed return address. Joe fixed
  the settings; integration-setup.md now records them exactly.
- Joe found the phone's menu button cramped: it is now 48px with a 22px
  icon, in a 64px top bar (tokens and components first).

## [#1](https://github.com/joestables/lifeos/pull/1) — Stage 1: the foundation

Branch `claude/stage-1-foundation` · 2026-10-09 to 2026-10-10

**What it did**
- Wrote the [Stage 1 plan](plans/stage-1.md).
- Drafted the Stage 1 requirements: sign-in and Spaces (ACC-001–003) and
  offline writes (OFF-001–005), all *proposed*.
- `CLAUDE.md` and the docs index now say Stage 1 is in progress.
- Joe agreed the eight requirements.
- Checked access from the cloud session: Supabase (new `lifeos` project in
  London, empty), GitHub and Vercel all reachable through their connectors;
  direct HTTPS to `*.supabase.co` and `*.vercel.app` is blocked by the
  environment's network policy.
- ADR-0040: migrations are applied by Claude through the Supabase MCP.
  Recorded the new environment in `environments.md` and the Google sign-in
  settings in `integration-setup.md`.

- Published three design directions for the look-and-feel exercise (plan
  step 3). Joe chose Stone, to be made monotone and coloured by Module;
  published three variations of that and recorded the direction in the
  design language. Joe chose B1's neutrals; published two subtle
  refinements of it (C2, C3) beside it (C1). Joe chose C1 with C2's hairline
  edges: ADR-0041.
- Wrote the design system as a specification in `docs/30-design/` (README
  with the checklist and enforcement, tokens, components, patterns, a frozen
  reference page) and amended ADR-0038 with how it is kept consistent.
- Merged Joe's `.claude/settings.json` change from `master` (whole Supabase,
  Vercel and GitHub servers allowed) and updated `environments.md`.
- Set Vercel's deployment protection to previews only, so production is
  public. Joe finished the Supabase and Google sign-in settings. Cut-over
  done: v1 paused without a `pg_dump` (Joe's choice); ADR-0003, the runbook
  and backups updated.
- Re-checked shadcn's default (Base UI, ADR-0034) and drafted the data
  layer as ADR-0042, which Joe agreed; linked it from ADR-0009, the offline spec,
  the data model, contracts, overview and roadmap.
- Scaffolded the app (plan step 5): Vite, React, TypeScript, Tailwind,
  TanStack Router and Query, the PWA plugin, ESLint (including the rule that
  only `src/data/` imports Supabase), Prettier, Vitest and Playwright;
  `npm run check` runs them. Wrote `src/styles/theme.css` from the tokens,
  since the build needs them. shadcn's CLI can't reach its registry from the
  cloud session, so `components.json` is written by hand.
- The ontology package (plan step 6): the core Types, their link types and
  in-place conversions, with the generated lookup-table migration and its
  staleness check.
- The core schema (plan step 7): people, Spaces, Items, links and the
  activity log, with row-level security, the visibility rule in
  `core_private`, and the write functions of ADR-0042. 42 database tests;
  `npm run db:test` runs them in a cloud session. A first CI workflow
  (plan step 10) runs the checks, the build and the database tests. Once CI
  passed, applied the three migrations to `lifeos` and renamed the files to
  the versions it recorded; the security advisor is clean (the
  `rls_auto_enable` warnings are gone).
- The data layer (plan step 8): `src/data/` with the write queue, unsent
  changes laid over the cache, the cache kept on the device, and sign-out;
  generated database types with a CI check; 19 unit tests. OFF-001–003 and
  ACC-002 verified; OFF-004, OFF-005 and ACC-003 built. Set the public
  Supabase values on Vercel.
- The design system in code (plan step 9): every shadcn component in
  components.md restyled from shadcn's Base UI source, LifeOS's own
  components, the `/design` page, the lint rules and the token check.
  Added to the spec first: `--switch-thumb`, `--shadow-thumb`, `--m-core`,
  `--selected`, `--selected-foreground`, `--pressed-foreground`, the "Not
  saved" state, and the DropdownMenu label rule; `--radius-full` added to
  the theme. Token tables are checked against the theme rather than
  generated (ADR-0038 amended).
- The app shell (plan step 9a): sign-in with Google only, the drawer, empty
  pages, sign-out with the unsent-writes warning, the privacy page Google
  asks for; email/password sign-up refused by a database trigger. Browser
  tests against a stand-in Supabase, with screenshot tests of `/design`
  (plan step 10); Playwright pinned to the Chromium in the cloud session.
  ACC-001 and ACC-003 verified.
- The `can_read` benchmark (plan step 11): reading every Item was slow
  through per-row checks, so the policies now work visibility out as sets
  once per query: 3–6 ms on 7,600 seeded Items. ADR-0017 amended; the result
  is in non-functional.md.
- `ops.events` and the nightly health check (plan step 12): the app reports
  crashes, uncaught errors and refused writes without any Item content; a
  `pg_cron` job records the day's findings. OFF-004 verified. The crash
  screen went into patterns.md first.
- Joe dropped plan step 13: no backups for now, and no notifications; the
  health check's findings stay in `ops.health_runs` for Joe or Claude to
  read. ADR-0035 amended; backups, runbook, environments, overview,
  non-functional, data model, roadmap and the plan updated.
- Joe's first sign-in worked. On his phone the app felt slow, cramped, and
  the drawer floated like a popup. The drawer is now shadcn's Sidebar; on a
  phone it is a Sheet attached to the left edge (288px, full height), kept
  in the page while closed so it opens without rendering, sliding in over
  300ms (new tokens `--duration-sheet`, `--ease-sheet`). Every Sheet is now
  attached to its edge. Pages scroll with the window, a top bar sits clear
  of the notch, drawer items are 44px on a phone, phone page padding went
  from 14px to 20px, and each page's code starts loading when its link is
  touched. Spec first: tokens, components and patterns.
- Closed Stage 1: ACC-001's Google round trip checked by Joe; the plan says
  what carries into Stage 2; `CLAUDE.md`, the docs index and the roadmap
  say Stage 2 is next and starts with its plan and specs.

**Left for later**
- An app icon: the design system has none yet, so the manifest has no icon
  and the app can't be installed until one is designed.
- Joe published the Google sign-in app. Its home page and `/privacy` page
  go live with the first deploy (plan step 9a); brand verification is
  optional and waits until then.

## No PR — Docs structure for LifeOS v2 (Stage 0)

Branch `claude/affectionate-lamport-cukhtr` · 2026-10-09 · pushed straight to
`master` to create it, since the repository had no `master` yet

**What it did**
- Created the `docs/` structure (foundation, requirements, architecture,
  design, operations, roadmap, history) and `CLAUDE.md`, from the redesign
  summary of 8–9 October, which is not kept in the repository. The
  hand-drawn knowledge graph is frozen in `docs/history/`.
- Recorded 36 ADRs: decisions agreed in the redesign discussion, and leans
  as Proposed.
- Added the **Provisionally agreed** ADR status and moved every agreed
  decision to it (Joe is open to changing course while the design is
  young).
- Introduced **Thoughts** (ADR-0037): capture makes a Thought that waits in
  Inbox to be sorted into Notes, Tasks, Lists and other Types. Amended ADR-0005, 0006,
  0007, 0018, 0019, 0023, 0027, 0028 and 0033, and updated every document
  that mentioned Notes as captures.
- Added **one design system, built from shared components** (ADR-0038), set
  up in Stage 1.
- Joe's ADR review: every Proposed ADR moved to Provisionally agreed except
  ADR-0030 (activity log), agreed afterwards to start small: items and
  links only in Stage 1. Notes are Personal only.
  Sign-up is open to anyone with Google; people connect as Contacts, then
  invite each other into a Household (ADR-0039, amending 0003 and 0017).
  Deleted Items can be recovered from Settings (ADR-0032, amending 0026).
- Moved Stage 2's requirements out of Stage 0, to the start of Stage 2.
- Strengthened the documentation-consistency rules in `docs/README.md` and
  `CLAUDE.md`; added this `50-progress/` folder.
- Added `.claude/settings.json`, pre-approving the Supabase MCP tools under
  both server names, and the rules for Claude running SQL.

- Drew the context and container diagrams in the architecture overview;
  Stage 0 is done ([plan](plans/stage-0.md)).

**Left for later**
- Stage 1's plan and specs (sign-in and Spaces, offline writes).
