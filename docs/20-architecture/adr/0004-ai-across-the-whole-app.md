# ADR-0004: AI across the whole app

**Status:** Provisionally agreed · 2026-10-09

## Context

An AI is only as useful as the context it can see. In v1 each App's data sat
in its own tables, so an AI feature could only reason about one App —
Recipes' AI knew nothing about the gym or the calendar.

## Decision

AI across the whole of LifeOS is a **core reason for the knowledge-graph
architecture** (goal 6 in the [vision](../../00-foundation/vision.md)). Every
design decision is checked for whether it keeps the graph whole, typed and
readable by an AI. Later, a **LifeOS MCP server** on the published layer lets
Claude read and act on the life data under the same visibility rules as the
app.

## Consequences

- One graph with named Types, named links, a written ontology, an activity
  log and named measures — so any question can span every Module.
- Spaces and `core.can_read` bound what an AI may see for each person.
- Capture never depends on AI; the basics work without it, offline.
- Building AI features is not in the first stages; no decision may close the
  door on it.
