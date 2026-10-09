# Plan: Stage 0 — requirements and architecture

**Outcome** ([roadmap](../../roadmap.md)): agreed decisions (ADRs), data model
and architecture — enough to start Stage 1. No code. Specs for each stage's
features are written at the start of that stage, not here.

**State:** nearly done.

## Steps

| # | Step | State | Produces |
|---|---|---|---|
| 1 | Vision and principles | Drafted | [vision](../../00-foundation/vision.md), [principles](../../00-foundation/principles.md) |
| 2 | Glossary | Drafted | [glossary](../../00-foundation/glossary.md) |
| 3 | Conceptual data model: the core, plus Thought, Note, Task and Event | Drafted, by hand | [data model](../../20-architecture/data-model.md) |
| 4 | Capability map | Drafted | [capability map](../../10-requirements/capability-map.md) |
| 5 | Cross-cutting decisions recorded (capture, Spaces, Reminders, offline, search, integrations) | Done; their user stories are written in the stage that first needs them | [cross-cutting](../../10-requirements/cross-cutting/) |
| 6 | Architecture overview and the first ADRs | ADRs done (39); overview drafted; context and container diagrams not drawn | [overview](../../20-architecture/overview.md), [ADRs](../../README.md#architecture-decision-records) |
| 7 | Roadmap | Drafted | [roadmap](../../roadmap.md) |
| 8 | Joe reviews the ADRs | Done 9 October: all Provisionally agreed, with changes to 0017 (→ 0039), 0032 and 0037; **ADR-0030 still to decide** | ADR statuses |

## Moved out of Stage 0

- Stage 2's requirements (capture, Thoughts and Inbox, Notes, Tasks with
  repeats, Reminders) are written at the start of Stage 2.

## Done when

- ADR-0030 is decided.
- The overview has its context and container diagrams.
- No two documents conflict.
