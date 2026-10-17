# Patterns

*How screens are put together from the [components](components.md) and
[tokens](tokens.md). See them in [reference.html](reference.html).*

## Page anatomy

```
AppShell
├── Drawer (Sidebar)          brand · Search · pages · Later · sync status · you
└── Page
    ├── PageHeader            title · capture's "New" (right, on a computer)
    └── Content               36px sides, 20px between sections, in a ScrollArea
        ├── Tabs (optional) · main action (just after them; a Fab on a phone)
        └── Sections          SectionLabel + rows, cards or a grid
```

- One PageHeader and at most one primary button per page: the page's main
  action ("New task", "New note"), always in the same place and style — a
  PageAction just after the page's Tabs on a computer, 16px from them (a
  little more than they are from each other), and a Fab on a phone.
- Capture is "New" (a speech bubble with a plus) at the top right of every
  page: in the PageHeader on a computer, the top bar on a phone.
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
- Each page's icon: Inbox `inbox`, Plan `calendar-days`, Tasks
  `square-check-big`, Notes `sticky-note`, Gym `dumbbell`, Cardio
  `footprints`, Recipes `chef-hat`, Goals `target`, Wardrobe `shirt`, Finance
  `wallet`; Meal plan and Shopping get theirs with their design in Stage 4.
- The header holds the brand (the app icon at 24px, then "LifeOS" at 16px
  weight 750) and, on its right, Search: a muted ghost `search` button, with
  "Search /" in a Tooltip on a computer, 44px in a phone's drawer. Capture
  isn't in the drawer: it is "New" at the top right of the page. The foot
  holds your row (Avatar, name, Space), with SyncStatus over it only while
  changes wait to send or weren't saved. Your row opens Settings, where
  Sign out is.

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
| Event | A Dialog over the page | A Dialog over the page |
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
- On a phone, a Task's and an Event's Dialog are one height, 440px
  ([tokens](tokens.md#sizes)): a Task shows down to its Reminders, an Event
  to its Place and Repeat, and the rest scrolls inside the Dialog.
- Changes are kept as they are made; there is no Save in an Item's Dialog.
- The Dialog's header holds the Type's tile and name, the Item's mark
  (star, pin), its "…" menu (Convert to, Delete) and Close, with no "…"
  when it would be empty; it opens with the Dialog itself focused, not its
  first control.
- **Convert to** lists only the Types this Type converts into that the app
  has yet; a toast says what it became ("Converted into a Task", "Converted
  into an Event"), with Undo. A Thought's row offers Task and Note as its
  own buttons; Event is in its "…" menu.
- **Delete** closes the Item and says so in a toast with Undo ("Deleted
  "Renew insurance""); the Item waits in Recently deleted.

## Capture

[CAP-001–004](../10-requirements/cross-cutting/capture.md#requirements);
the CaptureDialog in [components](components.md).

- Opens over the page from "New" at the top right, Inbox's Fab, or N on a
  computer (not while typing in a field or with a menu open; over an open
  Item it is fine), the
  line ready to type; Enter saves. Saving or closing changes nothing on the
  page but the new Item.
- It makes a Thought unless switched to Task, and starts as a Thought every
  time.
- Under the line, my Labels as LabelChips, none chosen each time; what is
  chosen is given to the Thought or Task saved.
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
  typing in a field, nor over a Dialog or menu), ready to type: a Dialog near
  the top, on a phone too; a tap outside it closes it.
- Results come as I type, best match first, grouped by Type ("Tasks",
  "Notes", "Thoughts"), each group where its best result is. Each shows a
  small TypeTile, its title and one muted line, the words matched in bold.
- The line: the line of its body the search found; else its Labels, if they
  matched; else a Task's day and time, its due date (red once passed),
  "Completed Sun 4 Oct" or "Someday"; an Event's day and times and its place
  ("Sat 17 Oct 13:00–15:00 · The Ivy"); or when a Thought was captured.
- The arrow keys move the highlight; Enter or a tap opens the Item where its
  Type opens ([Opening an Item](#opening-an-item)), closing the Dialog.
- Nothing matching: "Nothing found". Offline, or with the server out of
  reach, the Items on the device are searched, and a muted line with
  `cloud-off` says "Offline · Results may be incomplete" (or "Can't reach
  LifeOS · …").

## Notes

[NTE-001–004](../10-requirements/views/notes.md#requirements); NoteCard,
NoteEditor and LabelPicker in [components](components.md).

- Under the title, LabelChips: every Label I have, A–Z, then "New note"
  on a computer; choosing one or more narrows the page to the Notes with
  any of them, until they are unchosen.
- "Pinned", then "Others", each NoteCards in a masonry, as Keep has them:
  columns of cards fitting together with no gaps however tall each is, the
  most recently changed first (left to right, then down); without pinned
  Notes it has no heading.
- "New note" (beside the LabelChips on a computer, the Fab on a phone) opens an
  empty Note — in a popup on a computer, on its own page on a phone — with
  its title ready to type; nothing is
  kept until something is typed, so closing it untouched leaves nothing
  behind.
- No Notes: an empty state, "No notes yet"; none with the Labels chosen,
  "No notes labelled Home" (or "with these labels").

## Tasks

[TSK-001–011](../10-requirements/views/tasks.md#requirements); TaskDetails,
DateField, TimeField, RepeatField, SubtaskList and AddRow in
[components](components.md).

- Under the title, Tabs: All tasks, Recurring, Completed, then "New task"
  on a computer (the Fab on a phone); 12px under them, LabelChips. The
  Labels chosen narrow every view, stay chosen as the view changes (they
  are kept in the page's address), and are given to a "New task"; none
  left, "No tasks labelled Home".
- "New task" opens a new Task in a popup with every field a Task has —
  title, notes, do-on date and time, due date, repeat, Reminders, Labels,
  sub-tasks — and Cancel and Save at its foot; nothing is kept until Save,
  and once anything is typed a click outside doesn't close it. Changing a
  Task needs no Save: each change is kept as it is made.
- A repeating Task shows only its next open occurrence, in every list.
- **All tasks**: Overdue, Today, Tomorrow, each remaining day of this week by
  its name, Later, No date, Someday; each a SectionLabel and its rows,
  hidden when empty. A Task sits under its do-on date, or its due date when
  it has none.
- **Recurring**: "On a schedule", then "After it's done", each a
  SectionLabel and rows of each repeating Task's next occurrence, soonest
  first; the row's meta gives its day and its repeat in full ("Every
  Monday").
- **Completed**: done Tasks, struck through, most recently changed first.
- A Task's row: its Checkbox (ticking it is done, with Undo), then title and
  meta: time, "Since Thu", the due date (red once passed), its repeat
  (`repeat` and "Weekly"), Labels, sub-tasks "2/5"; on hover Tomorrow and the star; the "…" menu holds
  Tomorrow, Someday and Delete. A starred Task shows its filled star.
- "New task" opens capture as a Task.
- Setting a time with no do-on date opens the do-on Calendar to ask for the
  day.
- **Reminders** sit under the dates: a ReminderList, each line opening the
  Reminder Dialog to change it. A Thought's popup has Reminders too, at a
  set time only, and its Labels; its checkbox sits before its title.
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
- **Google Calendar** ([GCL-001–006](../10-requirements/cross-cutting/integrations.md#google-calendar)):
  a titled Card with a "…" menu (Sync now; Disconnect, in red). Not
  connected: a CardRow "Not connected" with an outline "Connect". Connected:
  a CardRow with `mail`, the Google account and, muted, "Synced 2 min ago"
  ("Not syncing" when broken); then a CardRow per calendar, its name, "Can't
  edit" muted where I can't, and an `sm` Select of Off, Incoming and (where
  I can edit it) Two-way; then, once one is two-way, "Default calendar", an
  `sm` Select of None and the two-way calendars. The first calendar made
  two-way is the default until I choose; one that stops being two-way stops
  being it. Coming back from Google, a
  toast says how it went ("Google Calendar connected"). When my calendars
  can't be read, the Card says "Couldn't load" with an outline "Try
  again", never "Connect"; meanwhile Events from Google stay Google's. The Reminders
  Card gains "Events, 30 min before" (a Switch).
- **Google Calendar isn't syncing** (GCL-006): on Inbox, above the groups,
  an Alert with `calendar-x-2`, "Google Calendar isn't syncing", since
  when, and an outline "Reconnect".
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
  does it. A Thought's starts with its checkbox (yellow); ticking it ticks
  it off. Other Items start with their TypeTile.
- A done Item: title struck through in `--muted-foreground`.
- A starred Task shows a filled star at the end of its row.
- Row actions (Task, Note, Tomorrow, then the "…" menu) appear on hover and
  focus; on a phone only the "…" menu shows, always, holding the same
  actions. Tapping a row anywhere else opens its Item.
- Overdue's heading and count are red; a due date that has passed is red in
  the row's meta.

## Plan

[PLN-001–007](../10-requirements/views/plan.md#requirements); PlanCard,
DayColumn, PlanWeek, PlanDay, PlanToolbar, WeekStrip and AddToDay in
[components](components.md). Agreed with Joe on 14 October on the
[Stage 3 design canvas](https://claude.ai/artifact/S7eLUszjswnPN77EkbTcxK)
(private to Joe), after a first pass he found too busy.

- Plan is neutral: no TypeScope; its primary button is ink.
- Under the PageHeader, the PlanToolbar ("12 – 18 October" on the left,
  opening a Calendar to go to any date; previous, Today, next, Day / Week
  and "Add" on the right), then the
  FilterChips of the Types there are, which act as the key and the filter.
- **A week** (a computer's default): a PlanWeek, Monday first. Today's
  number sits in an ink pill and its column is filled a little more. Each
  day lists all-day and untimed Items first, then the rest by time, each a
  PlanCard in its Type's colour saying its own time ("All day", "18:00").
  An all-day Item over several days is a card on each of them; past and done
  Items fade.
- **A day** (chosen on a computer; always on a phone): the WeekStrip, then a
  PlanDay, up to `max-w-3xl`. Times are inside the cards; nothing sits to
  their left.
- **Adding:** each day's "+" on hover (AddToDay), "Add" in the toolbar (for
  today, or the day shown), the Fab on a phone; each opens a new Item of the
  chosen Type, dated that day, in its popup with Cancel and Save.
- **Moving:** on a computer a card is dragged to another day: it lifts, the
  day under it fills a little more, and a DropSlot shows where it will land;
  letting go moves it, with Undo in a toast. An Event from an
  incoming-only calendar doesn't lift.
- A card opens its Item as it opens anywhere else; Tasks are ticked in their
  popup, not on the card.
- A phone has no Week / Day switch and no dragging: the WeekStrip chooses
  the day, and the Fab adds to it.

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
| Hover | `--accent` fill (ghost and outline buttons, rows, menu items); an empty checkbox fills with its colour's tint. Whatever can be pressed shows the pointing hand |
| Focus | 3px `--ring-soft` halo; inputs switch to the card fill |
| Selected / current | `--accent` fill; the Type's tint inside `TypeScope` |
| Disabled | 50% opacity, no hover |
| Loading | Skeletons shaped like the content, after about 300ms |
| Saved / waiting to send | Nothing while all is saved; SyncStatus in the drawer while changes wait; an Item not yet sent shows "Not sent yet" with a cloud icon in its meta |
| Not saved | An Item whose change the server refused shows "Not saved" in red with a `cloud-alert` icon in its meta, and SyncStatus counts it, with "Clear" to put the Items back as they were saved ([OFF-004](../10-requirements/cross-cutting/offline.md#off-004--a-write-that-cant-be-saved-is-not-lost-silently)) |
| Notifications off | On Inbox, while none of my devices has notifications: an Alert with `bell`, "Notifications are off", "Reminders can't reach you" (or "Add LifeOS to your Home Screen first" in an iPhone's browser), and "Not now" (ghost) and "Turn on" (outline) on the right, under the text on a phone. "Not now" puts it away on this device ([REM-001](../10-requirements/cross-cutting/reminders.md#rem-001--turn-on-notifications-for-a-device)) |
| Offline | An Alert at the top of every page, with `cloud-off`: "Offline" (or "Can't refresh" when the server can't be reached) and "These may be out of date". What was loaded still shows (OFF-005) |
| Error | Red text under the field, or a toast that says what went wrong and what to do |
| A screen that crashes | Its PageHeader title says "Something went wrong", with one primary button, "Reload", under it. The crash is recorded in `ops.events` ([runbook](../40-operations/runbook.md#noticing-problems)) |
| Empty | `EmptyState`: centred in the content, about a third of the way down, a 48px muted tile with the page's icon and a `text-h2` line saying so ("Nothing needs you", "Nothing deleted"). No paragraph, no button unless there's one obvious thing to do |

## Icons

Lucide only, at 16px with a 1.75 stroke (12 or 14px small, 22px large).
Grey by default; a Type colour only in tiles, checkboxes, the drawer and
pressed Toggles. Each Type always uses the same icon: Thought `lightbulb`, Note
`file-text`, Task `square-check-big`, Event `calendar`, Shopping list `shopping-cart`,
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
  included: the menu button on the left, the brand, and capture's "New" on
  the right
  ([CAP-002](../10-requirements/cross-cutting/capture.md#cap-002--capture-from-any-page-without-losing-my-place)).
  It keeps clear of the notch.
- The drawer becomes a left Sheet, 288px, attached to the left edge and the
  full height of the screen, opened from the menu button; choosing a page
  closes it.
- Page padding 20px; page title 22px; Tabs and LabelChips scroll sideways under it.
- **The main action floats** bottom right as a Fab: a "+" only, no words.
  Inbox's Fab opens capture, as the top bar's "New" does.
- **Pull to refresh:** the page scrolls in its own box, which the browser's
  pull to refresh can't reach, so pulling down from the top of any page
  shows a round indicator that turns as it follows the finger; let go past
  72px and LifeOS reloads.
- Dialogs sit inset 18px from the sides, as tall as their content;
  AlertDialog actions stack, full width.
- Row actions: the "…" menu is always visible; a Thought in Inbox can be
  swiped to make it a Task.

## Dark and light

Every screen is checked in dark first, then light. Nothing is designed for
one mode only: every colour comes from a token with both values.
