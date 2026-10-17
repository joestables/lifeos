# Recipes

*Stage 4, the `food` Module's Recipes page. **A draft for Joe to refine**,
written from Joe's notes of 17 October, with Claude's own suggestions marked
**(suggested)**. Everything is *proposed* until Joe agrees it. The Meal plan,
the Ingredient database and shopping lists are in [meals](meals.md).*

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
  the one that opens; a new Variation starts as a copy of another.
- **Each Variation has a state**, which I set: **Idea** → **Draft** →
  **Complete**, or **Archived** (Joe, 17 October). I cook a Draft a few
  times, refining it, and mark it Complete once it's settled.
- **The Recipe's state is the highest of its Variations'**, worked out, never
  set: Complete over Draft over Idea, Archived Variations not counting. A
  Recipe is Archived when every Variation is; archiving a Recipe archives
  them all.
- **An Idea has few fields**: a name, a link, a short note and a photo. When
  it becomes a Draft it keeps them all, and the Variation's fields open.
- **Archived is not deleted.** An archived Recipe is kept, out of the way,
  and found from Settings; deleting goes to Recently deleted
  ([ADR-0032](../../20-architecture/adr/0032-delete-means-archive.md),
  Provisionally agreed).

### Describing a Recipe

- **Category** (breakfast, dinner, sauce…), **cuisine**, **tags** ("quick",
  "batch"), **protein** and **carbs**, from lists I keep in Settings and add
  to as I go. Tags are Recipes' own, not Labels, so "Quick" never appears
  among my Tasks' Labels
  ([ADR-0014](../../20-architecture/adr/0014-reference-data-and-labels.md),
  amended). Each is optional, so an Idea needs none.
- **A favourite is mine alone**, a per-person mark (heart).
- **Recipes are green**, with Variations, Meals and Ingredients
  ([ADR-0043](../../20-architecture/adr/0043-colour-by-type.md),
  Provisionally agreed).

### Ingredients and method

- **An ingredient line is an amount, a unit and an ingredient** — nothing
  else (Joe, 17 October). The ingredient is linked to the Ingredient
  database ([meals](meals.md#ingredients)), or left as typed when I'd rather
  not add it there. How it is prepared goes in the method.
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
- **Scaling to other servings is in Cooking only**, and scales the
  ingredients, not numbers written in the method.
- **Cooking (suggested additions):** the screen kept awake; one step at a
  time, large, with the ingredients that step uses beside it; a timer offered
  on a step that names a time ("simmer for 20 minutes").

### The log

- **Each Recipe has a log**: Variations made, changed or deleted; heading
  changes; and cooks. Each entry says who and when.
- **A cook** is logged when I finish Cooking: a verdict (stars) and notes,
  both optional. **It keeps a snapshot of the Variation as cooked**, so a
  verdict can be read against what I actually made, even after the recipe
  has moved on (Joe, 17 October;
  [ADR-0013](../../20-architecture/adr/0013-occurrences-snapshot-their-definition.md),
  Provisionally agreed).

### Getting recipes in

- **By hand**, as an Idea or a Draft.
- **Shared from another app** — TikTok, Instagram, a browser — straight into
  an Idea, with its link (and its title and thumbnail when the link offers
  them) (Joe, 17 October). On Android the installed app can be a share
  target now; capture from outside the app was Stage 10
  ([ADR-0028](../../20-architecture/adr/0028-capture-from-outside-the-app.md)),
  so this brings the share target forward for recipes.
- **Imported from a web page**, as a Draft, rewritten in **my recipe style**:
  a few lines in Settings saying how I like recipes written, which every
  import follows (Joe, 17 October; the style in Settings is suggested).
- **(Suggested) From a photo** of a cookbook page or a handwritten card, and
  **from a video's link**, using what the video's page says (its description
  or captions), to fill an Idea in as a Draft.
- **A link I've saved before** is flagged before I save it again.
- These use the core's one AI service
  ([principles](../../00-foundation/principles.md), 11); without AI, they
  are unavailable and say so, and everything else works.

## What the page shows

**Recipes** tab: Draft and Complete Recipes as cards with a photo (name,
cuisine, favourite, a Draft mark), with search, filters, sort and group.
**Ideas** tab: Ideas as a list (name, source, when saved, the start of the
note). "New" offers *New recipe*, *New idea* and *Import*. A Recipe opens on
its own page.

## Requirements

*Stage 4. Statuses: proposed → agreed → built → verified. All proposed.*

### RCP-001 — Browse the library

**As** Joe, **I want** my recipes as cards with photos, **so that** I
recognise dishes at a glance.
Priority: Must · Status: proposed

Acceptance criteria
1. Given the Recipes tab, then every Draft and Complete Recipe shows as a
   card: photo (or a quiet placeholder), name, cuisine, my heart, and a mark
   on a Draft. Ideas and Archived Recipes don't show.
2. Given I search, then Recipes match by name, tag or ingredient.
3. Given I filter by category, cuisine, tags, protein, carbs or favourites,
   then only matching Recipes show (any choice within a filter, every filter
   together), and my filters are kept for next time.
4. Given I sort (recently added, recently cooked, A–Z) or group (by
   category, cuisine or state), then the grid follows, and my choice is kept.

### RCP-002 — Ideas

**As** Joe, **I want** ideas saved with almost nothing and kept in a list,
**so that** capturing is quick and I can scan them later.
Priority: Must · Status: proposed

Acceptance criteria
1. Given New idea, when I give only a name, a link or a note, then it is
   kept as an Idea.
2. Given the Ideas tab, then Ideas show as a list: name, source, when saved
   and the start of the note, newest first, with a search.
3. Given an Idea, when I make it a Draft, then its name, link, note and photo
   stay, and its Variation's ingredients and method open to fill.
4. Given a Thought in Inbox, when I sort it into a Recipe, then it becomes an
   Idea, any link in it kept as its source.

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

### RCP-004 — Many at once

**As** Joe, **I want** to select several Recipes or Ideas, **so that** I can
tidy them in one go.
Priority: Should · Status: proposed

Acceptance criteria
1. Given Select on either tab (or a long press on a phone), then I can pick
   several and Archive, Delete, or (Ideas) make them Drafts, with Undo.

### RCP-005 — A Recipe's page, to read

**As** Joe, **I want** a clear page to read a recipe from, **so that** no
editing controls get in the way.
Priority: Must · Status: proposed

Acceptance criteria
1. Given a Recipe, then it opens on its default Variation: the heading
   (photo, name, facts, favourite), then the Variation's times, servings and
   sources, ingredients, method and notes — side by side on a computer,
   stacked on a phone — and the latest log entries.
2. Given more than one Variation, then a menu under the name switches
   between them, each with its state.
3. Given an "@" reference, then it is a button that opens that Recipe.

### RCP-006 — Edit a Recipe

**As** Joe, **I want** to edit the heading and a Variation separately, **so
that** each edit is about one thing.
Priority: Must · Status: proposed

Acceptance criteria
1. Given Edit heading, then I change the name, photo, category, cuisine,
   tags, protein and carbs, and nothing of the Variation.
2. Given Edit (a Variation), then I change its name, state, ingredients,
   method, notes, times, servings and sources, and nothing of the heading.
3. Given a photo from a file, the camera or a link, then it is kept, reduced
   in size.
4. Given I leave the page, lose signal or close the app mid-edit, then
   nothing typed is lost.
5. Given a new list value in a field ("Korean"), then it is added to my
   list as I type it.

### RCP-007 — Ingredient lines

**As** Joe, **I want** structured ingredient lines, **so that** quantities
are consistent and can go on a shopping list.
Priority: Must · Status: proposed

Acceptance criteria
1. Given I type "200 g chorizo", then it is read as 200, g and Chorizo;
   suggestions from the Ingredient database appear as I type, the first
   chosen with Enter.
2. Given a name not in the database, then I choose Add to ingredients (with
   its aisle) or Keep as typed.
3. Given "1-2 tsp", "~5 g" or a name alone, then each is kept as typed.
4. Given lines, then I reorder and delete them.
5. Given a method and no ingredients, when I choose Fill from method, then
   the lines are suggested from the method, matched to the database, for me
   to accept or change.

### RCP-008 — Method, notes and references

**As** Joe, **I want** numbered steps and notes that can name other recipes,
**so that** I can reach a stock or sauce mid-recipe.
Priority: Must · Status: proposed

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
Priority: Must · Status: proposed

Acceptance criteria
1. Given a Variation, when I duplicate it and name the copy ("Air fryer"),
   then the copy has its ingredients, method, notes, times, servings and
   sources, and is a Draft.
2. Given a Variation, then I can rename it, set its state, make it the
   default, or delete it; the last one can't be deleted, only the Recipe.
3. Given the grid, then a Recipe is one card however many Variations it has.
4. **(Suggested)** Given two Variations, when I compare them, then their
   ingredients and methods show side by side, differences marked.

### RCP-010 — States

**As** Joe, **I want** to move a Recipe from idea to finished, and archive
it, **so that** I can see how far along each one is.
Priority: Must · Status: proposed

Acceptance criteria
1. Given a Variation, then I set its state: Idea, Draft, Complete or
   Archived.
2. Given a Recipe, then its state is the highest of its Variations' that
   aren't archived; it is Archived only when all are.
3. Given I archive a Recipe, then all its Variations are archived, and it
   leaves both tabs, with Undo.
4. Given Settings → Archived recipes, then archived Recipes are listed, and
   one can be brought back as it was.

### RCP-011 — Cooking

**As** Joe, **I want** a focused Cooking mode, **so that** I can follow a
recipe while I cook.
Priority: Must · Status: proposed

Acceptance criteria
1. Given a Draft or Complete Variation, when I press Start cooking, then the
   ingredients and method show large, without editing controls, and the
   screen stays awake where the device allows.
2. Given Cooking, when I change the servings, then the ingredients scale
   (both ends of a range) and the method says its numbers aren't scaled.
3. Given an "@" reference, then it opens the other Recipe and I come back
   to where I was.
4. **(Suggested)** Given a step, then the ingredients it uses are shown
   with it, and a step that names a time offers a timer.
5. Given I leave the page or the phone sleeps, then Cooking is where I left
   it when I come back.

### RCP-012 — How it went

**As** Joe, **I want** to record how a cook went, against what I cooked,
**so that** I can improve the recipe over time.
Priority: Must · Status: proposed

Acceptance criteria
1. Given I finish Cooking, then I'm asked for a verdict (stars) and notes,
   both optional; Save logs the cook, Don't log keeps nothing.
2. Given a logged cook, then it keeps a snapshot of the Variation as cooked,
   at the servings I cooked, which opens from the log.
3. Given a cook from earlier ("we made it Saturday"), then Log a cook keeps
   one for that day, without Cooking.
4. **(Suggested)** Given a cook's notes ("less salt; 5 minutes longer"),
   when I choose Apply to recipe, then the changes are proposed to the
   Variation — or to a new one — for me to accept line by line.

### RCP-013 — The log

**As** Joe, **I want** a Recipe's history in order, **so that** I can see how
each Variation has changed.
Priority: Must · Status: proposed

Acceptance criteria
1. Given a Recipe, then its log lists, newest first, its cooks (verdict,
   notes, who), Variations made, changed or deleted, and heading changes,
   each with who and when.
2. Given a change entry, then it says what changed ("Salt 1 → 2 tsp; step 4
   rewritten").
3. Given the log, then I can filter it to one Variation, or to cooks.
4. Given my own cook entry, then I can change its verdict and notes.

### RCP-014 — Import a recipe

**As** Joe, **I want** to import a recipe from a web page in my style, **so
that** I don't copy it out and can trust what I get.
Priority: Should · Status: proposed

Acceptance criteria
1. Given Import and a link, then I see its progress, then a new Draft, not
   yet kept, to check: name, photo, facts, times, servings, ingredient lines
   matched to the database, method and source.
2. Given my recipe style in Settings, then the import is rewritten in it.
3. Given I keep it, then the Recipe and any new Ingredients are saved
   together; cancelled, nothing is left.
4. Given an Idea with a link, when I import from it, then the Idea becomes a
   Draft, keeping its name, note and photo.
5. Given the link was saved before, then I'm told before importing.
6. **(Suggested)** Given a photo of a recipe, or a video link, then import
   reads it the same way.
7. Given the AI is unavailable, then Import says so before I start.

### RCP-015 — Favourites

**As** Joe, **I want** to heart Recipes, **so that** I can find the ones I
like.
Priority: Must · Status: proposed

Acceptance criteria
1. Given a card or a Recipe's page, when I press the heart, then it is my
   favourite only, and the favourites filter shows mine.

### RCP-016 — Recipes everywhere

**As** Joe, **I want** recipes with no signal and in Search, **so that**
they are there in the kitchen.
Priority: Must · Status: proposed

Acceptance criteria
1. Given no signal, then every Recipe opens, cooks and logs, and changes are
   sent later; photos I've seen before show.
2. Given Search, then Recipes and Ideas are found by name, tag and
   ingredient.
3. Given I delete a Recipe, then it goes to Recently deleted with its log,
   and Undo brings it back.

### RCP-017 — Settings for Recipes

**As** Joe, **I want** to keep my lists and my recipe style, **so that**
filters and imports follow how I organise food.
Priority: Should · Status: proposed

Acceptance criteria
1. Given Settings → Recipes, then I rename, merge and delete categories,
   cuisines, tags, protein and carbs; one in use can't be deleted until
   nothing uses it.
2. Given Settings → Recipes, then I write my recipe style, used by every
   import.
3. Given Settings → Recipes, then Archived recipes opens (RCP-010).

Non-goals (Stage 4): AI that suggests what to cook; nutrition; converting
weight to volume; sharing a Recipe outside LifeOS.

## Open points for Joe

1. **Households.** Your notes ask for "recipes from all Household members
   shown together", and you haven't settled Households. See the
   [plan's question](../../50-progress/plans/stage-4.md#households) — this
   spec works either way.
2. **Archived as a Variation state:** your notes put it beside Idea, Draft
   and Complete. *Recommended:* as written — archive a Variation you've
   given up on, or the whole Recipe.
3. **Sharing on an iPhone:** a web app can't be a share target on iOS; an
   iOS Shortcut can do it later. Is Android enough for now?
4. **Which suggestions to keep:** one step at a time with its ingredients
   and timers (RCP-011 4), comparing Variations (RCP-009 4), applying a
   cook's notes to the recipe (RCP-012 4), import from a photo or a video
   (RCP-014 6), and the recipe style in Settings.
5. **Ingredient groups** ("For the sauce") — left out, since a line is only
   an amount, unit and ingredient, and a sauce can be its own Recipe named
   with "@". Agreed?
