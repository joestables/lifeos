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
waits on Joe's agreement.

## Steps

Steps marked **Joe** need Joe's go-ahead or action before Claude does them.
Every step that builds a screen follows the [design system](../../30-design/README.md)
checklist and brings its own Playwright walks, citing the requirements it
verifies, against a stand-in for Supabase.

| # | Step | State | Produces |
|---|---|---|---|
| 1 | **Joe** — specs: garments and their lists, adding a garment on a phone, colour from the photo, filters, sort, group and search, Select, retiring; outfits, the Outfit builder and collections; the Week tab, the Planned Outfits pane, worn worked out, the weather; Today and Week; Settings → Wardrobe | First draft 18 November, from Joe's notes and his answers (several outfits a day; Retire or Delete; worn worked out; one colour), Claude's suggestions marked, five open points; second draft the same day with Joe's comments, the suggestions and open points settled | [wardrobe](../../10-requirements/modules/wardrobe.md) (WRD-*) |
| 2 | Decisions: how the wardrobe is held in the database (Garment and Outfit as Personal Items, the lists as reference data, colours as named swatches, collections, Outfit worn several a day and holding single garments, worn worked out, the snapshot); the weather Integration (Open-Meteo, fetched on the device or by an Edge Function, cached); the camera on the Android app; the colour swatch's exception to ADR-0043; and every [change the spec lists](../../10-requirements/modules/wardrobe.md#changes-to-agreed-documents) | — | ADR(s); data model, ADR-0013, ADR-0014, ADR-0026, ADR-0029, ADR-0043, integrations, Today and Week brought into line |
| 3 | **Joe** — design, with Claude design: the Wardrobe tab and its filters; the add sheet on a phone, the colour suggestions and the loupe; a garment's popup; the Outfit builder's pane and the phone's tray; outfit cards; the Week tab, a day's joined garments, the weather at a day's head and the Planned Outfits pane; the day's card on Today and Week; Settings → Wardrobe. Into the design spec first (the swatch, the builder, the tray, the joined group and the weather are new), then the shared components | — | Design spec, components, screenshot tests |
| 4 | Schema: the `wardrobe` Module in the ontology; detail tables, reference data and their write functions; the activity log; the generated data model; database tests | — | Migration, tests, advisors |
| 5 | `packages/wardrobe`: the dominant colour (OKLab clusters, the background from the edges, the centre weighted), the distance between colours and the suggestions, the colour names, and a new colour suggested when none of mine is close; unit tests over a set of test photos | — | Package, tests |
| 6 | Settings → Wardrobe: the lists, dragged into order; colours; collections; the weather location; Retired garments (every list starts empty) | — | Screens, walks |
| 7 | Garments: the Wardrobe tab (cards, filters, sort, group, search), adding (the camera, the sheet, colours, brands, fits and tags inline, Add another, offline), a garment's popup, Select, Retire | — | Screens, walks |
| 8 | Outfits: the Outfit builder (pane and tray), the Outfits tab, New outfit, an outfit's popup, collections, Select, the Planned Outfits pane | — | Screens, walks |
| 9 | Week: the week, dragging from the Planned Outfits pane and placing, a day's outfits and garments, Create outfit, worn worked out; the weather | — | Screens, walks |
| 10 | Everywhere: the day's card on Today and Week; Search; offline | — | Screens, walks |
| 11 | **Joe** — photographs his wardrobe and plans a week; what he trips over is fixed | — | Fixes |

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
