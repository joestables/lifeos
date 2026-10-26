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
- **One reading width for rows** (Joe, 24 October): a page or tab whose
  content is a column of rows or Cards — Inbox, Tasks, Ideas, Settings,
  the Pantry, Plan's day, Shopping's Food and Other, a list — is at most
  `max-w-3xl` (768px) wide, left-aligned. Grids and weeks (the library,
  Notes, the Meal plan's week, Plan's week) and a food shop's aisles take
  the page's width.

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
  `footprints`, Recipes `chef-hat`, Meal plan `utensils`, Shopping
  `shopping-cart`, Goals `target`, Wardrobe `shirt`, Finance `wallet`.
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
| Needs seeing to: out of stock | Amber (`--warning`), with a word | Same |

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
  own buttons; Event is in its "…" menu. Shopping list is offered only to a
  Thought or Note naming a Pantry ingredient; with an open food shop it
  opens a small Dialog, "Shopping list": the lines it will add, muted and
  separated by " · ", then "Add to" (a Select of "A new food shop", then
  the open food shops), Cancel and Convert (Add for an open shop). With
  none it converts at once. Either way the toast ("Converted into a
  Shopping list", 'Added to "Big shop"') offers Open rather than Undo; a
  Thought added to a shop goes to Recently deleted.
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
- **Households** ([HSH-001–004](../10-requirements/cross-cutting/spaces-and-sharing.md)):
  a titled Card with an outline "New household", then a CardRow per
  Household (`house`, its name, "Owner · 2 members" muted, leading to its
  page) and, first, for an invitation waiting for me, a CardRow with `mail`,
  the Household's name, "From Sam Carter" muted, and a ghost Decline and an
  outline Join; on a phone they are `icon-sm` Buttons, `x` and `check`, so
  the name has room.
  Invitations show here and nowhere else, never on Inbox.
- **A Household's page** has a BackLink to Settings: a Members Card (an
  outline `sm` "Invite" with `mail` for the owner; a CardRow per member
  with an Avatar and "Owner" or "Member", the owner's "…" menu on the
  others; a pending invitation with `mail`, "Invited Thu" and a ghost
  Withdraw), then a Card with Rename and, for the owner, Delete (red). A
  member's page has Leave instead. Invite is a small Dialog: "Google
  email" and Invite.
- **Food** (RCP-018, MPL-005): a titled Card: with a Household, "New meals
  are for" (`utensils`) with an `sm` Select of Personal and my Households,
  then CardRows leading to
  "Categories, cuisines and tags" and "Archived recipes" (with its count).
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

## Recipes

[RCP-001–018](../10-requirements/modules/recipes.md#requirements); the food
components in [components](components.md), from RecipePhoto to
StepEditor. Agreed with Joe on 18 October on the
[Stage 4 design canvas](https://claude.ai/artifact/6GfJTp2G1BF6n573dqHxpy)
(private to Joe), after three passes.

- Recipes is green (TypeScope); so are its Dialogs and its Filters Sheet.
  Tabs: **Recipes** and **Ideas**; on both, the PageAction is "New", a
  DropdownMenu of New recipe, New idea and Import (`sparkles`; Joe, 23
  October), and on a phone the Fab opens the same menu. **New recipe** is
  the Edit heading Dialog titled "New recipe", with Cancel and Save; Save
  makes a Draft and opens its Variation to fill, and Done there shows the
  new Recipe. A name a Recipe I can see has is refused under the field, and
  so is a Draft without both a category and a cuisine, under them. The
  library's filters, sort, group and card size, and Ideas' sort, are kept
  on the device. Both tabs start at the same place, so the search doesn't
  move between them.
- **The library:** on a computer a 248px FilterPanel on the left (State and
  Category open; Cuisine, Tags, Protein, Carbs, Created by — in a Household
  only — and Favourites collapsed), and over the RecipeGrid a toolbar:
  search, Sort (a SortMenu) and Group (an `sm` Select), S / M / L (a ToggleGroup) and a
  ghost "Select" with `list-checks`. On a phone: search and an outline
  "Filters" button (with a Badge counting what's chosen on its corner, so
  the row never moves) on one line, Sort
  and Group sharing the next; no S / M / L, cards two across; Filters open
  in a right Sheet.
- **Choosing several:** Select (a long press on a card or row on a phone)
  puts a SelectionBar in the toolbar's place: Archive and Delete for
  Recipes, Delete only for Ideas (Joe, 20 October). On a phone the actions
  are outline buttons sharing a bar fixed to the foot of the screen, and
  the Fab is put away. Each card or row shows its Checkbox; Undo follows
  in a toast.
- **Ideas** are ItemRows, up to `max-w-3xl`, under the search and a
  SortMenu (Recently added, A–Z): the Recipe's TypeTile, the name, then source ·
  when saved · the start of the note, muted; a "…" menu (Make it a draft,
  Delete; Import from its link with Import). **An Idea opens in a Dialog**
  over Ideas, "Idea" (its link, `?idea=`, too; never a page): Name, Links,
  Note and its photo, kept on Done or on closing, the Dialog itself focused as
  it opens, so a phone's keyboard stays down (Joe, 24 October); then Delete
  (`ghost-destructive`) and "Make it a draft" (outline, `chef-hat`) side by
  side at their own width, and Done at the right (on a phone, full width
  under them). **Make it
  a draft** is the Edit heading Dialog titled so, asking the category and
  cuisine; it then opens the Variation to fill. New idea is a Dialog: Name, Links (any number, "Add a link"), Note, "Add a
  photo" (as Edit heading's); then Cancel and Save. A photo is made WebP of
  about 250 KB on the device as it is chosen, kept on Save or Done, and
  sent once its Recipe has reached the server; with no signal it is
  refused, saying so.
- **Import** is a Dialog: Link, then Cancel and a primary Import side by side at the bottom right (Joe, 24 October), then its progress as
  three lines (Reading the page, Writing it up, Matching the Pantry; done
  with a filled check, the current one with a spinner, the next muted). A
  link saved before says which Recipe or Idea has it first, with Open and
  Import anyway. A page of several recipes lists them as RadioCards (its
  name, then how many ingredients and steps), to choose one with "Check
  it". A page that isn't a recipe, or a video that says too
  little, ends in the Dialog on a line saying so and Close. The AI
  unavailable (off, out of allowance, unreachable), Import is disabled in
  the menu, saying why under it (12px, muted). It ends on **Check the
  import** (its PageHeader title), a page laid out as Editing a Variation:
  a Card of the Edit heading Dialog's fields (the photo, from the page's
  picture made small on the device, beside Name, Category, Cuisine,
  Protein and Carbs), the VariationFieldsCard's Serves, Prep and Cook,
  then Ingredients (IngredientLineEditors, with the page's groups as
  SubheadingEditors, and "Add an ingredient") beside Method (StepEditors,
  and "Add a step"), spaced as editing a Variation's, then Notes (a
  Textarea and "From" the link, muted). A name on none of my lists
  carries an `outline` "New" Badge (" · New" in a Protein or Carbs Badge).
  A line whose entry isn't in the Pantry has the `package-plus` mark, as
  a typed line has when editing: it opens Add to the Pantry, the AI's
  aisle to start, and the entry is added when the import is kept; a line
  left so is kept as typed (Joe, 24 October). Renaming a line matches it
  to the Pantry entry of that name. In the method, Enter starts the next
  step and Backspace in an empty one removes it, as when editing. Cancel
  (outline) and Keep (primary) at the top right on a computer, at the
  foot on the right on a phone, as wide as their words. Keep saves it all and opens the
  Recipe, or says it couldn't, keeping the page; Cancel, or leaving, asks
  first in an AlertDialog ("Leave without keeping it?", Leave, Cancel) and
  keeps nothing. An Idea's "…" menu has **Import from its link**, the same
  Dialog titled so with its link filled in; kept, the Idea keeps its
  name, photo and notes.
- **A Recipe's page:** a BackLink to Recipes and the name as the title;
  then the heading (RecipeHeadingLayout): the RecipePhoto (288px on a
  computer; on a phone about half the width, Joe, 20 October) beside
  "Variation" with a ghost Select of its Variations (a member's saying
  whose, "Air fryer (Sam's)") and its state as an
  `outline` Badge, the RecipeFacts, "Add a category and cuisine" (a `link`
  Button, `sm`, opening Edit heading) when either is
  missing, a muted line of times, servings and source (each with its 14px
  icon), "Cooked 6 times · last Sat"; then, the whole width on a phone,
  Start cooking (primary, `utensils`), Edit (outline), the heart (an `lg`
  Toggle) and a "…" menu. A member's Recipe has "Add my variation" (outline, `copy`) for
  Edit and "By Sam" first among its facts. The "…" menu as drawn: Edit
  heading, Duplicate this variation, Compare variations (two or more), Log
  a cook, Make it the default, then Archive and Delete variation (not the
  last); a member's Recipe: Log a cook and Compare variations. Duplicate and Add my variation ask the copy's name in a small
  Dialog, then open it to edit. Under it three Cards on a
  computer — Ingredients (IngredientList), Method (MethodSteps), and Notes
  over the Log (three LogEntries and a ghost "See all") — stacked on a
  phone. An ingredient reads name first, its amount at the end. In the Log
  an edit says "Edited" (with the Variation's name when there are several)
  only when its ingredients or method changed, and, under it, its note; my own entries carry a "…": "Say what changed"
  (or "Change the note") on an edit, a small Dialog "What changed?" with a
  Textarea, Cancel and Save; "Change how it went" on a cook. "See all"
  opens a Dialog of the whole log, twenty entries at a time with an outline
  "Show more", and an `sm` Select of Everything, Cooks or one Variation; a
  cook's "What I cooked" opens its snapshot in a Dialog.
- **Compare variations:** a BackLink to the Recipe, two `sm` Selects with
  `git-compare-arrows` between, then a Card per Variation; lines that
  differ are filled `--selected` with an `outline` "Differs" Badge.
- **Editing a Variation:** a BackLink to the Recipe and "Edit variation";
  a Card of fields (VariationFieldsCard: Variation, State, Serves, Prep,
  Cook, each a Label over a default-height field) — in a row ending in a
  primary Done on a computer; on a phone the name, then State and Serves,
  then Prep and Cook, two across, and Done at the foot of the page, where
  the editing ends (Joe, 20 October); then
  Ingredients (IngredientLineEditors and SubheadingEditors; ghost "Add an
  ingredient", "Add a subheading"; a ghost `sm` "Fill from method" with
  `sparkles` at the right of its heading, disabled with no method)
  beside Method (StepEditors, "Add a step"; on a Draft, a ghost `sm`
  "Import from a link" with `sparkles` at the right of its heading, Joe,
  23 October); then "Notes and sources", a
  Textarea and the links, each an Input with a ghost X, and "Add a link".
  Everything is kept as it is left, and also when the page goes some other
  way (swiped back, the app closed); there is nothing to save, so the
  button says Done. Lines reorder by their handle (on a phone too), or
  Alt+↑ / Alt+↓; steps don't reorder (Joe, 23 October). **Fill from method**
  works in place, the card's lines replaced by Skeletons while it runs;
  over existing lines it asks first, an AlertDialog "Replace the
  ingredients?" (Cancel, Replace). **Import from a link** opens a small
  Dialog, "Import from a link": Link, then Cancel and Import, the same
  progress lines, and, over an existing method or lines, "This replaces
  the ingredients and method" muted above the buttons; closed while it
  works, it goes on, the Ingredients' and Method's Cards Skeletons until
  it is kept (a page of several then opens the Dialog at its choice).
  Either ends in a toast with Undo. Add "…" to the Pantry
  opens a small Dialog, "Add to the Pantry", the Dialog itself focused so a
  phone's keyboard stays down (Joe, 24 October): Name, then Aisle (a Select,
  Cupboard to start) beside Default unit (a Select, the line's unit to
  start), Cancel and Add (PAN-004 1); a line kept as typed opens it from
  its mark. A Pantry entry chosen for a line with no unit gives it the
  entry's default unit. **Edit heading** is a Dialog: the photo
  (112px wide; Change photo, or "Add a photo" with `plus` when there is
  none, a DropdownMenu of "From a file or the camera" (`image`) and "From a
  link" (`link`, which opens an Input with an outline Use under the photo);
  then a ghost Remove), Name, Category and Cuisine (each a LabelPicker of
  my list, opened from an outline Button showing the value), then Tags,
  Protein and Carbs as Badges, each with its X (`onRemove`), and an "Add" LabelPicker; a
  new name is added to my list. It keeps as it goes: Done, X, Escape or
  leaving keep what changed. A Draft's or Complete's category and cuisine
  can't be emptied, nor the name taken by another: Done says what is wrong
  under them, and closing leaves that one as it was.
- **Cooking:** a BackLink to the Recipe, "Cooking · Air fryer" (14px, the
  Type's text colour) over the name, the ServingsStepper and a primary
  Finish; then Ingredients beside Method (`cooking`), the method's numbers
  marked "Not scaled" (an `outline` Badge) once the servings change. On a
  phone it is one long page: the stepper in the Ingredients card's
  heading, then the method. The screen stays awake. **Finish** opens a
  Dialog, "How did it go?": a StarRating to set, a Textarea, then "Don't
  log" (ghost) and Save. **Log a cook** is the same Dialog with "Cooked
  on" (a DateField) first, and Cancel for "Don't log".

## Meal plan

[MPL-001–006, PAN-001–004](../10-requirements/modules/meals.md#requirements);
MealCard, MealSlot, AddMealButton, MealWeek, MealDay and PantryRow in
[components](components.md). Agreed with the Recipes screens.

- Green (TypeScope). Tabs: **Week** and **Pantry** (`?tab=pantry`); the
  PageAction none on the week, "New entry" on the Pantry. The week's
  toolbar has a ghost `sm` "Select" (`list-checks`) after Show, as the
  library's (Stage 4b): it puts a SelectionBar in the toolbar's place with
  "Add to shop" (`shopping-cart`), MealCards take their Checkbox (not
  eaten Meals, leftovers, or Meals on another open shop), and the chosen
  Meals make a new food shop, "Food shop", dated the first one's day,
  which opens
  ([SHP-002](../10-requirements/modules/meals.md#shp-002--a-food-shop-from-the-meal-plan)).
  A long press still drags on a phone.
- **The week:** the PlanToolbar (no Day / Week; `?day=` names the week), an
  `sm` Select of whose Meals show ("All my meals", Personal, each
  Household; only with a Household, kept on the device; 160px, on a phone
  too) and Select; on a phone those two take a row of their own under the
  dates, so the dates show whole, and a week across two months is short
  ("28 Sept – 4 Oct"; Joe, 26 October). Then the MealWeek on a computer,
  the week's seven MealDays down a phone, today's scrolled into view: each
  day its "+" and its Meals as one-line cards saying their slot, no slots
  named (Joe, 25 and 26 October). A Meal's name is its Recipe's, a typed
  Meal's what was typed; leftovers take the name of the Meal they are of.
- **Moving:** on a computer a MealCard is dragged to any slot, as on Plan;
  on a phone it is pressed and held until it lifts, then dragged to another
  day, the day under the finger lit, and let go there, keeping its slot
  (Move to… changes the slot). It lifts without turning (Joe, 26 October). A slot can hold several Meals.
  Moved, a toast says where ("Moved "Katsu curry" to Sat lunch") with Undo.
- **Adding:** a slot's "+" opens a Popover (320px) on a computer; on a
  phone, a day's "+" opens the Dialog Plan's "+" → Meal opens, Dinner to
  start (Joe, 25 October: a Popover over the page let taps through). In it, an `sm` search, my
  categories as LabelChips (none chosen), then "Recently viewed": the
  three Recipes I opened last ("Planned lately", from my latest Meals,
  before I've opened any; Joe, 26 October). Searching or choosing a
  category shows every match instead (Drafts and Completes, A–Z, scrolling
  past 240px). Each is a 40px line with the Recipe's
  small TypeTile, its name and cuisine (and "· Sam") muted; a footer of
  ghost "Type a meal" (`utensils`) and "Leftovers" (`rotate-ccw`). A Recipe
  with one Variation is planned at once; with more, the list becomes its
  Variations under a ghost back button and the Recipe's name, the default
  first. **Type a meal** becomes an `sm` Input ("Out: Dishoom") and Add.
  **Leftovers** lists the Meals of the seven days before the slot, newest
  first ("Katsu curry · Thu dinner"), leftovers themselves left out. A new
  Meal serves what its Variation does, and goes where Settings → Food says
  (Personal to start); leftovers go where their Meal is.
- **A Meal** opens in its ItemDialog: "Meal · Thu dinner", its Checkbox
  (eaten) and name; for a Recipe's Meal, an ItemRow for its Recipe ("Open
  recipe · Standard") and, when the Recipe has more than one Variation, a
  Variation Select; Servings (and, with a Household, on a Meal I made, For: Personal or a
  Household, moving its leftovers with it) side by side; for leftovers, an ItemRow for the Meal they are
  of; Leftovers, an ItemRow per slot they fill, each with a "…" Remove;
  then, not on leftovers, **Ingredients** (a SectionLabel; "Extra
  ingredients" on a Recipe's Meal): on a typed Meal first a Link Input with
  an outline `sm` "Get ingredients" (`sparkles`) beside it, the link
  opening from an `external-link` ghost icon button once kept; then
  IngredientLineEditors (no subheadings) and a ghost "Add an ingredient".
  Get ingredients shows a spinner in its button, asks first over existing
  lines ("Replace the ingredients?"), and ends in a toast with Undo; a
  page that isn't a recipe says so under the Link (MPL-006; Joe, 23
  October). On a phone Get ingredients wraps under the Link.
  Its "…" menu: Move to…, Add leftovers… (not on leftovers) and Remove
  (red). **Move to…** and **Add leftovers…** are small Dialogs: Day (a
  DateField) and Slot (a Select; for leftovers the next lunch or dinner to
  start),
  then Cancel and Move, or Add. **Remove** takes its leftovers with it, in
  a toast with Undo.
- **On Plan** (PLN-008): a Meal's card says Meal, its name ("Leftovers:
  Katsu curry" for leftovers) and its slot where a time would be. Plan's
  "+" → Meal opens a Dialog, "Add a meal · Thu 15 Oct": a ToggleGroup of
  Breakfast, Lunch and Dinner (Dinner to start), then the Popover's search
  and list in its place. "+" → Shopping list opens New shop dated that day
  ([Shopping](#shopping)).
- **The Pantry** ([PAN-001](../10-requirements/modules/meals.md#pan-001--the-pantry),
  [SHP-005](../10-requirements/modules/meals.md#shp-005--staples-and-essentials);
  Joe, 25 October): on one row whose staples and Essentials (a 160px `sm`
  Select of Personal and my Households, only with a Household), All ·
  Staples · Essentials (a ToggleGroup) and an outline `sm` "Pending"
  (`clock`, and a `secondary` Badge counting the names) at the end; on a
  phone Pending sits beside whose and the ToggleGroup, at its own width,
  takes the next row (Joe, 26 October). Then the search and a SortMenu (By
  aisle, Recently used, Most popular, A–Z; under Show, Aisle, Default unit
  and Number of recipes as CheckboxItems, the last on to start). By aisle: "Ingredients" (a
  SectionLabel) and a Card per aisle, in aisle order (its name muted,
  14px weight 600, then its PantryRows); the other sorts, one unnamed Card.
  Then household items apart, sorted the same. Each PantryRow carries
  KeepToggles for the Space chosen. Staples or Essentials show only those;
  one taken off there leaves, in a toast with Undo. Nothing matching: an
  EmptyState ("Nothing in the Pantry", "No staples yet", "No essentials
  yet" or "Nothing matches"). View, Space and sort are kept on the device.
- **Pending** is a page of its own (PageHeader "Pending", back to the
  Pantry): "Kept as typed" (a SectionLabel) with an outline `sm` "Add
  all", then a Card of CardRows, each the name, how many Recipes, and an
  outline `sm` "Add" opening Add to the Pantry; none, an EmptyState
  ("Nothing pending").
  **New entry** is a Dialog: a ToggleGroup of
  Ingredient and Household item, Name, and Aisle (Cupboard to start) and
  Default unit side by side; then Cancel and Save. A household item's Aisle reads Household and can't be changed.
  A name the Pantry has is refused under the field ("Already in the
  Pantry").
- **An entry's "…" menu:** Edit, Recipes that use it, Merge into… and
  Delete (red) on one I added; Recipes that use it alone on anyone
  else's. **Edit** is the New entry Dialog titled "Edit entry". **Recipes that use it** is a Dialog titled with the entry's name:
  an ItemRow per Recipe (its TypeTile and name), opening it, or "No recipes
  use it". **Merge into…** is a Dialog, 'Merge "Green onions"': "Merge
  into" (a Select of the other entries I added of the same kind, A–Z, none
  chosen to start); then Cancel and Merge, which waits for a choice and
  ends in a toast, 'Merged "Green onions" into "Spring onions"'. **Delete** of an entry
  nothing uses says so in a toast with Undo; one a Recipe or the own lines
  of a Meal today or later use isn't deleted, and a toast names where it
  is used, Recipes first ("Used in Katsu curry and 2 more"), or says "Used
  in a deleted recipe" when only a deleted one does. A past Meal's line
  keeps the name, as typed.
- **Until the week is built** (plan step 7), the page is the Pantry alone:
  the title, then the Pantry, with no Tabs; on a computer its PageAction,
  "New entry", ends the row of search and ToggleGroup.

## Shopping

[SHP-001–005](../10-requirements/modules/meals.md#shp-001--shopping-lists);
ShoppingLine, OfferRow, PantryAisle and ItemRow in
[components](components.md). Agreed on the
[Stage 4b design canvas](https://claude.ai/artifact/KZyE2VPa3jTsVZ4mjxanGk)
(24 October), with New shop's Date and For only, and the reading width.

- Yellow (TypeScope), as Notes and Thoughts. Tabs: **Food** and **Other**
  (`?tab=lists`; named Lists until 26 October); Online waits for a later
  stage. The PageAction is "New shop" on Food, "New list" on Other. Both tabs are at the reading width.
- **Food:** "Shops" (a SectionLabel) and an ItemRow per open shop: a yellow
  `shopping-cart` TypeTile, its name, and a meta line of its date, how many
  Meals, its Space when not where my new Meals go, and "2 of 27" ticked;
  its "…" menu Complete list (asking first while lines are unticked) and
  Delete; then a `link` "Done shops". **Other** is the same rows, with no
  done lists (Joe, 26 October). Staples and Essentials are kept in the
  Pantry ([Meal plan](#meal-plan); Joe, 25 October).
- **New shop** is a Dialog: Name, then Date and For side by side (For a
  Select of Personal and my Households, the Household of the
  first Household Meal chosen to start), then "Meals": the plan's Meals from
  today, under each day (12px bold muted), a 40px row each with a yellow
  Checkbox, the Meal's name and, muted at its end, its slot and "Personal"
  or "On Top-up" (disabled, faded: a Meal on another open shop). Cancel and
  Create. New list asks Name and Date only.
- **A shop's page:** a BackLink to Shopping, its name (`text-h1`) with its
  "…" menu (Edit details…, Complete list — Not done once done — and
  Delete) at the title's end; a
  muted line of its date and Space; Tabs **All · Meals · Extra**, each with
  its count; then, on All (and on Extra, over Added), an Input "Add to the shop" with a
  leading `plus` and the Pantry's Suggestions ("Add "chick" as typed" after
  the line).
  - **All:** a PantryAisle Card per aisle in aisle order, Household then
    Other last, in two balanced columns on a wide screen; ShoppingLines,
    a ticked one staying where it is (Joe, 26 October).
  - **Meals:** a Card per Meal: a small green `utensils` TypeTile, its name
    (weight 600) and, muted, "Thu · Dinner · Serves 6" (and "Personal"),
    its "…" menu (Take off the shop), then its ShoppingLines, which have no
    menu. Last, an outline "Add a meal", opening New shop's list of Meals.
    A row that is one line I added, or one on the shop because it's
    needed, ends in a ghost `icon-sm` × (no asking); no Meals are named
    under a row (Joe, 25 October).
  - **Extra** (Joe, 25 October): on a computer two columns, "Add staples"
    over "Add essentials" on the left (PantryAisle Cards of OfferRows, the
    why muted: the Meals using it, "Out of stock", "Required", or the
    Spaces keeping it), and on the right the Input then "Added": what I
    added and what's needed, as ShoppingLines ("Out of stock", "Required"
    muted under the name; ×, until ticked). On a phone the Input and
    Added come first. An empty Card says so in one muted line ("None for
    these meals", "No essentials yet", "Nothing added").
- **Finishing:** ticking the last line shows a toast, "Everything's ticked",
  with Done. Complete list in the menu, with lines unticked, asks first in
  an AlertDialog: "Complete Big shop?", "4 lines aren't ticked.", Complete
  and Cancel. Done or completed, the shop leaves the list, with Undo.
- **A list's page:** as a shop's, with no Tabs: its subheadings as
  PantryAisle Cards, each ending in an AddRow ("Add to Garden"; a list with
  none yet has one untitled Card, "Add an item"), a ticked line staying in
  its place; then an AddRow "Add a subheading"; at the reading width.
- **Saved as an idea** (a share from another app; RCP-003): a page with no
  drawer, green, centred about a fifth of the way down: a large `check`
  TypeTile (`chef-hat` when saved before), "Saved as an idea" or "Already
  saved" (`text-h2`), and a Card of the Idea's thumbnail, its name and,
  muted, the link's site; "Already saved" adds an outline `sm` Open, which
  opens an Idea in its popup on Ideas, a Recipe its page. A share with no
  link says "No link to save", with an outline `sm` Recipes.

## Forms

- Label above, field below, 6px apart. No help text under fields, and no
  keyboard hints in footers.
- Fields are filled, never outlined. Two short fields may sit side by side.
- The primary action is last on the right; Cancel or Close is an outline
  button beside it. Buttons are as wide as their words, on a phone too, and
  sit together at the bottom right (Joe, 24 October); the one exception is
  a page's or a popup's lone Done under its other actions, full width on a
  phone (editing a Variation, an Idea).
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
| A screen that crashes | Its PageHeader title says "Something went wrong", with one primary button, "Reload", under it. The crash is recorded in `ops.events` ([runbook](../40-operations/runbook.md#noticing-problems)). A page whose code went with a new deploy reloads by itself instead, once a minute at most |
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
- Dialogs sit inset 18px from the sides, as tall as their content; their
  actions, an AlertDialog's too, sit side by side at the bottom right, as
  wide as their words (Joe, 24 October).
- Row actions: the "…" menu is always visible; a Thought in Inbox can be
  swiped to make it a Task.
- A long press starts choosing several where a computer has Select (the
  library, Ideas).

## Dark and light

Every screen is checked in dark first, then light. Nothing is designed for
one mode only: every colour comes from a token with both values.
