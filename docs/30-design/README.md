# The LifeOS design system

One look, built from shadcn/ui, used the same way on every screen. This folder
is its specification. **If a screen needs something this folder doesn't
describe, the folder is changed first** — in the same pull request — and
the screen then uses what was added.

| Document | Holds |
|---|---|
| [design-language.md](design-language.md) | The principles and the decisions behind the look |
| [tokens.md](tokens.md) | Every design token, with its exact light and dark value: colour, Module colours, type, spacing, radius, shadow, size, motion |
| [components.md](components.md) | Every component a screen may use — shadcn's and LifeOS's own — with its variants, sizes and rules |
| [patterns.md](patterns.md) | How screens are put together: page anatomy, Module colour, lists, Plan, states, icons, copy, phone |
| [reference.html](reference.html) | A frozen picture of the agreed look ([published copy](https://claude.ai/artifact/RKXtYq2tiCHrfM1XeMX4wK), private to Joe). If it and the written spec differ, the written spec wins. The app's own page, `/design`, now shows the real components; this file stays as the record of the look that was agreed. |

The direction itself is [ADR-0041](../20-architecture/adr/0041-visual-direction.md);
building everything from shared components is
[ADR-0038](../20-architecture/adr/0038-one-design-system.md).

## Building a screen

Work through this before writing a screen, and again before opening its pull
request.

1. **Compose, don't style.** Start from `AppShell` → `PageHeader` → content,
   and build the content only from [components.md](components.md). Layout
   (flex, grid, gap, padding) uses the spacing scale; nothing else is styled
   on the screen.
2. **Module pages** are wrapped in `ModuleScope` with their Module; core pages
   (Inbox, Plan, Tasks, Notes) are not ([patterns](patterns.md#module-colour)).
3. **Every Item shows its Module** — a `ModuleTile`, `ModuleBadge` or dot —
   wherever it appears.
4. **Only tokens.** No colour, size, radius, shadow or font that isn't in
   [tokens.md](tokens.md).
5. **Both modes, dark first**, and phone width as well as desktop.
6. **Every state is designed** from the existing patterns: hover, focus,
   disabled, selected, loading, empty, error, offline.
7. **Copy:** sentence case, buttons name the action, no paragraphs of
   explanation.
8. **Walk it** in a browser against the stand-in Supabase and attach dark and
   light screenshots to the pull request. A UI change is not verified
   because `tsc` passed.

## Changing the system

The look will be refined as we go; this is how, without drift.

- **A value** (a colour, a radius, a shadow): change it in the theme file and
  in [tokens.md](tokens.md), in one pull request. Every screen follows.
- **A new component, variant or pattern:** add it to
  [components.md](components.md) or [patterns.md](patterns.md) first — name,
  when to use it, its variants — then build it once, in the shared
  components. Never as a one-off on a screen.
- **The direction** (what colour means, the fonts, the overall feel): an ADR
  that amends or supersedes [ADR-0041](../20-architecture/adr/0041-visual-direction.md).
- **A new Module** gets its colour as set out in
  [tokens.md](tokens.md#adding-a-module-colour).

## Enforcement

Built in Stage 1 ([plan](../50-progress/plans/stage-1.md)), so that drift
fails CI instead of relying on memory.

| Check | What it catches |
|---|---|
| **One theme file** (`src/styles/theme.css`) holds every token as a CSS variable, mapped to Tailwind with `@theme inline`. It is the only file allowed to contain a colour value, except the two places that must be hex: the web app manifest (`vite.config.ts`) and `theme-color` in `index.html`, which carry `--background` converted; and Google's "G" (`public/google-g.svg`), whose colours Google sets. | Colours defined anywhere else |
| **Checked token tables:** `npm run tokens:check` compares every value in [tokens.md](tokens.md) with the theme file, and fails if the theme defines a variable the spec doesn't list. It runs in `npm run check` and CI. | Docs and code disagreeing |
| **Lint** (`eslint.config.js`): no colour literals anywhere in `src/`. On screens — everything outside `src/components/` and `src/data/` — no Tailwind arbitrary values (`bg-[…]`, `p-[13px]`, `rounded-[…]`, `shadow-[…]`, which also rules out other fonts), no inline `style` except computed sizes (a progress width, with a comment), and UI imported only from `@/components/ui` and `@/components/lifeos`, never Base UI, Radix, Sonner or react-day-picker directly. Inside the shared components arbitrary values are allowed: that is where the look is defined, once. | One-off styling, bypassing the shared components |
| **The design-system page** (`/design`, in development and preview builds only; `src/routes/design.tsx`) renders every component and pattern from the real code, with a dark/light switch. `scripts/screenshot.mjs` takes its dark and light, desktop and phone screenshots. | Components no one has looked at |
| **Screenshot tests** of the design-system page in CI (`tests/e2e/design.spec.ts`), dark and light, desktop and phone. They run inside Playwright's own Docker image, in a cloud session (`npm run e2e`) as in CI, so both draw identically. After an intended change, refresh the pictures with `npm run e2e -- design --update-snapshots` and look at them before committing. | Unintended visual change |
| **This checklist** on every pull request that touches UI, with screenshots. | What the tools can't |
