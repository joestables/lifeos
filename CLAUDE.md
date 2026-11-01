# LifeOS — instructions for Claude

LifeOS v2 is being built, stage by stage. Stage 0 settled the architecture
(Provisionally agreed); Stage 1 built the foundation; Stage 2 replaced
Google Tasks; Stage 3 built Plan, Events and Google Calendar; Stage 4 built Recipes and the Meal plan; Stage 4b (Shopping) has started, and Stage 5 (Gym) has its spec, design, schema, calculations (`packages/fitness`), settings, exercise library, templates, workouts and recovery. The current stage's plan is in
[docs/50-progress/plans/](docs/50-progress/plans/);
a stage without one starts by writing it, shaped like the last, with the
stage's specs as its first step for Joe to agree
([roadmap](docs/roadmap.md#where-we-are)). Start at [docs/README.md](docs/README.md): the
index, the ADR statuses, which document wins, and how to change documents.

**Before every commit:** `npm run check` (typecheck, lint, format, token
check, unit tests) and `npm run build` pass; with UI changes also
`npm run build:e2e && npm run e2e` (browser and screenshot tests, in
Playwright's Docker image; start `dockerd` first in a cloud session); with
migrations, `npm run db:test`. GitHub's CI runs only on pull requests
([CI](docs/40-operations/environments.md#ci)): open a draft one before
applying a migration. Vite + React + TypeScript; the app is in
`src/`, shared packages in `packages/`.

## Spec-driven development: the docs are the source of truth

This matters more than anything else here.

- **The documents must never conflict** — with each other or with the code.
  Finding a conflict is finding a defect: fix it, or raise it, before going
  on.
- **Every change updates every document it touches, in the same commit.**
  Before committing, search all of `docs/` and this file for the terms,
  decisions and behaviour you changed — glossary, data model, ADRs,
  capability map, specs, roadmap, design language — and bring every one up
  to date.
- **Code and docs move together.** A pull request that changes behaviour
  without updating its spec is not finished. Specs describe the present; ADRs
  and git hold the past.
- **Use the [glossary](docs/00-foundation/glossary.md)'s terms** (Item, Type,
  Thought, Note, View, Screen, Module, Space…), in docs and in code.
- **Record progress:** every pull request adds its entry to
  [docs/50-progress/pull-requests.md](docs/50-progress/pull-requests.md),
  and keeps the current [plan](docs/50-progress/plans/) up to date.

## ADR statuses

- **Proposed** — context; don't build on it without asking.
- **Provisionally agreed** — follow it, but Joe is open to a better option:
  when you see one, or a conflict, raise it with the trade-off rather than
  silently following or silently overriding.
- **Accepted** — binding; a conflicting task stops and raises it.
- **Superseded** — history.

## One design system

The [design system](docs/30-design/README.md) is a specification, and every
screen follows it exactly ([ADR-0038](docs/20-architecture/adr/0038-one-design-system.md),
[ADR-0041](docs/20-architecture/adr/0041-visual-direction.md)).

- **Read `docs/30-design/` before building or changing any UI**, and work
  through its checklist before opening the pull request.
- **Use only its tokens and components.** No colour, size, radius, shadow or
  font that isn't in [tokens](docs/30-design/tokens.md); no component or
  variant that isn't in [components](docs/30-design/components.md); no
  restyling a component on a screen.
- **Something new goes into the spec first**, in the same pull request, then
  into the shared components — never as a one-off.
- **Colour means Type**, and nothing else: related Types share a colour, a
  page takes its Types' colour, and Inbox and Plan are neutral; red and
  green keep their usual meaning, and amber is a warning, never by colour
  alone
  ([ADR-0043](docs/20-architecture/adr/0043-colour-by-type.md),
  [patterns](docs/30-design/patterns.md#colour-by-type)).
- **Check dark mode first**, then light, at desktop and phone width, and
  attach screenshots.

## Running SQL for Joe

Joe mostly works in Claude cloud sessions. **Run SQL yourself** with the
Supabase MCP tools; don't hand Joe SQL to paste into the dashboard. If a tool
can't do something, say exactly why and what Joe needs to do.

- **Queries and checks:** `execute_sql`, `list_tables`, `get_advisors`,
  `query_logs`.
- **Schema changes:** write the migration file in the repository first, then
  apply it with `apply_migration` and name the file with the version the
  project records ([ADR-0040](docs/20-architecture/adr/0040-migrations-applied-by-claude.md))
  — never ad-hoc DDL through `execute_sql` (that is how v1's schema drifted). Run `get_advisors` after
  every migration.
- **Know the project** before any write. v1 (_JoeStables LifeOS_) is
  reference only: never write to it.
- **Joe's standing permission covers every Supabase action** on the `lifeos`
  project — queries, migrations, destructive SQL, Edge Function deploys,
  secrets. Never ask him to approve one. Take care instead: check it's the
  right project, and before destroying data say in your reply what will
  change.
- **Permissions** are in [.claude/settings.json](.claude/settings.json); see
  [environments](docs/40-operations/environments.md#claude-cloud-sessions).
  Browser walks run against a stand-in Supabase, never real data.

## Lessons from v1

- Put the Supabase tools on the permission allowlist under every name the
  server registers, including the `_88FE637B` suffix.
- A credential is not a permission.
- A UI change is not verified because `tsc` passed.
- No paragraphs of explanation in the app (v1 style-guide rule 36).
