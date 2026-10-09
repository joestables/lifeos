# ADR-0034: Stack

**Status:** Provisionally agreed · 2026-10-09

## Context

v1 used React + TypeScript + heavily customised MUI over Supabase. Goal 3
asks for a standard design system.

## Decision

- React + TypeScript + Vite, as an installable PWA;
- Tailwind v4 and **shadcn/ui on Base UI** (reported as the shadcn default for
  new projects since July 2026, with Radix still supported);
- TanStack Router;
- TanStack Query behind one data layer, keeping the option of PowerSync +
  TanStack DB;
- Supabase, including Edge Functions, pg_cron and Vault;
- Capacitor later.

## Consequences

- Re-check the shadcn default before starting.
- No Storybook: shadcn's components are documented upstream.
