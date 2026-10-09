# Design language

*Short by intent: LifeOS's own design choices only. Not yet written beyond
what is decided below.*

- **Goal:** a design that looks natural, intentional and integrated, using a
  standard design system rather than a heavily customised MUI
  ([vision](../00-foundation/vision.md)).
- **Components:** shadcn/ui on Base UI, with Tailwind v4
  ([ADR-0034](../20-architecture/adr/0034-stack.md), Proposed). shadcn's
  components are documented upstream, so there is no Storybook; a component
  catalogue is added only if it can be generated.
- **Navigation:** a collapsible drawer, no bottom bar
  ([ADR-0026](../20-architecture/adr/0026-navigation-drawer.md), Accepted).
- **No paragraphs of explanation in the app** (v1 style-guide rule 36).
- **Visibility is shown:** a Personal Item linked to a shared one is marked
  "Visible to Household"; a pointer to an Item the reader can't read shows as
  "private", with no title.
- A mockup canvas was produced on 8 October; its visual design was not
  liked, as expected at that stage.
