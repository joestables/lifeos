# ADR-0053: Quantities and units

**Status:** Proposed · 2026-10-18

## Context

Ingredient lines are an amount, a unit and an ingredient, with ranges and
approximate amounts; Cooking scales them; shopping lists total them and
protect what the Meals need ([recipes](../../10-requirements/modules/recipes.md),
[meals](../../10-requirements/modules/meals.md)). The same arithmetic must
work offline on the device and be checked in the database.

## Decision

- **A line keeps what was typed:** an amount, an optional top of a range,
  an *approximate* flag, and one unit — g, kg, ml, l, tsp, tbsp, or none (a
  count, or unmeasured). Nothing is stored converted.
- **One package, `packages/food`,** holds the only conversion factors
  (kg = 1000 g; l = 1000 ml; tsp = 5 ml; tbsp = 15 ml), the parser ("200 g
  chorizo", "1-2 tsp", "~5 g", "½" as 0.5), scaling (both ends of a range),
  display rounding, totals, and the timer parser for Cooking
  ([ADR-0056](0056-cooking-on-the-device.md)). Pure TypeScript with unit
  tests, used by the app offline and by Edge Functions.
- **Totals** add within a kind (weight, or volume), shown in the larger unit
  once it reads better (1.5 kg); weight and volume sit side by side; a range
  counts as its top; approximate carries into the total; an unmeasured line
  on a measured one shows "+".
- **The database checks one thing:** that a Meal's line isn't lowered below
  what the Meals need. Its SQL function uses the same factors, and one table
  of cases is run by both the unit tests and the database tests, so the two
  can't drift.
- **Display rounding:** whole grams and millilitres up to 100, then to 5;
  kg and l to two decimals; spoons to quarters; counts to halves; never
  rounded to nothing.

## Consequences

- Adding a unit is a change to `packages/food`, its case table and the
  enum, in one pull request.
- No weight ↔ volume conversion, no imperial units stored: an import
  converts imperial amounts to metric before they reach a line
  ([ADR-0054](0054-the-ai-service-and-import.md)).
