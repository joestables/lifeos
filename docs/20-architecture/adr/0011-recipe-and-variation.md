# ADR-0011: Recipe and Variation; cooking with or without a Meal

**Status:** Provisionally agreed · 2026-10-09

**Amended:** 2026-10-17 by Joe's notes for the [Recipes spec](../../10-requirements/modules/recipes.md) (states set on each Variation; a cook keeps a snapshot); 2026-10-18 by Joe's comments on the Stage 4 specs (ticking a Meal eaten logs no cook) and [ADR-0051](0051-who-sees-food.md) (a Household member may add their own Variation to another's Recipe).

## Context

v1's Recipes spec: *the Recipe is the dish and the Variation is the way you
make it.* A draft that made each variation a full Recipe was withdrawn: it
lost the dish, so the Recipes grid would have shown one card per variation.

## Decision

- **Recipe and Variation are two Types.**
  - **Recipe** (the dish): what identifies it in a grid — name, photo,
    category, cuisine, tags, protein and carbs, and each person's favourite.
    Its state is the highest of its Variations' (below).
  - **Variation** (the way you make it): ingredient lines, method steps,
    servings, times, sources, notes, and the cook log. Every Recipe has at
    least one, linked by *variation of*; the interface hides the Variation
    level while there is only one.
  - A new Variation copies its lines and method from the one it starts from,
    then is edited freely. "What differs" is calculated for display, not
    stored.
- **A Meal uses a Variation**, with its own servings; quantities scale by
  meal servings ÷ variation servings.
- **Cooking is logged on the Variation.**
  - Every cook is a **cook log entry** (child row: who, when, rating, notes,
    optional pointer to the Meal it was for).
  - **Cook it now** (from the Recipe) writes a log entry and nothing else.
  - **Ticking a Meal eaten logs no cook** (Joe, 18 October): a cook comes
    from Cooking, with its verdict and snapshot.
  - **Each Variation's state is set by hand:** Idea → Draft → Complete, or
    Archived. The Recipe's is worked out: the highest of its Variations'
    that aren't archived, and Archived only when all are.
  - **A cook log entry keeps a snapshot** of the Variation as cooked
    ([ADR-0013](0013-occurrences-snapshot-their-definition.md)), so its
    verdict and notes are read against what was made.

## Consequences

- Measures such as `food.new_recipes_cooked` read the log, so a quick cook
  still counts towards a goal.
