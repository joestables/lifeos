# Patterns

*How screens are put together from the [components](components.md) and
[tokens](tokens.md). See them in [reference.html](reference.html).*

## Page anatomy

```
AppShell
├── Drawer (Sidebar)          brand · Capture · pages · Later · sync status · you
└── Page
    ├── PageHeader            title · main action (right; a Fab on a phone)
    └── Content               36px sides, 20px between sections, in a ScrollArea
        ├── Tabs or ToggleGroup (optional)
        └── Sections          SectionLabel + rows, cards or a grid
```

- One PageHeader and at most one primary button per page: the page's main
  action ("New task", "New note"), always in the same place and style.
- Items open in a Dialog or on their own page ([below](#opening-an-item));
  focused tasks (capture, confirming) in a Dialog.
- No browser scrollbars: whatever scrolls is a ScrollArea.
- Content never fills edge to edge without the 36px page padding.

## The drawer

- Order and pages are fixed by [ADR-0026](../20-architecture/adr/0026-navigation-drawer.md).
- shadcn's standard Sidebar: full height, attached to the left edge, a
  hairline between it and the page.
- Each page's icon is in its Type colour; Inbox's and Plan's are grey.
- The current page is filled `--sidebar-accent`, with text in `--foreground`
  at weight 650, on every page.
- Counts are 12px, muted, tabular, on the right. "Later" pages sit at 50%
  opacity.
- The Capture button sits under the brand, full width, ink on every page,
  with its shortcut (N) in a Kbd (from Stage 2, with capture).
- Each page's icon: Inbox `inbox`, Plan `calendar-days`, Tasks
  `square-check-big`, Notes `sticky-note`, Recipes `chef-hat`, Gym
  `dumbbell`, Goals `target`, Wardrobe `shirt`, Cardio `footprints`, Finance
  `wallet`.
- The header holds the brand (a 24px ink square with "L", then "LifeOS" at
  16px weight 750) and, from Stage 2, Search; the foot holds SyncStatus and your row
  (Avatar, name, Space). Your row opens Settings, where Sign out is (until
  Settings exists, it opens a menu with Sign out).

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

## Colour by Type

*([ADR-0043](../20-architecture/adr/0043-colour-by-type.md), Provisionally
agreed.)* The rule: **colour says what Type an Item is, and nothing else**,
used the same way on every screen.

| Where | Neutral page (Inbox, Plan, Search, Settings) | Page about one family of Types (Tasks, Notes, Recipes, Gym…) |
|---|---|---|
| Drawer icon | Each page's own colour | Each page's own colour |
| An Item anywhere | Its TypeTile, or its checkbox, in its Type's colour | Same |
| Main action, checked, selected tab, progress, focus ring | Ink | The page's Type colour (`TypeScope`) |
| Current drawer item | `--sidebar-accent` | `--sidebar-accent` |
| Page background, cards, body text, meta | Never coloured | Never coloured |
| Overdue, delete, error · saved, done | Red · green, with a word or icon | Same |

- An Item keeps its own colour on another page: the Goal a workout counts
  towards stays purple on the Gym page; a Task's checkbox is blue on Inbox.
- **No line above the page title** naming the Module: the title and the
  colour say where you are.
- **Text in a Type colour** uses its text value (`--tc-text`), which reaches
  4.5:1 on the page; text on a filled Type colour uses its foreground.
- **A state is never colour alone:** Overdue is red and says "Due…"; a
  Recipe's green is never read as "done".

## Opening an Item

| Type | On a computer | On a phone |
|---|---|---|
| Task | A Dialog over the page | A Dialog over the page |
| Note | A Dialog over the page | Its own page, with a back link to where you were |

- A Dialog keeps the page beneath where it was; closing it returns there.
- An Item's own page keeps the top bar (menu, brand, Capture), with a back
  link above the title.
- Changes are kept as they are made; there is no Save in an Item's Dialog.
- The Dialog's header holds the Item's mark (star, pin), its "…" menu
  (Convert to, Delete) and Close.

## Lists of Items

- ItemRows 6px apart, each a card-filled row with the hairline edge; no
  divider lines.
- Order inside a row: tile or checkbox → title and meta → hover actions.
- Meta parts are separated by "·"; times and counts in tabular figures.
- A Task's row starts with its checkbox (blue), never a tile; ticking it
  does it. Other Items start with their TypeTile.
- A done Task: title struck through in `--muted-foreground`.
- A starred Task shows a filled star at the end of its row.
- Row actions (Note, Task, the "…" menu) appear on hover and focus; on a
  phone, the "…" menu is always visible.

## Plan

- A week is seven DayColumns, 10px apart, Monday first. Today's number sits
  in an ink pill and its column is filled a little more.
- Each Item is a PlanCard in its Type's colour; past Items fade to 50%.
- FilterChips above the week act as the key and the filter.

## Forms

- Label above, field below, 6px apart. No help text under fields, and no
  keyboard hints in footers.
- Fields are filled, never outlined. Two short fields may sit side by side.
- The primary action is last on the right (full width on a phone); Cancel or
  Close is an outline button beside it.
- **Choosing between options that each need explaining** (changing a
  repeat: "This task", "This and following", "All"): a RadioGroup of
  `cards`; the chosen card has a ring, never a fill, and a primary Save
  confirms.

## States

| State | How it looks |
|---|---|
| Hover | `--accent` fill (ghost and outline buttons, rows, menu items) |
| Focus | 3px `--ring-soft` halo; inputs switch to the card fill |
| Selected / current | `--accent` fill; the Type's tint inside `TypeScope` |
| Disabled | 50% opacity, no hover |
| Loading | Skeletons shaped like the content, after about 300ms |
| Saved / waiting to send | SyncStatus in the drawer; an Item not yet sent shows "Not sent yet" with a cloud icon in its meta |
| Not saved | An Item whose change the server refused shows "Not saved" in red with a `cloud-alert` icon in its meta, and SyncStatus counts it ([OFF-004](../10-requirements/cross-cutting/offline.md#off-004--a-write-that-cant-be-saved-is-not-lost-silently)) |
| Offline | An Alert at the top of the content |
| Error | Red text under the field, or a toast that says what went wrong and what to do |
| A screen that crashes | Its PageHeader title says "Something went wrong", with one primary button, "Reload", under it. The crash is recorded in `ops.events` ([runbook](../40-operations/runbook.md#noticing-problems)) |
| Empty | Centred in the content, about a third of the way down: a 48px muted tile with the page's icon and an `text-h2` line saying so ("Nothing needs you"). No paragraph, no button unless there's one obvious thing to do |

## Icons

Lucide only, at 16px with a 1.75 stroke (12 or 14px small, 22px large).
Grey by default; a Type colour only in tiles, checkboxes, the drawer and
pressed Toggles. Each Type always uses the same icon: Thought `lightbulb`, Note
`file-text`, Task `square-check-big`, Event `calendar`, Shop `shopping-cart`,
Meal `utensils`, Recipe `chef-hat`, Workout `dumbbell`, Cardio activity
`footprints`, Goal `target`, Outfit and Garment `shirt`. Marks: star (Task),
pin (Note), heart (Recipe). A Task that repeats shows `repeat` in its meta;
sub-tasks `list-checks` with "2/5".

## Copy

- Sentence case everywhere; no full stops in labels and buttons.
- Buttons and menu items name what happens ("Add to Sun dinner", "Restore").
- Toasts say what happened ("Restored "Book Japan flights"") with Undo.
- Dates: "Fri 9 Oct", "Today", "Tomorrow"; times 24-hour ("18:30").
- No paragraphs of explanation in the app.

## Phone

- **The top bar stays at the top of every page**, an Item's own page
  included: the menu button on the left, the brand, and Capture on the right
  ([CAP-002](../10-requirements/cross-cutting/capture.md#cap-002--capture-from-any-page-without-losing-my-place)).
  It keeps clear of the notch.
- The drawer becomes a left Sheet, 288px, attached to the left edge and the
  full height of the screen, opened from the menu button; choosing a page
  closes it.
- Page padding 20px; page title 22px; Tabs scroll sideways under it.
- **The main action floats** bottom right as a Fab: a "+" only, no words.
  Inbox's Fab opens capture, as the top bar's Capture does.
- Dialogs sit inset 18px from the sides, as tall as their content;
  AlertDialog actions stack, full width.
- Row actions: the "…" menu is always visible; a Thought in Inbox can be
  swiped to make it a Task.

## Dark and light

Every screen is checked in dark first, then light. Nothing is designed for
one mode only: every colour comes from a token with both values.
