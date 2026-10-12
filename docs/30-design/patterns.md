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
  with its shortcut (N) in a Kbd, on a computer; a phone's is in the top bar.
- Each page's icon: Inbox `inbox`, Plan `calendar-days`, Tasks
  `square-check-big`, Notes `sticky-note`, Recipes `chef-hat`, Gym
  `dumbbell`, Goals `target`, Wardrobe `shirt`, Cardio `footprints`, Finance
  `wallet`.
- The header holds the brand (the app icon at 24px, then "LifeOS" at 16px
  weight 750) and, on its right, Search: a muted ghost `search` button, with
  "Search /" in a Tooltip on a computer, 44px in a phone's drawer. The foot
  holds SyncStatus and your row (Avatar, name, Space). Your row opens
  Settings, where Sign out is.

## The app icon

Agreed with Joe on 11 October 2026 (option C on the
[Stage 2 design canvas](https://claude.ai/artifact/N5ZmkZnYg51kcHySQ8c6F6)):
**a graph** — a node in each Type colour, on a hexagon, linked to a white
centre and to each other, on the dark `--background`.

- The same icon in light and dark: the dark theme's colours, as hex, since
  icons can't read the theme.
- `public/icon.svg` is full bleed (the Apple touch icon and Android's
  maskable icon, cropped by the system; everything sits inside the central
  80%); `public/favicon.svg` has 112/512 rounded corners (the browser tab,
  the installed app's "any" icon, and the brand mark).
- The brand mark is `BrandMark`: the icon at 24px, beside "LifeOS" in the
  drawer, the phone's top bar and the sign-in page.
- The PNGs (`icon-192`, `icon-512`, `icon-maskable-512`,
  `apple-touch-icon`) are drawn from the SVGs; change the SVGs and draw them
  again, never the PNGs alone.

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
| Thought | A Dialog over the page | A Dialog over the page |
| Task | A Dialog over the page | A Dialog over the page |
| Note | A Dialog over the page | Its own page, with a back link to where you were |

- **Every Item has a link of its own**, `/item/<id>`: its own page where its
  Type opens as one, otherwise its home page (Inbox for a Thought, Tasks,
  Notes) with it open in a Dialog. A Dialog is `?item=<id>` on the page
  beneath, so Back closes it; a link to an Item that can't be seen says
  "This can't be found" (ITM-001).
- A Dialog keeps the page beneath where it was; closing it returns there,
  and Back from an Item's own page returns to the same place on the list.
- An Item's own page keeps the top bar (menu, brand, Capture), with a back
  link above the title.
- Changes are kept as they are made; there is no Save in an Item's Dialog.
- The Dialog's header holds the Type's tile and name, the Item's mark
  (star, pin), its "…" menu (Convert to, Delete) and Close; it opens with
  the Dialog itself focused, not its first control.
- **Convert to** lists only the Types this Type converts into that the app
  has yet; a toast says what it became ("Converted into a Task").
- **Delete** closes the Item and says so in a toast with Undo ("Deleted
  "Renew insurance""); the Item waits in Recently deleted.

## Capture

[CAP-001–004](../10-requirements/cross-cutting/capture.md#requirements);
the CaptureDialog in [components](components.md).

- Opens over the page with one tap or N (not while typing in a field), the
  line ready to type; Enter saves. Saving or closing changes nothing on the
  page but the new Item.
- It makes a Thought unless switched to Task, and starts as a Thought every
  time.
- Under the line, for a Thought with a date: the offer, "Task, Fri 18:00?",
  which switches to Task when tapped and is never taken on its own. For a
  Task: what it will be saved with, as Badges ("Fri 16 Oct 18:00", "Due
  Fri 16 Oct", and the Reminder's time with a bell). Nothing shows when the
  line has no date.
- Dates as capture says them: "Today", "Tomorrow", "Fri" within the week,
  else "Fri 23 Oct".
- A toast says what was made, with Undo: "Thought saved", "Task saved · Fri
  18:00".

## Search

[SRC-001, SRC-002](../10-requirements/cross-cutting/search.md#requirements);
Command in [components](components.md). Neutral, as it mixes Types.

- Opens from the drawer's Search button, or with / on a computer (not while
  typing in a field, nor over a Dialog), ready to type: a Dialog near the top
  on a computer; on a phone, the Search page, which keeps what was typed so
  going back from a result finds it again.
- Results come as I type, best match first, grouped by Type ("Tasks",
  "Notes", "Thoughts"), each group where its best result is. Each shows a
  small TypeTile, its title and one muted line, the words matched in bold.
- The line: the line of its body the search found; else its Labels, if they
  matched; else a Task's day and time, its due date (red once passed),
  "Completed Sun 4 Oct" or "Someday", or when a Thought was captured.
- The arrow keys move the highlight; Enter or a tap opens the Item where its
  Type opens ([Opening an Item](#opening-an-item)), closing the Dialog.
- Nothing matching: "Nothing found". Offline, or with the server out of
  reach, the Items on the device are searched, and a muted line with
  `cloud-off` says "Offline · Results may be incomplete" (or "Can't reach
  LifeOS · …").

## Notes

[NTE-001–004](../10-requirements/views/notes.md#requirements); NoteCard,
NoteEditor and LabelPicker in [components](components.md).

- Under the title, Tabs: "All", then each Label a Note has, A–Z; choosing
  one narrows the page to it until All is chosen again.
- "Pinned", then "Others", each a grid of NoteCards, most recently changed
  first; without pinned Notes the grid has no heading.
- "New note" opens an empty Note with its title ready to type; nothing is
  kept until something is typed, so closing it untouched leaves nothing
  behind.
- No Notes: an empty state, "No notes yet".

## Tasks

[TSK-001–011](../10-requirements/views/tasks.md#requirements); TaskDetails,
DateField, TimeField, RepeatField, SubtaskList and AddRow in
[components](components.md).

- Under the title, Tabs: All tasks, By label, Recurring, Completed.
- A repeating Task shows only its next open occurrence, in every list.
- **All tasks**: Overdue, Today, Tomorrow, each remaining day of this week by
  its name, Later, No date, Someday; each a SectionLabel and its rows,
  hidden when empty. A Task sits under its do-on date, or its due date when
  it has none.
- **By label**: an Accordion item per Label with Tasks (A–Z), then No label,
  each open; a Task with two Labels is under both, and rows leave Labels
  out of their meta. Each Label's group ends with an AddRow, "Add a task",
  which gives the new Task that Label.
- **Recurring**: "On a schedule", then "After it's done", each a
  SectionLabel and rows of each repeating Task's next occurrence, soonest
  first; the row's meta gives its day and its repeat in full ("Every
  Monday").
- **Completed**: done Tasks, most recently changed first.
- A Task's row: its Checkbox (ticking it is done, with Undo), then title and
  meta: time, "Since Thu", the due date (red once passed), its repeat
  (`repeat` and "Weekly"), Labels, sub-tasks "2/5"; on hover Tomorrow and the star; the "…" menu holds
  Tomorrow, Someday and Delete. A starred Task shows its filled star.
- "New task" opens capture as a Task.
- Setting a time with no do-on date opens the do-on Calendar to ask for the
  day.
- **Reminders** sit under the dates: a ReminderList, each line opening the
  Reminder Dialog to change it. A Thought's popup has Reminders too, at a
  set time only.
- **Repeat** sits with Do on, Time and Due. It opens a Dialog, "Repeat": a
  RadioGroup of `cards` ("On a schedule", "After it's done"), then Every
  (a number and a Select of Days, Weeks, Months, Years); on a schedule, also
  On (a ToggleGroup of the days of the week, or a Select of "Day 12", "The
  second Monday", "The last Monday", "The last day") and Ends (Never, On a
  date, After a number of times). Footer: "Don't repeat" (outline, on the
  left, once it repeats), Cancel, Save.

## Settings

- One column of Cards, `max-w-3xl`; first Notifications and Reminders, side
  by side on a computer.
- **Notifications** (REM-001): a titled Card. "This device" with an
  outline "Turn on", until this device has notifications; where it can't,
  a muted few words instead ("Add LifeOS to your Home Screen first", "Not
  available in this browser", "Blocked in this browser's settings"). Then
  a CardRow per device: its name ("Android · Chrome"), "This device" or
  "Can't be reached" muted, a Switch, and a "…" menu with Remove.
- **Reminders** (REM-007, REM-008): a titled Card of CardRows: Default time
  (a TimeField), Dated tasks and Dated thoughts (Switches), Morning digest
  (a Switch) and, while it is on, Digest time.
- **Labels** is a Card on a computer — its title, "New label" (outline) on
  the right, then a CardRow per Label: its name, how many Items have it, and
  a "…" menu (Rename, Delete). On a phone, Settings links to a Labels page,
  where the Card has no title and "New label" is the page's main action.
- Renaming or making a Label is a small Dialog with one field and Save;
  deleting one asks first (AlertDialog), saying how many Items it comes off.
- A Card of CardRows leads on: Recently deleted (with its count), then Sign
  out, which acts at once and so has no chevron.
- **Recently deleted** has a back link to Settings above its title, and an
  ItemRow per deleted Item, newest first: its TypeTile, title, Type and
  "Deleted 10 min ago", and an outline Restore, which says so in a toast
  with Undo.

## Lists of Items

- ItemRows 6px apart, each a card-filled row with the hairline edge; no
  divider lines.
- Order inside a row: tile or checkbox → title and meta → hover actions.
- Meta parts are separated by "·"; times and counts in tabular figures.
- A Task's row starts with its checkbox (blue), never a tile; ticking it
  does it. Other Items start with their TypeTile.
- A done Task: title struck through in `--muted-foreground`.
- A starred Task shows a filled star at the end of its row.
- Row actions (Task, Note, Tomorrow, then the "…" menu) appear on hover and
  focus; on a phone only the "…" menu shows, always, holding the same
  actions. Tapping a row anywhere else opens its Item.
- Overdue's heading and count are red; a due date that has passed is red in
  the row's meta.

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
- **Choosing between options that each need explaining** (how a Task
  repeats: "On a schedule", "After it's done"): a RadioGroup of `cards`; the
  chosen card has a ring, never a fill, and a primary Save confirms.

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
| Notifications off | On Inbox, while none of my devices has notifications: an Alert with `bell`, "Notifications are off", "Reminders can't reach you" (or "Add LifeOS to your Home Screen first" in an iPhone's browser), and "Not now" (ghost) and "Turn on" (outline) on the right, under the text on a phone. "Not now" puts it away on this device ([REM-001](../10-requirements/cross-cutting/reminders.md#rem-001--turn-on-notifications-for-a-device)) |
| Offline | An Alert at the top of every page, with `cloud-off`: "Offline" (or "Can't refresh" when the server can't be reached) and "These may be out of date". What was loaded still shows (OFF-005) |
| Error | Red text under the field, or a toast that says what went wrong and what to do |
| A screen that crashes | Its PageHeader title says "Something went wrong", with one primary button, "Reload", under it. The crash is recorded in `ops.events` ([runbook](../40-operations/runbook.md#noticing-problems)) |
| Empty | `EmptyState`: centred in the content, about a third of the way down, a 48px muted tile with the page's icon and a `text-h2` line saying so ("Nothing needs you", "Nothing deleted"). No paragraph, no button unless there's one obvious thing to do |

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
