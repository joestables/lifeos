# ADR-0036: Changing the model over time

**Status:** Provisionally agreed · 2026-10-09

**Amended:** 2026-10-14 by the Stage 3 plan (the first Module, `lists`,
moved to Stage 4b, so the first Module is now `food` in Stage 4).

## Context

Modules and Integrations will be added for years. The ontology (Types,
Traits, statuses, link types, measures, reference data) must not decay.

## Decision

The ontology is a **controlled configuration item**: one source, a baseline,
a change process and impact analysis.

- **One source:** `packages/ontology`. Generated from it: the database lookup
  tables, the TypeScript types, the data-model document, the Mermaid
  diagrams, and the descriptions the MCP server gives an AI. CI fails if any
  is out of date. Built in steps:
  - *Stage 1:* the TypeScript constants and the generated lookup-table
    migration. Until then `data-model.md` is written by hand, and says so.
  - *Stage 4, with the first Module:* the generated data-model tables and
    Mermaid diagrams.
  - *Stages 4–5:* the impact script, model version tags and the MCP
    descriptions.
- **Three classes of change:**

  | Class | Examples | What it takes |
  |---|---|---|
  | **Additive** | A new Type, Module, link type, measure, optional field or Integration | A pull request with its spec and tests; an ADR if it is a design choice. |
  | **Changing** | Renaming, splitting or merging a Type; changing what a link may connect; making a field required | An ADR, an impact report, and **expand → migrate → contract** over separate releases. |
  | **Removing** | Retiring a Type or link type | Deprecate first (hidden, still readable), export or migrate its data, remove after a set period. |

- **Impact analysis:** a script lists a change's reach
  (`ontology impact Variation` → Views, Screens, measures, link types,
  requirement IDs and tests).
- **Baselines:** each merged ontology change bumps the model version, tagged
  in git (`model-v12`) with a one-line changelog entry.
- **Integrations keep their raw data** with the version of the mapping that
  converted it, so it can be re-mapped instead of re-fetched.
- **Process for changing and removing changes:** change proposal → impact
  report → ADR agreed by Joe → one pull request (ontology source,
  migration, code, tests, spec, glossary, generated docs) → CI passes, merge,
  baseline tagged.

## Consequences

The chain from a Type to the tests that prove it is traceable, as with DOORS.
