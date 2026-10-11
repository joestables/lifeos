# ADR-0041: Visual direction: Stone, neutral, coloured by Type

**Status:** Provisionally agreed · 2026-10-09

**Amended:** 2026-10-10 by [ADR-0043](0043-colour-by-type.md) (colour by Type, not by Module).

## Context

Goal 3 asks for a design that looks natural, intentional and integrated, and
Joe wants it premium, calm, frictionless and predictable. Three rounds of
options on 9 October 2026, all built from shadcn/ui
([design language](../../30-design/design-language.md#how-the-look-was-chosen)).

## Decision

- **Stone:** Plus Jakarta Sans; roomy spacing; filled surfaces and soft
  shadows; 12px controls, 18px cards; a strong hierarchy of weight and size.
- **True neutral greys** with an ink primary, and a **faint hairline edge** on
  cards, rows and the drawer.
- **Colour means Type** ([ADR-0043](0043-colour-by-type.md)): every Type
  has a colour (Tasks and Events blue; Thoughts, Notes, Lists and Shops
  yellow; Gym and Cardio coral; Recipes green; Wardrobe orange; Goals
  purple). A page takes the colour of its Types, where it becomes shadcn's
  primary and ring; Inbox and Plan are neutral. Red and green keep their
  usual meanings everywhere.
- **Dark and light are both designed**; dark is checked first.
- The exact values and rules are the [design system](../../30-design/README.md).

## Consequences

- A new family of Types needs a colour, chosen by the rule in
  [tokens](../../30-design/tokens.md#adding-a-colour).
- Changing what colour means, the typeface or the overall feel needs an ADR
  that amends or supersedes this one; refining a value doesn't.
