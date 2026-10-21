# Recipes

*Stage 4, the `food` Module's Recipes page. **A draft for Joe to refine**,
written from Joe's notes (17 October) and his comments on the first round
(18 October), with Claude's own suggestions marked **(suggested)**.
Households themselves are core: [spaces and sharing](../cross-cutting/spaces-and-sharing.md).
Everything is *proposed* until Joe agrees it. The Meal plan, the Pantry and
shopping lists are in [meals](meals.md).*

**In one line:** my recipe library and the ideas I've saved
([ADR-0026](../../20-architecture/adr/0026-navigation-drawer.md),
Provisionally agreed).

## Decisions

### Recipes, Variations and their states

- **The Recipe is the dish; the Variation is the way you make it**
  ([ADR-0011](../../20-architecture/adr/0011-recipe-and-variation.md),
  Provisionally agreed). The Recipe has a **heading**: name, photo,
  category, cuisine, tags, protein and carbs, and each person's favourite.
  Each Variation has its own name, state, ingredients, method, notes, prep
  and cook time, servings and sources. One Variation is the **default**,
  the one that opens; a new Variation starts as a copy of another. A new
  Recipe's first Variation is called "Standard" until I rename it
  (Suggested).
- **Each Variation has a state**, which I set: **Idea** → **Draft** →
  **Complete**, or **Archived** (Joe, 17 October). I cook a Draft a few
  times, refining it, and mark it Complete once it's settled.
- **No way back to Idea:** once a Variation has ingredients or a method, it
  can't be made an Idea again (Joe, 18 October).
- **The Recipe's state is the highest of its Variations'**, worked out, never
  set: Complete over Draft over Idea, Archived Variations not counting. A
  Recipe is Archived when every Variation is; archiving a Recipe archives
  them all.
- **An Idea needs only a name**; notes, any number of links and a photo are
  optional (Joe, 18 October). When it becomes a Draft it keeps them all,
  and the Variation's fields open.
- **Archived is not deleted.** An archived Recipe is kept, out of the way,
  and found from Settings; deleting goes to Recently deleted
  ([ADR-0032](../../20-architecture/adr/0032-delete-means-archive.md),
  Provisionally agreed).

### Who sees and edits

- **A Recipe is its author's** (Joe, 18 October;
  [ADR-0051](../../20-architecture/adr/0051-who-sees-food.md), Provisionally
  agreed). Everyone in a Household with me sees all my Recipes, and I see
  all of theirs, read-only.
- **Someone else's Recipe can take my Variation:** I can add a Variation to
  it, which is mine to edit; its heading and other Variations stay the
  author's. If I leave the Household, I keep my Variations, under a copy of
  the Recipe's heading that becomes mine. If I rejoin, the two Recipes stay
  separate and nothing is merged (Joe, 18 October).
- **A Recipe's name is unique** among the Recipes I can see, mine and my
  Households'. Two exceptions: a copy kept on leaving, seen beside the
  original again after rejoining; and Recipes of the same name that two
  people already had before one joined the other's Household, each card
  then saying whose it is. A new Recipe still can't take a name in use
  (Joe, 18 October).
- **A favourite is mine alone**, a per-person mark (heart), on anyone's
  Recipe.

### Describing a Recipe

- **Category** (breakfast, lunch, dinner, condiments, baking, smoothies…),
  **cuisine**, **tags** ("quick", "batch"), **protein** and **carbs**, from
  lists I keep in Settings and add to as I go. Tags are Recipes' own, not
  Labels, so "Quick" never appears among my Tasks' Labels
  ([ADR-0014](../../20-architecture/adr/0014-reference-data-and-labels.md),
  Provisionally agreed). Each is optional, so an Idea needs none.
- **In a Household, the lists are pooled for browsing:** filters offer the
  categories, cuisines, tags, protein and carbs of everyone in all my
  Households, the same name counting as one (Joe, 18 October). Each person
  still keeps their own lists.
- **Recipes are green**, with Variations, Meals and the Pantry
  ([ADR-0043](../../20-architecture/adr/0043-colour-by-type.md),
  Provisionally agreed).

### Ingredients and method

- **An ingredient line is an amount, a unit and an ingredient** — nothing
  else (Joe, 17 October). The ingredient is linked to the
  [Pantry](meals.md#the-pantry), or left as typed when I'd rather not add it
  there. How it is prepared goes in the method.
- **Optional subheadings** group the lines ("For the marinade", "For the
  sauce"); most Recipes won't have any (Joe, 18 October).
- **Amounts** may be left out ("salt"), a range ("1–2") or approximate
  ("~5"). **Units** are metric: g, kg, ml, l, tsp, tbsp, or none for a count
  ("2 onions").
- **The method is numbered steps; notes are free text.** In either, typing
  "@" names another Recipe — a stock, a sauce — from a short list of
  suggestions; outside editing it is a button that opens it.

### Read, edit and cook

- **Three modes** (Joe, 17 October). **Read** shows the Recipe with no
  editing controls. **Edit** changes either the heading or the current
  Variation's content, never both at once. **Cooking** is for the hob.
- **Changes are kept as I make them**, offline too, and survive leaving the
  page.
- **Cooking keeps the screen awake**, scales the ingredients (not numbers
  in the method) to other servings, and offers a timer on a step that names
  a time ("simmer for 20 minutes") (Joe, 18 October).

### The log

- **Each Recipe has a log**: Variations made, changed or deleted; heading
  changes; and cooks. Each entry says who and when.
- **A cook** is logged when I finish Cooking: a verdict (stars) and notes,
  both optional. **It keeps a snapshot of the Variation as cooked**, so a
  verdict can be read against what I actually made, even after the recipe
  has moved on (Joe, 17 October;
  [ADR-0013](../../20-architecture/adr/0013-occurrences-snapshot-their-definition.md),
  Provisionally agreed). Ticking a Meal eaten logs no cook
  ([meals](meals.md#the-meal-plan)).

### Getting recipes in

- **By hand**, as an Idea or a Draft.
- **Shared from another app** — TikTok, Instagram, a browser — straight into
  an Idea, with its link (and its title and thumbnail when the link offers
  them) (Joe, 17 October). On Android the installed app is a share target
  now; **an iPhone must follow** (Joe, 18 October), through an iOS Shortcut,
  since a web app can't be a share target on iOS. Capture from outside the
  app was Stage 10
  ([ADR-0028](../../20-architecture/adr/0028-capture-from-outside-the-app.md),
  amended), so this brings the share target forward for recipes.
- **Imported from a web page or a video's link**, as a Draft. A video is
  read from what its page says (description, captions). Every import is
  rewritten in **Joe's recipe style**, kept in the code, not in Settings.
  It is already written in v1's code; Joe will say where when import is
  built (Joe, 18 October).
- **A link I've saved before** is flagged before I save it again.
- Import and filling ingredients from a method use the core's one AI
  service ([principles](../../00-foundation/principles.md), 11); without
  AI, they are unavailable and say so, and everything else works.

## What the page shows

**Recipes** tab: Draft and Complete Recipes as cards with a photo (name,
cuisine, favourite, a Draft mark) at a card size I choose (S, M or L,
on a computer), with search, sort, group and Select over the grid. On a
computer the filters stand in one card on the left: State (Draft ·
Complete · All) and Category always open, the other filters collapsed
until opened; on a phone they open from a Filters button (Joe, 18
October). **Ideas** tab: Ideas as a list (name, source, when
saved, the start of the note). "New" offers *New recipe*, *New idea* and
*Import*. A Recipe opens on its own page.

## Requirements

*Stage 4. Statuses: proposed → agreed → built → verified. All proposed.*

### RCP-001 — Browse the library

**As** Joe, **I want** my recipes as cards with photos, **so that** I
recognise dishes at a glance.
Priority: Must · Status: verified (5 comes with Households, plan step 9)

Acceptance criteria
1. Given the Recipes tab, then every Draft and Complete Recipe I can see
   shows as a card: photo (or a quiet placeholder), name, cuisine, my heart,
   and a mark on a Draft. Ideas and Archived Recipes don't show.
2. Given Draft · Complete · All, the first of the filters (All to start),
   then the grid shows that state's Recipes.
3. Given I search, then Recipes match by name, tag or ingredient.
4. Given I filter by category, cuisine, tags, protein, carbs or favourites,
   then only matching Recipes show (any choice within a filter, every filter
   together), and my filters are kept for next time. A collapsed filter
   says how many of its choices are on.
5. Given I'm in a Household, then a Created by filter lists me and every
   member of all my Households; outside a Household it isn't shown.
6. Given I sort (recently added, recently cooked, A–Z) or group (by
   category, cuisine or state), then the grid follows, and my choice is kept.
7. *(Suggested)* Given S, M or L on a computer, then the cards take that
   size, and my choice is kept; a phone shows two across.

### RCP-002 — Ideas

**As** Joe, **I want** ideas saved with almost nothing and kept in a list,
**so that** capturing is quick and I can scan them later.
Priority: Must · Status: verified

Acceptance criteria
1. Given New idea, then only the name is required; notes, links (any
   number) and a photo are optional.
2. Given the Ideas tab, then Ideas show as a list: name, source, when saved
   and the start of the note, newest first or A–Z (kept for next time), with
   a search.
3. Given an Idea, then it opens in a popup over Ideas, never a page of its
   own: its name, links, note and photo, and no ingredients or method (Joe,
   20 October).
4. Given an Idea, when I make it a Draft, then I give its category and
   cuisine first (RCP-010 6); its name, links, notes and photo stay, and its
   Variation's ingredients and method open to fill.
5. Given an Idea, then it can be deleted, not archived (Joe, 20 October).
6. Given a Thought in Inbox, when I sort it into a Recipe, then it becomes an
   Idea, any link in it kept as a source.

### RCP-003 — Save an idea from another app

**As** Joe, **I want** to share a recipe from TikTok or a web page to
LifeOS, **so that** it's saved as an idea without copying anything.
Priority: Must · Status: proposed

Acceptance criteria
1. Given LifeOS installed on my Android phone, when I share a link to it and
   choose Recipe idea, then an Idea is kept with the link, and its title and
   thumbnail where the link offers them.
2. Given the link is already a source of a Recipe or Idea, then I'm told
   which, and can open it or save anyway.
3. Given no signal, then the Idea is kept and sent later; its title and
   thumbnail fill in when it is.
4. *Later:* given an iPhone, then an iOS Shortcut does the same.

### RCP-004 — Many at once

**As** Joe, **I want** to select several Recipes or Ideas, **so that** I can
tidy them in one go.
Priority: Should · Status: verified

Acceptance criteria
1. Given Select on either tab (or a long press on a phone), then I can pick
   several of my own and Archive or Delete Recipes, or Delete Ideas, with
   Undo. Ideas are made Drafts one at a time, each needing its category and
   cuisine (RCP-010 6).

### RCP-005 — A Recipe's page, to read

**As** Joe, **I want** a clear page to read a recipe from, **so that** no
editing controls get in the way.
Priority: Must · Status: verified

Acceptance criteria
1. Given a Recipe, then it opens on its default Variation: the heading
   (photo, name, facts, favourite), then the Variation's times, servings and
   sources, ingredients (under any subheadings), method and notes — side by
   side on a computer, stacked on a phone — and the latest log entries.
2. Given more than one Variation, then a menu under the name switches
   between them, each with its state, and whose it is when it isn't the
   author's.
3. Given an "@" reference, then it is a button that opens that Recipe.
4. Given someone else's Recipe, then it has no editing controls but "Add my
   variation".

### RCP-006 — Edit a Recipe

**As** Joe, **I want** to edit the heading and a Variation separately, **so
that** each edit is about one thing.
Priority: Must · Status: verified

Acceptance criteria
1. Given Edit heading on my Recipe, then I change the name, photo,
   category, cuisine, tags, protein and carbs, and nothing of the Variation.
2. Given Edit on my Variation, then I change its name, state, ingredients,
   method, notes, times, servings and sources, and nothing of the heading.
3. Given a photo from a file, the camera or a link, then it is kept, reduced
   in size. A photo needs signal: without, I'm told at once it wasn't kept.
4. Given I leave the page, close a Dialog, lose signal or close the app
   mid-edit, then nothing typed is lost: Edit heading keeps as it goes, and
   a name it can't take stays as it was.
5. Given a new list value in a field ("Korean"), then it is added to my
   list as I type it.
6. Given a name already used by a Recipe I can see, then it is refused, and
   I'm told whose it is.

### RCP-007 — Ingredient lines

**As** Joe, **I want** structured ingredient lines, **so that** quantities
are consistent and can go on a shopping list.
Priority: Must · Status: verified (5 comes with the AI service, plan step 8)

Acceptance criteria
1. Given I type "200 g chorizo", then it is read as 200, g and Chorizo;
   suggestions from the Pantry appear as I type, the first chosen with
   Enter.
2. Given a name not in the Pantry, then I choose Add to the Pantry, which
   asks its name and aisle (Cupboard to start; Joe, 20 October), or Keep as
   typed.
3. Given "1-2 tsp", "~5 g" or a name alone, then each is kept as typed.
4. Given lines, then I reorder them by dragging (on a phone too; Joe, 20
   October) and delete them, and may add subheadings ("For the sauce") that
   group the lines below them.
6. Given a line, then it reads ingredient, then amount, then unit, on one
   line on a phone and a computer, when edited and when read (Joe, 20
   October).
5. Given a method and no ingredients, when I choose Fill from method, then
   the lines are suggested from the method, matched to the Pantry, for me
   to accept or change.

### RCP-008 — Method, notes and references

**As** Joe, **I want** numbered steps and notes that can name other recipes,
**so that** I can reach a stock or sauce mid-recipe.
Priority: Must · Status: verified

Acceptance criteria
1. Given the method, then steps are numbered, and I add, edit, reorder and
   delete them.
2. Given I type "@" in a step or the notes, then up to three of my Recipes
   are suggested, the first highlighted; choosing one makes a reference.
3. Given a referenced Recipe is renamed, then the reference shows its new
   name; deleted, it shows as plain text.

### RCP-009 — Variations

**As** Joe, **I want** several ways of making one dish, **so that** I can
experiment without losing what works.
Priority: Must · Status: verified

Acceptance criteria
1. Given a Variation, when I duplicate it and name the copy ("Air fryer"),
   then the copy has its ingredients, method, notes, times, servings and
   sources, and is a Draft.
2. Given my Variation, then I can rename it, set its state, delete it, and
   (on my Recipe) make it the default; the last one can't be deleted, only
   the Recipe.
3. Given the grid, then a Recipe is one card however many Variations it has.
4. Given two Variations, when I compare them, then their ingredients and
   methods show side by side, differences marked.

### RCP-010 — States

**As** Joe, **I want** to move a Recipe from idea to finished, and archive
it, **so that** I can see how far along each one is.
Priority: Must · Status: verified

Acceptance criteria
1. Given my Variation, then I set its state: Idea, Draft, Complete or
   Archived.
2. Given a Variation with ingredients or a method, then Idea isn't offered.
3. Given a Recipe, then its state is the highest of its Variations' that
   aren't archived; it is Archived only when all are.
4. Given I archive my Recipe, then all its Variations are archived, and it
   leaves both tabs, with Undo.
5. Given Settings → Archived recipes, then my archived Recipes are listed,
   and one can be brought back as it was.
6. Given a Draft or Complete Recipe, then it has a category and a cuisine:
   New recipe and making an Idea a Draft ask for both, and Edit heading
   won't take either away; a Recipe without them says so on its page (Joe,
   20 October).

### RCP-011 — Cooking

**As** Joe, **I want** a focused Cooking mode, **so that** I can follow a
recipe while I cook.
Priority: Must · Status: verified (3: the alert sounds while LifeOS is open; the notification from the server when it is not is still to come)

Acceptance criteria
1. Given a Draft or Complete Variation, when I press Start cooking, then the
   ingredients and method show large, without editing controls, and the
   screen doesn't sleep until I finish. Ingredients aren't ticked off; the
   step I'm on is picked out, and the ones before it marked done (Joe, 18
   October).
2. Given Cooking, when I change the servings, then the ingredients scale
   (both ends of a range) and the method says its numbers aren't scaled.
3. Given a step that names a time ("simmer for 20 minutes"), then it offers
   a timer, which alerts me when it ends, even with the screen on another
   page.
4. Given an "@" reference, then it opens the other Recipe and I come back
   to where I was.
5. Given I leave the page, then Cooking is where I left it when I come back.

### RCP-012 — How it went

**As** Joe, **I want** to record how a cook went, against what I cooked,
**so that** I can improve the recipe over time.
Priority: Must · Status: verified

Acceptance criteria
1. Given I finish Cooking, then I'm asked for a verdict (stars) and notes,
   both optional; Save logs the cook, Don't log keeps nothing.
2. Given a logged cook, then it keeps a snapshot of the Variation as cooked,
   at the servings I cooked, which opens from the log.
3. Given a cook from earlier ("we made it Saturday"), then Log a cook keeps
   one for that day, without Cooking.

### RCP-013 — The log

**As** Joe, **I want** a Recipe's history in order, **so that** I can see how
each Variation has changed.
Priority: Must · Status: verified

Acceptance criteria
1. Given a Recipe, then its log lists, newest first, its cooks (verdict,
   notes, who), Variations made, edited, marked or deleted, and the heading
   edited, each with who and when; edits close together by one person are
   one entry.
2. Given an edit, then it says "Edited", as a new Recipe says "Added"; its
   maker may say in their own words what changed, from the entry's "…"
   (Joe, 20 October).
5. Given See all, then the whole log opens twenty entries at a time, with
   Show more.
3. Given the log, then I can filter it to one Variation, or to cooks.
4. Given my own cook entry, then I can change its verdict and notes.

### RCP-014 — Import a recipe

**As** Joe, **I want** to import a recipe from a web page or a video in my
style, **so that** I don't copy it out and can trust what I get.
Priority: Should · Status: proposed

Acceptance criteria
1. Given Import and a link to a web page or a video, then I see its
   progress, then a new Draft, not yet kept, to check: name, photo, facts,
   times, servings, ingredient lines matched to the Pantry, method and
   source.
2. Given any import, then it is written in Joe's recipe style.
3. Given I keep it, then the Recipe and any new Pantry entries are saved
   together; cancelled, nothing is left.
4. Given an Idea with a link, when I import from it, then the Idea becomes a
   Draft, keeping its name, notes and photo.
5. Given the link was saved before, then I'm told before importing.
6. Given a video whose page says too little to make a recipe, then I'm told
   so, and nothing is made.
7. Given the AI is unavailable, then Import says so before I start.

### RCP-015 — Favourites

**As** Joe, **I want** to heart Recipes, **so that** I can find the ones I
like.
Priority: Must · Status: verified

Acceptance criteria
1. Given a card or a Recipe's page, when I press the heart, then it is my
   favourite only, and the favourites filter shows mine.

### RCP-016 — Recipes everywhere

**As** Joe, **I want** recipes with no signal and in Search, **so that**
they are there in the kitchen.
Priority: Must · Status: built (2 verified)

Acceptance criteria
1. Given no signal, then every Recipe opens, cooks and logs, and changes are
   sent later (a photo aside, RCP-006 3); photos I've seen before show.
2. Given Search, then Recipes and Ideas are found by name, tag and
   ingredient.
3. Given I delete my Recipe, then it goes to Recently deleted with its log,
   and Undo brings it back.

### RCP-017 — Sharing Recipes in a Household

**As** Joe, **I want** to see the Recipes of the person I live with, and
make my own version of one, **so that** we draw on one collection without
changing each other's.
Priority: Must · Status: proposed

Acceptance criteria
1. Given we are in a Household, then each of us sees all the other's
   Recipes and Ideas, read-only, on both tabs.
2. Given someone else's Recipe, when I choose Add my variation, then a copy
   of the Variation I'm looking at becomes mine, under their Recipe, and I
   edit it freely.
3. Given I leave the Household, then each Recipe I added Variations to is
   copied into my Recipes — its heading, with my Variations under it — and
   I stop seeing theirs.
4. Given I rejoin, then my copies and their Recipes are separate, even with
   the same name, and nothing is merged.
5. Given the filters, then categories, cuisines, tags, protein and carbs
   include everyone's in all my Households, the same name counting once.

### RCP-018 — Settings for Recipes

**As** Joe, **I want** to keep my lists, **so that** filters follow how I
organise food.
Priority: Should · Status: proposed (2 built)

Acceptance criteria
1. Given Settings → Recipes, then I rename, merge and delete categories,
   cuisines, tags, protein and carbs; one in use can't be deleted until
   nothing uses it.
2. Given Settings → Recipes, then Archived recipes opens (RCP-010).

Non-goals (Stage 4): AI that suggests what to cook; import from a photo;
nutrition; converting weight to volume; sharing a Recipe outside LifeOS.

## Open points for Joe

1. **Joe's recipe style:** in v1's code; Joe will point Claude to it when
   import is built (step 8).
2. ~~Reordering on a phone~~: settled 20 October — ingredient lines are
   dragged by their handle on a phone too; steps stay as they are.
