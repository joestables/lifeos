# Plan

*Stage 3. Spec not yet written; what the page shows, its tabs, layouts and
filters are decided here at the start of the stage. Below: the decisions it
builds on.*

**In one line:** the one place to plan meals, outfits, shops, gym, cardio,
events and tasks ([ADR-0026](../../20-architecture/adr/0026-navigation-drawer.md),
  Provisionally agreed).

## Inputs so far

- **Plan is a query**: Schedulable Items in a date range. Nothing links to
  Plan ([ADR-0005](../../20-architecture/adr/0005-traits-links-rules.md),
  Provisionally agreed).
- **Plan reads `core.items`**; Modules may only enrich how their Items look
  ([ADR-0029](../../20-architecture/adr/0029-plan-reads-core-items.md),
  Provisionally agreed).
- An Item shows on the first of `starts_at` (as a local date), `do_on`,
  `due_on` that it has. A Task with only a deadline shows on its due date. A
  Goal is not on Plan ([data model](../../20-architecture/data-model.md#time-fields-per-schedulable-type)).
- Meals use fixed slots: breakfast, lunch, dinner, snack.
- The standard time fields hold the plan; detail tables hold what happened,
  enabling planned-vs-done ([ADR-0021](../../20-architecture/adr/0021-time.md)).
- Planning is mostly creating occurrences of definitions, and the action
  creates the link (planning a recipe for Thursday creates the Meal and its
  *uses* link).
- Later: readiness-aware gym suggestions; "plan my week"
  ([roadmap](../../roadmap.md#later-opportunities)).
