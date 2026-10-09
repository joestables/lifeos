# ADR-0038: One design system, built from shared components

**Status:** Provisionally agreed · 2026-10-09

**Amended:** 2026-10-09 with how it is kept consistent, once the look was; 2026-10-09 by the Stage 1 design system in code (token tables checked against the theme, not generated)
agreed ([ADR-0041](0041-visual-direction.md)).

## Context

Goal 3 asks for a design that looks natural, intentional and integrated. v1
customised MUI heavily, screen by screen. The look is set by
[ADR-0041](0041-visual-direction.md), and the design system will be **tweaked
as we go to improve it**.

## Decision

- **The design system is set up in Stage 1**, before the first real screen:
  shadcn/ui ([ADR-0034](0034-stack.md)) themed with LifeOS's own design
  tokens (colour, type, spacing, radius), plus the shared components the
  first screens need.
- **Every screen is built from the same shared components and tokens.** No
  one-off styling in a screen: no raw colours or spacing values, no
  copy-pasted variants of a component. A screen that needs something new adds
  it to, or extends, a shared component.
- **Expect to tweak it.** Because everything is built from the same parts, a
  change to a token or a component improves every screen at once.
- **The [design system](../../30-design/README.md) is a specification**:
  every token with its exact value, every component and variant a screen may
  use, and the patterns screens follow. Anything new is added there first, in
  the same pull request, before a screen uses it.
- **Drift fails CI** ([enforcement](../../30-design/README.md#enforcement)):
  one theme file holds every value; the token tables are checked against it;
  lint forbids colour literals, arbitrary Tailwind values and direct imports
  of Base UI or Radix in screens; a design-system page in the app, generated
  from the real components, is screenshot-tested.

## Consequences

- Refining the design is cheap and safe at any stage.
- Every pull request that touches UI runs the design system's checklist and
  carries dark and light screenshots.
