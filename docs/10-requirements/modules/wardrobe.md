# Wardrobe

*Stage 6, the `wardrobe` Module's Wardrobe page. Written from Joe's notes
(18 November), his answers and his comments the same day, with Claude's
suggestions marked **(suggested)**, which Joe agreed. **Agreed by Joe on 18
November.** How it is held and worked out:
[ADR-0066](../../20-architecture/adr/0066-wardrobe-in-the-database.md)
(the database), [ADR-0067](../../20-architecture/adr/0067-garment-colours.md)
(colours) and [ADR-0068](../../20-architecture/adr/0068-weather.md) (the
weather) ([Stage 6 plan](../../50-progress/plans/stage-6.md)).*

**In one line:** every garment I own, the outfits I make from them, and
what I'll wear on each day, with the weather beside it.

## Decisions

### Garments

- **A garment is an Item**, Personal, orange
  ([ADR-0043](../../20-architecture/adr/0043-colour-by-type.md)), because
  outfits link to it ([data model](../../20-architecture/data-model.md#item-or-child-row)).
- **Four things are required: Category, Brand, Size and Colour.** A garment
  can't be saved without all four (Joe, 18 November). **Fit** (one) and
  **Tags** (any number) are optional. A **photo** is expected but not
  required (suggested): a garment without one shows its category's
  placeholder.
- **A garment has no name to type** (suggested). Its title is worked out:
  colour, brand and category ("Navy Uniqlo T-shirt"), kept up to date as
  they change, so Search and Week have something to say. An own name can
  be given under More, for the odd garment that needs one ("Wedding suit").
- **One colour, required** (Joe, 18 November): a garment's main colour.
  Stripes and patterns take their main one.
- **Owned or Retired** (Joe, 18 November). Retiring a garment I no longer
  have hides it from the Wardrobe tab and from pickers, but keeps it in
  outfits and on past days, faded and marked Retired, and it can be
  brought back. Delete is still there, for mistakes: a deleted garment
  leaves every outfit, goes to Recently deleted
  ([ADR-0032](../../20-architecture/adr/0032-delete-means-archive.md)),
  and Undo brings it back into them.
- **A favourite** is a heart on a garment, as on a Recipe.

### Lists

- **Categories and Sizes are made only in Settings**, each an ordered
  list I drag into order (XS, S, M, L, XL), and that order is used
  wherever they're listed, sorted or grouped (Joe, 18 November).
  Categories are named in the singular ("T-shirt", "Jeans"), as a
  garment's title uses the name as written (Joe, 19 November).
- **Brands, Fits and Tags** are kept in Settings too, and also made as I
  add a garment (Joe, 18 November). Fit and Tags work the same way, a
  list of pills; Fit is one per garment ("Slim"), Tags any number ("Gym",
  "Work").
- **Colours** are a list of my own named colours, each with its swatch
  (Joe, 18 November). They are made as I add a garment (below), and seen,
  renamed, merged and deleted in Settings. The point is one "White" for
  every white garment, so filtering by colour works.
- **The lists are Wardrobe's own**, not Labels, as a Recipe's tags are
  Food's ([ADR-0014](../../20-architecture/adr/0014-reference-data-and-labels.md)):
  "Gym" as a Wardrobe tag never appears among my Notes' Labels.
- **Every list starts empty** (Joe, 18 November): nothing is predefined.
  Before the first garment, I add categories and sizes in Settings.
- **One list of sizes for every category** (Joe, 18 November), not sizes
  tied to categories; the add sheet puts the sizes already used for the
  chosen category first.

### Adding a garment, without friction

Joe adds 99% of garments on his phone, often one after another (Joe, 18
November). Claude's suggestion for keeping it quick:

1. **The camera first.** New garment opens the camera at once (on a
   computer, a file or the camera). One shot; a square crop I can nudge.
2. **One sheet, no steps.** The photo at the top, then every field as
   pills on one scrolling sheet, in this order: Colour, Category, Size,
   Brand, Fit, Tags. Each required field is one tap; Save lights up when
   all four are set, and until then says what's missing ("Size needed").
3. **The colour is already chosen.** By the time the sheet shows, the
   photo has been read and the closest of my colours is selected, with
   the next closest beside it, or, when none is close, a new colour ready
   to make ([below](#colour-from-the-photo)).
4. **The likely sizes come first.** After a Category is chosen, the sizes
   I've used for it lead the Size pills; the rest are behind More sizes.
5. **Brands are a search**, narrowing as I type, the brands I've used most
   recently shown as pills before I type; a brand I haven't got is made
   from the search with Add "…".
6. **Add another keeps what's likely the same.** Saved, the garment opens
   read-only with **Add another**, which opens the camera again with this
   garment's Category and Size already chosen, marked as carried over, one
   tap to change (suggested): photographing a drawer of T-shirts is then a
   shot, a colour and Save each.
7. **Nothing waits on signal** (suggested): a garment added offline is
   kept, its photo held on the device and sent when there is signal, as
   the rest of LifeOS writes are
   ([offline](../cross-cutting/offline.md)). Recipes refuse a photo without
   signal ([RCP-006](recipes.md#rcp-006--edit-a-recipe) 3); garments
   shouldn't, as they're added in bulk.

### Colour from the photo

- **The garment's dominant colour is estimated on the device**
  (suggested), in a moment and offline, so it's ready when the sheet
  shows. The photo's pixels are clustered in a perceptual colour space
  (OKLab); the background is estimated from the photo's edges and left
  out, and the centre counts for more, so the garment wins over the floor
  it lies on. The largest remaining cluster is the garment's colour. This
  is the job v1's colour algorithm did
  ([ADR-0002](../../20-architecture/adr/0002-start-afresh-port-selectively.md));
  it is written afresh (Joe, 18 November).
- **No background removal** (Joe, 18 November): a plain floor or bed
  behind the garment is enough for the estimate.
- **My own colours are offered, never a new hex.** The estimate is compared
  with each of my colours by how far apart they look (ΔE in OKLab); the
  closest is selected, and up to three within a set distance are offered
  beside it, closest first, with all my colours a tap away. Suggestions
  are only suggestions (Joe, 18 November).
- **Obviously new, a new colour is suggested** (Joe, 18 November): when
  none of mine is close, the estimate itself is offered first as a new
  colour, already named (below), to make with one tap, or to change in the
  picker first. It is still only a suggestion.
- **A new colour is picked from the photo** (Joe, 18 November): New colour
  shows the photo with a loupe I drag over the garment; where I let go
  sets the colour. Then I name it.
- **The name is suggested** (Joe: bonus): the picked colour's nearest name
  from a built-in list of everyday clothing colour names (Navy, Olive,
  Charcoal, Cream, Burgundy, Light grey…), worked out on the device, so it
  needs no AI, no signal and no wait (suggested). I keep it or type my own.
- **A near twin is flagged.** A new colour that looks very close to one I
  have says so ("Close to White"), with Use White, so I don't make a second
  white by accident.

### Outfits

- **An outfit is a set of garments**, any combination, linked by
  *includes* ([data model](../../20-architecture/data-model.md#link-types)).
  It needs no name (Joe, 18 November); one can be given (suggested).
  Deleting an outfit deletes none of its garments.
- **An outfit is shown as its garments' photos**, laid out together on its
  card, in my categories' order (tops before trousers before shoes).
- **Collections** group outfits: a holiday, a trip, work (Joe, 18
  November). They are made in Settings. **My Outfits** holds every outfit,
  always: it can't be renamed, deleted or left. An outfit can also be in
  any number of my own collections.
- **The same outfit twice is flagged** (suggested): saving garments that
  are already exactly an outfit says so, with Open, rather than making a
  copy.

### Two ways to make an outfit

- **On the Outfits tab, New outfit** opens a popup to choose garments from
  my wardrobe, with the same search and filters (Joe, 18 November).
- **On the Wardrobe tab, the Outfit builder** (Joe, 18 November): a mode,
  as Select is, where every card shows a "+" and pressing anywhere on a
  card adds it to the builder; pressed again, it comes out (suggested).
  Search, filters and sort still work, so I filter to tops, choose one,
  filter to trousers, choose one. The builder holds the garments chosen,
  in category order, each removable; the collections to save into (My
  Outfits always, others optional); an optional name; **Save outfit**; and
  a switch, **Clear after saving**, kept for next time (Joe, 18 November).
  - On a computer it is a pane fixed on the right (Joe, 18 November).
  - **On a phone, a tray** (suggested): a bar along the bottom showing the
    chosen garments' photos small, how many, and Save; pulled up, it opens
    to the whole builder. The grid stays in reach above it.
  - What's in the builder is kept if I leave the page (suggested).

### The Week tab

- **The week**, Monday first, laid out as the Meal plan's: columns on a
  computer, days stacked on a phone, ‹ Today › and a date
  ([meals](meals.md#the-meal-plan)).
- **A day can hold several outfits and single garments** (Joe, 18
  November): gym kit and work clothes, or a jacket added to an outfit
  just for that day. An outfit on a day shows each of its garments as its
  own card, the cards joined into one group so they read as one outfit;
  single garments stand on their own.
- **The tab is called Week** (Joe, 18 November), as the Meal plan's is:
  Plan is a page of its own (Tasks, Events and Reminders).
- **The Planned Outfits pane** (Joe, 18 November). Outfits chosen on the
  Outfits tab with **Add to Planned Outfits** wait in a pane on the right,
  styled as the Outfit builder is, and are dragged onto days on the Week
  tab. The pane is the same, and shows the same outfits, on both the
  Outfits and Week tabs (Joe, 18 November). A placed outfit
  leaves the pane (suggested); it can be placed again from the Outfits tab.
  The pane is the planned outfits alone: a Garments search beside them was
  no use (Joe, 20 November); a single garment goes on a day with its "+". On a phone, the pane
  is the same tray as the builder's, its planned outfits only, each held
  and dragged onto a day, the tray stepping aside (Joe, 20 November), or
  tapped and then a day. Planning is quiet: what's placed, moved or
  returned shows where it went, so no toast says so (Joe, 20 November).
- **Create outfit** on a day with two or more single garments makes an
  outfit of them, into My Outfits, and they join into one group (Joe, 18
  November).
- **What's planned for a day is that day's own** (suggested): an outfit
  placed on a day keeps the garments it had then
  ([ADR-0013](../../20-architecture/adr/0013-occurrences-snapshot-their-definition.md)).
  Changing the outfit later changes days still to come, not past ones.
- **Worn is worked out** (Joe, 18 November): once a planned day has passed,
  what was on it counts as worn, unless I took it off the day. Each
  garment and outfit then has **last worn** and **times worn**.

### Weather

- **Each day on the Week tab shows its forecast** (Joe, 18 November): an
  icon, the day's high and low in °C, and the chance of rain when it's
  worth saying.
- **One place, set in Settings → Wardrobe** (Joe, 18 November), found by
  name ("Manchester").
- **Open-Meteo** (suggested): free, with no key or account, forecasting
  16 days ahead. Days past the forecast, and days gone, show no weather.
  Without signal, the last forecast fetched shows, saying when it's from.
- Weather was a [later opportunity](../../roadmap.md#later-opportunities);
  this makes it an Integration in Stage 6, for the Week tab only. Outfit
  suggestions from it aren't wanted (Joe, 18 November).

### Today and Week

- **One card a day**, never one per garment (Joe, 18 November): an orange
  card with the day's garments' photos small, saying "Navy work outfit",
  "2 outfits" or "4 garments". Pressed, a popup shows the day's outfits
  and single garments as the Week tab does, with the weather, and Open in
  Wardrobe.

### Not wanted

Joe doesn't want these, now or later (18 November): price and a shop link
on a garment; importing a garment from a shop's page (v1 had it,
[ADR-0002](../../20-architecture/adr/0002-start-afresh-port-selectively.md));
removing the photo's background; outfit suggestions from the weather or
from what I haven't worn; *worn to* an Event; packing lists; laundry;
sharing garments or outfits in a Household (all Personal).

**A wishlist of clothes** isn't Wardrobe's: it will be part of Shopping,
built later (Joe, 18 November).

## What the page shows

**Wardrobe** (orange, `shirt`), three tabs (Joe, 18 November):

- **Wardrobe**: my Owned garments as photo cards, presented as Recipes
  are ([RCP-001](recipes.md#rcp-001--browse-the-library)): S, M or L cards
  on a computer, two across on a phone; search, sort, group and Select
  over the grid; the filters in one card on the left on a computer
  (Category open, showing every category; Brand, Colour, Size, Fit and
  Tags collapsed; Favourites), from a Filters button on a phone. **New
  garment** and **Build outfit**. A card: photo, brand, category and size,
  the colour's swatch, the heart.
- **Outfits**: a Collection menu (My Outfits first), the collection's
  outfits as cards in a grid, New outfit, search, sort and Select, and
  the Planned Outfits pane.
- **Week**: the week with each day's weather, outfits and garments.

The Planned Outfits pane is on both the Outfits and Week tabs, the same on
each.

A garment and an outfit each open in a popup, read-only first.

## Requirements

*Stage 6. Statuses: proposed → agreed → built → verified. All agreed (Joe, 18 November).*

### Garments

### WRD-001 — Browse my wardrobe

**As** Joe, **I want** my clothes as photo cards, **so that** I can see
what I own at a glance.
Priority: Must · Status: verified (`wardrobe.spec.ts`)

Acceptance criteria
1. Given the Wardrobe tab, then every Owned garment shows as a card: its
   photo (or its category's placeholder), brand, category, size, its
   colour's swatch and my heart. Retired garments don't show.
2. Given S, M or L on a computer, then the cards take that size, and my
   choice is kept; a phone shows two across (suggested, as RCP-001 7).
3. Given no garments yet, then the tab says so with New garment; given no
   categories or sizes yet, then New garment says to add them in
   Settings → Wardrobe, with a link; every list starts empty (Joe, 18
   November).

### WRD-002 — Filter

**As** Joe, **I want** to filter by anything a garment has, **so that** I
find, say, every slim black pair of trousers.
Priority: Must · Status: verified (`wardrobe.spec.ts`)

Acceptance criteria
1. Given the filters, then I filter by Category, Brand, Size, Colour, Fit,
   Tags and Favourites: any choice within a filter, every filter together;
   my filters are kept for next time.
2. Given a computer, then the filters stand in a card on the left: Category
   open with every category listed, in my order; Brand, Colour, Size, Fit
   and Tags collapsed until opened, each saying how many of its choices
   are on. Given a phone, then they open from a Filters button saying how
   many are on.
3. Given a list's choices, then they are in my order (Category, Size), A–Z
   (Brand, Fit, Tags), or my colours' order (by hue, then lightness;
   suggested), each with its swatch for Colour; a choice no Owned garment
   has isn't offered.
4. Given Clear, then every filter is off.

### WRD-003 — Sort and group

**As** Joe, **I want** to sort and group my clothes, **so that** the grid
follows how I think about them.
Priority: Must · Status: verified (`wardrobe.spec.ts`, `wardrobe-week.spec.ts`)

Acceptance criteria
1. Given Sort, then I sort by category, brand, size (each in my order, or
   A–Z for brand), recently added (Joe, 18 November), or last worn or times
   worn (suggested, WRD-024); choosing the sort in use again reverses it,
   its arrow showing which way (as RCP-001 6), and my choice is kept.
2. Given Group, then I group by category, brand, size or colour (Joe, 18
   November), or none; groups follow the lists' order, each heading saying
   how many, and the sort applies within each group; my choice is kept.

### WRD-004 — Search

**As** Joe, **I want** to search my clothes, **so that** typing "navy
slim" finds them.
Priority: Must · Status: verified (`wardrobe.spec.ts`)

Acceptance criteria
1. Given I type in the search, then garments match on category, brand,
   size, colour, fit, tags and any own name (Joe, 18 November), each word
   matching something ("navy slim" finds navy garments with a Slim fit),
   ignoring case.
2. Given a search, then the filters, sort and group still apply.

### WRD-005 — Add a garment

**As** Joe, **I want** adding a garment on my phone to be a photo and a
few taps, **so that** I can photograph my whole wardrobe in one go.
Priority: Must · Status: verified (`wardrobe.spec.ts`)

Acceptance criteria
1. Given New garment on a phone, then the camera opens at once; given a
   computer, then I choose a file or the camera. The photo can be skipped.
2. Given a photo, then a square crop shows, centred, which I can move and
   zoom before going on; taken with the camera, it starts on just the square
   the camera's frame showed, 1:1 (Joe, 20 November); it is kept reduced in size, with a small copy for
   cards (as RCP-006 3).
3. Given the sheet, then the photo is at the top and every field below it
   on one sheet, no steps: Colour (WRD-006), Category, Size, Brand, Fit and
   Tags, Category and Size as pills in my order, Fit and Tags as pills of
   every value (Joe, 18 November).
4. Given a Category chosen, then the sizes I've used with it lead the Size
   pills and the rest are behind More sizes (suggested); with none used,
   every size shows.
5. Given Category, Brand, Size and Colour all set, then Save is on; until
   then it is off and says what's missing (Joe, 18 November).
6. Given no signal, then the garment is kept, and sent with its photo when
   there is signal (suggested); its card shows it's waiting.
7. Given I close the sheet with something chosen, then I'm asked before it
   is thrown away.

### WRD-006 — Colour from the photo

**As** Joe, **I want** the app to suggest my colour for the garment in the
photo, **so that** colours are quick and consistent.
Priority: Must · Status: verified (`wardrobe.spec.ts`); 5 by the unit tests

Acceptance criteria
1. Given a photo, then the garment's dominant colour is estimated on the
   device, the background (from the photo's edges) left out and the
   centre counting for more, before the sheet shows, offline too.
2. Given the estimate, then the closest of my colours is selected, and up
   to three others close to it are offered beside it, closest first; All
   colours shows every one of mine (Joe, 18 November).
3. Given none of my colours is close, then a new colour of the estimate is
   offered first and selected, with a suggested name (WRD-007 2); I keep
   it, change its colour or name, or choose one of mine instead (Joe, 18
   November). Its suggested name already one of mine ("Brown"), mine is
   selected instead, and a new colour named as one of mine is saved as mine:
   names are never made twice (Joe, 20 November).
4. Given no photo, then no colour is suggested, and I choose from mine or
   make one by its swatch alone (a colour picker without the photo).
5. Given unit tests, then photos of known garments on known backgrounds
   give the expected colour (a set of test photos kept with the code).

### WRD-007 — A new colour

**As** Joe, **I want** to pick a new colour from the photo and have it
named for me, **so that** a colour I haven't got yet is one step.
Priority: Must · Status: built; 2 verified (`wardrobe.spec.ts`)

Acceptance criteria
1. Given New colour, then the photo fills the sheet with a loupe that
   follows my finger (or pointer), magnified, showing the colour under it;
   where I let go is the colour (Joe, 18 November). It starts at the
   estimate's colour.
2. Given a colour picked, then a name is filled in, the nearest from a
   built-in list of clothing colour names (suggested); I keep it or type
   my own. A name I already have is refused, offering that colour.
3. Given a picked colour very close to one of mine, then it says "Close
   to White" with Use White (suggested).
4. Given Save, then the colour joins my list and is the garment's.

### WRD-008 — Brands, fits and tags as I go

**As** Joe, **I want** to make a brand, fit or tag while adding a garment,
**so that** I never leave the sheet for Settings.
Priority: Must · Status: verified (`wardrobe.spec.ts`)

Acceptance criteria
1. Given Brand, then before I type it shows the brands I've used most
   recently as pills (up to six; suggested); as I type, my brands narrow
   to those matching, the typed part bold; Add "…" makes a new one (Joe,
   18 November). A brand matching one I have but for case is that one.
2. Given Fit, then every fit shows as a pill, one chosen at most, and
   pressed again it comes off; "+ Fit" makes a new one inline (Joe, 18
   November).
3. Given Tags, then every tag shows as a pill, any number chosen; "+ Tag"
   makes a new one inline (Joe, 18 November).
4. Given Category or Size, then they can't be made here, only in Settings
   (Joe, 18 November).

### WRD-009 — Add another

**As** Joe, **I want** to go straight on to the next garment, **so that**
adding many back to back is seamless.
Priority: Must · Status: verified (`wardrobe.spec.ts`)

Acceptance criteria
1. Given Save, then the new garment opens in its popup, read-only, with
   Add another (Joe, 18 November).
2. Given Add another, then the camera opens again, and the next sheet has
   the last garment's Category and Size already chosen, marked as carried
   over (suggested); its colour is estimated afresh.

### WRD-010 — A garment's popup

**As** Joe, **I want** a garment to open read-only, **so that** I can look
without changing anything, and edit only when I mean to.
Priority: Must · Status: verified (`wardrobe.spec.ts`, `wardrobe-outfits.spec.ts`, `wardrobe-week.spec.ts`)

Acceptance criteria
1. Given a card pressed, then the garment opens in a popup, read-only
   (Joe, 18 November): its photo large, category, brand, size, colour, fit,
   tags, my heart, when added, last worn and times worn (WRD-024), and the
   outfits it is in, each opening its own popup.
2. Given Edit, then every field changes as when adding, the same rules
   holding (four required), including a new photo, with its colour
   suggested again but not changed unless I choose.
3. Given "…", then Retire (WRD-013) and Delete; Delete says how many
   outfits it leaves, and has Undo (Joe, 18 November).

### WRD-011 — Favourites

**As** Joe, **I want** to heart garments, **so that** I can find the ones I
love.
Priority: Should · Status: verified (`wardrobe.spec.ts`)

Acceptance criteria
1. Given a card or a garment's popup, when I press the heart, then it is a
   favourite, and the Favourites filter shows my favourites.

### WRD-012 — Many garments at once

**As** Joe, **I want** to select several garments and tag or remove them
together, **so that** I can tag all my gym clothes "Gym" in one go.
Priority: Must · Status: verified (`wardrobe.spec.ts`)

Acceptance criteria
1. Given Select (or a long press on a phone), then I pick several garments,
   with Select all for what's showing, as on Recipes
   ([RCP-004](recipes.md#rcp-004--many-at-once)).
2. Given Add tag, then I choose one or more tags (or make one), and each is
   added to every garment selected; given Remove tag, then I choose from
   the tags the selected garments have, and those come off every one of
   them (Joe, 18 November).
3. Given Retire or Delete, then every garment selected is retired or
   deleted (Joe, 18 November), with Undo.

### WRD-013 — Retire a garment

**As** Joe, **I want** to retire clothes I no longer have, **so that** the
wardrobe shows what I own and my past outfits still make sense.
Priority: Must · Status: agreed; 1 and 3 verified (`wardrobe.spec.ts`, `wardrobe-settings.spec.ts`)

Acceptance criteria
1. Given Retire, then the garment leaves the Wardrobe tab, filters and
   pickers, and stays in its outfits and on past days, faded, marked
   Retired (Joe, 18 November).
2. Given an outfit with a retired garment, then it can still be placed on a
   day, the retired garment marked.
3. Given Settings → Wardrobe → Retired garments, then each is listed, with
   Bring back and Delete.

### Outfits

### WRD-014 — The Outfit builder

**As** Joe, **I want** to build outfits by tapping garments on the
Wardrobe tab, **so that** making outfits is quick.
Priority: Must · Status: verified (`wardrobe-outfits.spec.ts`)

Acceptance criteria
1. Given Build outfit, then the Wardrobe tab enters the builder: each card
   shows a "+", and pressing anywhere on a card adds it; a card in the
   builder shows a tick, and pressed again comes out (Joe, 18 November;
   the second press suggested). Search, filters, sort and group still work.
2. Given a computer, then the builder is a pane fixed on the right (Joe,
   18 November); given a phone, then it is a tray along the bottom: the
   chosen garments small, how many and Save, pulled up to show it all
   (suggested).
3. Given the builder, then it shows the garments chosen as lines, in my
   categories' order, each with a remove (no picture of them together,
   which took the room: Joe, 20 November); Collections (My Outfits always, fixed; any of
   mine added); an optional name; Save outfit; Clear; and Clear after
   saving, a switch kept for next time (Joe, 18 November).
4. Given Save outfit with one or more garments, then the outfit is made in
   My Outfits and the collections chosen, saying so with Open (a toast has
   one action; a mistake is deleted from its popup, with Undo);
   with Clear after saving on, the builder empties, and off, it keeps the
   garments to vary them for the next outfit.
5. Given the same garments as an existing outfit, then Save says so, with
   Open, and makes nothing (suggested).
6. Given I leave the page or close the app, then what's in the builder is
   there when I come back (suggested). Done leaves the mode.

### WRD-015 — New outfit from the Outfits tab

**As** Joe, **I want** to make an outfit from the Outfits tab, **so that**
I needn't go back to the Wardrobe tab.
Priority: Must · Status: verified (`wardrobe-outfits.spec.ts`)

Acceptance criteria
1. Given New outfit, then a popup opens with my garments as small cards,
   a search and the Category filter as pills, and the outfit being made
   (Joe, 18 November): its garments, collections (the collection being
   viewed already chosen; suggested) and an optional name.
2. Given Save, then it is made as WRD-014 4 and 5 say, and opens.

### WRD-016 — The Outfits tab

**As** Joe, **I want** my outfits as cards, by collection, **so that** I
can see what I can wear.
Priority: Must · Status: verified (`wardrobe-outfits.spec.ts`); sort by worn built

Acceptance criteria
1. Given the Outfits tab, then the collection chosen in the Collection
   menu (My Outfits first, then mine in my order; kept for next time) shows
   its outfits as cards in a grid (Joe, 18 November).
2. Given a card, then it shows the outfit's garments' photos together, in
   my categories' order (up to four, then "+2"), and its name if it has
   one.
3. Given the search, then outfits match on their name and on what their
   garments match on (WRD-004) (suggested).
4. Given Sort, then recently added, last worn or times worn (suggested),
   either way round, kept.

### WRD-017 — An outfit's popup

**As** Joe, **I want** an outfit to open read-only, **so that** I see it
whole and change it only when I mean to.
Priority: Must · Status: verified (`wardrobe-outfits.spec.ts`, `wardrobe-week.spec.ts`)

Acceptance criteria
1. Given a card pressed, then the outfit opens in a popup, read-only: its
   garments as cards (each opening its own popup), its name, its
   collections, last worn and times worn.
2. Given Edit, then I add and remove garments (with the picker of WRD-015),
   rename it and change its collections. Days already gone keep what they
   had (ADR-0013).
3. Given Add to Planned Outfits, then it goes to the Planned Outfits pane (WRD-021),
   quietly, the button then saying "In Planned outfits". Given it opened
   from a day, then there's no such button: its "…" has Return to Planned
   outfits, taking it off the day and back into the pane (Joe, 20
   November).
4. Given "…" in My Outfits, then Delete, with Undo; its garments stay
   (Joe, 18 November). Given "…" in my own collection, then Remove from
   this collection, and no Delete (Joe, 18 November).

### WRD-018 — Collections

**As** Joe, **I want** to group outfits into collections, **so that** a
trip's outfits are together.
Priority: Must · Status: verified (`wardrobe-outfits.spec.ts`); 3 by the database tests

Acceptance criteria
1. Given any outfit, then it is in My Outfits, which can't be renamed,
   deleted or removed from (Joe, 18 November).
2. Given my own collections (made in Settings, WRD-028), then an outfit is
   in any number of them, chosen when it's made (WRD-014, WRD-015) or
   later (WRD-017, WRD-019).
3. Given a collection deleted in Settings, then its outfits stay in My
   Outfits and any others they're in.

### WRD-019 — Many outfits at once

**As** Joe, **I want** to select several outfits, **so that** I can file,
plan or tidy them together.
Priority: Must · Status: verified (`wardrobe-outfits.spec.ts`)

Acceptance criteria
1. Given Select (or a long press on a phone) on the Outfits tab, then I
   pick several outfits.
2. Given My Outfits, then Delete (their garments stay; with Undo), Add to
   collection, and Add to Planned Outfits (Joe, 18 November; Add to collection
   suggested).
3. Given one of my collections, then Remove from collection, Add to
   collection and Add to Planned Outfits; no Delete (Joe, 18 November).
4. Given Add to Planned Outfits, then they go to the Planned Outfits pane,
   beside them on the Outfits tab and on the Week tab, quietly, as the pane
   is in view (Joe, 20 November).

### Week

### WRD-020 — The week

**As** Joe, **I want** a week of what I'll wear beside the weather, **so
that** I plan clothes around it.
Priority: Must · Status: verified (`wardrobe-week.spec.ts`)

Acceptance criteria
1. Given the Week tab on a computer, then Monday to Sunday show as columns,
   as the Meal plan's week (MPL-001); given a phone, then the days are
   stacked, today's first in view.
2. Given ‹, ›, Today or a date, then that week shows.
3. Given each day, then its weather is at its head (WRD-025), then its
   outfits, each one's garments as their own cards in the Type's tint, then
   its single garments, each tile the size of an outfit's (Joe, 18 and 20
   November). On a computer every day is as wide as the others and as tall
   as an outfit of three garments, taller only when it needs to be; on a
   phone a day's outfits and garments share a line while they fit (Joe, 20
   November).
4. Given a day gone, then it is quieter, its garments counted as worn
   (WRD-024).

### WRD-021 — The Planned Outfits pane

**As** Joe, **I want** outfits I've picked waiting beside the week, **so
that** I drag each onto its day.
Priority: Must · Status: verified (`wardrobe-outfits.spec.ts`, `wardrobe-week.spec.ts`)

Acceptance criteria
1. Given outfits sent with Add to Planned Outfits, then they wait in the
   Planned Outfits pane (Joe, 18 November), styled as the Outfit builder
   is, newest last, each removable, with Clear; the pane is kept until I
   clear it (suggested).
2. Given the Outfits tab or the Week tab, then the pane is on the right on
   a computer, and the tray on a phone, the same on both tabs (Joe, 18
   November).
3. Given the Week tab, when I drag an outfit onto a day, then it is
   planned for that day and leaves the pane (leaving suggested); on a
   phone I hold it in the tray first, the tray steps aside, its picture
   follows my finger, the day under it is marked and the page scrolls at
   its top and foot (Joe, 20 November).
4. Given the pane, then it is the planned outfits only, with no Garments
   search (Joe, 20 November); a single garment is added with a day's "+"
   (WRD-022 1).
5. Given a phone, on the Week tab, I tap an outfit in the tray instead,
   then press a day (each day showing "Place here"), and it is planned
   there (suggested).
6. Given a day's outfit dragged onto the pane (on a phone, onto the tray),
   then it leaves the day and is back in the pane, quietly (Joe, 20
   November).

### WRD-022 — A day's outfits and garments

**As** Joe, **I want** to change a day's clothes easily, **so that** the
plan follows what the week brings.
Priority: Must · Status: verified (`wardrobe-week.spec.ts`)

Acceptance criteria
1. Given a day's "+", then I add an outfit or a single garment from a
   picker with search (suggested).
2. Given a planned outfit or single garment, when I drag it to another day
   by any part of it, its pictures too (on a phone, held first, or Move
   to… a day), then it moves, its picture following the pointer as a card
   on Week does, with Week's cursor, quietly (suggested; Joe, 20 and 22
   November).
3. Given a planned outfit or garment, then Remove takes it off the day,
   with Undo.
4. Given a garment of a planned outfit, then Remove from this day takes it
   off that day only; the outfit itself is unchanged (suggested,
   ADR-0013).
5. Given a day's outfit pressed, then the outfit's popup opens (WRD-017).

### WRD-023 — Create outfit from a day

**As** Joe, **I want** a day's single garments to become an outfit, **so
that** a combination I tried is kept.
Priority: Should · Status: agreed; 1 verified (`wardrobe-week.spec.ts`); 2 (choosing which) not yet built

Acceptance criteria
1. Given a day with two or more single garments, then Create outfit makes
   an outfit of them in My Outfits, and on the day they join into its group
   (Joe, 18 November), quietly; WRD-014 5's check applies.
2. Given Select on that day (suggested), then I choose which of its single
   garments go into the outfit.

### WRD-024 — Worn, worked out

**As** Joe, **I want** what I planned to count as worn once the day has
gone, **so that** I see what I wear and what I don't, without ticking
anything.
Priority: Should · Status: verified (`wardrobe-week.spec.ts`)

Acceptance criteria
1. Given a planned day has passed, then every outfit and garment on it
   counts as worn on that day (Joe, 18 November); one I removed from the
   day doesn't.
2. Given a garment or outfit, then its last worn and times worn are shown
   in its popup, and sort by them is offered (WRD-003, WRD-016).
3. Given a past day changed, then the counts follow.

### WRD-025 — The weather

**As** Joe, **I want** each day's forecast on the Week tab, **so that** I
plan for rain and cold.
Priority: Must · Status: verified (`wardrobe-week.spec.ts`); 3 built (the forecast kept with the device's cache)

Acceptance criteria
1. Given a location in Settings → Wardrobe, then each day from today to the
   forecast's end (16 days, Open-Meteo; suggested) shows an icon (sun,
   cloud, rain, snow…), its high and low in °C, and the chance of rain
   when it's 20% or more (suggested); the icon in the sky's colour and the
   high bold, so it reads at a glance (Joe, 20 November).
2. Given a day gone, or past the forecast, then no weather shows.
3. Given no signal, then the last forecast fetched shows, saying when it's
   from; one older than a day isn't shown (suggested).
4. Given no location set, then the Week tab says so once, with Set
   location.
5. Given the weather service fails, then the week shows as usual, without
   weather, and nothing else is affected.

### Everywhere

### WRD-026 — Outfits on Today and Week

**As** Joe, **I want** one card for the day's clothes on Today and Week,
**so that** they don't fill the day.
Priority: Must · Status: verified (`wardrobe-everywhere.spec.ts`); the Today widget shows the same card, named the same (TDY-006)

Acceptance criteria
1. Given a day with outfits or garments planned, then Today and Week show
   one orange card for that day (Joe, 18 November), with the garments'
   photos small: an outfit's name, else "Outfit · 4 garments", "2 outfits"
   or "3 garments".
2. Given the card pressed, then a popup shows the day's weather, outfits
   (each its garments joined) and single garments, and Open in Wardrobe,
   which opens the Week tab on that week.
3. Given Week's filter by Type, then Outfits is one of its choices
   ([week](../views/week.md)).

### WRD-027 — Wardrobe offline and in Search

**As** Joe, **I want** my wardrobe there without signal and in Search,
**so that** I can plan anywhere.
Priority: Must · Status: verified (`wardrobe-everywhere.spec.ts`); a photo seen before is kept by the app's service worker (ADR-0052)

Acceptance criteria
1. Given no signal, then every tab opens with the photos I've seen before,
   and changes, new garments and their photos included (WRD-005 6), are
   sent later.
2. Given Search, then garments are found by their title and what WRD-004
   matches, and outfits by their name.

### WRD-028 — Settings for the Wardrobe

**As** Joe, **I want** my lists in Settings, **so that** the Wardrobe
follows how I organise my clothes.
Priority: Must · Status: verified (`wardrobe-settings.spec.ts`)

Acceptance criteria
1. Given Settings → Wardrobe, then Categories, Sizes, Brands, Fits, Tags,
   Colours and Collections, each saying how many garments (or outfits)
   use each entry (Joe, 18 November).
2. Given Categories, Sizes and Collections, then I add, rename and delete
   entries and drag them into order by their handle, on a phone too (Joe,
   18 November; Collections' order suggested); My Outfits is first and
   fixed.
3. Given Brands, Fits and Tags, then I add, rename, merge and delete them,
   as Recipe lists are (RCP-018 1).
4. Given Colours, then each shows its swatch and name (Joe, 18 November);
   I rename one, change its swatch with a colour picker, merge two (one
   colour's garments taking the other's), and delete one no garment uses
   (suggested).
5. Given an entry in use, then it can't be deleted until nothing uses it,
   but can be merged into another (suggested, as RCP-018 1); a Collection
   can always be deleted (WRD-018 3).
6. Given Weather location, then I search a place by name and choose it
   (WRD-025).
7. Given Retired garments, then they open (WRD-013 3).

Non-goals: see [Not wanted](#not-wanted).

## Changes to agreed documents

Made in step 2 (18 November), with ADR-0066–0068: Garment's states (no
Wishlist: a wishlist of clothes will be Shopping's) and not Capturable;
no `url` or `price`; the lists, tags and collections as Wardrobe's own
reference data (settling ADR-0014's Wardrobe point); Outfit worn several a
day, holding single garments, worn worked out, drawn as one card a day on
Today and Week (ADR-0029, [today](../views/today.md),
[week](../views/week.md#wek-003--outfits-on-week)); *worn to* removed;
v1's URL import no longer to port (ADR-0002); Weather a Stage 6
Integration ([integrations](../cross-cutting/integrations.md)); the colour
Swatch the one exception to colour by Type (ADR-0043,
[patterns](../../30-design/patterns.md#colour-by-type)). Wardrobe left
the drawer's "Later"
([ADR-0026](../../20-architecture/adr/0026-navigation-drawer.md)) when its
page was built (plan step 7, 19 November).

## Open points for Joe

All settled (Joe, 18 November):

1. ~~The tab's name~~: **Week**.
2. ~~Claude's suggestions~~: agreed.
3. ~~Sizes~~: one list for every category.
4. ~~Background removal~~: none.
5. ~~v1's colour algorithm~~: written afresh.
