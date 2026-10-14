# LifeOS v2 documentation

LifeOS v2 is a personal and household life app built as one knowledge graph:
Items, the Links between them, and Views over both. These documents are the
source of truth for what it does and why. Code is checked against them.

Stages 0 (requirements and architecture), 1 (foundation) and 2 (replacing
Google Tasks) are done. **Stage 3**, Plan, Events and Google Calendar, has
started: its [plan](50-progress/plans/stage-3.md) is written, and its specs
come first ([roadmap](roadmap.md#where-we-are)).

## Index

| Folder | What it holds |
|---|---|
| [00-foundation](00-foundation/) | [Vision](00-foundation/vision.md) · [Principles](00-foundation/principles.md) · [Glossary](00-foundation/glossary.md) |
| [10-requirements](10-requirements/) | [Capability map](10-requirements/capability-map.md) · cross-cutting: [capture](10-requirements/cross-cutting/capture.md), [spaces and sharing](10-requirements/cross-cutting/spaces-and-sharing.md), [reminders](10-requirements/cross-cutting/reminders.md), [search](10-requirements/cross-cutting/search.md), [events](10-requirements/cross-cutting/events.md), [offline](10-requirements/cross-cutting/offline.md), [items](10-requirements/cross-cutting/items.md), [integrations](10-requirements/cross-cutting/integrations.md) · views: [Inbox](10-requirements/views/inbox.md), [Tasks](10-requirements/views/tasks.md), [Notes](10-requirements/views/notes.md), [Plan](10-requirements/views/plan.md) · [modules](10-requirements/modules/) · [non-functional](10-requirements/non-functional.md) |
| [20-architecture](20-architecture/) | [Overview](20-architecture/overview.md) · [Data model](20-architecture/data-model.md) · [Contracts](20-architecture/contracts.md) · [ADRs](#architecture-decision-records) |
| [30-design](30-design/) | [The design system](30-design/README.md): [design language](30-design/design-language.md) · [tokens](30-design/tokens.md) · [components](30-design/components.md) · [patterns](30-design/patterns.md) · [reference](30-design/reference.html) |
| [40-operations](40-operations/) | [Environments](40-operations/environments.md) · [Migrations](40-operations/migrations.md) · [Backups](40-operations/backups.md) · [Runbook](40-operations/runbook.md) · [Integration setup](40-operations/integration-setup.md) |
| [roadmap.md](roadmap.md) | Stages, open questions |
| [50-progress](50-progress/) | Plans for the work in hand, and a record of every pull request and what it did. Not specs. |
| [history](history/) | Frozen records of how decisions were reached. Not specs; never edited. |

Many documents are placeholders until their stage: specs are written just in
time, and only as detailed as the next build needs.

## ADR statuses

| Status | Meaning | What Claude does |
|---|---|---|
| **Proposed** | A recommendation, not yet agreed. | Treats it as context. Doesn't build on it without asking. |
| **Provisionally agreed** | Joe's chosen direction, but he is open to changing course if there is a better option. Nothing is boxed in yet. | Follows it. When a better option or a conflict appears, raises it — with the trade-off — rather than silently following or silently overriding it. |
| **Accepted** | Settled, after building on it has proved it. Changing it needs a strong reason. | Follows it. A task that conflicts with it stops and raises it. |
| **Superseded** | Replaced by a later ADR, which it names. | Treats it as history. |

No ADR is Accepted yet: every agreed decision is Provisionally agreed, by
choice, while the design is young.

## Which document wins

- **ADR status decides** (above). A spec or task never quietly contradicts a
  Provisionally agreed or Accepted ADR: the conflict is raised and resolved,
  and every affected document is updated in the same change.
- **Specs describe the present.** ADRs and git hold the past. Nothing in
  `history/` is a spec, and nothing in `50-progress/` overrides a spec.
- **For the ontology, the code is the authority**
  ([ADR-0008](20-architecture/adr/0008-registries-declared-in-code.md)):
  `packages/ontology` declares the core Types, link types and conversions.
  [data-model.md](20-architecture/data-model.md) is still written by hand
  and must agree with it; it is generated from Stage 4.

Where a document states something that rests on an ADR, it cites it, e.g.
"(ADR-0007, Provisionally agreed)". Anything citing a Proposed ADR is not yet
agreed.

## How to change documents

This is spec-driven development: **the documents are the source of truth,
so they must always agree with each other and with the code.** A conflict
between two documents is a defect, fixed before anything else.

1. **Specs describe the present; ADRs and git hold the past.** No revision
   notes inside specs.
2. **ADR status binds Claude** (above). ADRs stay to a page.
3. **One change, every document.** When a decision, term or behaviour
   changes, search the whole of `docs/` (and `CLAUDE.md`) for every place it
   appears — the glossary, the data model, ADRs, the capability map, specs,
   the roadmap — and update them all in the same commit.
4. **Docs change in the same commit as the code.** A pull request that
   changes behaviour without changing its spec is not finished.
5. **Generate rather than hand-write** wherever possible: schema docs, types,
   the lookup-table migration, the migrations list. CI checks what it can
   (e.g. every requirement ID cited in code exists; every link resolves).
6. **Record progress** in [50-progress](50-progress/) with each pull request.
7. **One short [CLAUDE.md](../CLAUDE.md)** pointing here and at the glossary,
   carrying v1's operational lessons.

(ADR-0001, Provisionally agreed)

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
Consequences**, to a page.

- A decision **wholly replaced** gets a new ADR; the old one becomes
  *Superseded* and names its replacement.
- A **Proposed or Provisionally agreed** ADR whose detail is changed by a
  later decision is **amended in place**, with an `Amended:` line naming the
  date and the ADR that caused it. Git keeps the earlier wording.

## Architecture decision records

| # | Decision | Status |
|---|---|---|
| [0001](20-architecture/adr/0001-spec-driven-docs-and-adrs.md) | Spec-driven documentation and ADRs | Provisionally agreed |
| [0002](20-architecture/adr/0002-start-afresh-port-selectively.md) | Start afresh, port selectively | Provisionally agreed |
| [0003](20-architecture/adr/0003-new-supabase-project.md) | A new Supabase project | Provisionally agreed |
| [0004](20-architecture/adr/0004-ai-across-the-whole-app.md) | AI across the whole app | Provisionally agreed |
| [0005](20-architecture/adr/0005-traits-links-rules.md) | Traits, Links and Rules | Provisionally agreed |
| [0006](20-architecture/adr/0006-vocabulary.md) | Vocabulary | Provisionally agreed |
| [0007](20-architecture/adr/0007-storage-shape.md) | Storage shape | Provisionally agreed |
| [0008](20-architecture/adr/0008-registries-declared-in-code.md) | Registries declared in code | Provisionally agreed |
| [0009](20-architecture/adr/0009-cross-table-writes-are-database-functions.md) | Writes that span tables are database functions | Provisionally agreed |
| [0010](20-architecture/adr/0010-shop-is-its-own-type.md) | Shop is its own Type | Provisionally agreed |
| [0011](20-architecture/adr/0011-recipe-and-variation.md) | Recipe and Variation; cooking with or without a Meal | Provisionally agreed |
| [0012](20-architecture/adr/0012-ingredients-and-shopping-lists.md) | Ingredients and shopping lists | Provisionally agreed |
| [0013](20-architecture/adr/0013-occurrences-snapshot-their-definition.md) | Occurrences snapshot their definition | Provisionally agreed |
| [0014](20-architecture/adr/0014-reference-data-and-labels.md) | Reference data and Labels | Provisionally agreed |
| [0015](20-architecture/adr/0015-health-data-as-a-time-series.md) | Health data as a time series | Provisionally agreed |
| [0016](20-architecture/adr/0016-sharing-and-visibility.md) | Sharing and visibility | Provisionally agreed |
| [0017](20-architecture/adr/0017-enforcing-visibility.md) | Enforcing visibility | Provisionally agreed |
| [0018](20-architecture/adr/0018-changing-an-items-type.md) | Changing an Item's Type | Provisionally agreed |
| [0019](20-architecture/adr/0019-conversion-keeps-space-and-status.md) | A conversion keeps Space and status | Provisionally agreed |
| [0020](20-architecture/adr/0020-task-event-reminder.md) | Task, Event and Reminder | Provisionally agreed |
| [0021](20-architecture/adr/0021-time.md) | Time | Provisionally agreed |
| [0022](20-architecture/adr/0022-repeating-items.md) | Repeating Items and do-on by default | Provisionally agreed |
| [0023](20-architecture/adr/0023-reminders.md) | Reminders | Provisionally agreed |
| [0024](20-architecture/adr/0024-goals.md) | Goals | Provisionally agreed |
| [0025](20-architecture/adr/0025-goal-on-track-by-kind.md) | "On track" depends on the goal kind | Provisionally agreed |
| [0026](20-architecture/adr/0026-navigation-drawer.md) | The navigation drawer | Provisionally agreed |
| [0027](20-architecture/adr/0027-quick-capture.md) | Quick capture makes a Thought by default | Provisionally agreed |
| [0028](20-architecture/adr/0028-capture-from-outside-the-app.md) | Capture from outside the app | Provisionally agreed |
| [0029](20-architecture/adr/0029-plan-reads-core-items.md) | Plan reads `core.items` | Provisionally agreed |
| [0030](20-architecture/adr/0030-activity-log-by-triggers.md) | An activity log written by triggers | Provisionally agreed |
| [0031](20-architecture/adr/0031-offline-and-concurrent-edits.md) | Offline writes and concurrent edits | Provisionally agreed |
| [0032](20-architecture/adr/0032-delete-means-archive.md) | Delete means archive | Provisionally agreed |
| [0033](20-architecture/adr/0033-architecture-principles.md) | Architecture principles | Provisionally agreed |
| [0034](20-architecture/adr/0034-stack.md) | Stack | Provisionally agreed |
| [0035](20-architecture/adr/0035-preventing-catching-fixing-bugs.md) | Preventing, catching and fixing bugs | Provisionally agreed |
| [0036](20-architecture/adr/0036-changing-the-model-over-time.md) | Changing the model over time | Provisionally agreed |
| [0037](20-architecture/adr/0037-thoughts.md) | Capture makes a Thought, sorted from Inbox | Provisionally agreed |
| [0038](20-architecture/adr/0038-one-design-system.md) | One design system, built from shared components | Provisionally agreed |
| [0039](20-architecture/adr/0039-accounts-contacts-households.md) | Accounts, Contacts and Households | Provisionally agreed |
| [0040](20-architecture/adr/0040-migrations-applied-by-claude.md) | Migrations are applied by Claude through the Supabase MCP | Provisionally agreed |
| [0041](20-architecture/adr/0041-visual-direction.md) | Visual direction: Stone, neutral, coloured by Type | Provisionally agreed |
| [0042](20-architecture/adr/0042-data-layer.md) | The data layer | Provisionally agreed |
| [0043](20-architecture/adr/0043-colour-by-type.md) | Colour by Type | Provisionally agreed |
| [0044](20-architecture/adr/0044-reminder-delivery.md) | How Reminders are delivered | Provisionally agreed |
| [0045](20-architecture/adr/0045-extending-series.md) | Where repeating Items are made | Provisionally agreed |
| [0046](20-architecture/adr/0046-note-bodies.md) | A Note's body is Markdown, edited in place | Provisionally agreed |
| [0047](20-architecture/adr/0047-google-calendar-sync.md) | How Google Calendar comes in | Provisionally agreed |
| [0048](20-architecture/adr/0048-google-calendar-two-way.md) | Two-way Google Calendar | Provisionally agreed |
| [0049](20-architecture/adr/0049-plans-read.md) | How Plan reads a week | Provisionally agreed |

## Sources

Spec-driven development and ADRs:
[SDD paper](https://arxiv.org/abs/2602.00180v1),
[coding agents and decision records](https://duncandavidson.com/agents-love-decisions).
