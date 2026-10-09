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
| 2 | Decisions: the migration tool; the data layer (TanStack Query, write queue, database functions); re-check shadcn's default (Base UI or Radix) | Migration tool done ([ADR-0040](../../20-architecture/adr/0040-migrations-applied-by-claude.md)); the rest not started | ADRs |
| 3 | **Joe** — look and feel: a short exercise to choose the direction for the design tokens | Round 1: Joe chose B (Stone), monotone and coloured by Module. Round 2 ([LifeOS Stone Variations](https://claude.ai/artifact/1aoCq4aQ1vvngN8e6D4S75)): Joe chose B1's neutrals. Round 3: C1–C3 to choose from, [LifeOS Stone Refinements](https://claude.ai/artifact/MWirJxnk1cTN46EiViXmLQ) | [design language](../../30-design/design-language.md) |
| 4 | **Joe** — cut-over: `pg_dump` of v1, pause v1, create the v2 Supabase project in London, a Vercel project, Google sign-in | Mostly done: v2 project, Vercel project, Google Cloud project and client exist; v1 paused. Left: confirm v1 was backed up; the Google and Supabase settings in [integration setup](../../40-operations/integration-setup.md#google-sign-in); Vercel's deployment protection | [runbook](../../40-operations/runbook.md#stage-1-cut-over-from-v1), [environments](../../40-operations/environments.md) |
| 5 | Repository scaffold: Vite, React, TypeScript, PWA, Tailwind, shadcn/ui, TanStack Router and Query, lint, format, unit tests | Not started | Code |
| 6 | The ontology package: Thought, Note, Task and Event, their link types, and the generated lookup-table migration | Not started | `packages/ontology` |
| 7 | Core schema: people, Spaces, items, links, activity log (items and links), `uuidv7()`, `core.can_read`, RLS; revoke public `EXECUTE` on Supabase's `public.rls_auto_enable()` (advisor warning) | Not started | Migrations, database tests |
| 8 | Data layer and write queue | Not started | Code, tests citing OFF-* |
| 9 | App shell: sign-in, navigation drawer (pages empty), design system tokens and first shared components | Not started | Code, tests citing ACC-* |
| 10 | CI: typecheck and lint → unit tests → database tests on a local Supabase; `master` protected; Vercel previews | Not started | GitHub Actions |
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
