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
| `--primary` | = `--ink` | = `--ink` | Main action, checked, selected; becomes the Module colour on a Module's pages |
| `--primary-foreground` | = `--ink-foreground` | = `--ink-foreground` | |
| `--secondary` | `oklch(0.928 0.0025 260)` | `oklch(0.265 0.0025 260)` | Secondary buttons and badges |
| `--secondary-foreground` | = `--foreground` | = `--foreground` | |
| `--muted` | `oklch(0.938 0.0025 260)` | `oklch(0.245 0.0025 260)` | Quiet fills: tracks, skeletons, kbd, core tiles |
| `--muted-foreground` | `oklch(0.5 0.005 260)` | `oklch(0.7 0.005 260)` | Secondary text, meta, placeholders |
| `--accent` | `oklch(0.922 0.0025 260)` | `oklch(0.275 0.0025 260)` | Hover, highlighted menu item, selected tab |
| `--accent-foreground` | = `--foreground` | = `--foreground` | |
| `--border` | `oklch(0.9 0.0025 260)` | `oklch(1 0 0 / 6.5%)` | Rare dividers; off-state chips |
| `--hairline` † | `oklch(0.235 0.0025 260 / 6.5%)` | `oklch(0.945 0.0025 260 / 6.5%)` | The 1px edge on cards, rows, the drawer, outline buttons |
| `--input` | `oklch(0.928 0.0025 260)` | `oklch(0.255 0.0025 260)` | Filled input background |
| `--input-strong` † | `oklch(0.79 0.0025 260)` | `oklch(1 0 0 / 20%)` | Unchecked checkbox edge, switch off |
| `--ring` | = `--primary` | = `--primary` | Focus |
| `--ring-soft` † | `--ring` at 18% | `--ring` at 20% | The 3px focus halo |
| `--sidebar` | = `--card` | = `--card` | The drawer |
| `--sidebar-foreground` | `oklch(0.38 0.0025 260)` | `oklch(0.8 0.0025 260)` | Drawer text |
| `--sidebar-accent` | = `--accent` | = `--accent` | Current page in the drawer (core pages) |
| `--sidebar-accent-foreground` | = `--foreground` | = `--foreground` | |
| `--overlay` † | `oklch(0.2 0.0025 260 / 30%)` | `oklch(0.06 0.0025 260 / 62%)` | Behind dialogs and sheets |
| `--switch-thumb` † | `oklch(1 0 0)` | `oklch(0.98 0 0)` | The Switch's and Slider's thumb |

## Colour: meaning

Never replaced by a Module colour.

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--destructive` | `oklch(0.57 0.19 27)` | same | Delete, overdue, errors |
| `--destructive-foreground` | `oklch(0.99 0 0)` | same | |
| `--success` † | `oklch(0.6 0.12 155)` | same | Saved, synced |

## Colour: Modules

One colour per Module. The core has none.

| Token | Module | Light | Dark | Pages and Types |
|---|---|---|---|---|
| `--m-lists` | Lists | `oklch(0.66 0.13 72)` | `oklch(0.82 0.11 78)` | Lists and Shops (in Notes) |
| `--m-food` | Food | `oklch(0.6 0.13 38)` | `oklch(0.76 0.11 40)` | Recipes · Recipe, Variation, Meal, Ingredient |
| `--m-fitness` | Fitness | `oklch(0.56 0.13 255)` | `oklch(0.76 0.104 250)` | Gym, Cardio · Exercise, Workout template, Workout, Cardio activity |
| `--m-goals` | Goals | `oklch(0.55 0.13 298)` | `oklch(0.76 0.104 300)` | Goals · Goal |
| `--m-wardrobe` | Wardrobe | `oklch(0.59 0.13 355)` | `oklch(0.77 0.104 355)` | Wardrobe · Garment, Outfit, Outfit worn |
| `--m-finance` | Finance | `oklch(0.57 0.13 160)` | `oklch(0.78 0.104 160)` | Finance · Account |
| `--m-core` † | Core | = `--muted-foreground` | = `--muted-foreground` | The core's Types (Thought, Note, Task, Event): grey icons on `--muted` tiles, never a colour |
| `--on-module` † | | `oklch(0.99 0 0)` | `oklch(0.2 0.01 260)` | Text on a solid Module colour |
| `--tile-mix` † | | `14%` | `16%` | Strength of a Module tint (tiles, badges, selected states) |

Inside `ModuleScope`, `--mc` is the current Module's colour; components read
`--mc`, never a Module token directly. `ModuleScope` also sets these, which
components use for their selected and pressed states:

| Token | Outside a Module (and on core pages) | Inside a Module's `ModuleScope` | Used for |
|---|---|---|---|
| `--selected` † | = `--accent` | `--mc` at `--tile-mix` | Selected tab, current drawer item |
| `--selected-foreground` † | = `--foreground` | = `--mc` | Their text |
| `--pressed-foreground` † | = `--foreground` | = `--mc` | A pressed Toggle's icon |

### Adding a Module colour

A new Module (Health, for example) gets one hue, at least 30° from every
existing one, at the same lightness and chroma as the others (light
L 0.55–0.66, C 0.13; dark L 0.76–0.82, C 0.104–0.11). Check it against
both backgrounds, add it to this table, and record it in the Module's spec.

## Type

One family: **Plus Jakarta Sans** (400–800), with **Geist Mono** only for
keyboard shortcuts and code. Numbers that line up use tabular figures.

| Token | Size / line height | Weight | Tracking | Used for |
|---|---|---|---|---|
| `text-h1` | 24px / 1.2 | 750 | −0.025em | Page title (22px on a phone) |
| `text-h2` | 17px / 1.3 | 700 | −0.015em | Card and section titles, dialog titles |
| `text-day` | 20px | 750 | −0.02em | Day numbers on Plan |
| `text-base` | 14px / 1.45 | 400; 600 for titles | 0 | Body, row titles, buttons |
| `text-sm` | 13px | 400–700 | 0 | Meta, small buttons, section labels (700) |
| `text-xs` | 12px | 400–700 | 0 | Badges, counts, help text, captions |
| `text-kicker` | 12px | 700 | 0.07em, uppercase | The line above a page title |
| `text-kbd` | 10.5px Geist Mono | 500 | 0 | Keyboard shortcuts |

## Spacing

Tailwind's 4px-based scale, using only these steps: **2, 4, 6, 8, 10, 12, 14,
16, 18, 20, 24, 30, 32, 36 px**.

| Where | Value |
|---|---|
| Page padding (sides) | 36px desktop, 20px phone |
| Page header | 30px top, 18px bottom; 12px top, 20px bottom on a phone |
| Top bar (phone) | 56px high, below the notch; the menu button 8px from the edge |
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
| `--radius-row` | 14px | List rows |
| `--radius-lg` | 18px | Cards, popovers, menus, Plan day columns |
| `--radius-panel` | 20px | The drawer |
| `--radius-xl` | 24px | Dialogs, sheets |
| `--radius-full` | 999px | Badges, tabs, chips, switch, avatar, progress |

As Tailwind classes: `rounded-xs`, `rounded-sm`, `rounded-md`,
`rounded-control` (`--radius`), `rounded-row`, `rounded-lg`, `rounded-panel`,
`rounded-xl`, `rounded-full`.

A shape inside another is rounded to the outer radius minus the gap between
them (a toggle item: 12px − 3px = 9px).

## Shadow and edge

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--shadow-card` | `0 0 0 1px var(--hairline), 0 1px 2px oklch(0.2 0.01 260 / 5%), 0 6px 20px -8px oklch(0.2 0.01 260 / 13%)` | `0 0 0 1px var(--hairline), inset 0 1px 0 oklch(1 0 0 / 3.5%), 0 10px 30px -14px oklch(0 0 0 / 60%)` | Cards, rows, the drawer, outline buttons, chips, Plan cards |
| `--shadow-pop` | `0 2px 4px oklch(0.2 0.01 260 / 6%), 0 16px 40px -12px oklch(0.2 0.01 260 / 26%)` | `inset 0 1px 0 oklch(1 0 0 / 4.5%), 0 20px 50px -16px oklch(0 0 0 / 70%)` | Menus, popovers, toasts |
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
| Tile | 32px (icon 16px); small 24px (icon 14px) | |
| Checkbox | 18px | |
| Switch | 38 × 22px | |
| Badge | 22px high | |
| Avatar | 30px | |
| Drawer | 252px wide (240px panel + 12px inset); a 288px Sheet on a phone | |
| Icon | 16px, stroke 1.75; 12px and 14px small; 22px large | |

## Motion

| Token | Value | Used for |
|---|---|---|
| `--duration` | 150ms | Colour, shadow and transform changes |
| `--duration-sheet` | 300ms | A Sheet sliding in and out, and its overlay |
| `--ease-sheet` | `cubic-bezier(0.32, 0.72, 0, 1)` | A Sheet's slide: fast, then settling |
| Skeleton pulse | 2s ease-in-out | Loading |

With `prefers-reduced-motion`, transitions and the pulse are off.
