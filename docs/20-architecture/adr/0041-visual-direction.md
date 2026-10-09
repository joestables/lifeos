# ADR-0041: Visual direction: Stone, neutral, coloured by Module

**Status:** Provisionally agreed · 2026-10-09

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
- **Colour means Module.** Each Module has one colour (Food terracotta,
  Fitness blue, Lists amber, Goals violet, Wardrobe rose, Finance green); the
  core stays neutral. On a Module's own pages its colour becomes shadcn's
  primary and ring. Red and green keep their usual meanings everywhere.
- **Dark and light are both designed**; dark is checked first.
- The exact values and rules are the [design system](../../30-design/README.md).

## Consequences

- Each new Module needs a colour, chosen by the rule in
  [tokens](../../30-design/tokens.md#adding-a-module-colour).
- Changing what colour means, the typeface or the overall feel needs an ADR
  that amends or supersedes this one; refining a value doesn't.
