# Contracts

*Not yet written as code-level interfaces. Each is defined in the stage that
first needs it. This page records what each contract must cover, as decided
so far.*

## ModuleDefinition

A Module **declares** what it contributes; adding a Module changes neither the
core nor other Modules ([principles](../00-foundation/principles.md)):

- Types and migrations;
- Views and Screens;
- capture patterns and Inbox entries;
- optionally, how its Items look on Plan (below);
- measures and search;
- settings and default Space.

Modules are packages in the repo, registered at build time. Registries are
TypeScript constants ([ADR-0008](adr/0008-registries-declared-in-code.md),
Provisionally agreed).

## IntegrationAdapter

Every Integration follows one pattern: connect (OAuth) → fetch new data
(schedule or webhook) → store the raw payload → map to Items, tagged with
`external_id` so re-runs never duplicate. Tokens are stored server-side in
Supabase Vault (`core.connections`). Raw data is kept with the version of the
mapping that converted it, so after a model change it can be re-mapped
instead of re-fetched
([ADR-0036](adr/0036-changing-the-model-over-time.md), Provisionally agreed).

## Measure

- An SQL function, named in code, published by a Module
  ([data model](data-model.md#measures-examples)).
- Goals pick from the published list; there is no free formula builder
  ([ADR-0024](adr/0024-goals.md), Provisionally agreed).
- Measures can't be called from the API. Goal progress is read through the
  goal: `goals.progress(goal_id)`, a security-definer function that checks
  `can_read` on the goal and returns only the figure
  ([ADR-0017](adr/0017-enforcing-visibility.md), Provisionally agreed).

## Plan enrichment

Plan reads `core.items`, which already has the title, times and Type. A
Module may **optionally** publish a view that adds a subtitle or icon;
without one, the core's default rendering is used
([ADR-0029](adr/0029-plan-reads-core-items.md), Provisionally agreed).

## Published-API rules

- Inside the database, Modules read each other only through **published
  views and functions**; internal helpers sit in a schema the API can't
  reach (`core_private` for the core: visibility, triggers, `uuidv7()`).
- In the app's code the boundary is not enforced by the schemas; it needs a
  lint rule or one typed client per Module.
- Writes that span tables are database functions called over RPC
  (`core.create_item`, `core.convert_item` …)
  ([ADR-0009](adr/0009-cross-table-writes-are-database-functions.md),
  Provisionally agreed); [ADR-0042](adr/0042-data-layer.md), Provisionally
  agreed, makes every write one, and keeps all Supabase calls in one data layer.
- The published layer is the surface for a later LifeOS MCP server, under the
  same visibility rules as the app
  ([ADR-0004](adr/0004-ai-across-the-whole-app.md), Provisionally agreed).
- Anything arriving from outside — capture, Integrations, the capture
  address, AI output — is checked against a schema (zod) at the door
  ([ADR-0035](adr/0035-preventing-catching-fixing-bugs.md), Provisionally agreed).
