# LifeOS v2 documentation

LifeOS v2 is a personal and household life app built as one knowledge graph:
Items, the Links between them, and Views over both. These documents are the
source of truth for what it does and why. Code is checked against them.

The project is in **Stage 0: requirements and architecture**
([roadmap](roadmap.md)).

## Index

| Folder | What it holds |
|---|---|
| [00-foundation](00-foundation/) | [Vision](00-foundation/vision.md) · [Principles](00-foundation/principles.md) · [Glossary](00-foundation/glossary.md) |
| [10-requirements](10-requirements/) | [Capability map](10-requirements/capability-map.md) · cross-cutting: [capture](10-requirements/cross-cutting/capture.md), [spaces and sharing](10-requirements/cross-cutting/spaces-and-sharing.md), [reminders](10-requirements/cross-cutting/reminders.md), [search](10-requirements/cross-cutting/search.md), [offline](10-requirements/cross-cutting/offline.md), [integrations](10-requirements/cross-cutting/integrations.md) · views: [Inbox](10-requirements/views/inbox.md), [Plan](10-requirements/views/plan.md) · [modules](10-requirements/modules/) · [non-functional](10-requirements/non-functional.md) |
| [20-architecture](20-architecture/) | [Overview](20-architecture/overview.md) · [Data model](20-architecture/data-model.md) · [Contracts](20-architecture/contracts.md) · [ADRs](#architecture-decision-records) |
| [30-design](30-design/) | [Design language](30-design/design-language.md) |
| [40-operations](40-operations/) | [Environments](40-operations/environments.md) · [Migrations](40-operations/migrations.md) · [Backups](40-operations/backups.md) · [Runbook](40-operations/runbook.md) · [Integration setup](40-operations/integration-setup.md) |
| [roadmap.md](roadmap.md) | Stages, what's next, open questions |
| [history](history/) | Frozen records of how decisions were reached. Not specs; never edited. |

Many documents are placeholders until their stage: specs are written just in
time, and only as detailed as the next build needs.

## Which document wins

- **An Accepted ADR is binding.** A task or spec that conflicts with one
  stops and raises it rather than overriding it. A **Proposed** ADR is
  context; a **Superseded** one is history.
- **Specs describe the present.** ADRs and git hold the past. Nothing in
  `history/` is a spec.
- **For the ontology, the code is the authority** once it exists
  ([ADR-0008](20-architecture/adr/0008-registries-declared-in-code.md)).
  Until Stage 1 builds it, [data-model.md](20-architecture/data-model.md) is
  written by hand.

Where a document states something that rests on an ADR, it cites it, e.g.
"(ADR-0007, Proposed)". Anything citing a Proposed ADR is not yet agreed.

## How to change documents

1. **Specs describe the present; ADRs and git hold the past.** No revision
   notes inside specs.
2. **ADR status binds Claude** (above). ADRs stay to a page.
3. **Generate rather than hand-write** wherever possible: schema docs, types,
   the lookup-table migration, the migrations list.
4. **Docs change in the same commit as the code**, with CI checking what it
   can (e.g. every requirement ID cited in code exists).
5. **One short [CLAUDE.md](../CLAUDE.md)** pointing here and at the glossary,
   carrying v1's operational lessons.

(ADR-0001, Proposed)

### Requirements

Every requirement has a **stable ID**, a **user story**, a **priority**
(Must / Should / Could) and a **status** (proposed → agreed → built →
verified). **Must** requirements also have acceptance criteria in
Given / When / Then form. Each spec lists **non-goals**.

A requirement is *verified* only when a test of the right kind cites its ID
and passes:

- **Playwright** for what a person sees and does (against the stand-in
  Supabase);
- **database tests** (SQL / pgTAP) for row-level security, triggers, series
  generation and Reminder scheduling, which a stand-in can't prove;
- **unit tests** for pure logic: the capture parser, the RRULE engine, e1RM.

The first drafted requirement,
[CAP-001](10-requirements/cross-cutting/capture.md#cap-001--capture-a-thought-in-one-line),
shows the format.

### ADRs

`20-architecture/adr/NNNN-title.md`, with **Status · Context · Decision ·
Consequences**, to a page. A changed decision gets a new ADR that supersedes
the old one.

## Architecture decision records

| # | Decision | Status |
|---|---|---|
| [0001](20-architecture/adr/0001-spec-driven-docs-and-adrs.md) | Spec-driven documentation and ADRs | Proposed |
| [0002](20-architecture/adr/0002-start-afresh-port-selectively.md) | Start afresh, port selectively | Accepted |
| [0003](20-architecture/adr/0003-new-supabase-project.md) | A new Supabase project | Accepted |
| [0004](20-architecture/adr/0004-ai-across-the-whole-app.md) | AI across the whole app | Accepted |
| [0005](20-architecture/adr/0005-traits-links-rules.md) | Traits, Links and Rules | Accepted |
| [0006](20-architecture/adr/0006-vocabulary.md) | Vocabulary | Proposed |
| [0007](20-architecture/adr/0007-storage-shape.md) | Storage shape | Proposed |
| [0008](20-architecture/adr/0008-registries-declared-in-code.md) | Registries declared in code | Proposed |
| [0009](20-architecture/adr/0009-cross-table-writes-are-database-functions.md) | Writes that span tables are database functions | Proposed |
| [0010](20-architecture/adr/0010-shop-is-its-own-type.md) | Shop is its own Type | Accepted |
| [0011](20-architecture/adr/0011-recipe-and-variation.md) | Recipe and Variation; cooking with or without a Meal | Accepted |
| [0012](20-architecture/adr/0012-ingredients-and-shopping-lists.md) | Ingredients and shopping lists | Proposed |
| [0013](20-architecture/adr/0013-occurrences-snapshot-their-definition.md) | Occurrences snapshot their definition | Proposed |
| [0014](20-architecture/adr/0014-reference-data-and-labels.md) | Reference data and Labels | Proposed |
| [0015](20-architecture/adr/0015-health-data-as-a-time-series.md) | Health data as a time series | Accepted |
| [0016](20-architecture/adr/0016-sharing-and-visibility.md) | Sharing and visibility | Accepted |
| [0017](20-architecture/adr/0017-enforcing-visibility.md) | Enforcing visibility | Proposed |
| [0018](20-architecture/adr/0018-changing-an-items-type.md) | Changing an Item's Type | Accepted |
| [0019](20-architecture/adr/0019-conversion-keeps-space-and-status.md) | A conversion keeps Space and status | Proposed |
| [0020](20-architecture/adr/0020-task-event-reminder.md) | Task, Event and Reminder | Accepted |
| [0021](20-architecture/adr/0021-time.md) | Time | Accepted |
| [0022](20-architecture/adr/0022-repeating-items.md) | Repeating Items and do-on by default | Proposed |
| [0023](20-architecture/adr/0023-reminders.md) | Reminders | Accepted |
| [0024](20-architecture/adr/0024-goals.md) | Goals | Accepted |
| [0025](20-architecture/adr/0025-goal-on-track-by-kind.md) | "On track" depends on the goal kind | Proposed |
| [0026](20-architecture/adr/0026-navigation-drawer.md) | The navigation drawer | Accepted |
| [0027](20-architecture/adr/0027-quick-capture.md) | Quick capture makes a Note by default | Accepted |
| [0028](20-architecture/adr/0028-capture-from-outside-the-app.md) | Capture from outside the app | Accepted |
| [0029](20-architecture/adr/0029-plan-reads-core-items.md) | Plan reads `core.items` | Accepted |
| [0030](20-architecture/adr/0030-activity-log-by-triggers.md) | An activity log written by triggers | Proposed |
| [0031](20-architecture/adr/0031-offline-and-concurrent-edits.md) | Offline writes and concurrent edits | Proposed |
| [0032](20-architecture/adr/0032-delete-means-archive.md) | Delete means archive | Proposed |
| [0033](20-architecture/adr/0033-architecture-principles.md) | Architecture principles | Proposed |
| [0034](20-architecture/adr/0034-stack.md) | Stack | Proposed |
| [0035](20-architecture/adr/0035-preventing-catching-fixing-bugs.md) | Preventing, catching and fixing bugs | Proposed |
| [0036](20-architecture/adr/0036-changing-the-model-over-time.md) | Changing the model over time | Proposed |

## Sources

Spec-driven development and ADRs:
[SDD paper](https://arxiv.org/abs/2602.00180v1),
[coding agents and decision records](https://duncandavidson.com/agents-love-decisions).
