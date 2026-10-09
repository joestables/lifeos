# ADR-0005: Traits, Links and Rules

**Status:** Accepted · 2026-10-09

## Context

The starting point was IBM DOORS link modules ("gym session *progresses
towards* goal"). That is right for genuine relationships, but not everything
should be a link.

## Decision

Three mechanisms, not one:

1. **Traits — what an Item *is*:** Schedulable, Completable, Shareable,
   Capturable. **Views are queries over traits**, so "gym session *can be
   viewed on* Plan" is a query, not a link. There is no *Measurable* trait;
   the measures registry covers it.
2. **Links — how two specific Items relate.** Named in both directions, with
   rules about which Types each link type may connect.
3. **Rules — relationships that are calculated, not stored.** A goal holds a
   measurement rule; its contributing Items are whatever the rule finds.

**The action creates the link.** Planning a recipe for Thursday creates the
Meal *and* its *uses* link; starting a session from a template creates
*follows*. Converting a Note keeps the same Item, so no link is needed;
*became* is created only when a new Item is made from an old one. Linking by
hand is a power feature, never a chore.

## Consequences

- A new Type with the *Schedulable* trait appears on Plan with no extra work.
- Nobody links sessions to goals by hand.
