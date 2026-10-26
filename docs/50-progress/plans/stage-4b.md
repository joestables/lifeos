# Plan: Stage 4b — Shopping

**Outcome** ([roadmap](../../roadmap.md)): Joe and his girlfriend shop
together from LifeOS. **Shopping** has three tabs: **Food**, food shops
linked to Meals and following their ingredients, with more added from the
Pantry or typed, and each Household's Essentials and out of stock offered;
**Lists**, shopping that isn't food; and **Online**, later. One **Shopping
list** Type takes the place of List and Shop
([ADR-0050](../../20-architecture/adr/0050-shopping-list.md)). A dated list
is on Plan with no Plan work
([ADR-0029](../../20-architecture/adr/0029-plan-reads-core-items.md)). A
shared list updates live for both of them. A recipe shared from TikTok is
kept as an Idea.

**State:** started 24 October 2026, after Stage 4 closed (Joe, 24 October;
[its plan](stage-4.md)). The Shopping specs were drafted with Stage 4's
(step 1 there): [meals](../../10-requirements/modules/meals.md#shopping)
SHP-001–004 and what they change in Plan, items, Search, Inbox and
Households. Step 1 is Joe agreeing them, after the
[questions below](#questions-for-the-specs). Joe answered them and widened
Shopping on 24 October ([his answers](#joes-answers-24-october)), then
answered five more and a later round; Joe agreed the specs on 24 October
(step 1 done). Step 2, the decisions, is written for his agreement.

## Steps

Steps marked **Joe** need Joe's go-ahead or action before Claude does them.
Every step that builds a screen follows the [design system](../../30-design/README.md)
checklist and brings its own Playwright walks, citing the requirements it
verifies. The walks use a stand-in for Supabase, Realtime included.

| # | Step | State | Produces |
|---|---|---|---|
| 1 | **Joe** — specs: Shopping lists (SHP-001), a food shop from the Meal plan (SHP-002), Extra (SHP-003), shopping together (SHP-004), Staples and Essentials (SHP-005); and what they change elsewhere: staples and out of stock leaving the Pantry ([PAN-002](../../10-requirements/modules/meals.md#pan-002--staples-and-out-of-stock)), dated lists on Plan ([PLN-008](../../10-requirements/views/plan.md#pln-008--meals-and-shopping-lists-on-plan) 2, 4, 5), opening, deleting and converting ([ITM-006](../../10-requirements/cross-cutting/items.md#itm-006--food-items) 1, 3, 5, 6), Search ([SRC-003](../../10-requirements/cross-cutting/search.md#src-003--find-recipes-and-shopping-lists) 2), a shop's Space ([HSH-003](../../10-requirements/cross-cutting/spaces-and-sharing.md#hsh-003--several-households) 2), a Meal's changes on a shop ([MPL-003](../../10-requirements/modules/meals.md#mpl-003--change-a-meal) 4); sharing a recipe in ([RCP-003](../../10-requirements/modules/recipes.md#rcp-003--save-an-idea-from-another-app)) | Drafted with Stage 4's specs (18 October). Third draft 24 October, after [Joe's answers](#joes-answers-24-october): three tabs, food shops linked to Meals, All · Meals · Extra, Essentials, back in stock by Space, Done and Complete list, no repeating lists, sharing from Android with nothing to press; ADR-0050, 0051, 0052, 0053, 0012, 0055 and 0028 amended. Then [Joe's later answers](#joes-answers-24-october-later): a shop made from the Meal plan's Select or Shopping's New shop, and staples kept beside Essentials on Shopping, out of stock and Required. Joe agreed the specs, 24 October. **Done** | [meals](../../10-requirements/modules/meals.md#shopping) (SHP-*, PAN-002), [recipes](../../10-requirements/modules/recipes.md) (RCP-003), changes to Plan, items, Search, spaces and sharing |
| 2 | Decisions: how a food shop's lines from its Meals are held and kept in step as the Meals change (rows the database makes and removes, or worked out from the Meals on the device with only ticks and Extra stored); where Essentials are kept (beside staples); totals in `packages/food` ([ADR-0053](../../20-architecture/adr/0053-quantities-and-units.md)); live updates with Supabase Realtime, the first in LifeOS ([ADR-0042](../../20-architecture/adr/0042-data-layer.md), [principles](../../00-foundation/principles.md) 9) | Written 24 October: [ADR-0057](../../20-architecture/adr/0057-shopping-in-the-database.md) — a Meal's lines are rows the database writes into its open shop as the Meal changes (unticked replaced, ticked kept; scaling only, units and totals on the device), so the shop is read through its own Space; `shopping.list_meals`; `food.staples` becomes `food.space_entries` (staple or Essential, needed); totals collated by Pantry entry in `packages/food`; Realtime's Postgres Changes telling the data layer what to refresh. ADR-0052, ADR-0042 and the data model amended. Joe agreed it, 24 October. **Done** | ADRs, or amendments to ADR-0052 and ADR-0053 |
| 3 | **Joe** — design, with Claude design: Shopping's Food and Lists tabs (shops, lists, each Space's Staples and Essentials with out of stock and Required, New shop offering the plan's Meals, New list), a food shop (All · Meals · Extra by aisle; ticking; adding with Pantry suggestions; Extra's out of stock, Essentials and staples to check; Done and Complete list), a list by my subheadings, the Meal plan's Select and Add to shop, a list's card on Plan, the "Saved as an idea" screen. Into the design spec first, then the shared components, with the screenshot tests refreshed | First pass 24 October on a [design canvas](https://claude.ai/artifact/KZyE2VPa3jTsVZ4mjxanGk) (private to Joe), drawn from the real components on `/design-stage-4b` (development and preview builds only; `DESIGN_PAGE=design-stage-4b scripts/design-shots.mjs` takes its screenshots), dark and light, computer and phone: Shopping's Food tab (shops; Staples and Essentials of a chosen Space, out of stock and Required), New shop with the plan's Meals, a shop's All (by aisle, adding from the Pantry), Meals and Extra, everything ticked and Complete list, the Lists tab and a list, the Meal plan's Select and Add to shop, and "Saved as an idea". Drafted in `@/components/lifeos`, specced as drafts in components.md: ShoppingLine, OfferRow, KeptRow, MealCard's choosing, Badge's `warning`; PantryAisle holds a shop's aisles. Select is drawn as a ghost button in the week's toolbar, as the library's, rather than a PageAction. Joe agreed it on 24 October with two changes: New shop asks only Name, Date and For (no time or place on any Shopping list; ADR-0050, the data model, SHP-001 and PLN-008 amended), and Shopping's tabs at one reading width, `max-w-3xl`, now a rule in patterns' page anatomy. Then written into the design spec (patterns: Shopping, the Meal plan's Select, the reading width; components: ShoppingLine, OfferRow, KeptRow, MealCard's choosing, Badge's `warning`) and onto `/design`, its screenshots refreshed. **Done** | [design system](../../30-design/README.md), components |
| 4 | Schema: the `shopping` Module — Shopping list (food shop or list) in the ontology; `shopping.shopping_list` and `shopping.lines`; a food shop's Meals; each Space's Essentials; lists in their Space ([ADR-0052](../../20-architecture/adr/0052-food-in-the-database.md)); the write functions; the generated data model; database tests | Written 24 October: the ontology gains the `shopping` Module and Shopping list (stage 4b; *for* an Event too); migrations `ontology` and `stage4b_shopping_schema` applied to `lifeos` by the tool (advisors clean of anything new): `shopping.shopping_list` (food or list), `shopping.list_meals`, `shopping.lines`, read and written through the list's Space; guards so only the database writes, changes or removes a Meal's line; `create_list`, `update_list`, `add_meals`, `add_line`, `update_line`, `tick` (clearing out of stock or Required), `meals_of`, `food.keep_entry`; `food.staples.kind` (the table keeps its name: expand, then contract); a deleted Pantry entry leaving shopping lines as typed; the Realtime publication. `stage4b_shopping_refresh` (`refresh_meal` and its triggers, `remove_meal`, `delete_line`, merges moving shopping lines) for Joe to run in the SQL editor, for its deletes. `npm run data-model` and `db:types` (now with `shopping`) regenerated; database tests `shopping_test` (31). Left for Joe: run `stage4b_shopping_refresh`, and expose `shopping` in the Data API ([integration setup](../../40-operations/integration-setup.md)) before step 5 | Migrations, database tests |
| 5 | Shopping page: the Food and Lists tabs, New shop (the plan's Meals toggled) and New list, a list by my subheadings, ticking, Done and Complete list with Undo, adding with Pantry suggestions, each Space's Staples and Essentials, out of stock and Required, the Pantry's staple marks removed, dated lists on Plan, deleting and recovering, Search; Shopping joins the drawer (`shopping-cart`) | Built 24 October. First, at Joe's word ("built the correct way"), `food.staples` renamed `food.space_entries` with `needed` (`stage4b_space_entries`, applied by the tool; `stage4b_space_entries_removing`, dropping `set_staple`, adding `remove_entry` and moving merged entries, for Joe in the SQL editor), and the Pantry's staple marks removed; Joe exposed `shopping` in the Data API. Then Shopping (`/shopping`, `?tab=lists`): Food's shops and each Space's Staples and Essentials, Lists; New shop and New list; a shop's page (All by aisle, Meals, Extra; adding from the Pantry or as typed; ticking, the last tick offering Done; Complete list asking first; Edit details…; Delete with Undo) and a list's (subheadings, household items matched); a Meal's lines worked out on the device until the server's arrive; dated lists on Plan, moved by dragging, and Plan's "+" → Shopping list; Search finding a list by a line on the device. A shop's lines to tick leave out its Space's staples a Meal needs. Walks `shopping.spec.ts` (10, at both widths); the design screenshots updated for the Pantry without staples. Left: reordering a list's lines (SHP-001 3), the Meal plan's Select (step 6), Realtime (step 7), converting (step 8). **Done** | Code, tests citing SHP-001, SHP-003, SHP-005, PLN-008, ITM-006, SRC-003 |
| 6 | From the Meal plan: Select and Add to shop (a new food shop of the chosen Meals, dated the first one's day), adding and taking off Meals, each Meal's lines scaled to its servings and its own as written, All · Meals · Extra, lines for one ingredient shown as one with their total and Meals, grouped by aisle with Other last, Extra's Needed and Essentials by Space and staples to check, out of stock and Required cleared by Space, the shop following its Meals as they change | Built 24 October. The rest came with step 5's shop page; this step added the Meal plan's Select: a ghost `sm` "Select" in the week's toolbar puts a SelectionBar in its place, MealCards take their Checkbox (not eaten Meals, leftovers, or Meals on another open shop, which the database refuses), dragging pauses, and Add to shop makes "Food shop" of the chosen Meals, dated the first one's day and in the Household of its first Household Meal, and opens it. Walks: Select and Add to shop, a Meal on a shop not offered again, a Meal rescaled and the shop following, a Meal taken off and added back. **Done** | Code, tests citing SHP-002, SHP-003, MPL-003, PAN-002 |
| 7 | Shopping together: a list in a Household seen by every member, its Personal Meals' lines too; ticks and new lines shown to the other within a second or two; ticks with no signal kept and sent when it returns | Built 25 October: `useLiveShopping` joins a Supabase Realtime channel while Shopping or a list is open (the publication came with step 4), a change refreshing what it touches, deletes acted on only when they name a line or list on the device, and joining again refreshing everything; ADR-0057 and ADR-0042 as built. Every member seeing a Household's list and its Personal Meals' lines (SHP-004 1, HSH-003) was built with the schema and is in `shopping_test`; ticks with no signal (SHP-004 3) are the write queue's. The browser walks' stand-in answers Realtime's websocket; walks: another device's tick, new line and delete arriving within two seconds, and a tick made with no signal sent when it returns. A list's rename or Complete on another device arrives at the next refresh, since `core.items` isn't published. Two people on the real database is left for step 10. **Done** | Code, tests citing SHP-004, HSH-003 |
| 8 | A Thought or Note sorted into a Shopping list: split at the commas (a Note's lines or checklist), "buy" dropped, each line matched to the Pantry where it can be | Built 25 October, with [Joe's rule](#joes-answer-25-october): Shopping list is offered only when a line names a Pantry ingredient, and it is then always a food shop. Lines read on the device (`writtenLines`): split at commas, line breaks and a list's last "and", a list's bullets and checkboxes, "buy" and headings dropped, an amount read off the front, matched to the Pantry ignoring case and a plural's "s". A new shop is "Food shop" (a Note keeps its title), in the Household where new Meals go; with an open food shop a Dialog offers adding to it instead, the Thought then going to Recently deleted. No migration: the existing writes do it. Unit tests for the reading; walks for a Thought made a shop, one not offered it, and one added to an open shop from its own Dialog. **Done** | Code, tests citing SHP-003 4, ITM-006 5–6 |
| 9 | Left from Stage 4: a recipe shared from another app on Android kept as an Idea, with a small "Saved as an idea" screen and nothing to press; on an iPhone, an iOS Shortcut opening New idea filled in ([RCP-003](../../10-requirements/modules/recipes.md#rcp-003--save-an-idea-from-another-app), [ADR-0055](../../20-architecture/adr/0055-sharing-into-lifeos.md)). Joe tries it | Built 25 October: the manifest's share target opens `/share`, which keeps the Idea at once through the write queue, named from what was shared and made unique, and shows "Saved as an idea" (or "Already saved", with Open, for a link the device or, with signal, the server already has); `link-preview` answers a name as well as the picture (deployed by the tool as one bundled file, `scripts/bundle-function.mjs`), filled in on the device when there's signal; signed out, the share waits for sign-in; the iOS Shortcut opens New idea with the link, its steps in [integration setup](../../40-operations/integration-setup.md#ios-shortcut-save-to-lifeos). Unit tests for reading a share and naming a link; walks for a share kept and named, a link saved before, a share with no signal, and the Shortcut's New idea. Left: Joe installs LifeOS again on Android, makes the Shortcut, and tries both | Code, tests citing RCP-003 |
| 10 | **Joe** — uses Shopping in a real shop; what he trips over is fixed | In progress: [Joe's first round](#joes-first-round-25-october), in four pull requests: Recipes (filters that don't move, All · Draft · Complete, sorts either way round) **done**; the Meal plan (photos that stay, Copy week gone, a phone's Dialog, top and days: [layout B](#joes-first-round-25-october)) **done**; the Pantry (sorts, Show, Pending, Staples and Essentials moved in) **done**; Shopping (counts as All, no Meals under a line, the Added bug, what's needed on the shop by itself, Extra's two columns, ×) **done**. [Joe's second round](#joes-second-round-26-october): the quick fixes **done**; Recently viewed **done**; the AI's cuisines **done**; Settings → Food's Recipe lists **done**; the UI review and bug hunt **done**; and a UI review and bug hunt to come. Next: Joe uses it in a real shop | Code, tests |

Each step's code goes into the specs' status as it lands (*built*, then
*verified* when a test citing the ID passes).

## Questions for the specs

Claude's recommendation was given with each; [Joe's answers](#joes-answers-24-october) follow.

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

## Joe's answers (24 October)

- **Shopping has three tabs: Food, Lists and Online.** Online (items
  watched for price alerts, with a notification) is out of scope for 4b: a
  [later opportunity](../../roadmap.md#later-opportunities). What Lists
  holds is [question 7](#the-next-five-24-october).
- **A food shop is linked to any number of Meals.** Every ingredient of each
  Meal comes onto the list: its Recipe's, a one-off import's, and those
  added by hand (MPL-006). When a Meal's ingredients change, the list
  follows (answers question 4). Anything else, household items included,
  is added by hand. **All · Meals · Extra** at the top of a list tells the
  Meals' lines from those added by hand.
- **No repeating lists** (question 1, as recommended).
- **Perishables** (milk) are never marked out of stock; Joe wants to be
  offered them on every food shop. **Each Household has an Essentials
  list** for these. Staples' out of stock stays for long-life goods (salt):
  marked when it runs out, bought on the next shop.
- **Extra** shows out-of-stock Pantry entries and the Essentials of every
  Household he is in, each added with + and none added by itself.
- **Households:** Joe buys food mostly at his girlfriend's and cooks, but
  doesn't buy, at his parents'. LifeOS must stay flexible as that changes.
  Out of stock is per Space, Personal or a Household (it already is:
  PAN-002), and ticking an out-of-stock line marks it back in stock
  (question 3). Which Space when a list holds Meals of more than one is
  [question 8](#the-next-five-24-october).
- **Done** (question 5): ticking the last line offers Done, which completes
  the list and takes it off the lists. **Complete list** is also in its
  menu at any time, asking first when lines are unticked.
- **Android's share target in this stage** (question 6): share from TikTok,
  and LifeOS keeps a Recipe idea from the link without being opened. On an
  iPhone LifeOS may open, with the name and link already filled in.

### The next five (24 October)

Claude's recommendation was given with each; Joe's answers follow them.

7. **What the Lists tab holds.** ADR-0050 makes lists that aren't shopping
   (packing, DIY jobs) Notes with a checklist. *Recommended:* Lists holds
   shopping lists that aren't food (Screwfix, Boots, a birthday): the same
   Shopping list Type, with no Meals, no aisles (my own subheadings), and
   typed lines plus the Pantry's household items. Packing lists stay
   Notes.
8. **Which Space an out-of-stock line restocks.** *Recommended:* a food
   shop is *for* one Space (Personal or a Household; the Household of its
   first Household Meal by default, then mine to change). Its Meals may come
   from any of my Spaces. Extra shows out of stock and Essentials from each
   of my Spaces under its name, the shop's own first. A line added from a
   Space's out of stock restocks that Space when ticked. Any other line
   whose entry is out of stock in the shop's own Space restocks it there.
   Nothing else is touched. So at my girlfriend's I see my parents' out of
   stock below hers, and adding their salt is a choice.
9. **Essentials.** *Recommended:* each Space has one Essentials list, made
   by itself and kept on the Food tab apart from the shops. It holds lines
   as any list does (an amount where wanted: "Milk 4 pints"). It is never
   ticked or done: it only feeds Extra. Members of the Household edit it.
10. **Staples a Meal uses.** Today they aren't added from Meals; Extra would
    show them under **Staples the Meals use**, each added with +.
    *Recommended:* keep that, so salt isn't bought every week.
11. **Sharing from Android without opening LifeOS.** An installed web app
    can't save in the background. Android opens it to receive what's
    shared, and the share sheet shows "LifeOS", not "Add as idea".
    *Recommended:* LifeOS opens on a small "Saved as an idea" screen. The
    Idea is kept at once (offline too), its name and picture filled from
    the link, then it closes back to TikTok. Nothing to type or press. A
    one-press-free share with no window at all would need a native Android
    app, which LifeOS isn't. On an iPhone, an iOS Shortcut in the share
    sheet opens New idea with the link and name filled in.

Joe's answers (24 October): **7** agreed. **8** agreed. **9** agreed, but
Essentials are Pantry ingredients, with no amounts: not a list of lines.
**10** staples are never added; Extra highlights those the Meals use, so I
can check they're in stock. **11** try it, and Joe will see how he likes
it. The specs were redrafted the same day: [meals](../../10-requirements/modules/meals.md#shopping)
(the Pantry's staples and Essentials, Shopping, PAN-002, MPL-003 4,
SHP-001–005), RCP-003, ITM-006 5, HSH-003 2; ADR-0050, 0051, 0052, 0053,
0012, 0055 and 0028 amended; the data model, glossary, capability map,
drawer and roadmap to match. Claude's own suggestions are marked
**(suggested)**: a Meal on one open food shop at most; a Meal's line not
changed or deleted on a shop, more of it added on Extra (in place of
raising it, Joe's 18 October rule); a sorted Thought a food shop when any
line matches a Pantry ingredient; a link shared twice not saved again.

## Joe's answers (24 October, later)

- **Agreed:** a food shop for one Space, seen only by its Space's members;
  a Meal's lines fixed on a shop, more added on Extra; a Meal on one open
  food shop at most; a sorted Thought a food shop when a line matches the
  Pantry, and it may instead go to a list I pick; a link shared twice not
  saved again; the specs' remaining suggestions.
- **Making a food shop two ways:** on the Meal plan, Select chooses Meals
  and Add to shop makes a new shop of them; on Shopping → Food, New shop
  opens offering the plan's Meals, each toggled on or off. Meals are still
  added or taken off afterwards. Select is the week's PageAction, since a
  long press already drags a Meal on a phone.
- **Staples work as Essentials do:** both are each Space's lists on
  Shopping → Food, no longer set in the Pantry. A staple may be marked out
  of stock, an Essential Required. Extra offers the out of stock and
  Required first (Needed), then the other Essentials. The Pantry's staple
  and out-of-stock marks, built in Stage 4, go in step 5 (PAN-002 replaced
  by SHP-005).

## Joe's answer (25 October)

- **Only food:** a Thought or Note is offered Shopping list only when it
  names a Pantry ingredient, so it always becomes a food shop, never a
  list (SHP-003 5, ITM-006 5–6, ADR-0050 amended).

## Joe's first round (25 October)

From using it on his phone and computer. Joe's answers to Claude's
questions are marked.

- **Recipes:** choosing a filter must move nothing (the count beside a
  group's name made it 2px taller, and a pill grew its tick); the State
  filter is All · Draft · Complete, All to start; every sort shows its
  way round with an arrow and reverses when chosen again (the Pantry's
  too).
- **Meal plan:** adding a Meal mustn't reload every photo; Copy week goes;
  on a phone, + then a Recipe must plan it, the top must fit, and a day's
  Breakfast, Lunch and Dinner take less height (Claude to show layouts
  first: *Joe, "your call"*; shown two, *Joe chose every slot on a line
  with its name beside it, the dates standing out more: the slot names
  fainter*).
- **Pantry:** sort By aisle, Recently used, Most popular or A–Z, either
  way round (*recently used and most popular count Recipes, Meals and
  shops*); show or hide each entry's aisle and default unit; kept as typed
  on a page of its own, Pending. **Staples and Essentials move here:** a
  Household picker, All · Staples · Essentials, and on every ingredient a
  Staple and an Essential toggle; out of stock and Required are marked
  here (*and from a shop's Extra; the cards leave Shopping → Food*). A
  Space keeps an entry as a staple or an Essential, not both, so the two
  toggles are one or the other.
- **Shopping:** a shop's count is All's lines (one ingredient for two
  Meals counts once); All doesn't name the Meals under each line; Extra
  showed a staple Added that wasn't (a bug: a Meal's line for it counted
  as on the shop). **Added by themselves:** the
  shop's Household's out-of-stock staples and Required Essentials (*only
  its own Household's*) go on the shop, shown in All and Extra. Extra on
  a computer: Add staples (the staples its Meals use, and the out-of-stock
  ones, Added) over Add essentials (every Household's, the Required ones
  Added) on the left, what I added on the right; on a phone what I added
  first. Other Households' out-of-stock staples are no longer offered. A
  line I added comes off with an × beside it, no menu and no asking. Built
  on the device, not by database triggers (whose deletes Joe would have
  had to run): the needed lines are worked out from the Space's entries,
  ticking one stores it, × unmarks it.
- **Refined:** whatever is new must look and feel refined.

## Joe's second round (26 October)

- **Pantry:** Show gains Number of recipes; on a phone whose and Pending
  share the top row and All · Staples · Essentials is its own width.
- **Shopping:** a ticked line stays where it is; the Lists tab is
  **Other** (*Joe's choice: "Household" means a Space*), with no done
  lists; Complete list in a shop's row menu too, asking first; a new
  shop opens without "This can't be found" flashing.
- **Meal plan:** the Show select its own width on a phone; a dragged Meal
  doesn't turn; a week across two months short on a phone; a phone's day
  names no slots (each Meal says its own, the day's "+" chooses);
  choosing Meals for a shop greys, with the reason, those that can't be;
  Recipes that use it spaced; Add a meal smaller, with the three Recipes
  I viewed last (a migration).
- **Everywhere:** an Edit dialog opens without the keyboard; only a New
  one focuses its first field.
- **Recipes:** an import's cuisine is the right one, made new when it
  isn't there yet (BBC Good Food's chicken curry came in as Chinese);
  Settings → Food manages categories, cuisines, tags, protein and carbs.
- **Review:** a senior UI/UX review and a production bug hunt of Shopping,
  Recipes and the Meal plan.

## Done when

- Every **Must** requirement in this stage's specs is *verified* (a test
  citing its ID passes).
- Joe and his girlfriend do a week's shop from a food shop made from the
  Meal plan, both ticking as they go.
- No two documents conflict.
