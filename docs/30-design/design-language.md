# Design language

*Short by intent: LifeOS's own design choices only. It grows with each stage
as the design system is refined.*

## One design system, built from shared components

*([ADR-0038](../20-architecture/adr/0038-one-design-system.md), Provisionally
agreed)*

- **Set up in Stage 1**, before the first real screen: shadcn/ui themed with
  LifeOS's own design tokens (colour, type, spacing, radius), plus the shared
  components the first screens need.
- **Every screen uses the same shared components and tokens.** No one-off
  styling: no raw colours or spacing values in a screen, no copy-pasted
  variants. Something new is added to, or extends, a shared component.
- **We expect to tweak the design system as we go**, to improve it. Building
  everything from the same parts is what makes that safe: one change to a
  token or component improves every screen at once.

## Decisions so far

- **Goal:** a design that looks natural, intentional and integrated, using a
  standard design system rather than a heavily customised MUI
  ([vision](../00-foundation/vision.md)).
- **Components:** shadcn/ui on Base UI, with Tailwind v4
  ([ADR-0034](../20-architecture/adr/0034-stack.md), Proposed). shadcn's
  components are documented upstream, so there is no Storybook; a component
  catalogue is added only if it can be generated.
- **Navigation:** a collapsible drawer, no bottom bar
  ([ADR-0026](../20-architecture/adr/0026-navigation-drawer.md), Provisionally
  agreed).
- **No paragraphs of explanation in the app** (v1 style-guide rule 36).
- **Visibility is shown:** a Personal Item linked to a shared one is marked
  "Visible to Household"; a pointer to an Item the reader can't read shows as
  "private", with no title.
- A mockup canvas was produced on 8 October; its visual design was not
  liked, as expected at that stage. The look is still to be decided.
