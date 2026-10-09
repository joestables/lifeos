# ADR-0032: Delete means archive

**Status:** Proposed · 2026-10-09

## Context

Deleting by mistake must be recoverable; deleting must not break visibility.

## Decision

Delete means archive (`archived_at`), with undo. An archived Item's links
stop counting for visibility. Its child rows go with it.

## Consequences

There is no Trash page for now ([ADR-0026](0026-navigation-drawer.md)); undo
is the recovery route.
