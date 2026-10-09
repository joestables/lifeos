# ADR-0019: A conversion keeps Space and status

**Status:** Proposed · 2026-10-09

**Amended:** 2026-10-09 by [ADR-0037](0037-thoughts.md) (Thoughts).

## Context

[ADR-0018](0018-changing-an-items-type.md) converts Items in place. Types have
different default Spaces and use different statuses.

## Decision

A conversion keeps the Item's Space and status. The new Type's default Space
applies only to new Items. A status the new Type doesn't use becomes
*active*.

## Consequences

A Personal Thought sorted into a Recipe stays Personal, although new Recipes
default to the Household; it moves only if someone moves it.
