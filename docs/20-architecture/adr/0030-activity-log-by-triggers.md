# ADR-0030: An activity log written by triggers

**Status:** Proposed · 2026-10-09

## Context

History: an activity log only, or full version history? Goals, Inbox, AI and
future automations also need to know what happened without calling each
other.

## Decision

An activity log (`core.activity`: item, verb, changed fields as JSON, time,
actor), written by **database triggers**.

## Consequences

- It gives most of a version history, and no code path can forget to write
  it.
- Goals, Inbox, AI and automations read the log rather than calling each
  other.
