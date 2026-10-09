# Inbox

*Stage 2. Spec not yet written; what the page shows, its tabs, layouts and
filters are decided here at the start of the stage. Below: the decisions and
candidate requirements it builds on.*

**In one line:** one feed of what needs you, drawn from everything — not
dashboard cards ([ADR-0026](../../20-architecture/adr/0026-navigation-drawer.md),
  Provisionally agreed).

## Inputs so far

- **Thoughts wait here to be sorted.** Capture makes a Thought by default;
  it leaves Inbox when it is converted into another Type (a Note, Task, List…)
  or deleted ([ADR-0037](../../20-architecture/adr/0037-thoughts.md),
  Provisionally agreed).
- **Due** drives "overdue" ([ADR-0021](../../20-architecture/adr/0021-time.md)).
- A repeating Task shows its **next open occurrence only**
  ([ADR-0022](../../20-architecture/adr/0022-repeating-items.md), Proposed).
- Modules contribute **Inbox entries**
  ([contracts](../../20-architecture/contracts.md#moduledefinition)).
- Dismiss and snooze of Inbox entries are **per person**
  (`core.inbox_state`).
- A **broken Integration** shows in Inbox.
- The **morning digest** is Inbox in one notification (candidate).
- Later: readiness-aware gym suggestions
  ([roadmap](../../roadmap.md#later-opportunities)).
