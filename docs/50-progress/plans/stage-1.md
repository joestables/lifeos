# Plan: Stage 1 — foundation

**Outcome** ([roadmap](../../roadmap.md)): a solid base, built only as far as
Stage 2 needs. Someone can sign up with Google, land in an empty app with the
navigation drawer, and every write is stored safely, logged, backed up and
tested. No user-facing features beyond that.

**State:** in progress.

## Steps

Steps marked **Joe** need Joe's go-ahead or action before Claude does them.

| # | Step | State | Produces |
|---|---|---|---|
| 1 | Specs: sign-in and Spaces; offline writes | Agreed by Joe, 9 October (ACC-001–003, OFF-001–005) | [spaces-and-sharing](../../10-requirements/cross-cutting/spaces-and-sharing.md#requirements), [offline](../../10-requirements/cross-cutting/offline.md#requirements) |
| 2 | Decisions: the migration tool; the data layer (TanStack Query, write queue, database functions); re-check shadcn's default (Base UI or Radix) | Migration tool done ([ADR-0040](../../20-architecture/adr/0040-migrations-applied-by-claude.md)). shadcn re-checked: Base UI is the default ([ADR-0034](../../20-architecture/adr/0034-stack.md)). Data layer drafted, waiting for Joe ([ADR-0042](../../20-architecture/adr/0042-data-layer.md), Proposed) | ADRs |
| 3 | **Joe** — look and feel: a short exercise to choose the direction for the design tokens | Done 9 October: Stone, true neutral greys, coloured by Module, with hairline edges ([ADR-0041](../../20-architecture/adr/0041-visual-direction.md)); specified in full | [design system](../../30-design/README.md) |
| 4 | **Joe** — cut-over: pause v1, create the v2 Supabase project in London, a Vercel project, Google sign-in | Done 9 October: v1 paused (no `pg_dump`, Joe's choice); v2 project, Vercel project and Google sign-in set up ([integration setup](../../40-operations/integration-setup.md#google-sign-in)) | [runbook](../../40-operations/runbook.md#stage-1-cut-over-from-v1), [environments](../../40-operations/environments.md) |
| 5 | Repository scaffold: Vite, React, TypeScript, PWA, Tailwind, shadcn/ui, TanStack Router and Query, lint, format, unit tests | Not started | Code |
| 6 | The ontology package: Thought, Note, Task and Event, their link types, and the generated lookup-table migration | Not started | `packages/ontology` |
| 7 | Core schema: people, Spaces, items, links, activity log (items and links), `uuidv7()`, `core.can_read`, RLS; revoke public `EXECUTE` on Supabase's `public.rls_auto_enable()` (advisor warning) | Not started | Migrations, database tests |
| 8 | Data layer and write queue | Not started | Code, tests citing OFF-* |
| 9 | Design system in code: `theme.css` from [tokens](../../30-design/tokens.md); the shadcn components and LifeOS components in [components](../../30-design/components.md); the `/design` page; generated token tables | Not started | Code |
| 9a | App shell: sign-in, `AppShell` with the drawer (pages empty); a short privacy page at `/privacy`, which Google requires before the sign-in app can be published | Not started | Code, tests citing ACC-* |
| 10 | CI: typecheck and lint (with the design-system rules) → unit tests → database tests on a local Supabase → screenshot tests of `/design`; `master` protected; Vercel previews | Not started | GitHub Actions, [enforcement](../../30-design/README.md#enforcement) |
| 11 | `can_read` benchmark on seeded data | Not started | Result recorded in [non-functional](../../10-requirements/non-functional.md) |
| 12 | `ops.events` and the nightly health check | Not started | Migrations, `pg_cron` job |
| 13 | Nightly backup, and one test restore | Not started | GitHub Actions, [backups](../../40-operations/backups.md) |

## Done when

- Every **Must** requirement in this stage's specs is *verified* (a test
  citing its ID passes).
- CI runs on every pull request and `master` is protected.
- The `can_read` benchmark is recorded, and the backup has been restored
  once.
- No two documents conflict.
