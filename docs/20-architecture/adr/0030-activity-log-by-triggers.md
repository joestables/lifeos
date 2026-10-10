# ADR-0030: An activity log written by triggers

**Status:** Provisionally agreed · 2026-10-09

## Context

History: an activity log only, or full version history? Goals, Inbox, AI and
future automations also need to know what happened without calling each
other. History can't be filled in afterwards: anything that happens before a
log exists is lost.

## Decision

- An activity log (`core.activity`: item, verb, changed fields as JSON, time,
  actor), written by **database triggers**, so every change is logged
  whatever made it — the app, the capture address, an Integration, an Edge
  Function or SQL run by Claude.
- **Start small:** Stage 1 logs changes to `core.items` and `core.links`
  only. Detail tables and child rows are added when a stage needs them.
- Not a full version history: no copy of the whole row on each change.

## Consequences

- It gives most of a version history, and no code path can forget to write
  it.
- Goals, Inbox, AI and automations read the log rather than calling each
  other; it records every conversion ([ADR-0018](0018-changing-an-items-type.md)).
- Log rows are personal data: a row is readable only by people who can read
  its Item (`core_private.can_read`).
- One small extra row per change, and slightly slower writes.
