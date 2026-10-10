# Patterns

*How screens are put together from the [components](components.md) and
[tokens](tokens.md). See them in [reference.html](reference.html).*

## Page anatomy

```
AppShell
├── Drawer (Sidebar)          brand · Capture · pages · Later · sync status · you
└── Page
    ├── PageHeader            kicker · title · actions (right)
    └── Content               36px sides, 20px between sections
        ├── Tabs or ToggleGroup (optional)
        └── Sections          SectionLabel + rows, cards or a grid
```

- One PageHeader and at most one primary button per page.
- Details open in a right Sheet beside the list; focused tasks (capture,
  confirming) in a Dialog.
- Content never fills edge to edge without the 36px page padding.

## The drawer

- Order and pages are fixed by [ADR-0026](../20-architecture/adr/0026-navigation-drawer.md).
- Each page's icon is in its Module's colour; core pages' icons are grey.
- The current page is filled `--accent` (core) or tinted in its Module colour
  (Module pages), with text in `--foreground` at weight 650.
- Counts are 12px, muted, tabular, on the right. "Later" pages sit at 50%
  opacity.
- The Capture button is ink in the drawer on every page (from Stage 2, with
  capture).
- Each page's icon: Inbox `inbox`, Plan `calendar-days`, Tasks
  `square-check-big`, Notes `sticky-note`, Recipes `chef-hat`, Gym
  `dumbbell`, Goals `target`, Wardrobe `shirt`, Cardio `footprints`, Finance
  `wallet`.
- The header holds the brand (a 24px ink square with "L", then "LifeOS" at
  16px weight 750) and, from Stage 2, Search; the foot holds SyncStatus and your row
  (Avatar, name, Space). Your row opens a menu: Sign out, and Settings once
  it exists.

## Sign-in page

- The brand above one Card, centred on `--background`, 360px wide.
- One button, "Continue with Google": `outline`, full width, with Google's
  own multicoloured "G" — the one colour that isn't a token, because
  Google's branding rules require it.
- No email or password fields ([ACC-001](../10-requirements/cross-cutting/spaces-and-sharing.md#acc-001--sign-up-and-sign-in-with-google)).

## Privacy page

The one page with paragraphs: a legal page that exists only because Google
asks for one. It lives at `/privacy`, reachable without signing in, and
nothing in the app links to it. 720px wide, `text-h1` title and `text-h2`
sections.

## Module colour

The rule: **colour says which Module an Item belongs to, and nothing else.**

| Where | Core page (Inbox, Plan, Tasks, Notes) | Module page (Recipes, Gym, Goals, Wardrobe…) |
|---|---|---|
| Drawer icon | Each page's own colour | Each page's own colour |
| An Item anywhere | ModuleTile, ModuleBadge or dot in the Item's Module colour | Same |
| Kicker | Muted | Module colour |
| Primary button, checkbox, progress, focus ring | Ink | Module colour (`ModuleScope`) |
| Selected tab, current drawer item | `--accent` | Module tint, Module-coloured tab text |
| Page background, body text, paragraphs | Never coloured | Never coloured |
| Overdue, delete, error · saved, done | Red · green | Red · green |

- An Item keeps its own Module colour on another Module's page: the Goal a
  workout counts towards stays violet on the Gym page.
- **Contrast:** Module colour is used for text only when bold and when it
  reaches 4.5:1 on its background. Where it doesn't (Lists amber in light
  mode), the text stays `--foreground` and only the icon is coloured.

## Lists of Items

- ItemRows 6px apart, each a card-filled row with the hairline edge; no
  divider lines.
- Order inside a row: tile or checkbox → title and meta → hover actions.
- Meta parts are separated by "·"; times and counts in tabular figures.
- A done Task: title struck through in `--muted-foreground`.
- Row actions (Note, Task, the "…" menu) appear on hover and focus; on a
  phone, the "…" menu is always visible.

## Plan

- A week is seven DayColumns, 10px apart, Monday first. Today's number sits
  in an ink pill and its column is filled a little more.
- Each Item is a PlanCard in its Module's colour; past Items fade to 50%.
- FilterChips above the week act as the key and the filter.

## Forms

- Label above, field below, 6px apart; help text 12px muted below.
- Fields are filled, never outlined. Two short fields may sit side by side.
- The primary action is last on the right (full width on a phone); Cancel or
  Close is an outline button beside it.

## States

| State | How it looks |
|---|---|
| Hover | `--accent` fill (ghost and outline buttons, rows, menu items) |
| Focus | 3px `--ring-soft` halo; inputs switch to the card fill |
| Selected / current | `--accent` fill; Module tint inside `ModuleScope` |
| Disabled | 50% opacity, no hover |
| Loading | Skeletons shaped like the content, after about 300ms |
| Saved / waiting to send | SyncStatus in the drawer; an Item not yet sent shows "Not sent yet" with a cloud icon in its meta |
| Not saved | An Item whose change the server refused shows "Not saved" in red with a `cloud-alert` icon in its meta, and SyncStatus counts it ([OFF-004](../10-requirements/cross-cutting/offline.md#off-004--a-write-that-cant-be-saved-is-not-lost-silently)) |
| Offline | An Alert at the top of the content |
| Error | Red text under the field, or a toast that says what went wrong and what to do |
| A screen that crashes | Its PageHeader title says "Something went wrong", with one primary button, "Reload". The crash is recorded in `ops.events` ([runbook](../40-operations/runbook.md#noticing-problems)) |
| Empty | Not designed yet: designed when the first empty page is built, and added here first |

## Icons

Lucide only, at 16px with a 1.75 stroke (12 or 14px small, 22px large).
Grey by default; the Module colour only in tiles, the drawer and Module
kickers. Each Type always uses the same icon: Thought `lightbulb`, Note
`file-text`, Task `square-check-big`, Event `calendar`, Shop `shopping-cart`,
Meal `utensils`, Recipe `chef-hat`, Workout `dumbbell`, Cardio activity
`footprints`, Goal `target`, Outfit and Garment `shirt`.

## Copy

- Sentence case everywhere; no full stops in labels and buttons.
- Buttons and menu items name what happens ("Add to Sun dinner", "Restore").
- Toasts say what happened ("Restored "Book Japan flights"") with Undo.
- Dates: "Fri 9 Oct", "Today", "Tomorrow"; times 24-hour ("18:30").
- No paragraphs of explanation in the app.

## Phone

- The drawer becomes a left Sheet, 288px, attached to the left edge and the
  full height of the screen, opened from the menu button in the top bar;
  choosing a page closes it.
- The top bar and the drawer keep clear of the notch and the home bar.
- Page padding 20px; page title 22px; the main action can float bottom right
  as a 48px primary button.
- Dialogs sit inset 18px from the sides; AlertDialog actions stack, full
  width.

## Dark and light

Every screen is checked in dark first, then light. Nothing is designed for
one mode only: every colour comes from a token with both values.
