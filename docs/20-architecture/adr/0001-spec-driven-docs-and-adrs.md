# ADR-0001: Spec-driven documentation and ADRs

**Status:** Provisionally agreed · 2026-10-09

## Context

LifeOS is built largely by Claude sessions, which have no memory between
sessions: the spec and the decisions are the memory. In v1, documentation
drifted because sessions changed code and left documents alone, specs filled
up with dated revision notes, and the documentation process grew until it was
hard for one person to keep true.

## Decision

- **Spec-driven development:** the specification is the source of truth; work
  flows *spec → plan → tasks → code*, and code is checked against the spec.
- **Architecture Decision Records** hold the "why". Specs describe the
  present; ADRs and git hold the past. No revision notes inside specs.
- **ADR status binds Claude:** *Proposed* is context; *Provisionally agreed*
  is followed, with better options raised rather than silently taken;
  *Accepted* is binding; *Superseded* is history
  ([docs/README.md](../../README.md#adr-statuses)). ADRs stay to a page.
- **The documents must always agree with each other and with the code.** A
  change updates every document it touches, in the same commit.
- **Specs are written just in time** — a Module's spec at the start of its
  stage — and **only as detailed as the next build needs**.
- Requirements have stable IDs, user stories, priorities and statuses, and
  are *verified* only when a test of the right kind cites the ID and passes.
- Docs change in the same commit as the code; generate rather than
  hand-write; one short CLAUDE.md.
- The structure is the one in [docs/README.md](../../README.md).

## Consequences

- "Is CAP-001 built and verified?" is answered mechanically, and a
  requirement that was typechecked but never exercised can't be marked
  verified.
- Process is phased in with the stage that needs it, not all at once.
