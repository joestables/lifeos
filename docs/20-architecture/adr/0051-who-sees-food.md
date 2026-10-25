# ADR-0051: Who sees and edits Recipes, the Pantry, Meals and shopping lists

**Status:** Provisionally agreed · 2026-10-18
**Amended:** 2026-10-24 by Joe's answers for Stage 4b (a food shop is for one Space; staples and Essentials kept on Shopping); 2026-10-25, kept in the Pantry again, still each Space's.

## Context

The first design put shared Items in a Household Space that every member
edits ([ADR-0016](0016-sharing-and-visibility.md)), with an Ingredient
catalogue per Household and a Variation always in its Recipe's Space
([ADR-0012](0012-ingredients-and-shopping-lists.md)). Writing the Stage 4
specs, Joe — the main user, his girlfriend an occasional one — set out how
food should be shared instead (18 October).

## Decision

- **The Pantry is shared by everyone in LifeOS.** It holds ingredients and
  household items ("bin bags"). Anyone may add to it, and everyone sees and
  uses what is added. Only the person who added an entry may change, merge
  or delete it, and an entry any Recipe uses can't be deleted. Pantry
  entries are a catalogue, not Items in a Space.
- **Staple and out of stock are ours, not the catalogue's:** each
  Household (or person, without one) keeps its own staples, and which of
  them have run out; and, from Stage 4b, its Essentials and which are
  Required. Both are marked in the Pantry, for the Space chosen there,
  but belong to the Space, not the catalogue (amended 24 and 25 October).
- **A Recipe belongs to the person who wrote it**, in their Personal Space.
  Everyone in a Household with them sees all their Recipes, read-only: a
  Recipe is seen through its author's Household membership, not through a
  link or the Household Space.
- **A Household member may add their own Variation** to someone else's
  Recipe. It is theirs to edit; the Recipe's heading and other Variations
  stay the author's. If they leave the Household, they keep their
  Variations.
- **A Meal is Personal or the Household's.** A food shop is for one Space,
  Personal or a Household, starting as the Household of its first Household
  Meal; everyone in that Space sees all of it, even its Personal Meals'
  lines, and a Meal of another of my Households brings its lines without
  that Household's members seeing the shop (amended 24 October; it was
  "seen by both").

## Consequences

- Amends [ADR-0012](0012-ingredients-and-shopping-lists.md) (the catalogue
  is global, and a Variation may belong to someone other than its Recipe's
  author), [ADR-0016](0016-sharing-and-visibility.md) (a Recipe is seen by
  its author's Household without being shared) and
  [ADR-0017](0017-enforcing-visibility.md) (the visibility rule gains that
  path).
- Settled with the specs (Joe, 18 October): a leaver's Variations sit
  under a copy of the Recipe's heading in their own Recipes, never merged
  back on rejoining; merging two Pantry entries needs the merger to have
  added both; household items have their own aisle, Household; any member
  of a Household changes its staples. With several Households, a Recipe is
  seen by everyone in any Household with its author.
