# ADR-0017: Enforcing visibility

**Status:** Provisionally agreed · 2026-10-09

**Amended:** 2026-10-09 by [ADR-0039](0039-accounts-contacts-households.md) (joining); 2026-10-09 by the Stage 1 core schema (`can_read` moved to `core_private`); 2026-10-10 by the `can_read` benchmark (policies use the rule as sets); 2026-10-18 by [ADR-0051](0051-who-sees-food.md) (the rule gains Recipes seen through their author's Household).

## Context

[ADR-0016](0016-sharing-and-visibility.md) sets the visibility rule. It must
hold in every Module, for detail tables and child rows, for goal progress,
and for AI.

## Decision

- **One rule, in `core_private`** — a schema the API can't reach, so none of
  it can be called as an endpoint. Policies use it as a set worked out once
  per query: `item_id in (select core_private.readable_item_ids())`, on
  detail tables and child rows alike (`linked_item_ids()` is its one-hop
  half). `core_private.can_read(item_id)` answers for a single Item. The
  links table is indexed for it.
- **Benchmarked in Stage 1** on seeded data: a week of Plan and every live
  Item each take a few milliseconds
  ([non-functional](../../10-requirements/non-functional.md#performance)).
  Checking per row was 30–90 times slower, hence the sets. If it grows slow
  again, a visibility table kept by triggers replaces the lookup.
- **Goal progress is read through the goal:** `goals.progress(goal_id)`, a
  security-definer function that checks `can_read` on the goal and returns
  only the figure. Measures can't be called from the API.
- **The edges of the rule:**
  - Only an Item's owner can link it to a shared Item, because the link
    exposes it.
  - A child row is readable when its Item is. A pointer from it to an Item
    the reader can't read shows as "private", with no title.
  - Snapshots copy values, not other Items: through one hop the Household
    sees "Olive knit · 3 garments", not the garments.
- **Joining** a Household is set by
  [ADR-0039](0039-accounts-contacts-households.md): the owner's invitation
  by email, accepted.

## Consequences

The same rules bound what an AI may see for each person.
