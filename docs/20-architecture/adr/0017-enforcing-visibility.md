# ADR-0017: Enforcing visibility

**Status:** Provisionally agreed · 2026-10-09

**Amended:** 2026-10-09 by [ADR-0039](0039-accounts-contacts-households.md) (joining).

## Context

[ADR-0016](0016-sharing-and-visibility.md) sets the visibility rule. It must
hold in every Module, for detail tables and child rows, for goal progress,
and for AI.

## Decision

- **One core function, `core.can_read(item_id)`**, holds the rule. Every
  Module's row-level security policies, on detail tables and child rows
  alike, call it. The links table is indexed for it.
- It runs for every row Plan reads, so it is **benchmarked in Stage 1** on
  seeded data (a few thousand Items, a week of Plan); if too slow, a
  visibility table kept by triggers replaces the lookup.
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
  [ADR-0039](0039-accounts-contacts-households.md): Contacts first, then an
  accepted invitation.

## Consequences

The same rules bound what an AI may see for each person.
