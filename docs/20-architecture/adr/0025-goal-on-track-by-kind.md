# ADR-0025: "On track" depends on the goal kind

**Status:** Provisionally agreed · 2026-10-09

## Context

[ADR-0024](0024-goals.md) has four goal kinds. One "on track" rule can't fit
them all; strength, for one, doesn't progress in a straight line.

## Decision

- *total*: progress against a straight line from start to deadline;
- *habit*: this period's count against the target, plus the streak;
- *target*: the latest value and its recent trend, with no on-track verdict
  in the first release;
- *milestone*: the share of linked Tasks done.

## Consequences

The Goals spec (Stage 5) builds on these rules.
