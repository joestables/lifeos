# Principles

*All Proposed ([ADR-0033](../20-architecture/adr/0033-architecture-principles.md))
unless marked.*

## Product

- **When goals pull apart, goal 2 (less friction) wins over goal 4
  (enhanceable)** ([vision](vision.md)).
- **The action creates the link.** Planning a recipe for Thursday creates the
  Meal *and* its *uses* link; starting a session from a template creates
  *follows*. Linking by hand is a power feature, never a chore.
  ([ADR-0005](../20-architecture/adr/0005-traits-links-rules.md), Accepted)
- **Capture never depends on AI.** AI improves things; the basics work
  without it, offline.

## Architecture

1. **A small, stable core plus Modules that plug in.** The core owns
   identity, Spaces, Items and Links, Reminders and notifications, capture,
   search, the activity log, caching and sync. A Module **declares** what it
   contributes:
   - Types and migrations;
   - Views and Screens;
   - capture patterns and Inbox entries;
   - optionally, how its Items look on Plan (principle 2);
   - measures and search;
   - settings and default Space.

   Adding a Module changes neither the core nor other Modules.
2. **One Postgres schema per area** (`core`, `lists`, `food`, `fitness`,
   `goals`, `wardrobe`, later `health` and `finance`).
   - Inside the database, Modules read each other only through published
     views and functions, and internal helpers sit in a schema the API can't
     reach, so the boundary is enforced there.
   - **In the app's code it is not enforced by the schemas**: any exposed
     schema can be queried from any Module's code. That needs a lint rule or
     one typed client per Module.
   - **Plan reads `core.items`**; a Module may only enrich how its Items look
     ([ADR-0029](../20-architecture/adr/0029-plan-reads-core-items.md),
     Accepted).
3. **Every Integration follows one pattern:** connect (OAuth) → fetch new data
   (schedule or webhook) → store the raw payload → map to Items, tagged with
   `external_id` so re-runs never duplicate. Tokens are stored server-side in
   Supabase Vault (`core.connections`).
4. **An activity log, written by triggers,** that Goals, Inbox, AI and future
   automations read, rather than calling each other.
5. **A measures registry**, declared in code, so any Module's numbers can be
   goals.
6. **Device features behind one interface** (alarms, health data, share
   target), so a native wrapper can be added without touching Module code.
7. **AI across the whole app.** Later, a **LifeOS MCP server** on the
   published layer so Claude can read and act on the life data, under the
   same visibility rules as the app. Until then, every design decision is
   checked for whether it keeps the graph whole, typed and readable by an AI
   ([ADR-0004](../20-architecture/adr/0004-ai-across-the-whole-app.md),
   Accepted).
8. **General only when a second real use needs it.**
   - Registries are TypeScript constants, not tables to administer.
   - No runtime plugins, no marketplace, no frameworks for strangers.
   - Modules are packages in the repo, registered at build time.
   - The core is built from three real Types (Note, Task, Event), not from a
     general ontology designed in advance.
9. **Live updates where two people share a thing.** Shared Lists and Shops
   use Supabase Realtime, so two people in Tesco see each other's ticks at
   once. Elsewhere, data refreshes on focus.
10. **Search** is Postgres full-text search over titles, bodies and labels
    from Stage 2; **vector search (pgvector)** later, for "find things like
    this" and for AI.
11. **One AI service in the core**, not per Module: v1 Recipes' AI machinery —
    usage accounting, a budget kill switch, guards that check in code what a
    prompt can only ask for, versioned prompts, test sets and the model choice
    (`Recipes-AI-Map.md`) — is ported once and used by every Module. Which v1
    AI features return (Explore, Labs, dish images, recipe import) is decided
    in Stage 4.
12. **Your data is exportable**: everything you can see, as JSON, on demand.
