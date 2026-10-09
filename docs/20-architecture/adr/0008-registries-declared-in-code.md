# ADR-0008: Registries declared in code

**Status:** Provisionally agreed · 2026-10-09

## Context

Two questions: should link types be fixed in code by Modules, or
user-definable in the app (DOORS-style)? Are Views data or code?

## Decision

- **Types, link types and measures are declared in code** (TypeScript
  constants in each Module), not edited in the app. **The code is the
  authority**: a migration generated from it copies the Types and link types
  into two small lookup tables, only so the database can enforce which Types
  a link may connect. Measures are SQL functions named in code.
- **Link types are fixed in code.** Revisit only if a real need appears.
- **Views are code.** Saved filters on top of a View can be data later.

## Consequences

- No registry tables to administer.
- Changing the ontology is a code change, governed by
  [ADR-0036](0036-changing-the-model-over-time.md).
