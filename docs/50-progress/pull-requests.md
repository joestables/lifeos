# Pull requests

Newest first. Each entry is added in its own pull request.

## Not yet opened — Stage 1: plan and first specs

Branch `claude/stage-1-foundation` · 2026-10-09

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
  layer as ADR-0042 (Proposed); linked it from ADR-0009, the offline spec,
  the data model, contracts, overview and roadmap.

**Left for later**
- Joe published the Google sign-in app. Its home page and `/privacy` page
  go live with the first deploy (plan step 9a); brand verification is
  optional and waits until then.
- Joe to agree the data layer (ADR-0042, Proposed).

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
