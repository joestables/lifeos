# Search

*Stage 2. The decisions come first; the requirements, drafted at the start of
Stage 2, are at the end.*

## Decisions

- **Postgres full-text search** over titles, bodies and labels from Stage 2;
  **vector search (pgvector)** later, for "find things like this" and for AI
  ([principles](../../00-foundation/principles.md)).
- Search is a **Screen**, reached from the drawer header
  ([ADR-0026](../../20-architecture/adr/0026-navigation-drawer.md),
  Provisionally agreed).
- Each Module declares its search contribution
  ([contracts](../../20-architecture/contracts.md#moduledefinition)).
- The Screen is built on shadcn's **Command**, designed into
  [components](../../30-design/components.md) first.

## Requirements

*Stage 2. Statuses: proposed → agreed → built → verified.*

### SRC-001 — Find anything by its words

**As** Joe, **I want** to type a few words and find the Item, **so that** I
never hunt through pages.
Priority: Must · Status: proposed

Acceptance criteria
1. Given the search button in the drawer header, or `/` on a computer, then
   the Search Screen opens with the cursor in the box.
2. Given I type "insur", then Items I can read whose title, body or Labels
   contain words starting "insur" are listed as I type, best match first,
   each with its Type.
3. Given a deleted Item, then it isn't found.
4. Given I choose a result, then the Item opens (ITM-001).

### SRC-002 — Starred and Recent before I type

**As** Joe, **I want** the Search Screen to show my starred and recent Items
before I type, **so that** the common jumps need no typing.
Priority: Should · Status: proposed

Acceptance criteria
1. Given the Search Screen is open and empty, then it shows Starred, then
   Recent ([ITM-006, ITM-007](items.md#requirements)).

### SRC-003 — Search what's on the device when offline

**As** Joe with no signal, **I want** to find Items I've already loaded,
**so that** search still helps offline.
Priority: Could · Status: proposed

Acceptance criteria
1. Given I have no connection, when I search, then titles of the Items held
   on the device are searched, and the Screen says the results may be
   incomplete.

Non-goals (Stage 2): "find things like this" (pgvector, later); searching
inside attachments; filters by Type or date.
