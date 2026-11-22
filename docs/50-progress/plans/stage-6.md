# Plan: Stage 6 — Wardrobe

**Outcome** ([roadmap](../../roadmap.md)): Joe keeps every garment he owns
in LifeOS, makes outfits from them and plans what he'll wear around the
weather. **Wardrobe** has three tabs: **Wardrobe**, the garments as photo
cards, presented as Recipes are, with the Outfit builder; **Outfits**, by
collection; and **Week**, the week with each day's forecast; the Planned
Outfits pane is on both Outfits and Week. Adding a garment on a phone is a photo and a few taps, its
colour suggested from the photo. A day's clothes are one card on Today and
Week.

**State:** started 18 November 2026, at Joe's asking, while Stage 7b's
step 11 (Joe using it) is in hand ([its plan](stage-7b.md)). Step 1's
first draft is written from Joe's notes and his four answers of the same
day; the second, the same day, with his comments and his answers to its
open points ([below](#joes-comments-on-the-first-draft-18-november)),
Joe agreed on 18 November. Step 2's decisions, ADR-0066–0068, are written
and agreed (18 November); step 3's design is on the
[Wardrobe design canvas](https://claude.ai/artifact/6b8SnjL1sUCVGXZ7qA312H),
as Joe chose it (19 November). Step 4, the schema, is in the database
(19 November), step 5, `packages/wardrobe`, is done, and step 6,
Settings → Wardrobe, step 7, Garments, step 8, Outfits, and step 9, the
Week, and step 10, Everywhere, are built (19 and 20 November); step 11,
Joe's own use, is under way, four rounds of fixes made (20 and 22 November).

## Steps

Steps marked **Joe** need Joe's go-ahead or action before Claude does them.
Every step that builds a screen follows the [design system](../../30-design/README.md)
checklist and brings its own Playwright walks, citing the requirements it
verifies, against a stand-in for Supabase.

| # | Step | State | Produces |
|---|---|---|---|
| 1 | **Joe** — specs: garments and their lists, adding a garment on a phone, colour from the photo, filters, sort, group and search, Select, retiring; outfits, the Outfit builder and collections; the Week tab, the Planned Outfits pane, worn worked out, the weather; Today and Week; Settings → Wardrobe | First draft 18 November, from Joe's notes and his answers (several outfits a day; Retire or Delete; worn worked out; one colour), Claude's suggestions marked, five open points; second draft the same day with Joe's comments, the suggestions and open points settled; agreed by Joe 18 November. **Done** | [wardrobe](../../10-requirements/modules/wardrobe.md) (WRD-*) |
| 2 | Decisions: how the wardrobe is held in the database (Garment and Outfit as Personal Items, the lists as reference data, colours as named swatches, collections, Outfit worn several a day and holding single garments, worn worked out, the snapshot); the weather Integration (Open-Meteo, fetched on the device or by an Edge Function, cached); the camera on the Android app; the colour swatch's exception to ADR-0043; and every [change the spec lists](../../10-requirements/modules/wardrobe.md#changes-to-agreed-documents) | Written 18 November: [ADR-0066](../../20-architecture/adr/0066-wardrobe-in-the-database.md) (Garment, Outfit and Outfit worn as Personal Items; Garment Owned or Retired, not Capturable, favourited, its title worked out; the lists each person's, none to begin with, by id, merged not deleted while in use; My Outfits not stored; the same outfit refused; Outfit worn several a day, a single garment one with no *wears*, garment ids as its snapshot, an outfit's change reaching days to come; worn worked out on the device; the Planned Outfits pane stored, the builder on the device; a garment's photo waiting on the device for signal; a day's Outfits worn one card on Today and Week), [ADR-0067](../../20-architecture/adr/0067-garment-colours.md) (the estimate on the device in OKLab, close and twin thresholds set against test photos, built-in names, hex stored; the Swatch the one exception to colour by Type) and [ADR-0068](../../20-architecture/adr/0068-weather.md) (Open-Meteo from the device, the place stored, the forecast cached, failing quietly), agreed by Joe 18 November. **Done**; the data model, ADR-0002, 0014, 0016, 0017, 0018, 0029, 0037, 0043, vision, integrations, patterns, Today and Week (WEK-003) brought into line. The camera on the Android app is checked in step 7 | ADR-0066, ADR-0067, ADR-0068; the documents they amend |
| 3 | **Joe** — design, with Claude design: the Wardrobe tab and its filters; the add sheet on a phone, the colour suggestions and the loupe; a garment's popup; the Outfit builder's pane and the phone's tray; outfit cards; the Week tab, a day's joined garments, the weather at a day's head and the Planned Outfits pane; the day's card on Today and Week; Settings → Wardrobe. Into the design spec first (the swatch, the builder, the tray, the joined group and the weather are new), then the shared components | First pass 18 November on the [Wardrobe design canvas](https://claude.ai/artifact/6b8SnjL1sUCVGXZ7qA312H) (private to Joe), drawn from the real components on `/design-stage-6` (development and preview builds only; `DESIGN_PAGE=design-stage-6 scripts/design-shots.mjs` takes its screenshots, `CHROMIUM=/opt/pw-browsers/chromium` in a cloud session), dark and light, computer and phone, with made-up clothes drawn as stand-in photos (`src/routes/-design-stage-6/art.ts`). Four choices for Joe: how an outfit is pictured (A mosaic, recommended; B flat lay, which needs each garment cut out of its photo, so reopens background removal); how an outfit sits on a day (A frame, recommended; B rail); the Outfit builder (A a list; B the outfit pictured, recommended); the phone's add sheet (A pills wrapping; B one line each, recommended: the whole sheet on one screen). The new components are in the design spec and `src/components/lifeos/Wardrobe.tsx`, marked as drawn for the design step; Week's day takes a forecast line (`subhead`). Joe chose 19 November: 1A the mosaic, 2B the rail (on a computer; a phone's day keeps its row), 3B the outfit pictured, 4A wrapping pills; drawn as chosen the same day, the other options removed from the page and the spec, the components on `/design` and its screenshot tests refreshed. **Done** | Design spec, components, screenshot tests |
| 4 | Schema: the `wardrobe` Module in the ontology; detail tables, reference data and their write functions; the activity log; the generated data model; database tests | Ontology: the `wardrobe` Module, Garment (Owned or Retired, favourited, not Capturable), Outfit and Outfit worn (schedulable on `do_on`, several a day), *wears* and *includes*. Migrations: `stage6_wardrobe_schema`, `stage6_wardrobe_rules`, `stage6_wardrobe_writes` (18 functions, each idempotent on its id) and `stage6_wardrobe_removing` (six removals and a trigger) ([as built](../../20-architecture/adr/0066-wardrobe-in-the-database.md#as-built-19-november-plan-step-4)). 54 database tests in `wardrobe_test`; `wardrobe` in the generated types and the local Data API. Applied to the project on 19 November with the draft pull request ([#96](https://github.com/joestables/lifeos/pull/96)), all five through the Supabase tool (the removals too), every function checked identical to its file; the advisors raise nothing new but the new tables' indexes not yet used. Joe exposes `wardrobe` in the Data API ([integration setup](../../40-operations/integration-setup.md)). **Done** | Migration, tests, advisors |
| 5 | `packages/wardrobe`: the dominant colour (OKLab clusters, the background from the edges, the centre weighted), the distance between colours and the suggestions, the colour names, and a new colour suggested when none of mine is close; unit tests over a set of test photos | 19 November. `packages/wardrobe`: the OKLab conversions; `estimateColour` (the background spread from the edges across soft light and shadow, the centre weighted, five clusters, shades counted together); `suggestColours` (within 0.06, closest first, four at most, else a new colour) and `nearTwin` (within 0.035); `nameColour` (45 names). 34 unit tests over generated photos ([as built](../../20-architecture/adr/0067-garment-colours.md#as-built-19-november-plan-step-5)). **Done** | Package, tests |
| 6 | Settings → Wardrobe: the lists, dragged into order; colours; collections; the weather location; Retired garments (every list starts empty) | 19 November. The data layer (`src/data/wardrobe*.ts`: the lists, garments' own fields, tags, collections and the weather's place, read and written through the queue, unsent writes laid over them); Settings' Wardrobe Card leading to **Lists and weather** (`/settings/wardrobe`: a Card per list, Categories, Sizes and Collections dragged by their handles, Merge into…, Delete with Undo or refused while in use, a colour's swatch from the device's colour picker and its name suggested, the weather's place found through Open-Meteo's geocoding) and **Retired garments** (Bring back, Delete). `merge_entry` made idempotent (migration `stage6_wardrobe_merge_again`, 56 database tests), applied to the project on 19 November with the draft pull request ([#98](https://github.com/joestables/lifeos/pull/98)), checked identical to its file; the advisors raise nothing new. 13 walks in `wardrobe-settings.spec.ts`, with stand-ins for the wardrobe schema and Open-Meteo. The drawer's Wardrobe stays under Later until step 7 builds its page. **Done** | Screens, walks |
| 7 | Garments: the Wardrobe tab (cards, filters, sort, group, search), adding (the camera, the sheet, colours, brands, fits and tags inline, Add another, offline), a garment's popup, Select, Retire | 19 November. The Wardrobe tab (`src/app/wardrobe-tab.tsx`): GarmentCards, the FilterPanel (Colour with its swatches), search, sort, group, S / M / L, kept on the device (`lib/wardrobe.ts`, its colours ordered by `compareColours` in `packages/wardrobe`); Select with Select all, Add tag, Remove tag, Retire and Delete. Adding: the live camera (`getUserMedia`, the torch as flash; "Choose a photo" without one), the photo's square (PhotoCrop), its colour read and my closest colours offered or a new one named, the GarmentSheet (sizes used with the category first, brands searched and made, fits and tags inline, an own name), the New colour dialog with the loupe or the colour picker, Add another carrying the category and size. The photo held on the device until there's signal ([ADR-0066, as built](../../20-architecture/adr/0066-wardrobe-in-the-database.md#as-built-19-november-plan-step-4)). A garment's popup (facts, Added; Edit, the heart, Retire, Delete with how many outfits it leaves). Wardrobe out of the drawer's Later. The camera on the Android app: the WebView's own, the app declaring `CAMERA` (app 0.1.16). 10 walks in `wardrobe.spec.ts`, the camera stood in by a canvas; unit tests for the view and overlays. The Outfits and Week tabs, worn and the popup's outfits come with steps 8–9. **Done** | Screens, walks |
| 8 | Outfits: the Outfit builder (pane and tray), the Outfits tab, New outfit, an outfit's popup, collections, Select, the Planned Outfits pane | 19 November. Outfits in the data layer (their garments by *includes*, collections, the pane, `sameOutfit`), every write through the queue. The Outfit builder on the Wardrobe tab (Build outfit; the pane on a computer, the tray on a phone; kept on the device, Clear after saving); the Outfits tab (a Collection Select, search, sort, Select with Select all, Add to Planned outfits, Add to collection, Delete or Remove from collection); New outfit and Edit outfit; an outfit's popup (Add to Planned outfits, Delete or Remove from its collection); the Planned outfits pane and tray (remove, Clear with Undo); a garment's popup showing the outfits it is in. A toast has one action: Outfit saved has Open, the rest Undo (WRD-014 4 and WRD-019 4 say so). The Fab rises above a Tray. 6 walks in `wardrobe-outfits.spec.ts`, unit tests for the overlays. Dragging from the pane onto days, its Garments search, and last worn and times worn come with step 9. **Done** | Screens, walks |
| 9 | Week: the week, dragging from the Planned Outfits pane and placing, a day's outfits and garments, Create outfit, worn worked out; the weather | 20 November. Days in the data layer (each Outfit worn, its garments its own snapshot, laid over as it's planned, moved, changed or made an outfit); worn worked out on the device from days gone, last worn and times worn on the popups and as sorts. The Week tab: Monday to Sunday, columns on a computer and days down a phone, each day's forecast, outfits joined and single garments; dragging from the Planned outfits pane (its Garments search too) and between days, on a phone choosing in the tray and Place here; a day's "+"; an outfit or garment opened from its day with the day's garments, Move to another day and Remove; Create outfit from a day's single garments. The forecast from Open-Meteo, kept with the device's cache ([ADR-0068, as built](../../20-architecture/adr/0068-weather.md)). 8 walks in `wardrobe-week.spec.ts`, unit tests for the days and the forecast. Choosing which single garments go into Create outfit (WRD-023 2) isn't built. Until step 10 a day's outfits show on Today and Week as ordinary rows. **Done** | Screens, walks |
| 10 | Everywhere: the day's card on Today and Week; Search; offline | 20 November. A day's Outfits worn are one card on Week (OutfitPlanCard) and one row on Today (its photos at its end, OutfitPhotos), named as WRD-026 says, opening a popup of the day's weather, outfits and garments with Open in Wardrobe; the Today widget's card the same, on the phone (`widgetDays`) and the server (migration `stage6_widget_clothes`, applied as `20261120084555`; the advisors: nothing new; `today_cards`). Outfit among Week's Types to show and a day's "+" (Wardrobe's Add to the day); the card dragged moves the whole day, with Undo. Search finds garments (their title and what Wardrobe's search matches, on the device) and outfits by name, opening them in Wardrobe, as an Item's link does. Offline, the tabs open from the device's cache, photos from the service worker. 6 walks in `wardrobe-everywhere.spec.ts`; unit tests for the day's card and the widget; database test `today_widget_clothes_test`. **Done** | Screens, walks |
| 11 | **Joe** — photographs his wardrobe and plans a week; what he trips over is fixed | Under way. First round, 20 November ([#103](https://github.com/joestables/lifeos/pull/103)): the camera made fast (the frame held in memory, not made a file, and the photo kept with one WebP made, at 1200px, not a PNG and up to twelve tries; the shutter took 20 seconds and Use photo 10 on Joe's phone); the camera's and crop's headers no longer cropped under the status bar; the sheet's "Needed" marks gone and its footer "Add a size…"; the phone's SelectionBar two to a row (three overflowed on Outfits); planning quiet, no toasts for placing, moving, adding to Planned outfits or a collection, or Create outfit; on a phone an outfit held in the Planned outfits tray and dragged onto a day (DragGhost, the tray stepping aside, the page scrolling), the tray its outfits only; a day's outfit tinted only as wide as it is, Create outfit at its garments' row's end; an outfit opened from a day without Add to Planned outfits or its garments twice, Return to Planned outfits in its "…". The bug hunt: the production logs, advisors and data had nothing of Stage 6's; a day's popup left open, switched to the whole outfit, once its last garment was taken off is closed; the Wardrobe tab's search squeezed to its icon on a computer takes a line of its own; the tray's overlapping photos showed a tint over a tint. Walks for the phone's drag and Return to Planned outfits. Second round, 20 November ([#104](https://github.com/joestables/lifeos/pull/104)): a garment refused because its new colour was named as one of Joe's ("Brown"), and everything after it held up behind a refusal retried as a server fault: a refusal a database function raises on purpose (P0) is no longer retried (OFF-004 3), a new colour named as one of mine is mine (WRD-006 3), and a refused garment's held photo is dropped; Use photo opens the sheet at once, with a small preview, the photo made while the sheet is filled in; the camera's video hidden until it plays, so Android's play button never shows. Third round, 20 November ([#105](https://github.com/joestables/lifeos/pull/105)): the crop starts on the camera frame's square, 1:1; the Outfit builder without its picture; Planned outfits without its Garments tab; the Week's days as wide as each other and as tall as a three-garment outfit, outfits tinted on a computer as on a phone, single garments' tiles as an outfit's, a phone's day's clothes on one line while they fit; a day's outfit dragged to another day or back into Planned outfits, quietly, a DragGhost following the pointer; the weather in the sky's colours, the high bold (tokens `--weather-*`, an exception to ADR-0043 at Joe's asking). Fourth round, 22 November ([#107](https://github.com/joestables/lifeos/pull/107)), across the app: Joe's nine (notes as "Add notes" above Space; a finished workout's end corrected; the Slider's thumbs within its track; an outfit dragged by any part, the browser's own drag and cursor on a computer as on Week; a phone's Meal plan's earlier days in one line; the progression chart's weights in multiples of the increment; a starred Task's star at the row's end; All workouts' To under From; Add a meal without categories) and a full UI review of every screen, its obvious finds fixed and the rest put to Joe | Fixes |

Each step's code goes into the specs' status as it lands (*built*, then
*verified* when a test citing the ID passes).

## Joe's brief (18 November)

Wardrobe stores all my clothes, so I can see what I own and plan outfits.
Three tabs: Wardrobe, Outfits and Plan. The Wardrobe tab is presented as
Recipes is. Each garment needs a Category, Brand, Size and Colour to be
saved; a Fit and Tags are optional. Categories and Sizes are made only in
Settings, each dragged into order; Brands, Tags and Fits are kept in
Settings and made inline too; colours are listed in Settings. Filters on
every characteristic and favourites, Category open, the rest collapsible;
sort by category, brand, size or recently added; group by category,
brand, size or colour; search across every characteristic. Adding is
nearly always on the phone and must be frictionless: a photo from the
camera, the app suggesting colours I already have that are close to the
garment's dominant colour, so there's one White, or a new colour picked
from the photo and named (the name suggested, as a bonus). Brand a search
that narrows as I type, with inline creation; Fit and Tags as pills, with
inline creation. A new garment opens read-only, with Add another. Select,
to delete and to add tags. Outfits as a card grid, made from a popup on
the Outfits tab or with the Outfit builder on the Wardrobe tab (a pane on
the right on a computer, a "+" on each card, a switch to clear it after
saving, no name required). Outfits in any number of collections, made in
Settings; My Outfits holds them all and can't be changed. Outfits are
deleted only from My Outfits, never their garments; in a collection, only
removed from it. Add to Plan sends outfits to a pane on the Plan tab, to
drag onto days. The Plan tab shows each day's weather (a location in
Settings); an outfit on a day shows its garments as cards joined
together; single garments can be added to a day, and Create outfit makes
an outfit of them. Today and Week show one card a day, opening the
outfit's garments.

## Joe's answers (18 November)

1. **A day can hold several outfits and single garments**; Today and Week
   still show one card for the day.
2. **Retire, or delete**: Retire hides a garment but keeps it in outfits
   and on past days, and can be undone; Delete is for mistakes.
3. **Worn is worked out**: a planned day counts as worn once it has passed,
   unless removed, giving last worn and times worn.
4. **One colour per garment, required.**

## Joe's comments on the first draft (18 November)

- **Every list starts empty**: no categories, sizes or anything else
  predefined.
- **A new colour is suggested** when none of mine is close: the estimate,
  named, to keep or change.
- **The Planned Outfits pane** (was "To plan") shows on both the Outfits
  and Week tabs, identical.
- **No wishlist** in Wardrobe: it will be part of Shopping, later.
- **What the draft left out of Stage 6** isn't wanted at all.
- **Select adds and removes tags.**
- Open points: the tab is **Week**; Claude's suggestions agreed; **one
  list of sizes** for every category; **no background removal**; the
  colour algorithm **written afresh**.

## Joe's choices on the design (19 November)

1. **A**, the mosaic: each garment's own photo as a tile.
2. **B**, the rail, on a computer: an outfit's garments in one column,
   joined by a line. A phone's day keeps its row.
3. **B**, the Outfit builder with the outfit pictured over its list.
4. **A**, the add sheet's pills wrapping.
