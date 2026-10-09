# ADR-0038: One design system, built from shared components

**Status:** Provisionally agreed · 2026-10-09

## Context

Goal 3 asks for a design that looks natural, intentional and integrated. v1
customised MUI heavily, screen by screen. The look of v2 isn't settled — the
first mockup wasn't liked — and the design system will be **tweaked as we go
to improve it**.

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
- [design-language.md](../../30-design/design-language.md) records the
  choices and grows with each stage.

## Consequences

- Refining the design is cheap and safe at any stage.
- Reviews of a pull request check that it uses the shared components.
