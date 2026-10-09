# ADR-0006: Vocabulary

**Status:** Provisionally agreed · 2026-10-09

**Amended:** 2026-10-09 by [ADR-0037](0037-thoughts.md) (Thoughts).

## Context

v1 spoke of a Shell, Apps and Domains. v2 needs words for one graph and the
pages over it, used the same way in documents and code.

## Decision

Adopt the terms in the [glossary](../../00-foundation/glossary.md): **Item,
Type, Trait, Status, Link, View, Screen, Module, Integration, Space, Thought,
Note, Reminder**. Three ideas to hold in your head: Items, Links, Views; a Screen is
how you act on them.

- An **idea** is a status, not a Type.
- **Screen** covers pages that are not a query plus a layout. The test: "these
  Items, laid out like this" is a View; a workflow (steps, a timer, a form, an
  import) is a Screen.
- **Module** is code packaging only, replacing "App" / "Domain".

Alternatives considered: "Object" (Anytype; collides with code), "Entry",
"Domain" (now internal only), "Source" (renamed Integration).

## Consequences

The navigation drawer lists Views; Screens open from them and from capture.
