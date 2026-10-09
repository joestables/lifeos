# Vision

## Why LifeOS v2

LifeOS v1 is a Shell with four Apps — Strength, Planner, Wardrobe, Recipes —
built in React + TypeScript + MUI over Supabase. Each App owns its own tables
and talks to the others only through narrow published interfaces. That rule is
the root of the main complaint: the Apps feel like separate CRUD tools rather
than one picture of a life.

## Goals

1. **A joined-up picture of my life.** Gym sessions, meals, outfits, shops,
   events, tasks and goals are connected, and every page is a different view
   of the same life data.
2. **Less friction, above all for the most common actions** — capturing a
   thought, a task or a reminder must be faster than Google Tasks or setting
   a phone alarm.
3. **A design that looks natural, intentional and integrated**, using a
   standard design system (shadcn) rather than a heavily customised MUI.
4. **Enhanceable** — adding a new area of life or a new data source later must
   not mean rewriting what exists.
5. **Spec-driven** — requirements and architecture agreed before code, and
   kept true afterwards.
6. **AI-ready across the whole of life.** A large part of the reason for the
   knowledge-graph architecture is to make AI possible *across the whole app*
   in future, not inside one corner of it. Every design choice that keeps the
   data connected, named and typed serves this goal
   ([ADR-0004](../20-architecture/adr/0004-ai-across-the-whole-app.md),
  Provisionally agreed).

**When goals pull apart, goal 2 wins over goal 4.** General machinery is built
when a second real use needs it, not in anticipation
([principles](principles.md)).

## The central idea: one model, many views

*"Different pages are just different views of the same life data."*

LifeOS v2 is a **knowledge graph**: a set of *things* (nodes), *named
relationships* between them (edges), and a *schema* saying which kinds of
thing and relationship are allowed (the **ontology**).

- **Items** are the nodes — a task, an event, a recipe, a workout, a meal, an
  outfit, a thought, a note.
- **Links** are the named edges — *meal uses recipe*, *session follows
  template*, *outfit worn to event*.
- **Types, Traits and link types** are the ontology
  ([data model](../20-architecture/data-model.md)).

This is the core principle of model-based systems engineering:

| MBSE / SysML | LifeOS v2 |
|---|---|
| The model is the single source of truth | The life data: Items and Links |
| Metamodel / profile (blocks, requirements; *satisfy, verify, derive, trace*) | The ontology: Types, Traits, link types |
| Diagrams are **views** of the model and own no data | Views and Screens own no data |
| Viewpoint (ISO 42010): what a view shows, for which concern | A View's definition: its query and layout |
| Analysis over the model (e.g. mass roll-up) | Goal measures (best e1RM, km per month) |

The starting point was IBM DOORS link modules ("gym session *progresses
towards* goal"). That intuition is right for genuine relationships, but not
everything should be a link: see the three mechanisms in the
[data model](../20-architecture/data-model.md#three-mechanisms).

Closest existing products to look at for inspiration: **Anytype** (Objects,
Types, Relations, Sets), **Tana** (supertags), **Notion** (databases,
relations, views).

## AI across the whole app

The knowledge graph is not only for joined-up screens. It is the foundation
that makes AI across the whole of LifeOS possible in future.

An AI is only as useful as the context it can see. In v1 each App's data sat
in its own tables, so an AI feature could only ever reason about one App. In
v2 everything is one graph with named Types, named links and a written
ontology, so an AI can be handed the whole picture:

- *"What's on this week, and am I on track for bench 60 kg?"* — Plan, Gym and
  Goals in one answer.
- *"Plan dinners around my gym days and Saturday's shop, using recipes we
  haven't cooked for a while."* — Recipes, Meals, Workouts and Shops together.
- *"I've got Dishoom on Friday — suggest an outfit I haven't worn recently."*
  — Events, Outfits and wear history.
- *"Turn these five thoughts into tasks and the rest into notes."* — sorting
  the Inbox.
- *"Why did my running drop off in September?"* — Cardio, Oura readiness,
  Events and Tasks across the same weeks.
- A weekly review written from the activity log.

What the architecture does to make this possible, at no extra cost now:

- **One graph, not silos** — any question can span every Module.
- **Typed, named relationships** — links like *uses*, *follows* and *worn to*
  carry meaning an AI can read; the ontology is the explanation it is given.
- **The activity log** — what happened, when, as a timeline an AI can reason
  over.
- **Measures** — goal progress as named, callable functions rather than
  numbers buried in screens.
- **A published layer** (views and functions, not raw tables) — the natural
  surface for a **LifeOS MCP server**, so Claude can read *and act on* the
  life data with the same rules the app follows.
- **Spaces and `core_private.can_read`** — the same visibility rules bound what an AI
  may see for each person, so the Household boundary holds for AI too.
- **Capture never depends on AI** — AI improves things; the basics work
  without it, offline.

Building AI features is not in the first stages. What matters now is that no
decision closes the door on it.
