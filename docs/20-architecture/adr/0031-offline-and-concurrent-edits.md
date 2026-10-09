# ADR-0031: Offline writes and concurrent edits

**Status:** Proposed · 2026-10-09

## Context

Capture must work with no signal. Two people can edit the same shared Item.

## Decision

- **A write queue first**, with IDs made on the device. Adopt PowerSync +
  TanStack DB only if the queue isn't enough.
- **Two people editing the same Item:** last write wins, **field by field, by
  the time the server receives it**. The write queue sends only the fields
  that changed.

## Consequences

A late offline edit overwrites only what it actually changed.
