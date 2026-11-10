# The LifeOS design system

One look, built from shadcn/ui, used the same way on every screen. This folder
is its specification. **If a screen needs something this folder doesn't
describe, the folder is changed first** — in the same pull request — and
the screen then uses what was added.

| Document | Holds |
|---|---|
| [design-language.md](design-language.md) | The principles and the decisions behind the look |
| [tokens.md](tokens.md) | Every design token, with its exact light and dark value: colour, Type colours ([ADR-0043](../20-architecture/adr/0043-colour-by-type.md)), type, spacing, radius, shadow, size, motion |
| [components.md](components.md) | Every component a screen may use — shadcn's and LifeOS's own — with its variants, sizes and rules |
| [patterns.md](patterns.md) | How screens are put together: page anatomy, the drawer, colour by Type, opening an Item, lists, Week, Today, Plan, Recipes, the Meal plan, the Gym, forms, states, icons, copy, phone |
| [reference.html](reference.html) | A frozen picture of the look agreed in Stage 1 ([published copy](https://claude.ai/artifact/RKXtYq2tiCHrfM1XeMX4wK), private to Joe), from before colour by Type and the standard Sidebar. The Stage 2 screens agreed on 11 October 2026 are on the [Stage 2 design canvas](https://claude.ai/artifact/N5ZmkZnYg51kcHySQ8c6F6), Stage 3's (Plan, Events, Google Calendar), agreed on 14 October, on the [Stage 3 design canvas](https://claude.ai/artifact/S7eLUszjswnPN77EkbTcxK), Stage 4's (Recipes, the Meal plan, the Pantry, Households), agreed on 18 October, on the [Stage 4 design canvas](https://claude.ai/artifact/6GfJTp2G1BF6n573dqHxpy), Stage 4b's (Shopping), agreed on 24 October, on the [Stage 4b design canvas](https://claude.ai/artifact/KZyE2VPa3jTsVZ4mjxanGk), and Stage 5's (the Gym), agreed on 1 November, on the [Stage 5 design canvas](https://claude.ai/artifact/NXxJeLcMza7iuHQjqDadmG) (all private to Joe). Stage 7b's (Today, Week, Plan, the Reminder Type and "New"), agreed on 9 November, are on the [Stage 7b design canvas](https://claude.ai/artifact/EqX4D326Apjs5aGVF2W4Gs). Where either differs from the written spec, the written spec wins; the app's own page, `/design`, shows the real components. |

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
2. **A page about one family of Types** (Plan, Notes, Recipes, Gym…) is
   wrapped in `TypeScope` with their colour; Today, Week, Search and
   Settings are not ([patterns](patterns.md#colour-by-type)).
3. **Every Item shows its colour** — a `TypeTile`, a coloured checkbox, a
   `TypeBadge` or a dot — wherever it appears.
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
- **A new Type** joins the colour of the Types it belongs with; only a new
  family gets a new colour, as set out in
  [tokens.md](tokens.md#adding-a-colour).

## Enforcement

Built in Stage 1 ([plan](../50-progress/plans/stage-1.md)), so that drift
fails CI instead of relying on memory.

| Check | What it catches |
|---|---|
| **One theme file** (`src/styles/theme.css`) holds every token as a CSS variable, mapped to Tailwind with `@theme inline`. It is the only file allowed to contain a colour value, except the places that must be hex: the web app manifest (`vite.config.ts`) and `theme-color` in `index.html`, which carry `--background` converted; the app icon (`public/icon.svg`, `public/favicon.svg` and the PNGs drawn from them), which carries the dark theme's `--background`, `--foreground` and Type colours converted ([patterns](patterns.md#the-app-icon)); and Google's "G" (`public/google-g.svg`), whose colours Google sets; and the Android app's bundled page for a first launch with no signal (`native-shell/no-connection.html`, with a copy of the icon), which can't read the theme and carries `tokens.md`'s values copied; and the Android app's resources (`android/app/src/main/res`): the icon's drawables, drawn from `public/icon.svg` with its colours, the colours Android draws itself in `colors.xml` (the opening screen's `--background`, notifications' Type colours, and the Alarm screen's), and the TypeTile's `--tile-mix` in `integers.xml`, which `tokens:check` compares with the theme; and the Type icons as vector drawables (`ic_type_*.xml`), written from Lucide by `scripts/android-type-icons.mjs`; and LifeOS's font as static TTFs (`res/font`), written from the web app's own variable font by `scripts/android-fonts.py`. | Colours defined anywhere else |
| **Checked token tables:** `npm run tokens:check` compares every value in [tokens.md](tokens.md) with the theme file, and fails if the theme defines a variable the spec doesn't list; and the Android app's colours with the theme's, as hex, and that no comment in its resources holds `--`, which breaks its build. It runs in `npm run check` and CI. | Docs and code disagreeing |
| **Lint** (`eslint.config.js`): no colour literals anywhere in `src/`. On screens — everything outside `src/components/` and `src/data/` — no Tailwind arbitrary values (`bg-[…]`, `p-[13px]`, `rounded-[…]`, `shadow-[…]`, which also rules out other fonts), no inline `style` except computed sizes (a progress width, with a comment), and UI imported only from `@/components/ui` and `@/components/lifeos`, never Base UI, Radix, Sonner or react-day-picker directly. Inside the shared components arbitrary values are allowed: that is where the look is defined, once. | One-off styling, bypassing the shared components |
| **The design-system page** (`/design`, in development and preview builds only; `src/routes/design.tsx`) renders every component and pattern from the real code, with a dark/light switch. `scripts/screenshot.mjs` takes its dark and light, desktop and phone screenshots. | Components no one has looked at |
| **Screenshot tests** of the design-system page in CI (`tests/e2e/design.spec.ts`), dark and light, desktop and phone. They run inside Playwright's own Docker image, in a cloud session (`npm run e2e`) as in CI, so both draw identically. After an intended change, refresh the pictures with `npm run e2e -- design --update-snapshots` and look at them before committing. | Unintended visual change |
| **This checklist** on every pull request that touches UI, with screenshots. | What the tools can't |
