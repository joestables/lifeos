# ADR-0011: Recipe and Variation; cooking with or without a Meal

**Status:** Accepted · 2026-10-09

## Context

v1's Recipes spec: *the Recipe is the dish and the Variation is the way you
make it.* A draft that made each variation a full Recipe was withdrawn: it
lost the dish, so the Recipes grid would have shown one card per variation.

## Decision

- **Recipe and Variation are two Types.**
  - **Recipe** (the dish): what identifies it in a grid — name, photo,
    cuisine and other facets, and each person's star. Status *idea* or
    *active*; *idea* is v1's *backlog*.
  - **Variation** (the way you make it): ingredient lines, method steps,
    servings, times, sources, notes, and the cook log. Every Recipe has at
    least one, linked by *variation of*; the interface hides the Variation
    level while there is only one.
  - A new Variation copies its lines and method from the one it starts from,
    then is edited freely. "What differs" is calculated for display, not
    stored.
- **A Meal uses a Variation**, with its own servings; quantities scale by
  meal servings ÷ variation servings.
- **Cooking is logged on the Variation, with or without a Meal.**
  - Every cook is a **cook log entry** (child row: who, when, rating, notes,
    optional pointer to the Meal it was for).
  - **Cook it now** (from the Recipe) writes a log entry and nothing else.
  - **Ticking a Meal done** writes a log entry pointing at the Meal.
  - The Variation's state is **calculated from its log**: *untried*,
    *attempted*, *final* (marked by you).

## Consequences

- Measures such as `food.new_recipes_cooked` read the log, so a quick cook
  still counts towards a goal.
