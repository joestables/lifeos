# Pull requests

Newest first. Each entry is added in its own pull request.

## Not yet opened — Stage 2: plan and specs

Branch `claude/kind-dijkstra-1kv0xt` · 2026-10-10

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

**Left for later**
- Joe agrees the specs; then the ADRs of plan step 2, the design step, and
  the build. The ontology package drops a Note's *idea* status and gains
  colours, Labels and marks with the Stage 2 schema (plan step 4).

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
