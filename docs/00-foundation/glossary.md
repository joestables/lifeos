# Glossary

*Provisionally agreed ([ADR-0006](../20-architecture/adr/0006-vocabulary.md)). The terms
matter mostly in documents and code.*

Three ideas to hold in your head: **Items, Links, Views.** A Screen is how you
act on them.

## Core terms

| Term | Meaning |
|---|---|
| **Item** | Any record that can be linked, scheduled, shared or searched. |
| **Type** | What kind of Item: Thought, Note, Task, Event, Shopping list, Recipe, Meal, Workout, Outfit… ([data model](../20-architecture/data-model.md#types)). |
| **Trait** | A capability a Type has: Schedulable, Completable, Shareable, Capturable. |
| **Status** | Where an Item is in its life: *idea*, *active*, *done* or *cancelled*. Each Type uses a subset and gives it its own labels (a Task's *idea* is "Someday"). Only Completable Types use *done*, so *done* always means finished. |
| **Idea** | An Item in the *idea* status. Not a Type. |
| **Link** / **link type** | A named relationship between two Items, named in both directions ("uses" / "used in"). |
| **View** | A query plus a layout (list, board, calendar, timeline, lanes), declared in code. Inbox, Plan, Tasks and Recipes are Views. |
| **Screen** | A page for *doing* something rather than looking at a set of Items: an Item's own page, logging a workout, cooking a recipe, importing a recipe, capture, search, Settings. Declared in code by a Module or the core. Owns no data. |
| **Module** | Code packaging only: a bundle of Types, Views, Screens, measures and link types (e.g. Fitness). Replaces "App" / "Domain". |
| **Integration** | An outside source feeding Items in: Google Calendar, Oura, Health Connect, later banks. |
| **Space** | Who can see an Item: **Personal** or **Household**. |
| **Household** | A group of people who share: its **owner** made it and invites others by email; **members** joined by accepting. A person may be in several ([ADR-0039](../20-architecture/adr/0039-accounts-contacts-households.md)). |
| **Thought** | A Type: a raw, unsorted capture. What capture makes by default. It waits in Inbox until it is sorted — converted in place into a Note, Task, Shopping list or other Capturable Type — ticked off (*done*), or deleted. |
| **Note** | A Type: a note, kept, labelled and shown in the Notes View. A Thought can be turned into one, and a Note can be converted into other Types. Personal only. |
| **Reminder** | A notification attached to an Item. Not a Type. |

**The test for View or Screen.** If the page is "these Items, laid out like
this", it is a View. If it has a workflow — steps, a timer, a form, an
import — it is a Screen. For example, the Gym View lists sessions and
templates, and starting a session opens the session-logging Screen.

## Traits

| Trait | Meaning |
|---|---|
| **Schedulable** | Has a time; appears on Plan. |
| **Completable** | Can be ticked off. |
| **Shareable** | Can belong to the Household Space. |
| **Capturable** | A Thought can become one in place. |

## Other terms

| Term | Meaning |
|---|---|
| **Child row** | Part of one Item, not an Item itself (a workout set, a recipe ingredient line, a list line). May *point at* an Item. |
| **Definition / occurrence** | A pattern and a dated instance of it: Variation → Meal, Workout template → Workout, Outfit → Outfit worn, series → each occurrence. |
| **Snapshot** | The values an occurrence copies from its definition when it starts or is created. |
| **Series** | A repeat rule that generates occurrences. |
| **Touched** | An occurrence that has been edited, ticked, logged or linked (`touched_at`). |
| **Do-on** | When you intend to do a Task (a date, with an optional time). |
| **Due** | A deadline (a date). Drives "overdue". |
| **Slot** | A Meal's fixed time of day: breakfast, lunch, dinner. |
| **Pantry** | The catalogue of ingredients and household items that recipes and shopping lists point at: one for everyone in LifeOS, each entry changed only by whoever added it ([ADR-0051](../20-architecture/adr/0051-who-sees-food.md)). Staples (long-life goods, marked out of stock when they run out) and Essentials (bought most shops, marked Required when needed) are each Household's lists, marked in the Pantry for the Household chosen there. |
| **Food shop** | A Shopping list on Shopping's Food tab: linked to Meals, whose ingredients it follows, with more added by hand; grouped by aisle, for one Space ([meals](../10-requirements/modules/meals.md#shopping)). Shopping's other lists (clothes, DIY) are on its Other tab. |
| **Rule** | A relationship that is calculated, not stored, e.g. a goal's measure. |
| **Measure** | Something a goal can track; an SQL function named in code. |
| **Conversion** | Changing an Item's Type in place; the Item keeps its id, links and history. |
| ***became*** | The link from a new Item to the old one it was "created from". |
| **Reference data** | A Module's small lookup lists (muscle groups, cuisines, brands…). Not Items. |
| **Type colour** | The colour that marks a Type's Items, and the pages about them; related Types share one (Tasks and Events blue). Inbox and Plan are neutral ([ADR-0043](../20-architecture/adr/0043-colour-by-type.md)). |
| **Design token** | A named design value — a colour, size, radius, shadow — defined once and used by every component ([tokens](../30-design/tokens.md)). |
| **Label** | A per-Space grouping on the Types that use one (Thoughts, Notes, Tasks and Events): filters Inbox, Notes and Tasks. Replaces "tags". |
| **Sorting** | Dealing with a Thought in Inbox: converting it into another Type, ticking it off, or deleting it. |
| **Mark** | A per-person flag a Type may have, under its own name: a Note is **pinned**, a Task **starred**, a Recipe **favourited**. Types without one have none. |
| **Sub-task** | A line ticked inside a Task: a title and a tick, not a Task of its own. |
| **Capture address** | A personal URL and secret that creates Items in its owner's Personal Space. |
| **Current set** | An Exercise's weight and reps — "60 kg × 8" — that a workout's sets start at, called **Current** in the app; changed by hand or from a workout's review ([gym](../10-requirements/modules/gym.md)). |
| **Strength** | How a set is measured and compared: weight × (1 + (reps + RIR) ÷ 30) — Epley's formula, never named in the app — for sets of 1–12 reps. A **PR** is the set with the best. A quick set has none. |
| **Backlog** | A workout's exercises not yet begun; beginning one moves it into the session, so the session's order is the order they were done. |
| **Quick set** | A set logged with no weight, reps or RIR (a deload); it counts as done and, in the recovery engine, as 10 reps at RIR 2, and nowhere in the record. |
| **Average frequency** | How many workouts a week trained a muscle group, averaged over the last 28 days ("×2.1"). |
| **Stimulus sets** | How much training a workout gave a muscle group, worked out by the recovery engine from RIR and each Exercise's contributions. |
| **Readiness** | How recovered a muscle group is, 0–100 %, worked out by the recovery engine. |
| **Stalled** | An Exercise whose best strength hasn't risen across four weeks of training ([gym](../10-requirements/modules/gym.md#progression)). |
| **Cook log** | The record of each time a Variation was cooked: who, when, a verdict and notes, and a snapshot of the Variation as cooked. |
| **Ontology** | Types, Traits, statuses, link types, measures and reference data: the schema of the graph. |

## Not used

"Object" (Anytype; collides with code), "Entry", "Domain" (internal only),
"Source" (renamed Integration), "App" (v1), "tags" (now Labels).
