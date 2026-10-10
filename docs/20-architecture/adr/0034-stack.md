# ADR-0034: Stack

**Status:** Provisionally agreed · 2026-10-09

## Context

v1 used React + TypeScript + heavily customised MUI over Supabase. Goal 3
asks for a standard design system.

## Decision

- React + TypeScript + Vite, as an installable PWA;
- Tailwind v4 and **shadcn/ui on Base UI** (the shadcn default for new
  projects since July 2026, with Radix still supported);
- TanStack Router;
- TanStack Query behind one data layer, keeping the option of PowerSync +
  TanStack DB;
- Supabase, including Edge Functions, pg_cron and Vault;
- Capacitor later.

## Consequences

- Re-checked 9 October 2026: Base UI is shadcn's default for new projects
  since July 2026 ([changelog](https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default)).
- No Storybook: shadcn's components are documented upstream.
