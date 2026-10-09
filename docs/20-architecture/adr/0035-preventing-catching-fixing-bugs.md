# ADR-0035: Preventing, catching and fixing bugs

**Status:** Provisionally agreed · 2026-10-09

## Context

v1's two audits (12 and 24 September) found 25 defects, mostly in the same
places: cache error paths, the order of optimistic writes, lazy loading and
the notification fallback. v1 also shipped every push to `master` straight to
production.

## Decision

A layer at each stage a bug passes through:

1. **Make bugs hard to write:** the database refuses bad data (required
   fields, `CHECK`s, foreign keys, a trigger refusing links the ontology
   doesn't allow, RLS through `core_private.can_read`); TypeScript types generated
   from the database; zod checks on anything arriving from outside; one
   requirement or fix per pull request.
2. **Catch them before they ship:** `main` is protected; CI runs typecheck
   and lint → unit tests → database tests on a local Supabase (every
   migration from empty, then pgTAP) → Playwright walks against the stand-in
   (from Stage 2); a Vercel preview of every pull request; tests cite
   requirement IDs and every bug fixed gets a test; Claude reviews its own
   pull requests (code-review, and security-review for RLS or the capture
   address); `get_advisors` after every migration; migrations
   backwards-compatible (expand, then contract).
3. **Notice them in production:** one errors table, `ops.events`, rather than
   a third-party service; no in-app bug reporting; a nightly health check
   that notifies Joe only when something is wrong; a nightly smoke walk once
   Stage 2 is in daily use.
4. **Recover quickly:** undo for deletes, and recovery from Settings; Vercel's instant rollback;
   migrations fixed forward; backups restored once when first set up.

Details: [runbook](../../40-operations/runbook.md),
[migrations](../../40-operations/migrations.md).

## Consequences

- Process is phased in with the stage that needs it.
- Sentry can be added later if needed.
