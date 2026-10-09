# Design language

*The principles and decisions behind the look. Exact values are in
[tokens.md](tokens.md); how to use them is in the [design system](README.md).*

## Principles

- **Calm and uncluttered.** Neutral greys, soft surfaces, generous space. One
  thing on a screen leads; everything else steps back.
- **Premium through restraint.** A single typeface, a small set of sizes,
  colour used for meaning only.
- **Predictable.** The same thing always looks and behaves the same way, on
  every page. That is why every screen is built from the same shared
  components ([ADR-0038](../20-architecture/adr/0038-one-design-system.md),
  Provisionally agreed).
- **Frictionless.** The common action is one obvious control away; capture
  is everywhere.
- **Dark first, light equal.** Joe uses dark mode, so it is checked first;
  light mode gets the same care.
- **No paragraphs of explanation in the app** (v1 style-guide rule 36).

## The look

*([ADR-0041](../20-architecture/adr/0041-visual-direction.md), Provisionally
agreed)*

- **Stone:** Plus Jakarta Sans throughout; roomy spacing; filled surfaces and
  soft shadows rather than borders; 12px controls and 18px cards; a strong
  hierarchy of weight and size.
- **True neutral greys** with an ink primary — near-black in light mode,
  near-white in dark.
- **A faint hairline edge** on cards, list rows and the drawer, so surfaces
  stay crisp in dark mode.
- **Colour means one thing: which Module an Item belongs to.** Food
  terracotta, Fitness blue, Lists amber, Goals violet, Wardrobe rose, Finance
  green. The core — Inbox, Plan, Tasks, Notes, and Thought, Note, Task,
  Event — stays neutral and is told apart by icons.
- **On a Module's own pages its colour leads:** it becomes shadcn's primary
  and ring there, so the main button, selected tab, checkboxes, progress and
  focus take it. Elsewhere the primary is ink.
- **Red and green keep their usual meaning** — overdue, delete, error; saved,
  done — whichever Module you're in.

## Other decisions

- **Components:** shadcn/ui on Base UI, with Tailwind v4
  ([ADR-0034](../20-architecture/adr/0034-stack.md), Provisionally agreed).
  No Storybook: the app's own design-system page, generated from the real
  components, is the catalogue.
- **Navigation:** a collapsible drawer, no bottom bar
  ([ADR-0026](../20-architecture/adr/0026-navigation-drawer.md), Provisionally
  agreed).
- **Icons:** Lucide, the set shadcn uses.
- **Visibility is shown:** a Personal Item linked to a shared one is marked
  "Visible to Household"; a pointer to an Item the reader can't read shows as
  "private", with no title.

## How the look was chosen

Three rounds on 9 October 2026:
[three directions](https://claude.ai/artifact/3v8Z2dQu1BxYArJSwsmesd) (Stone
chosen), [Stone made neutral and coloured by Module](https://claude.ai/artifact/1aoCq4aQ1vvngN8e6D4S75)
(B1's true greys chosen), and [three refinements](https://claude.ai/artifact/MWirJxnk1cTN46EiViXmLQ)
(C1, with C2's hairline edges). The result is
[reference.html](reference.html). All private to Joe.
