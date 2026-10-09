# Components

*Every component a screen may use. Screens import them from
`@/components/ui` (shadcn's, restyled through [tokens](tokens.md)) and
`@/components/lifeos` (LifeOS's own, built from shadcn's). Nothing else.*

How shadcn components are customised:

- **Through the theme first.** Most of the look comes from shadcn's theme
  variables in the theme file.
- **Then in the component's own file**, in its variant definitions (`cva`),
  once, for everyone. The variants listed here are the only ones.
- **Never on a screen.** A screen may place a component (margin, grid
  position, width in a layout) but never restyles it: no colour, size,
  radius, shadow or font classes.

A component not listed here is added to this page before it is used.

## shadcn components

| Component | Variants and sizes | Rules |
|---|---|---|
| **Button** | `primary` (ink, or the Module colour inside `ModuleScope`), `secondary`, `outline` (card fill with the hairline edge, no border), `ghost`, `destructive`. Sizes: default 40px, `sm` 32px, `icon` and `icon-sm` (square). Radius 12px, weight 600. | One `primary` per view, for the main action. Icon left of the label, 16px. Icon-only buttons need an accessible label and a tooltip. |
| **Badge** | `secondary`, `outline` (muted fill, muted text), `destructive` (tinted), plus `ModuleBadge`. 22px pill, 12px, weight 600. | Short labels only: a Label, a state, a count. Not a button. |
| **Input**, **Textarea** | Filled with `--input`, no border; on focus the card fill with the 3px halo. Default 40px; `sm` 32px in tables and toolbars. | Every input has a visible label, except search, which has a search icon. |
| **Select** | As Input, with a chevron. | Options open in a menu styled as DropdownMenu. |
| **Label** | 13px, weight 600. | Above the field, 6px gap. |
| **Checkbox** | 18px, 6px radius, 1.5px `--input-strong` edge; checked fills with `--primary`. | Ticking a Task, a step, a set. |
| **Switch** | 38 × 22px; on fills with `--primary`. | Settings that take effect at once. |
| **RadioGroup** | 16px, `--primary` dot. | Two to four exclusive options in a form. |
| **Slider** | 4–6px track, `--primary` range, 16px thumb. | Durations and amounts with a sensible range. |
| **Tabs** | Pills with no track: selected is `--accent` fill; inside `ModuleScope`, a Module tint with Module-coloured text. 32px, weight 600. Optional count. | Switching between views of the same set (All, Starred, Ideas). |
| **ToggleGroup** | Muted track (3px padding, 12px radius); the selected item is a card-filled pill with `--shadow-card`. 28px items. | Choosing one of a few values in place (Day / Week / Month, Lunch / Dinner). |
| **Toggle** | Icon only, 32px; pressed fills the icon (Module colour inside `ModuleScope`). | Star, pin. |
| **Card** | `--card` fill, 18px radius, `--shadow-card`, 20px padding. | A self-contained object: a Recipe, a Note, a settings group. Not for every block of content. |
| **Separator** | 1px, foreground at 7%. | Rare: between a dialog's body and footer. Space separates everything else. |
| **DropdownMenu** | `--popover`, 18px radius, `--shadow-pop`, 6px padding; 36px items, 8px radius, highlighted with `--accent`; 12px muted group labels; shortcuts in Kbd on the right. | Actions on an Item ("Convert to"). Destructive items last, in red. A label sits inside a `DropdownMenuGroup` with its items. |
| **Popover** | As DropdownMenu, 14px padding for forms. | A small form tied to a control (planning a Recipe). |
| **Tooltip** | Ink fill, 12px weight 600, 8px radius. | Names an icon-only control, and its shortcut. |
| **Dialog** | `--popover`, 24px radius, `--shadow-dialog`, over `--overlay`. | Capture, and focused tasks that need the whole attention. |
| **AlertDialog** | As Dialog; actions stacked on a phone, destructive first. | Confirming something that loses work. |
| **Sheet** | Inset 12px from the edge, `--card`, 24px radius. Right for an Item's details; left for the drawer on a phone. | Details beside a list without leaving it. |
| **Sidebar** | The drawer: `--sidebar`, 20px radius, inset 12px, `--shadow-card`. See [patterns](patterns.md#the-drawer). Built as part of `AppShell`, not as shadcn's Sidebar. | Only in `AppShell`. |
| **Calendar** | 34px days, rounded; today `--accent`; selected `--primary`. Weeks start on Monday. | Picking a do-on or due date, inside a Popover. |
| **Table** | 12px weight-600 muted headers; 6 × 8px cells; separators at foreground 6%. | Tabular data: workout sets, Recently deleted. |
| **Pagination** | Ghost buttons; current page `--accent`. | Long tables only. |
| **Progress** | 8px pill, `--muted` track, `--primary` fill. | A share of something done: sets, a goal. |
| **Skeleton** | `--muted`, 8px radius, 2s pulse. Shaped like what's loading. | Loading for longer than about 300ms. |
| **Sonner** (toast) | `--popover`, 18px radius, `--shadow-pop`, bottom right (bottom on a phone). | Confirming what just happened, with Undo where possible. |
| **Accordion** | Bold trigger with a tile and a chevron; no lines. | Groups that can collapse (Tasks by Label, exercises). |
| **Avatar** | 30px circle, `--secondary`, initials 11px weight 700. | People. |
| **Kbd** | Geist Mono 10.5px, 18px high, 6px radius, `--muted`. | Shortcuts in buttons, menus and tooltips. |
| **Alert** | Card fill with icon, bold title and muted description. | A state worth noticing on the page (offline). Not for decoration. |
| **Command** | Not designed yet. Designed with Search in Stage 2 and added here first. | |

## LifeOS components

Built once from the components above, in `@/components/lifeos`.

| Component | What it is | Rules |
|---|---|---|
| **AppShell** | The drawer and the page area: a 252px column and the rest. On a phone the drawer becomes a left Sheet. | Every page sits in one. |
| **PageHeader** | Optional kicker (12px, uppercase, Module colour on a Module page, muted on a core page), the title (`text-h1`), and actions on the right (`sm` buttons). | One per page. At most one primary action. |
| **ModuleScope** | Wraps a Module's page or part of one (`data-module`). Sets `--mc` to the Module colour, and `--primary`, `--ring`, `--selected` and `--pressed-foreground` to it ([tokens](tokens.md#colour-modules)). The drawer sits outside it, so stays ink. | Module pages only — never core pages. |
| **ModuleTile** | 32px (or 24px) rounded square with the Type's icon: Module colour on its tint; core Types grey on `--muted`. | The first thing in a row that shows an Item. |
| **ModuleBadge** | A Badge in the Module colour on its tint. | Naming the Module, or a Module-specific state ("Last cooked Mon"). |
| **ModuleDot** | 8px dot in the Module colour; hollow when switched off. | Keys and filters. |
| **ItemRow** | A card-filled row: tile or checkbox, title (weight 600) and meta (13px muted, separated by "·"), then actions that appear on hover. 14px radius, min 56px high, `--shadow-card`, 6px apart. | Any list of Items. |
| **SectionLabel** | 13px weight-700 heading, optional count Badge. | Above a group of rows. |
| **PlanCard** | A small card in a Plan day: type line with icon in the Module colour, title (13px weight 650), time. Past Items at 50% opacity, no shadow. | Plan only. |
| **DayColumn** | A Plan day: uppercase day name, day number (`text-day`; today in an ink pill), and a lightly filled column. | Plan only. |
| **FilterChip** | 32px pill with a ModuleDot; on is card-filled with the shadow, off is outlined with a hollow dot. | The key that also filters (Plan). |
| **SyncStatus** | "All changes saved" with a green tick, or what's waiting to send. | In the drawer footer. |
