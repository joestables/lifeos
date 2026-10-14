# Pull requests

Newest first. Each entry is added in its own pull request.

## Stage 3: the plan, and Lists moved to Stage 4b

Branch `claude/kind-babbage-p00wl4` · 2026-10-14

**What it did**
- Closed Stage 2 (Joe, 14 October); its nightly smoke walk stays deferred.
- Wrote [Stage 3's plan](plans/stage-3.md) from Joe's brief: Plan shows
  every Schedulable Type, filtered by Type, a week on a computer (or a day)
  and a day on a phone; Events, repeating, with the Task ↔ Event switch;
  Google Calendar, incoming only or two-way, always Personal. Its first
  step is the specs, with eleven questions for Joe.
- Moved Lists, Shops and list templates (with live updates and ingredients
  to shopping lists) to a new Stage 4b, after Recipes: the roadmap,
  capability map, data model, Modules list and Notes spec follow, and
  ADR-0042 (live updates) and ADR-0036 (the generated data-model now comes
  with the first Module, `food`, in Stage 4) are amended.
- Drafted Stage 3's specs with Joe's answers: [Plan](../10-requirements/views/plan.md#requirements)
  (PLN-001–007), a new [Events](../10-requirements/cross-cutting/events.md#requirements)
  spec (EVT-001–006) and [Google Calendar](../10-requirements/cross-cutting/integrations.md#google-calendar)
  (GCL-001–006), all *proposed*. Capture stays Thoughts and Tasks
  (ADR-0027 amended); Events take Labels (ADR-0014 amended); capture,
  Inbox, items, Reminders, Search, the data model, glossary and capability
  map follow.
- Joe agreed the specs; step 2's decisions written as Proposed ADRs:
  ADR-0047 (how Google Calendar comes in), ADR-0048 (two-way), ADR-0049
  (how Plan reads a week), with Google's rules re-checked; Joe agreed them.
- Step 3's first design pass: Stage 3's screens drawn from the real
  components on `/design-stage-3`, on a design canvas for Joe, with the
  Plan components drafted (PlanWeek, PlanDay, PlanToolbar, WeekStrip,
  AddToDay; PlanCard extended). A second pass after Joe's comments, closer
  to the first Plan design, with "Link a task" on an Event; agreed, and
  written into the design spec (components, patterns) and `/design`.
- Step 4, the schema: an Event's place, Labels and default Reminder; all-day
  Events as dates; Task ↔ Event mapping times; repeating Events;
  `core.plan_items`; Plan's hidden Types; Google Calendar's connections,
  calendars and references, with Google's fields locked on incoming
  calendars. 35 database tests.

## [#12](https://github.com/joestables/lifeos/pull/12) — Stage 2, step 14: Labels as filters, Thoughts ticked off

Branch `claude/laughing-babbage-maqg0k` · 2026-10-13

**What it did**
- Joe's second round from using LifeOS (plan step 14), each specified
  first in the design system:
  - `LabelChips`: my Labels as pills to choose, any number at once, kept in
    the page's address. On Notes they replace the Label tabs; on Tasks they
    replace By label, sit under the view Tabs, stay chosen across views and
    are given to a "New task"; on Inbox they sit at the top (INB-007).
  - Capture shows the Labels as pills, given to the Thought or Task saved
    (CAP-009).
  - Thoughts take Labels, shown in their row and set in their popup, and
    kept when sorted (ADR-0014 amended).
  - A Thought has a checkbox, as a Task does: ticked off, it is *done* and
    leaves Inbox, with Undo; a Thought's notification offers Done
    (INB-006, REM-005; ADR-0037 amended).
  - Inbox's "To sort" is "Thoughts"; the morning digest says "4 thoughts".
  - Done Tasks are struck through: a line-through didn't reach the title's
    button in a row.
- Converting keeps the status where the new Type has it, else active, as
  ADR-0019 says (a done Thought made a Note is an active Note).
- Two migrations (conversion's status, the digest; the generated ontology:
  Thought is Completable, with *done* and Labels), a new database test file,
  and browser tests for each change on desktop and phone.
- Live: the migrations are applied as `20261013190144` and `20261013190156`;
  the advisors found nothing new.

## [#11](https://github.com/joestables/lifeos/pull/11) — Stage 2, step 14: Joe's first round, and a bug hunt

Branch `claude/kind-dijkstra-1kv0xt` · 2026-10-12

**What it did**
- Joe's first round from using LifeOS (plan step 14). The changes, each
  specified first in the design system:
  - Convert's toast has Undo (ITM-004 3).
  - Whatever can be pressed shows the pointing hand.
  - Capture is "New" with a speech bubble at the top right of every page,
    no longer in the drawer (`CaptureButton`).
  - Pull to refresh on a phone (`PullToRefresh`): the page scrolls in its
    own box, which the browser's can't reach.
  - Search is a popup on a phone too, closed by a tap outside; the Search
    page is gone.
  - A checkbox fills with its tint on hover.
  - "New task" opens a new Task with every field, kept on Save
    (`NewTaskDialog`, sharing `TaskFields` with the Task popup; TSK-001 4).
  - Notes sit in a masonry, like Keep.
  - The drawer says nothing while all is saved.
  - "New task" and "New note" sit just after the Tabs (`PageAction`,
    `TabsRow`).
- A bug hunt across the app and database, with fixes:
  - A default Reminder no longer comes back or doubles when a date moves.
  - A Reminder already past when it was set isn't sent.
  - Converting keeps a Thought's Reminder when Tasks get no default.
  - Refused changes can be cleared (OFF-004 2).
  - Signing out stops this device's notifications (ACC-003 3).
  - N and / don't fire in menus.
  - A Label made twice offline is one Label.
  - Undo of "done" restores Someday and takes away a repeat's next
    occurrence.
  - A fixed Reminder is read in the home timezone.
  - The date picker closes after a pick.
  - Settings' times are kept on leaving the field.
  - Two fixes to the nightly run and the notification sender.
  - The full list is in the [plan](plans/stage-2.md#bug-hunt-12-october).
- Plan step 13, the nightly smoke walk, is deferred until the roadmap is
  complete; Stage 2 is provisionally closed (Joe, 12 October), with step
  14's fixes still coming.
- The Notes masonry places cards from what they show, so they never
  jump; the design screenshot test waits for its page to be drawn (it
  sometimes caught a blank page).
- One migration (undoing a conversion, the default Reminder, past
  Reminders, Label aliases, the nightly run, stuck notifications), 12 new
  database tests, and browser tests for each change on desktop and phone.
- Live: the migration is applied as `20261012214527`; the advisors found
  nothing new.

## [#10](https://github.com/joestables/lifeos/pull/10) — Stage 2, step 12: Search

Branch `claude/kind-dijkstra-1kv0xt` · 2026-10-12

**What it did**
- Plan step 12. Search opens from a button beside the brand in the drawer,
  or with / on a computer: over the page on a computer (`CommandDialog`),
  as its own page on a phone, which keeps what was typed in its address so
  going back from a result finds it again.
- Results come as I type, from `core.search_items` (step 4's full-text
  search over titles, Labels and bodies), best match first, grouped by
  Type, each with its TypeTile, its title and one line — the body line it
  found, the Labels that matched, or a Task's dates — the words matched in
  bold. They are shown as the device has them, so unsent changes count; a
  repeating Task shows once. The arrow keys and Enter, or a tap, open the
  Item where its Type opens.
- Offline, or with the server out of reach, the Items on the device are
  searched the same way, and Search says "Offline · Results may be
  incomplete". Searches are never kept on the device.
- New in the design spec first: Command's states and keys, the drawer's
  Search button, and a Search section in patterns. Command is on the
  design-system page.
- 16 unit tests and 4 browser tests (desktop and phone; / on a computer
  only). No migration: the database's part came with step 4.

## [#9](https://github.com/joestables/lifeos/pull/9) — Stage 2, step 11: Reminders and notifications

Branch `claude/kind-dijkstra-1kv0xt` · 2026-10-12

**What it did**
- Plan step 11
  ([ADR-0044](../20-architecture/adr/0044-reminder-delivery.md)). Each
  minute `pg_cron` queues what has come due, one row per notification and
  device: Reminders (up to 12 hours late, then recorded as missed), each
  person's morning digest at their digest time ("2 overdue · 3 today · 4 to
  sort", skipped when nothing needs them), and, for those without a digest,
  one nudge per overdue Task at their default time. When rows wait it wakes
  `send-notifications`, which sends them by Web Push (topic and tag so a
  repeat replaces itself, high urgency) and records each: sent, failed and
  tried again, gone (the device stops being sent to, and `ops.events` says
  so), skipped (done or deleted meanwhile) or missed.
- Done and Snooze on a notification go to `notification-action` with the
  delivery's token; Done on a Task repeated after completion makes its
  next with the engine; Snooze brings it back in an hour, for me only.
- LifeOS's own service worker (vite-plugin-pwa's injectManifest): the
  offline files as before, the notification (its title, time and buttons),
  a tap that opens the Item in the window already open, and presses made
  with no signal kept and sent later.
- Settings gains Notifications (this device's "Turn on", each device with
  its switch and Remove; "Add LifeOS to your Home Screen first" in an
  iPhone's browser) and Reminders (default time, dated Tasks and Thoughts,
  the morning digest and its time). Inbox offers to turn notifications on
  while no device has them, with "Not now". A Task's popup lists its
  Reminders, each changed or removed, and adds them on its do-on or due
  date or at a set time; a Thought's at a set time. A repeating Task's own
  Reminders go to each occurrence. A dated Thought's Reminder respects the
  Thought default.
- New in the design spec first: ReminderList, ReminderDialog, Alert's
  action, the Settings cards and Inbox's offer. ADR-0044 now says the VAPID
  keys are made by the sender and kept in Vault, every secret is checked
  by the database (nothing typed into a dashboard), and the health check
  looks for notifications waiting over an hour.
- 29 database tests, 9 tests of the two functions, 10 unit tests and 9
  browser tests (each on desktop and phone). A browser can't be made to
  show a real notification in a test, so what a push becomes is a unit
  test, and a real one on each device is checked by hand.
- Live: the migration is applied as `20261012105115`; `send-notifications`
  and `notification-action` are deployed; Vault holds `push_secret` (made in
  the database) and the VAPID keys, which the sender made on its first run;
  `minute-notifications` runs each minute. A call to `notification-action`
  with a wrong token is refused. The security advisor's note that signed-in
  people can call `core.vapid_public_key` is meant: it returns only the
  public key a device subscribes with.

## [#8](https://github.com/joestables/lifeos/pull/8) — Stage 2, step 10: repeating Tasks

Branch `claude/kind-dijkstra-1kv0xt` · 2026-10-12

**What it did**
- Plan step 10. `packages/recurrence`, the one repeat engine
  ([ADR-0045](../20-architecture/adr/0045-extending-series.md)), ported from
  v1 with its cases and no dependencies, now in calendar days: daily, every
  weekday, weekly on chosen days, every N days, weeks, months or years,
  monthly on a date, the nth or last weekday or the last day, yearly
  (skipping 29 February), an end by date or count, after completion, and
  the window a run makes. The app and the Edge Function import the same
  files.
- A Task's Repeat field opens the Repeat Dialog (the first RadioGroup of
  `cards`: on a schedule, or after it's done). The device works out twelve
  weeks of occurrences and the one after, and `core.set_repeat` writes the
  series and them in one call, offline too. Changing the repeat of an
  occurrence starts a new series from it, keeping occurrences I had
  changed; "Don't repeat" stops it there. Ticking a Task repeated after
  it's done makes its next (`core.complete_occurrence`).
- Only a series' next open occurrence shows, in Tasks and Inbox; one
  overtaken by a newer due one is skipped unless I changed it. Rows show
  the repeat ("Weekly"); the Recurring view lists each repeating Task once,
  on a schedule then after it's done, with its repeat in full. Occurrences
  a repeat took away stay out of Recently deleted (ITM-003).
- The nightly run: the `extend-series` Edge Function, called at 02:00 UTC
  by the `nightly-series` job through `pg_net` with a secret in Vault, keeps
  every series twelve weeks ahead, makes a missing after-completion next,
  skips overtaken occurrences and records its heartbeat, which the health
  check now watches ([runbook](../40-operations/runbook.md#the-nightly-series-run)).
- ADR-0045 now says each window includes the first occurrence beyond it,
  so ticking a yearly Task still shows the next, and that the engine works
  in days. 38 engine tests, 27 database tests, 5 tests of the nightly run,
  11 more unit tests and 5 browser tests (each on desktop and phone).
- Live: the migration is applied as `20261012024305`; `extend-series` is
  deployed; Vault holds `project_url` and `series_secret` (made in the
  database, never copied out); a run by hand made the heartbeat, and a call
  with the wrong secret was refused. The secret is checked against Vault by
  the database, so nobody types a copy into the dashboard. `pg_net` was left
  in `public`: moving it hangs on the live project
  ([runbook](../40-operations/runbook.md#the-nightly-series-run)).

## [#7](https://github.com/joestables/lifeos/pull/7) — Stage 2, step 9: Tasks

Branch `claude/kind-dijkstra-1kv0xt` · 2026-10-12

**What it did**
- Plan step 9, the Tasks page: All tasks (Overdue, Today, Tomorrow, each
  remaining day of the week by name, Later, No date, Someday), By label (an
  open group per Label, then No label; each Label's group ends with "Add a
  task", which gives the new Task that Label, its date understood) and
  Completed (most recently changed first: the database keeps no done
  time). "New task" opens capture as a Task. The Recurring view comes with
  repeating Tasks (step 10).
- A Task's row, shared with Inbox: tick done (with Undo; unticked in
  Completed it is open again), time, "Since Thu", due (red once passed),
  Labels, sub-tasks "2/5", Tomorrow and the star on hover, and a "…" menu
  with Tomorrow, Someday and Delete.
- The Task popup: its title and notes kept as typed, do-on date and time
  (a time with no day opens the Calendar to ask for one), due date,
  Labels from the LabelPicker, sub-tasks (tick, rename, remove, add), the
  star. Someday clears the do-on date; a date makes it active again.
- New in the design spec first: DateField, TimeField, SubtaskList, AddRow,
  TaskDetails, and a Tasks section in patterns. The app reads sub-tasks.
- Found on the way: By label's groups were all closed when they arrived
  after the page was drawn; the do-on Calendar stayed open after asking
  for a time's day; the stand-in's session expired when a test's clock ran
  ahead of the real one. 7 unit tests and 7 browser tests (each on desktop
  and phone).

## [#6](https://github.com/joestables/lifeos/pull/6) — Stage 2, step 8: Notes

Branch `claude/kind-dijkstra-1kv0xt` · 2026-10-11

**What it did**
- [ADR-0046](../20-architecture/adr/0046-note-bodies.md), chosen by Joe: a
  Note's body is Markdown, edited in place with TipTap (lists, checklists,
  bold, italic, links; no headings, quotes or code), loaded only when a
  Note opens (about 145 KB compressed). A round-trip test keeps the editor
  from changing what it is given. The data model says an Item's body is
  Markdown.
- Plan step 8, the Notes page: Tabs of the Labels my Notes have; Pinned,
  then Others, most recently changed first, as NoteCards in a grid (the
  start of the body as it reads, cut after 8 lines; Labels at the foot);
  "No notes yet". "New note" opens an empty Note with its title ready to
  type, kept only once something is typed. A Note opens in a 640px popup
  on a computer and on its own page on a phone, its title and body edited
  in place and kept as they are typed (a short pause, then the write
  queue; on closing or leaving at once). Its Labels are given from the
  LabelPicker, where a new one can be made. An untitled Note's first line
  stands in without its Markdown marks.
- New in the design spec first: NoteCard and NoteGrid, NoteEditor,
  LabelPicker, ItemDialog's 640px and editable title, ItemPage's editable
  title, and a Notes section in patterns.
- Found on the way: TipTap's focus command waits a frame, so what was typed
  straight after Enter in the title could land in the wrong place; the
  body is now focused at once. Ticking a checklist line no longer moves
  the keyboard focus. Checklist lines use the editor's own markup, styled
  like the Checkbox: CI's phone runs showed Enter on an empty checklist line
  not leaving the list with a custom line component, because on Chrome for
  Android the editor reads Enter from the page's change. 11 unit tests (the reader, the round trip) and 6
  browser tests (each on desktop and phone).

## [#5](https://github.com/joestables/lifeos/pull/5) — Stage 2, step 7: Inbox

Branch `claude/kind-dijkstra-1kv0xt` · 2026-10-11

**What it did**
- Plan step 7, the Inbox: Overdue (only a due date makes a Task overdue),
  Today (timed first) and To sort (Thoughts, newest first, with when they
  were captured and any Reminder), each hidden when empty, and "Nothing
  needs you". A repeating Task shows only its next open occurrence. Tick a
  Task done or move it to tomorrow, with Undo. A Thought becomes a Task or
  a Note in one action (buttons on hover; on a phone the "…" menu, or a
  swipe right to make it a Task), or is deleted with Undo. Made a Task,
  its dates are read as they were meant when it was captured, its title
  loses them, and a Reminder at the same moment as the Task's own is
  removed rather than kept twice (added to INB-002); the "…" menu's
  Convert to does the same. Inbox's count is in the drawer. Tapping a row
  opens its Item.
- The app now reads my Reminders. New in the design spec first: ItemRow's
  hover actions, "…" menu and tap to open; SwipeAction; SectionLabel's red
  Overdue. 6 unit tests (groups, dates) and 6 browser tests (each on
  desktop and phone); a captured Thought is now checked to show in Inbox at
  once, so CAP-001 is verified.

## [#4](https://github.com/joestables/lifeos/pull/4) — Stage 2, step 6: capture in the app

Branch `claude/kind-dijkstra-1kv0xt` · 2026-10-11

**What it did**
- Plan step 6, capture in the app. Capture opens over any page from the
  drawer's button or N on a computer, the top bar or Inbox's Fab on a
  phone, and leaves the page as it was. It makes a Thought unless switched
  to Task. A new package, `packages/capture`, reads dates with chrono-node
  and the spec's rules (the coming weekday, today included; "next week" is
  Monday; "may", "sun", "march" only next to a number or after "on"; "due"
  and "by" for deadlines; date words out of a Task's title), so the capture
  address can share it later. A dated Thought is offered as a Task ("Task,
  Fri 18:00?") and, kept as a Thought, gets a Reminder at that time or my
  default time, in my timezone; a Task shows the dates it will be saved
  with. A toast says what was made, with Undo. The app now reads my
  settings (timezone, default Reminder time). New in the design spec,
  first: the CaptureDialog, Input `lg`, a Capture section in patterns, and
  toasts above the Fab on a phone (found on the walk: a toast covered it).
  One rule added to CAP-003: "at 6" with no am or pm is 18:00. 33 parser
  tests, 2 date tests and 6 browser tests (each on desktop and phone).

## [#3](https://github.com/joestables/lifeos/pull/3) — Stage 2, steps 1–5: specs, design, schema, working with Items

Branch `claude/kind-dijkstra-1kv0xt` · 2026-10-10 to 2026-10-11

**What it did**
- Wrote the [Stage 2 plan](plans/stage-2.md), shaped like Stage 1's, with
  five questions for Joe, since answered.
- Drafted the Stage 2 requirements, all *proposed*: capture (CAP-001–008),
  Inbox (INB-001–005), Notes (NTE-001–005), Tasks with repeats
  (TSK-001–011), Reminders (REM-001–009), working with Items (ITM-001–007)
  and Search (SRC-001–003). New specs: `views/notes.md`, `views/tasks.md`,
  `cross-cutting/items.md`.
- Re-checked before Stage 2: iOS Web Push still shows no notification
  buttons; Gemini can't post to a custom address. Recorded in the reminders
  and capture specs and the roadmap.
- The capability map, roadmap, docs index and `CLAUDE.md` say Stage 2 is in
  progress; the data model marks a Note's colour as an open question
  (colour means Module).

- Joe's answers (10 October), and every document they touch:
  - Capture from outside the app (CAP-005–008, an Android widget) deferred
    to a new Stage 10, after every other stage: ADR-0027 and 0028 amended;
    roadmap, capability map, overview, integration setup, data model and
    non-functional updated.
  - Capture opens over any page and leaves you where you were; on a phone,
    from a button in the top bar (patterns and components).
  - Specs rewritten without implementation detail. Items open on their own
    page or in a popup; one Recently deleted page; no Recent; marks per Type
    (Notes pinned, Tasks starred, Recipes favourited); Labels on Notes and
    Tasks only, filtering Notes rather than heading them (ADR-0014
    amended); Notes have no *idea* status (ADR-0037 amended); steps became
    sub-tasks; Reminders go to every registered device.
  - Colour by Type, with no Module name above page titles: ADR-0043, and
    ADR-0041 amended. The design-language, glossary, data model and
    `CLAUDE.md` state the new rule; tokens, components and patterns carry a
    note until the colours are designed (plan step 3).
  - The data model's Types table gains each Type's colour, Labels and mark;
    `core.stars` and `core.recent` became `core.marks`; `task_steps` became
    `subtasks`.

- Designed every Stage 2 screen (plan step 3, first pass) on a design
  canvas, desktop and phone, dark and light, from the design system's tokens
  and components, with proposed values for the Type colours. Nothing in the
  design spec or code changes until Joe has commented.

- Second design pass after Joe's comments (plan step 3): the standard
  shadcn Sidebar, one place and style for each page's main action, no hint
  text, Tasks opening as a centred popup, the Tasks views All Tasks, By
  Label, Recurring and Completed, ScrollArea instead of browser scrollbars,
  and a fixed stylesheet bug that made primary buttons unreadable. The Tasks
  and Notes specs say how their Items open and which views the Tasks page
  has.

- Joe agreed the specs and the second pass (11 October), with sentence case
  for the Tasks views and main actions and a "+" only on a phone's floating
  buttons; every Stage 2 requirement is now *agreed*.
- Plan step 2: [ADR-0044](../20-architecture/adr/0044-reminder-delivery.md)
  (how Reminders are delivered) and
  [ADR-0045](../20-architecture/adr/0045-extending-series.md) (where
  repeating Items are made), both *Proposed*; the data model, overview,
  reminders spec, non-functional, runbook and integration setup cite them.

- Plan step 3: the agreed designs went into the design system — Type colour
  tokens with text and foreground values that reach 4.5:1, `TypeScope`,
  `TypeTile`, `TypeBadge`, `TypeDot` and a coloured Checkbox in place of the
  Module components; shadcn's standard Sidebar (256px, full height);
  ScrollArea for the page and the drawer, with a thin themed scrollbar for
  anything else; the phone's Fab; PageHeader's main action; no kicker; and
  in the spec, how Items open, RadioGroup `cards`, Command, the empty state
  and no hint text. ADR-0026 amended: Settings opens from your row. The
  design-page screenshots were refreshed and looked at, and the shell walked
  in dark and light, desktop and phone.

- Joe agreed ADR-0044 and ADR-0045 (11 October): both are now
  *Provisionally agreed*, and every document citing them says so.
- Six app icon options on the design canvas, each shown as the icon,
  Android's round crop, on dark and light home screens, in a browser tab and
  as the drawer's mark.

- Joe chose option C, the graph. It is in the design spec (patterns, "The
  app icon"; `BrandMark` in components), as `public/icon.svg` and
  `public/favicon.svg` with the PNGs drawn from them, in the manifest
  (`any` and `maskable`), as the favicon and Apple touch icon, and as the
  brand mark in the drawer, the phone's top bar and sign-in.

- Plan step 4, the Stage 2 schema. The ontology package gains each Type's
  colour, Labels, mark, sub-tasks and default Reminder, and a Note loses
  its *idea* status. Three migrations: Labels (one set per Space, "home" is
  "Home"), marks, sub-tasks, series with one occurrence per date made,
  Reminders whose `fires_at` follows the Item in the person's timezone (a
  dated Task's default Reminder made and removed by a trigger), push
  devices, deliveries kept from the app, each person's settings, a hand-made
  order, `touched_at` kept by triggers, and full-text search; then the write
  functions for all of them and `search_items`. 74 new database tests
  (Labels, marks and sub-tasks 27; Reminders and devices 26; series and
  search 21). The app reads every Item column but the search index.
  Applied to the live project after CI passed; then the security advisor
  showed every LifeOS function was executable by PUBLIC: Stage 1's
  per-schema "revoke from public" can't work in Postgres. A fourth
  migration revokes it and changes the default for everything `postgres`
  makes; `core_privileges_test.sql` keeps it so. Signed-out visitors could
  never reach them (no usage on the schemas).
- After applying: the advisors show no function open to people signed out.
  Left as they are: `register_device` runs as its owner, by design (a
  browser's push endpoint moves to whoever registers it); deliveries,
  heartbeats and health runs have row-level security and no policies, so
  only the jobs read them; leaked-password protection is off, as only the
  test account can use a password.

- Plan step 5, working with Items. Every Item has a link of its own,
  `/item/<id>`; a Thought or Task opens in a Dialog over the page
  (`?item=<id>`, so Back closes it), a Note too on a computer and on a page
  of its own on a phone; an unknown link says "This can't be found". The
  Dialog and page carry the Type's tile and name, the star or pin, and a
  "…" menu with Convert to (only Types the app has, from the ontology's new
  `stage`) and Delete, which says so with Undo. Settings, reached from your
  row in the drawer: Labels (a Card on a computer, its own page on a phone:
  new, rename, delete with a count), Recently deleted (newest first, Restore
  with Undo) and Sign out. An offline notice tops every page. New shared
  components, specified first: ItemDialog, ItemPage, BackLink, CardRow,
  EmptyState, a large TypeTile, ItemRow's always-shown control, PageHeader's
  back link. The data layer reads deleted Items too, and Labels, Label
  links and marks, each laid over by unsent writes; a new database function
  `convert_item`. Found on the way: reopening the app within 30 seconds of
  a change showed the device's copy without asking the server — it now
  always refreshes on start. 12 unit tests and 8 browser tests (each on desktop and
  phone) added; the stand-in Supabase now keeps the writes it is sent.
- Before merging: the items browser test moves between pages inside the
  app after a write, as a reload a moment after Undo could come before the
  write was stored (it failed CI once on a slow runner).

**Left for later**
- Merged mid-stage, at Joe's request, so production shows the work so far.
- The build (plan steps 6–14): capture in the app, the Inbox, Notes and
  Tasks lists, series' occurrence functions (step 10) and the notification
  job (step 11).

## [#2](https://github.com/joestables/lifeos/pull/2) — Phone menu button; Supabase URL settings

Branch `claude/stage-1-foundation` · 2026-10-10

**What it did**
- Signing in on production landed on `joestables.uk`: Supabase's Site URL
  was v1's site and production wasn't an allowed return address. Joe fixed
  the settings; integration-setup.md now records them exactly.
- Joe found the phone's menu button cramped: it is now 48px with a 22px
  icon, in a 64px top bar (tokens and components first).

## [#1](https://github.com/joestables/lifeos/pull/1) — Stage 1: the foundation

Branch `claude/stage-1-foundation` · 2026-10-09 to 2026-10-10

**What it did**
- Wrote the [Stage 1 plan](plans/stage-1.md).
- Drafted the Stage 1 requirements: sign-in and Spaces (ACC-001–003) and
  offline writes (OFF-001–005), all *proposed*.
- `CLAUDE.md` and the docs index now say Stage 1 is in progress.
- Joe agreed the eight requirements.
- Checked access from the cloud session: Supabase (new `lifeos` project in
  London, empty), GitHub and Vercel all reachable through their connectors;
  direct HTTPS to `*.supabase.co` and `*.vercel.app` is blocked by the
  environment's network policy.
- ADR-0040: migrations are applied by Claude through the Supabase MCP.
  Recorded the new environment in `environments.md` and the Google sign-in
  settings in `integration-setup.md`.

- Published three design directions for the look-and-feel exercise (plan
  step 3). Joe chose Stone, to be made monotone and coloured by Module;
  published three variations of that and recorded the direction in the
  design language. Joe chose B1's neutrals; published two subtle
  refinements of it (C2, C3) beside it (C1). Joe chose C1 with C2's hairline
  edges: ADR-0041.
- Wrote the design system as a specification in `docs/30-design/` (README
  with the checklist and enforcement, tokens, components, patterns, a frozen
  reference page) and amended ADR-0038 with how it is kept consistent.
- Merged Joe's `.claude/settings.json` change from `master` (whole Supabase,
  Vercel and GitHub servers allowed) and updated `environments.md`.
- Set Vercel's deployment protection to previews only, so production is
  public. Joe finished the Supabase and Google sign-in settings. Cut-over
  done: v1 paused without a `pg_dump` (Joe's choice); ADR-0003, the runbook
  and backups updated.
- Re-checked shadcn's default (Base UI, ADR-0034) and drafted the data
  layer as ADR-0042, which Joe agreed; linked it from ADR-0009, the offline spec,
  the data model, contracts, overview and roadmap.
- Scaffolded the app (plan step 5): Vite, React, TypeScript, Tailwind,
  TanStack Router and Query, the PWA plugin, ESLint (including the rule that
  only `src/data/` imports Supabase), Prettier, Vitest and Playwright;
  `npm run check` runs them. Wrote `src/styles/theme.css` from the tokens,
  since the build needs them. shadcn's CLI can't reach its registry from the
  cloud session, so `components.json` is written by hand.
- The ontology package (plan step 6): the core Types, their link types and
  in-place conversions, with the generated lookup-table migration and its
  staleness check.
- The core schema (plan step 7): people, Spaces, Items, links and the
  activity log, with row-level security, the visibility rule in
  `core_private`, and the write functions of ADR-0042. 42 database tests;
  `npm run db:test` runs them in a cloud session. A first CI workflow
  (plan step 10) runs the checks, the build and the database tests. Once CI
  passed, applied the three migrations to `lifeos` and renamed the files to
  the versions it recorded; the security advisor is clean (the
  `rls_auto_enable` warnings are gone).
- The data layer (plan step 8): `src/data/` with the write queue, unsent
  changes laid over the cache, the cache kept on the device, and sign-out;
  generated database types with a CI check; 19 unit tests. OFF-001–003 and
  ACC-002 verified; OFF-004, OFF-005 and ACC-003 built. Set the public
  Supabase values on Vercel.
- The design system in code (plan step 9): every shadcn component in
  components.md restyled from shadcn's Base UI source, LifeOS's own
  components, the `/design` page, the lint rules and the token check.
  Added to the spec first: `--switch-thumb`, `--shadow-thumb`, `--m-core`,
  `--selected`, `--selected-foreground`, `--pressed-foreground`, the "Not
  saved" state, and the DropdownMenu label rule; `--radius-full` added to
  the theme. Token tables are checked against the theme rather than
  generated (ADR-0038 amended).
- The app shell (plan step 9a): sign-in with Google only, the drawer, empty
  pages, sign-out with the unsent-writes warning, the privacy page Google
  asks for; email/password sign-up refused by a database trigger. Browser
  tests against a stand-in Supabase, with screenshot tests of `/design`
  (plan step 10); Playwright pinned to the Chromium in the cloud session.
  ACC-001 and ACC-003 verified.
- The `can_read` benchmark (plan step 11): reading every Item was slow
  through per-row checks, so the policies now work visibility out as sets
  once per query: 3–6 ms on 7,600 seeded Items. ADR-0017 amended; the result
  is in non-functional.md.
- `ops.events` and the nightly health check (plan step 12): the app reports
  crashes, uncaught errors and refused writes without any Item content; a
  `pg_cron` job records the day's findings. OFF-004 verified. The crash
  screen went into patterns.md first.
- Joe dropped plan step 13: no backups for now, and no notifications; the
  health check's findings stay in `ops.health_runs` for Joe or Claude to
  read. ADR-0035 amended; backups, runbook, environments, overview,
  non-functional, data model, roadmap and the plan updated.
- Joe's first sign-in worked. On his phone the app felt slow, cramped, and
  the drawer floated like a popup. The drawer is now shadcn's Sidebar; on a
  phone it is a Sheet attached to the left edge (288px, full height), kept
  in the page while closed so it opens without rendering, sliding in over
  300ms (new tokens `--duration-sheet`, `--ease-sheet`). Every Sheet is now
  attached to its edge. Pages scroll with the window, a top bar sits clear
  of the notch, drawer items are 44px on a phone, phone page padding went
  from 14px to 20px, and each page's code starts loading when its link is
  touched. Spec first: tokens, components and patterns.
- Closed Stage 1: ACC-001's Google round trip checked by Joe; the plan says
  what carries into Stage 2; `CLAUDE.md`, the docs index and the roadmap
  say Stage 2 is next and starts with its plan and specs.

**Left for later**
- An app icon: the design system has none yet, so the manifest has no icon
  and the app can't be installed until one is designed.
- Joe published the Google sign-in app. Its home page and `/privacy` page
  go live with the first deploy (plan step 9a); brand verification is
  optional and waits until then.

## No PR — Docs structure for LifeOS v2 (Stage 0)

Branch `claude/affectionate-lamport-cukhtr` · 2026-10-09 · pushed straight to
`master` to create it, since the repository had no `master` yet

**What it did**
- Created the `docs/` structure (foundation, requirements, architecture,
  design, operations, roadmap, history) and `CLAUDE.md`, from the redesign
  summary of 8–9 October, which is not kept in the repository. The
  hand-drawn knowledge graph is frozen in `docs/history/`.
- Recorded 36 ADRs: decisions agreed in the redesign discussion, and leans
  as Proposed.
- Added the **Provisionally agreed** ADR status and moved every agreed
  decision to it (Joe is open to changing course while the design is
  young).
- Introduced **Thoughts** (ADR-0037): capture makes a Thought that waits in
  Inbox to be sorted into Notes, Tasks, Lists and other Types. Amended ADR-0005, 0006,
  0007, 0018, 0019, 0023, 0027, 0028 and 0033, and updated every document
  that mentioned Notes as captures.
- Added **one design system, built from shared components** (ADR-0038), set
  up in Stage 1.
- Joe's ADR review: every Proposed ADR moved to Provisionally agreed except
  ADR-0030 (activity log), agreed afterwards to start small: items and
  links only in Stage 1. Notes are Personal only.
  Sign-up is open to anyone with Google; people connect as Contacts, then
  invite each other into a Household (ADR-0039, amending 0003 and 0017).
  Deleted Items can be recovered from Settings (ADR-0032, amending 0026).
- Moved Stage 2's requirements out of Stage 0, to the start of Stage 2.
- Strengthened the documentation-consistency rules in `docs/README.md` and
  `CLAUDE.md`; added this `50-progress/` folder.
- Added `.claude/settings.json`, pre-approving the Supabase MCP tools under
  both server names, and the rules for Claude running SQL.

- Drew the context and container diagrams in the architecture overview;
  Stage 0 is done ([plan](plans/stage-0.md)).

**Left for later**
- Stage 1's plan and specs (sign-in and Spaces, offline writes).
