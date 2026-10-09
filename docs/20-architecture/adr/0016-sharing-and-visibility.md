# ADR-0016: Sharing and visibility

**Status:** Provisionally agreed · 2026-10-09

## Context

Joe wants the option for his girlfriend to see recipes, create shopping lists
and add events, while most of his life stays personal.

## Decision

- Two levels of Space: **Personal** and **Household**. Each Type has a
  default Space; gym sessions are always Personal.
- **Visibility follows links:** if a Personal Item is linked to a shared
  Item, members of that Space can see the Personal Item, within four
  boundaries:
  1. **One hop only** — an Event's linked Outfit worn is visible; the Outfit
     and garments behind it are not.
  2. **Read-only** — visibility through a link never grants editing.
  3. **Shown in the interface** — linking a Personal Item to a shared one
     marks it "Visible to Household"; removing the link removes the
     visibility.
  4. **Rules expose nothing** — a shared goal's measure may find Personal
     sessions; others see the progress figure, not the sessions.

  Tasks linked to a shared milestone goal *are* visible one hop away: that is
  boundary 1 working as intended.
- **Leaving the Household:** the shared Items you created **become
  Personal** to you, and the other members **lose access**. Items others
  created stay in the Household. Visibility through links is recalculated in
  the same step.

## Consequences

- To confirm: "created by" decides ownership, so a shared List one person
  started and the other filled — or a Recipe one added that the other has
  cooked six times, cook log included — leaves with its creator. The
  alternative: the leaver takes a **copy** of the shared Items they created,
  and the originals stay.
- How it is enforced: [ADR-0017](0017-enforcing-visibility.md) (Proposed).
