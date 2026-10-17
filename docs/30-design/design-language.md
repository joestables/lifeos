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
- **A faint hairline edge** on cards and list rows, and between the drawer
  and the page, so surfaces stay crisp in dark mode.
- **Colour means one thing: what Type an Item is**
  ([ADR-0043](../20-architecture/adr/0043-colour-by-type.md), Provisionally
  agreed). Related Types share a colour: Tasks and Events blue; Thoughts,
  Notes and Shopping lists yellow; Gym and Cardio coral; Recipes green;
  Wardrobe orange; Goals purple.
- **A page takes the colour of the Types it is about:** it becomes shadcn's
  primary and ring there, so the main button, selected tab, checkboxes,
  progress and focus take it. Pages that mix Types — Inbox, Plan, Search,
  Settings — are neutral, with an ink primary, and each Item on them shows
  its own colour.
- **No Module name above the page title:** the title and the colour say
  where you are.
- **Red and green keep their usual meaning** — overdue, delete, error; saved,
  done — on every page, and never by colour alone: a state always has a word
  or an icon too.
- The colours were designed with Joe on the Stage 2 screens (11 October
  2026); their values are in the [tokens](tokens.md#colour-types).
- **No hint text:** no keyboard hints in footers, no explanatory lines under
  controls. A control's label says what it does.
- **The drawer is shadcn's standard Sidebar**, attached to the edge, and
  nothing scrolls with a browser scrollbar: ScrollArea everywhere.

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

Then, with the Stage 2 screens, two passes on 10 and 11 October 2026 on the
[Stage 2 design canvas](https://claude.ai/artifact/N5ZmkZnYg51kcHySQ8c6F6)
(private to Joe): colour by Type with its values, the standard Sidebar,
Items opening in a centred Dialog, one place for each page's main action,
the phone's "+" floating buttons, ScrollArea, and no hint text.
