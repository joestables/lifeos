# ADR-0026: The navigation drawer

**Status:** Provisionally agreed · 2026-10-09

**Amended:** 2026-10-09 by [ADR-0032](0032-delete-means-archive.md) (recovery in Settings).

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
| **Notes** | Notes, **Lists and Ideas** together. |
| **Recipes** | Recipes, their Variations and cooking. |
| **Gym** | Workouts and templates. |
| **Goals** | Goals, measured from the rest of the app. |
| **Wardrobe** | Garments and outfits. |
| **Cardio** | *Later.* |
| **Finance** | *Later.* |

- **No Trash page and no Timeline** in the drawer, for now. Deleted Items are
  recovered from Settings ([ADR-0032](0032-delete-means-archive.md)).
- **Search** and **Settings** are reached from the drawer header, not listed
  as pages.
- **Deliberately not decided here:** what each page shows, its tabs,
  layouts, filters and Screens. Those are written in the page's spec at the
  start of its stage.

## Consequences

Anything said elsewhere about a page's contents is a candidate requirement
for its spec, not a design.
