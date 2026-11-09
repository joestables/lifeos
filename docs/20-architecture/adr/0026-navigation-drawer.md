# ADR-0026: The navigation drawer

**Status:** Provisionally agreed · 2026-10-09

**Amended:** 2026-10-09 by [ADR-0032](0032-delete-means-archive.md) (recovery in Settings); 2026-11-09 by [ADR-0065](0065-reminders-alerts-and-the-day.md) (the drawer opens on Today, then Week and Plan; Inbox becomes Today, Plan Week, Tasks Plan; Stage 7b, as it is built).
2026-10-11 by the Stage 2 design agreed with Joe (Settings from your row);
2026-10-17 by Joe's brief for [Stage 4](../../50-progress/plans/stage-4.md)
(Recipes, Meal plan and Shopping as three pages; Cardio moves up beside
Gym, a blank page until Stage 8).

## Context

The pages are Views over one graph, so the navigation lists Views. A mockup
canvas was produced on 8 October; its visual design was not liked (expected
at that stage).

## Decision

A collapsible drawer (no bottom bar) with these pages, in this order:

| Page | In one line |
|---|---|
| **Inbox** | One feed of what needs you, drawn from everything — not dashboard cards. |
| **Plan** | The one place to plan meals, outfits, shops, gym, cardio, events and tasks. |
| **Tasks** | Tasks and their Reminders. |
| **Notes** | Notes. |
| **Gym** | Workouts and templates. |
| **Cardio** | Cardio activities. *A blank page until Stage 8.* |
| **Recipes** | The recipe library and saved ideas, with their Variations and cooking. |
| **Meal plan** | Where meals are planned, and the Pantry of ingredients and household items. |
| **Shopping** | Food shops (made by hand, or from the meal plan with more added), other shopping lists, and later Online. |
| **Goals** | Goals, measured from the rest of the app. |
| **Wardrobe** | Garments and outfits. |
| **Finance** | *Later.* |

- A page joins the drawer when its stage builds it (Meal plan and Shopping
  with Stage 4); Cardio is there already, empty.
- **No Trash page and no Timeline** in the drawer, for now. Deleted Items are
  recovered from Settings ([ADR-0032](0032-delete-means-archive.md)).
- **Search** is reached from the drawer header and **Settings** from your
  row at its foot, not listed as pages.
- **Deliberately not decided here:** what each page shows, its tabs,
  layouts, filters and Screens. Those are written in the page's spec at the
  start of its stage.

## Consequences

Anything said elsewhere about a page's contents is a candidate requirement
for its spec, not a design.
