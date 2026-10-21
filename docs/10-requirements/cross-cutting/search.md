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
- Search is **neutral**: it mixes Types, so each result shows its Type's
  colour ([ADR-0043](../../20-architecture/adr/0043-colour-by-type.md),
  Provisionally agreed).
- It opens over the page, on a phone as on a computer, and a tap outside it
  closes it (Joe, 12 October; [patterns](../../30-design/patterns.md#search)).
- A repeating Task (and, from Stage 3, a repeating Event) is found once, as its lists show it
  ([TSK-008](../views/tasks.md#requirements)).

## Requirements

*Stage 2. Statuses: proposed → agreed → built → verified.*

### SRC-001 — Find anything by its words

**As** Joe, **I want** to type a few words and find the Item, **so that** I
never hunt through pages.
Priority: Must · Status: verified

Acceptance criteria
1. Given any page, then Search opens from the navigation, or with one key
   on a computer, ready to type.
2. Given I type "insur", then the Items I can read whose title, body or
   Labels have a word starting "insur" are listed as I type, best match
   first, each showing its Type.
3. Given a deleted Item, then it isn't found.
4. Given I choose a result, then the Item opens
   ([ITM-001](items.md#itm-001--open-an-item)).

### SRC-002 — Search what's on the device when offline

**As** Joe with no signal, **I want** to find Items I've already loaded,
**so that** search still helps offline.
Priority: Could · Status: verified

Acceptance criteria
1. Given I have no connection, when I search, then the Items held on the
   device are searched, and I'm told the results may be incomplete.

### SRC-003 — Find recipes and shopping lists

**As** Joe, **I want** Search to find my recipes and lists, **so that**
food is found like everything else.
Priority: Must · Status: built for Recipes (1 verified, without photos until they come; tags and ingredients are searched on the device, beside the server's results); 2 in Stage 4b

Acceptance criteria
1. Given I search, then Recipes and Ideas I can see (mine and my
   Households') are found by name, tag or ingredient, each with its photo
   and state; an Archived one is marked so.
2. Given I search, then Shopping lists I can see are found by name or by a
   line on them.
3. Given Meals, then they aren't results of their own: their Recipe is.
4. Given Pantry entries, then they aren't in Search; the Pantry has its own
   search ([PAN-001](../modules/meals.md#pan-001--the-pantry)).

Non-goals (Stage 2): "find things like this" (pgvector, later); Recent
Items; searching inside attachments; filters by Type or date.
