# Design tokens

*[`src/styles/theme.css`](../../src/styles/theme.css) holds these values.
Change both together: `npm run tokens:check` fails CI if they differ, or if
the theme defines a variable this page doesn't list
([design system](README.md#enforcement)). Names follow shadcn/ui's theme
variables, plus LifeOS's own (marked †).*

Colours are OKLCH. "fg" is short for foreground.

## Colour: neutral theme

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--background` | `oklch(0.966 0.0025 260)` | `oklch(0.175 0.0025 260)` | The page behind everything |
| `--foreground` | `oklch(0.235 0.0025 260)` | `oklch(0.945 0.0025 260)` | Text, icons by default |
| `--card` | `oklch(0.997 0.00125 260)` | `oklch(0.215 0.0025 260)` | Cards, list rows, the drawer, sheets |
| `--card-foreground` | = `--foreground` | = `--foreground` | |
| `--popover` | = `--card` | `oklch(0.24 0.0025 260)` | Menus, popovers, dialogs |
| `--popover-foreground` | = `--foreground` | = `--foreground` | |
| `--ink` † | `oklch(0.24 0.0025 260)` | `oklch(0.94 0.0025 260)` | The neutral primary |
| `--ink-foreground` † | `oklch(0.985 0 0)` | `oklch(0.2 0.0025 260)` | Text on ink |
| `--primary` | = `--ink` | = `--ink` | Main action, checked, selected; becomes the page's Type colour on a page about one Type family |
| `--primary-foreground` | = `--ink-foreground` | = `--ink-foreground` | |
| `--secondary` | `oklch(0.928 0.0025 260)` | `oklch(0.265 0.0025 260)` | Secondary buttons and badges |
| `--secondary-foreground` | = `--foreground` | = `--foreground` | |
| `--muted` | `oklch(0.938 0.0025 260)` | `oklch(0.245 0.0025 260)` | Quiet fills: tracks, skeletons, kbd, core tiles |
| `--muted-foreground` | `oklch(0.5 0.005 260)` | `oklch(0.7 0.005 260)` | Secondary text, meta, placeholders |
| `--accent` | `oklch(0.922 0.0025 260)` | `oklch(0.275 0.0025 260)` | Hover, highlighted menu item, selected tab |
| `--accent-foreground` | = `--foreground` | = `--foreground` | |
| `--border` | `oklch(0.9 0.0025 260)` | `oklch(1 0 0 / 6.5%)` | Rare dividers; off-state chips |
| `--hairline` † | `oklch(0.235 0.0025 260 / 6.5%)` | `oklch(0.945 0.0025 260 / 6.5%)` | The 1px edge on cards, rows, outline buttons; the line between the drawer and the page |
| `--input` | `oklch(0.928 0.0025 260)` | `oklch(0.255 0.0025 260)` | Filled input background |
| `--input-strong` † | `oklch(0.79 0.0025 260)` | `oklch(1 0 0 / 20%)` | Unchecked checkbox edge, switch off |
| `--ring` | = `--primary` | = `--primary` | Focus |
| `--ring-soft` † | `--ring` at 18% | `--ring` at 20% | The 3px focus halo |
| `--sidebar` | = `--card` | = `--card` | The drawer |
| `--sidebar-foreground` | `oklch(0.38 0.0025 260)` | `oklch(0.8 0.0025 260)` | Drawer text |
| `--sidebar-accent` | = `--accent` | = `--accent` | Current page in the drawer |
| `--sidebar-accent-foreground` | = `--foreground` | = `--foreground` | |
| `--overlay` † | `oklch(0.2 0.0025 260 / 30%)` | `oklch(0.06 0.0025 260 / 62%)` | Behind dialogs and sheets |
| `--switch-thumb` † | `oklch(1 0 0)` | `oklch(0.98 0 0)` | The Switch's and Slider's thumb |
| `--scroll-thumb` † | `oklch(0.235 0.0025 260 / 18%)` | `oklch(0.945 0.0025 260 / 16%)` | The ScrollArea's thumb |

## Colour: meaning

Never replaced by a Type colour.

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--destructive` | `oklch(0.57 0.19 27)` | same | Delete, overdue, errors |
| `--destructive-foreground` | `oklch(0.99 0 0)` | same | |
| `--success` † | `oklch(0.6 0.12 155)` | same | Saved, synced |

## Colour: Types

*([ADR-0043](../20-architecture/adr/0043-colour-by-type.md), Provisionally
agreed; the colours agreed with Joe on 11 October 2026.)* Related Types share
a colour; Account's (Finance) is chosen in Stage 9, and until then Finance is
neutral. Inbox, Plan, Search and Settings are neutral.

| Token | Light | Dark | Types · pages |
|---|---|---|---|
| `--t-blue` † | `oklch(0.55 0.14 255)` | `oklch(0.72 0.12 250)` | Task, Event · Tasks |
| `--t-yellow` † | `oklch(0.8 0.15 88)` | `oklch(0.86 0.13 90)` | Thought, Note, List, Shop · Notes |
| `--t-coral` † | `oklch(0.66 0.15 35)` | `oklch(0.74 0.12 35)` | Exercise, Workout template, Workout, Cardio activity · Gym, Cardio |
| `--t-green` † | `oklch(0.6 0.14 150)` | `oklch(0.76 0.12 150)` | Recipe, Variation, Meal, Ingredient · Recipes |
| `--t-orange` † | `oklch(0.7 0.15 60)` | `oklch(0.8 0.12 62)` | Garment, Outfit, Outfit worn · Wardrobe |
| `--t-purple` † | `oklch(0.55 0.15 298)` | `oklch(0.74 0.12 300)` | Goal · Goals |

Each colour also has a **text** value — the colour as text or an icon on the
page, darker in light mode where the colour itself wouldn't reach 4.5:1 — and
a **foreground**, for text on the colour (a primary button, a ticked
checkbox): white or near-black, whichever reads.

| Token | Light | Dark |
|---|---|---|
| `--t-blue-text` † | `oklch(0.52 0.14 255)` | `oklch(0.72 0.12 250)` |
| `--t-yellow-text` † | `oklch(0.5 0.11 75)` | `oklch(0.86 0.13 90)` |
| `--t-coral-text` † | `oklch(0.55 0.15 35)` | `oklch(0.74 0.12 35)` |
| `--t-green-text` † | `oklch(0.5 0.12 150)` | `oklch(0.76 0.12 150)` |
| `--t-orange-text` † | `oklch(0.52 0.12 60)` | `oklch(0.8 0.12 62)` |
| `--t-purple-text` † | `oklch(0.55 0.15 298)` | `oklch(0.74 0.12 300)` |
| `--t-blue-foreground` † | `oklch(0.99 0 0)` | `oklch(0.2 0.0025 260)` |
| `--t-yellow-foreground` † | `oklch(0.2 0.0025 260)` | same |
| `--t-coral-foreground` † | `oklch(0.2 0.0025 260)` | same |
| `--t-green-foreground` † | `oklch(0.2 0.0025 260)` | same |
| `--t-orange-foreground` † | `oklch(0.2 0.0025 260)` | same |
| `--t-purple-foreground` † | `oklch(0.99 0 0)` | `oklch(0.2 0.0025 260)` |
| `--tile-mix` † | `14%` | `16%` |

`--tile-mix` is the strength of a Type's tint: tiles, badges, the selected tab.

Anything marked with `data-colour` — a `TypeScope`, a `TypeTile`, a coloured
Checkbox — sets three variables that components read, never a `--t-*` token
directly:

| Variable | Is | Used for |
|---|---|---|
| `--tc` † | the Type's colour | Tile tints, dots, primary fills |
| `--tc-text` † | its text value | Icons in tiles and the drawer, selected tab text, pressed Toggles |
| `--tc-foreground` † | its foreground | Text on a primary fill |

and, inside it, these, which components use for their selected and pressed
states:

| Token | Neutral (no `data-colour`) | Inside a colour | Used for |
|---|---|---|---|
| `--selected` † | = `--accent` | `--tc` at `--tile-mix` | Selected tab |
| `--selected-foreground` † | = `--foreground` | = `--tc-text` | Its text |
| `--pressed-foreground` † | = `--foreground` | = `--tc-text` | A pressed Toggle's icon |

`--primary`, `--primary-foreground` and `--ring` become `--tc`,
`--tc-foreground` and `--tc` there too.

### Adding a colour

A new family of Types gets a colour only if it belongs with none of these
([ADR-0043](../20-architecture/adr/0043-colour-by-type.md)): one hue at least
30° from the others, checked against both backgrounds, with its text and
foreground values worked out the same way, then added here.

## Type

One family: **Plus Jakarta Sans** (400–800), with **Geist Mono** only for
keyboard shortcuts and code. Numbers that line up use tabular figures.

| Token | Size / line height | Weight | Tracking | Used for |
|---|---|---|---|---|
| `text-h1` | 24px / 1.2 | 750 | −0.025em | Page title (22px on a phone) |
| `text-h2` | 17px / 1.3 | 700 | −0.015em | Card and section titles, dialog titles |
| `text-day` | 20px | 750 | −0.02em | Day numbers on Plan; an Item's title in its Dialog |
| `text-base` | 14px / 1.45 | 400; 600 for titles | 0 | Body, row titles, buttons |
| `text-sm` | 13px | 400–700 | 0 | Meta, small buttons, section labels (700) |
| `text-xs` | 12px | 400–700 | 0 | Badges, counts, help text, captions |
| `text-kbd` | 10.5px Geist Mono | 500 | 0 | Keyboard shortcuts |

## Spacing

Tailwind's 4px-based scale, using only these steps: **2, 4, 6, 8, 10, 12, 14,
16, 18, 20, 24, 30, 32, 36 px**.

| Where | Value |
|---|---|
| Page padding (sides) | 36px desktop, 20px phone |
| Page header | 30px top, 18px bottom; 12px top, 20px bottom on a phone |
| Top bar (phone) | 64px high, below the notch; the menu button 48px square with a 22px icon, 8px from the edge (its icon lines up with the page padding), 8px before the brand; the Capture button 48px square, 8px from the right edge |
| Gap between sections | 20px |
| Gap between list rows | 6px |
| Card padding | 20px |
| Row padding | 10px × 14px |
| Inside a control, between icon and label | 8px (6px small) |

## Radius

| Token | Value | Used for |
|---|---|---|
| `--radius-xs` | 6px | Checkbox, kbd |
| `--radius-sm` | 8px | Small tile (24px), menu item, tooltip, skeleton |
| `--radius-md` | 10px | Tile (32px) |
| `--radius` | 12px | Buttons, inputs, selects, toggle group, drawer items, Plan cards |
| `--radius-row` | 14px | List rows, the large tile |
| `--radius-lg` | 18px | Cards, popovers, menus, Plan day columns, the phone's floating button |
| `--radius-xl` | 24px | Dialogs, sheets |
| `--radius-full` | 999px | Badges, tabs, chips, switch, avatar, progress |

As Tailwind classes: `rounded-xs`, `rounded-sm`, `rounded-md`,
`rounded-control` (`--radius`), `rounded-row`, `rounded-lg`, `rounded-xl`,
`rounded-full`.

A shape inside another is rounded to the outer radius minus the gap between
them (a toggle item: 12px − 3px = 9px).

## Shadow and edge

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--shadow-card` | `0 0 0 1px var(--hairline), 0 1px 2px oklch(0.2 0.01 260 / 5%), 0 6px 20px -8px oklch(0.2 0.01 260 / 13%)` | `0 0 0 1px var(--hairline), inset 0 1px 0 oklch(1 0 0 / 3.5%), 0 10px 30px -14px oklch(0 0 0 / 60%)` | Cards, rows, outline buttons, chips, Plan cards |
| `--shadow-pop` | `0 2px 4px oklch(0.2 0.01 260 / 6%), 0 16px 40px -12px oklch(0.2 0.01 260 / 26%)` | `inset 0 1px 0 oklch(1 0 0 / 4.5%), 0 20px 50px -16px oklch(0 0 0 / 70%)` | Menus, popovers, toasts, the phone's floating button |
| `--shadow-dialog` | `0 30px 80px -24px oklch(0.2 0.01 260 / 38%)` | `inset 0 1px 0 oklch(1 0 0 / 5%), 0 40px 90px -24px oklch(0 0 0 / 80%)` | Dialogs, sheets |
| `--shadow-button` | `0 1px 2px oklch(0.2 0.01 260 / 20%)` | none | Primary buttons |
| `--shadow-thumb` † | `0 1px 2px oklch(0 0 0 / 25%)` | same | The Switch's and Slider's thumb |

No borders on surfaces: edges come from `--shadow-card`'s hairline.

## Sizes

| Token | Value | Used for |
|---|---|---|
| `--h` | 40px | Buttons, inputs, selects |
| `--h-sm` | 32px | Small buttons, tabs, chips, inputs in tables |
| Drawer item | 38px; 44px on a phone | |
| Menu item | 36px | |
| List row | min 56px | |
| Tile | 32px (icon 16px); small 24px (icon 14px); large 48px (icon 22px, `--radius-row`), for an empty page | |
| Checkbox | 18px | |
| Switch | 38 × 22px | |
| Badge | 22px high | |
| Avatar | 30px | |
| Drawer | 256px wide, full height; a 288px Sheet on a phone | |
| Floating button (phone) | 56px square, `--radius-lg`, 22px icon; 20px from the right, 28px from the bottom | |
| ScrollArea thumb | 6px wide, 2px from the edge | |
| Icon | 16px, stroke 1.75; 12px and 14px small; 22px large | |

## Motion

| Token | Value | Used for |
|---|---|---|
| `--duration` | 150ms | Colour, shadow and transform changes |
| `--duration-sheet` | 300ms | A Sheet sliding in and out, and its overlay |
| `--ease-sheet` | `cubic-bezier(0.32, 0.72, 0, 1)` | A Sheet's slide: fast, then settling |
| Skeleton pulse | 2s ease-in-out | Loading |

With `prefers-reduced-motion`, transitions and the pulse are off.
