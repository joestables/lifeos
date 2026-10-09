# ADR-0022: Repeating Items and do-on by default

**Status:** Provisionally agreed · 2026-10-09

## Context

[ADR-0021](0021-time.md) makes repeating items generated occurrences. Editing
a series, clock changes and missed occurrences need rules. Google Tasks,
which LifeOS replaces in Stage 2, has repeating tasks.

## Decision

- **One engine.** The ported TypeScript RRULE expansion, kept free of
  dependencies so the same code runs on the device (the first window, when a
  series is created) and in a nightly Edge Function (Deno) that extends every
  window. There is no SQL copy.
- **Generated in local time**, in the series' timezone, then stored as UTC,
  so an 18:30 session stays at 18:30 when the clocks change.
- **Touched occurrences are kept** (`touched_at`: edited, ticked, logged or
  linked).
- **Editing the rule** ("this and all following") ends the old series at that
  date and starts a new one. Untouched future occurrences are regenerated;
  touched ones stay, still carrying the series they came from.
- **Editing one occurrence** changes only that Item and marks it touched.
- **Deleting a series** archives its untouched future occurrences and keeps
  everything in the past or touched.
- **Two repeat modes:** *on a schedule* (every Monday) and *after completion*
  ("every 3 months after I last did it"), where the next occurrence is
  created when the current one is done.
- **Repeating Tasks behave like Google Tasks:** the Tasks View and Inbox show
  a series' next open occurrence only. When a newer occurrence comes due, an
  older untouched one is closed as *skipped* (cancelled).
- **Google Calendar's repeating events** are imported as individual
  instances; LifeOS doesn't regenerate them.
- **A bare date fills do-on** ("renew insurance fri"); a deadline must be
  said ("due fri", "by fri").

## Consequences

A missed week of "take vitamins" doesn't pile up as overdue.
