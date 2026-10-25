# ADR-0050: One Shopping list Type, in place of List and Shop

**Status:** Provisionally agreed · 2026-10-17
**Amended:** 2026-10-24 by Joe's answers for Stage 4b (Shopping's three tabs; a food shop or a list; a food shop linked to Meals and for one Space; staples and Essentials on Shopping; no repeating lists; a date only, no time or place).

Supersedes [ADR-0010](0010-shop-is-its-own-type.md).

## Context

ADR-0010 made two Types: a List (packing, DIY) and a Shop (a List with a
date, a place and a done state). Neither was built. On 17 October Joe set
out a Shopping page holding all his shopping lists, made by hand or from the
meal plan, and asked whether the List Type could go
([Stage 4 plan](../../50-progress/plans/stage-4.md#questions-for-the-specs),
questions 1 and 2).

## Decision

- **One Type, Shopping list**, in a Module renamed `shopping` (from
  `lists`). It holds lines, each with an optional Ingredient and an optional
  *for* pointer (a Meal or an Event).
- **A date is optional.** With a date (and a time and place if I like) a
  Shopping list is on Plan, reminds me if I ask, and is ticked done when the
  shop is done: what ADR-0010 called a Shop. Without one it is a standing
  list ("Household essentials").
- **It is Shareable and Capturable**, Household by default; yellow, with
  Thoughts and Notes ([ADR-0043](0043-colour-by-type.md)).
- **Lists that aren't shopping** (packing for Lisbon, DIY) are Notes with a
  checklist, which Notes already have. A Thought sorts into a Shopping list,
  not a List, and only when it names a Pantry ingredient: it becomes a food
  shop (Joe, 25 October).
- **No list templates.** Essentials and an undated list do their job; a
  packing Note can be duplicated.

## Amended 24 October (Stage 4b)

- **Shopping has three tabs:** Food, Lists and Online (later: items watched
  for their price). A Shopping list is a **food shop** (Food) or a **list**
  (Lists: shopping that isn't food). A food shop's lines are grouped by
  aisle; a list's under my own subheadings. Packing and DIY lists stay
  Notes, as above.
- **A food shop is linked to any number of Meals** and follows them: their
  ingredients come onto it, change with them, and go when a Meal is removed
  or taken off. It is **for one Space**, Personal or a Household, whatever
  Spaces its Meals are in ([ADR-0051](0051-who-sees-food.md), amended).
- **Staples and Essentials** are each Space's lists of Pantry entries, kept
  on Shopping → Food rather than in the Pantry: staples are long-life goods
  (salt), never added from a Meal, any marked out of stock; Essentials are
  bought most shops (milk), any marked Required. Every food shop offers the
  out of stock and Required, then the other Essentials, none added by
  itself.
- **A food shop is made** from Meals chosen on the Meal plan (Select, Add to
  shop), or from Shopping → Food's New shop, offering the plan's Meals.
- **A date only:** a Shopping list may have a date, never a time or a
  place (Joe, 24 October), so it shows on Plan among the day's untimed
  Items.
- **No repeating lists:** Essentials do that job, which settles the
  carry-over question below.

## Consequences

- No List ↔ Shop conversion, no *from template* link, and no List template
  → List occurrence.
- Settled 24 October: Shopping lists don't repeat, so nothing carries over.
- Amends [ADR-0012](0012-ingredients-and-shopping-lists.md) (where a Meal's
  ingredients go) and [ADR-0013](0013-occurrences-snapshot-their-definition.md)
  (no list templates).
