# ADR-0043: Colour by Type

**Status:** Provisionally agreed · 2026-10-10

## Context

[ADR-0041](0041-visual-direction.md) made colour mean Module and kept the
core grey, so Tasks, Events, Thoughts and Notes — most of what Joe sees in
Stage 2 and 3 — had no colour at all. Reading the Stage 2 specs, Joe wanted
colour to tell Types and screens apart more strongly, and the core to have
colours of its own.

## Decision

- **Every Type has a colour**, shared by related Types:

  | Colour | Types | Pages |
  |---|---|---|
  | **Blue** | Task, Event | Tasks |
  | **Yellow** | Thought, Note, List, Shop | Notes, Shopping |
  | **Coral** | Exercise, Workout template, Workout, Cardio activity | Gym, Cardio |
  | **Green** | Recipe, Variation, Meal, Ingredient | Recipes, Meal plan |
  | **Orange** | Garment, Outfit, Outfit worn | Wardrobe |
  | **Purple** | Goal | Goals |
  | *Chosen in Stage 9* | Account | Finance |

- **A page takes the colour of the Types it is about.** Pages that mix Types
  — **Inbox and Plan** — are neutral, as are Screens that aren't about one
  Type (Search, Settings). Every Item shows its Type's colour wherever it
  appears.
- **Red and green keep their usual meaning** (overdue, delete, error; saved,
  done), and a state is **never shown by colour alone**: it also has a word or
  an icon, so it can't be mistaken for Gym's coral or Recipes' green.
- **No Module name at the top of a page**: the page's title and colour say
  where you are.
- Everything else in [ADR-0041](0041-visual-direction.md) stands.

## Consequences

- Amends [ADR-0041](0041-visual-direction.md) (what colour means) and the
  [design system](../../30-design/README.md). The exact colours are designed
  with Joe in Stage 2 ([plan](../../50-progress/plans/stage-2.md), step 3),
  and the tokens, components and theme change together then; until that
  lands, the design system describes the code as it is.
- The design system's Module-colour components and tokens are renamed for
  Types when they change.
- A new Type joins an existing colour where it belongs with those Types;
  only a new family of Types gets a new colour.
