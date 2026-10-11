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
| **Button** | `primary` (ink, or the Type colour inside `TypeScope`), `secondary`, `outline` (card fill with the hairline edge, no border), `ghost`, `destructive`. Sizes: default 40px, `sm` 32px, `icon` and `icon-sm` (square). Radius 12px, weight 600. | One `primary` per view, for the main action. Icon left of the label, 16px. Icon-only buttons need an accessible label and a tooltip. |
| **Badge** | `secondary`, `outline` (muted fill, muted text), `destructive` (tinted), plus `TypeBadge`. 22px pill, 12px, weight 600. | Short labels only: a Label, a state, a count. Not a button. |
| **Input**, **Textarea** | Filled with `--input`, no border; on focus the card fill with the 3px halo. Default 40px; `sm` 32px in tables and toolbars. | Every input has a visible label, except search, which has a search icon. |
| **Select** | As Input, with a chevron. | Options open in a menu styled as DropdownMenu. |
| **Label** | 13px, weight 600. | Above the field, 6px gap. |
| **Checkbox** | 18px, 6px radius, 1.5px `--input-strong` edge; checked fills with `--primary`. With a `colour`, the edge and the fill are that Type's colour. | Ticking a Task, a sub-task, a set. A Task's checkbox is blue wherever it appears, Inbox included. |
| **Switch** | 38 × 22px; on fills with `--primary`. | Settings that take effect at once. |
| **RadioGroup** | 16px, `--primary` dot. Variant `cards`: each option a card-filled row (title and a muted line); the chosen one has a 1.5px `--foreground` ring and no fill. | Two to four exclusive options in a form. `cards` when each option needs a line saying what it does ("Apply the change to"), confirmed by a primary Save. |
| **Slider** | 4–6px track, `--primary` range, 16px thumb. | Durations and amounts with a sensible range. |
| **Tabs** | Pills with no track: selected is `--accent` fill; inside `TypeScope`, the Type's tint with its text colour. 32px, weight 600. Optional count. Too many for the width: they scroll sideways, with no scrollbar. | Switching between views of the same set (All tasks, By label; a Note's Labels). |
| **ToggleGroup** | Muted track (3px padding, 12px radius); the selected item is a card-filled pill with `--shadow-card`. 28px items. | Choosing one of a few values in place (Day / Week / Month, Lunch / Dinner). |
| **Toggle** | Icon only, 32px; pressed fills the icon (the Type colour inside `TypeScope`). | Star a Task, pin a Note. |
| **Card** | `--card` fill, 18px radius, `--shadow-card`, 20px padding. | A self-contained object: a Recipe, a Note, a settings group. Not for every block of content. |
| **Separator** | 1px, foreground at 7%. | Rare: between a dialog's body and footer. Space separates everything else. |
| **DropdownMenu** | `--popover`, 18px radius, `--shadow-pop`, 6px padding; 36px items, 8px radius, highlighted with `--accent`; 12px muted group labels; shortcuts in Kbd on the right. | Actions on an Item ("Convert to"). Destructive items last, in red. A label sits inside a `DropdownMenuGroup` with its items. |
| **Popover** | As DropdownMenu, 14px padding for forms. | A small form tied to a control (planning a Recipe). |
| **Tooltip** | Ink fill, 12px weight 600, 8px radius. | Names an icon-only control, and its shortcut. |
| **Dialog** | `--popover`, 24px radius, `--shadow-dialog`, over `--overlay`; centred, never attached to an edge (inset 18px on a phone), as tall as its content up to the screen, its body in a ScrollArea. Header: the title or the Item's own controls on the left, its actions (star or pin, the "…" menu) and Close on the right. Capture and Search sit near the top rather than centred, so the list below stays in view. | Capture; an Item opened as a popup ([patterns](patterns.md#opening-an-item)); focused tasks that need the whole attention. |
| **AlertDialog** | As Dialog; actions stacked on a phone, destructive first. | Confirming something that loses work. |
| **Sheet** | Attached to its edge, full height, `--card`, 24px radius on the open side only, `--shadow-dialog`, over `--overlay`. Slides the whole way in and out (`--duration-sheet`, `--ease-sheet`). | The drawer on a phone (left, 288px) only. Items open in a Dialog or on their own page, never a Sheet. |
| **Sidebar** | shadcn's Sidebar in its standard form: the drawer. On desktop 256px, full height, attached to the left edge, `--sidebar`, divided from the page by a `--hairline` line; on a phone a left Sheet. Header, content (in a ScrollArea) and footer. `SidebarTrigger` is the phone's menu button: ghost, 48px, 22px icon. Pages are `SidebarMenuButton`s (38px, 44px on a phone), counts `SidebarMenuBadge`, "Later" a `SidebarGroupLabel`. See [patterns](patterns.md#the-drawer). | Only in `AppShell`. |
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
| **Command** | In a Dialog near the top on a computer (560px), or as the Search page on a phone. A 48px input with a search icon, then results grouped by Type under 12px muted labels, each a 52px item with a small TypeTile, the title (the match in bold) and a muted line; the highlighted item `--accent`. No footer. | Search ([SRC-001](../10-requirements/cross-cutting/search.md#requirements)). |
| **ScrollArea** | Wherever content scrolls: the page, the drawer, a Dialog's body, a long menu. A 6px `--scroll-thumb` pill 2px from the edge, shown while scrolling or hovered; no track. Sideways too (Tabs). | Every scrolling box. No browser scrollbars anywhere: what still scrolls natively (a long text field) gets a thin scrollbar in `--scroll-thumb`. |

## LifeOS components

Built once from the components above, in `@/components/lifeos`.

| Component | What it is | Rules |
|---|---|---|
| **AppShell** | The drawer (Sidebar) and the page area: a 256px column and the rest; the page scrolls in a ScrollArea. On a phone, a top bar that stays at the top of every page: the menu button, the brand and, on the right, Capture; the drawer becomes a left Sheet. | Every page sits in one. |
| **PageHeader** | The title (`text-h1`), and the page's main action on the right: a primary `sm` button with a "+" ("New task"). On a phone the main action becomes a Fab instead. No line above the title. | One per page, at most one main action. |
| **Fab** | The phone's floating button: 56px, `--radius-lg`, primary, `--shadow-pop`, a 22px "+" and no words, named for screen readers ("New task", "Capture"). Bottom right, clear of the home bar. | Phones only; a page's main action, from PageHeader, or Inbox's Capture. |
| **TypeScope** | Wraps a page about one family of Types, or part of one (`data-colour`). Sets `--tc` and makes `--primary`, `--ring`, `--selected` and `--pressed-foreground` the Type's ([tokens](tokens.md#colour-types)). The drawer sits outside it. | Pages about one family of Types (Tasks, Notes, Recipes, Gym…); never Inbox, Plan, Search or Settings. |
| **TypeTile** | 32px (or 24px) rounded square with the Type's icon in its text colour on its tint. | The first thing in a row that shows an Item, unless it has a checkbox. |
| **TypeBadge** | A Badge in the Type's text colour on its tint. | A Type-specific state ("Last cooked Mon"). |
| **TypeDot** | 8px dot in the Type colour; hollow when switched off. | Keys and filters. |
| **ItemRow** | A card-filled row: tile or checkbox, title (weight 600) and meta (13px muted, separated by "·"), then actions that appear on hover. 14px radius, min 56px high, `--shadow-card`, 6px apart. A starred Task shows a filled star in the Type colour at the end. | Any list of Items. |
| **SectionLabel** | 13px weight-700 heading, optional count Badge; red for Overdue. | Above a group of rows. |
| **PlanCard** | A small card in a Plan day: type line with icon in the Type colour, title (13px weight 650), time. Past Items at 50% opacity, no shadow. | Plan only. |
| **DayColumn** | A Plan day: uppercase day name, day number (`text-day`; today in an ink pill), and a lightly filled column. | Plan only. |
| **FilterChip** | 32px pill with a TypeDot; on is card-filled with the shadow, off is outlined with a hollow dot. | The key that also filters (Plan). |
| **BrandMark** | The app icon at 24px ([patterns](patterns.md#the-app-icon)). | Beside "LifeOS": the drawer, the phone's top bar, sign-in. |
| **SyncStatus** | "All changes saved" with a green tick, or what's waiting to send. | In the drawer footer. |
