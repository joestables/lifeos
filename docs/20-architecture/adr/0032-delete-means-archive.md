# ADR-0032: Delete means archive

**Status:** Provisionally agreed · 2026-10-09

**Amended:** 2026-10-09 by Joe's review (recovery in Settings).

## Context

Deleting by mistake must be recoverable; deleting must not break visibility.

## Decision

Delete means archive (`archived_at`), with undo. **Deleted Items can be
recovered from Settings**, as well as straight after deleting. An archived Item's links
stop counting for visibility. Its child rows go with it.

## Consequences

Recovery lives in Settings, so there is still no Trash page in the drawer
([ADR-0026](0026-navigation-drawer.md)).
