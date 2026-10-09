# ADR-0015: Health data as a time series

**Status:** Accepted · 2026-10-09

## Context

Oura sleep and readiness, steps and weight arrive daily. No one links one
night's sleep to anything.

## Decision

Health data **stays out of the Items table**, in a time-series table
(`health.daily_metrics`, later).

## Consequences

- Health metrics are not Items: not linked, scheduled or searched on their
  own.
- Goals can still read them through a measure (`health.latest(metric)`).
- A Body measurement Type can be added if it ever needs linking.
