# Working with Items

*Stage 2. What every Item offers, whatever its Type — opening it, deleting
and recovering it, converting it — and the Labels that Thoughts, Notes, Tasks
and Events share. The decisions come first; the requirements, drafted at the start of
Stage 2, are at the end.*

## Decisions

- **How an Item opens depends on the page and the Type**: on a page of its
  own or in a popup over the page it was opened from, chosen for each page
  and Type when it is designed. Every Item has a link of its own.
- **Delete means archive**, with undo, and every Type's deleted Items are
  recovered from one Recently deleted page in Settings; there is no Trash
  page ([ADR-0032](../../20-architecture/adr/0032-delete-means-archive.md),
  Provisionally agreed).
- **Conversion changes an Item's Type in place**: it keeps its id, links,
  Reminders and history. Thought → any Capturable Type; Note → any other
  Capturable Type; Task ↔ Event. Everything else is "create
  from" + *became* ([ADR-0018](../../20-architecture/adr/0018-changing-an-items-type.md),
  [ADR-0019](../../20-architecture/adr/0019-conversion-keeps-space-and-status.md),
  Provisionally agreed). The ontology package decides which conversions
  exist.
- **Not every Type has every feature.** Each Type declares what it has:
  - **Labels** — Thoughts, Notes, Tasks and Events (from Stage 3), one shared set per Space; other Types
    don't use them ([ADR-0014](../../20-architecture/adr/0014-reference-data-and-labels.md),
    Provisionally agreed).
  - **A mark, under its own name** — Notes are *pinned*, Tasks *starred*,
    Recipes *favourited* (Stage 4, on anyone's Recipe I can see); a Type
    without one has none. Marks are per person
    ([data model](../../20-architecture/data-model.md#types)).
- **Food Items (Stage 4)**: a Recipe opens on its own page; a Meal in a
  popup over the page; a Shopping list on its own page. Recipes, Meals and
  Shopping lists take no Labels. A Recipe's *Archived* state is not
  deleted: it is kept, out of the way, and listed from Settings; deleting
  goes to Recently deleted ([recipes](../modules/recipes.md)).
- **Pantry entries aren't Items** ([ADR-0051](../../20-architecture/adr/0051-who-sees-food.md)):
  they aren't in Recently deleted; deleting an unused one is final, with
  Undo at once.

## Requirements

*Stage 2. Statuses: proposed → agreed → built → verified.*

### ITM-001 — Open an Item

**As** Joe, **I want** to open any Item from wherever I see it and get back
easily, **so that** looking at something never loses my place.
Priority: Must · Status: built (Back to the same place on a list is verified with the first lists, steps 7–9)

Acceptance criteria
1. Given a list of Items, when I open one, then it opens on a page of its own
   or in a popup over the list.
2. Given it opened on a page of its own, when I go back (with the app's
   back control, the phone's back gesture or the browser's), then I am on
   the list where I was, scrolled to the same place.
3. Given an Item, then it has a link of its own, and opening that link (from
   a notification, say) shows the same Item.
4. Given an Item I can't read, or that doesn't exist, then its link says it
   can't be found.

### ITM-002 — Delete with undo

**As** Joe, **I want** deleting to be quick and undoable, **so that** a
slip costs nothing.
Priority: Must · Status: built (its Reminders not firing is verified with step 11)

Acceptance criteria
1. Given an Item, when I delete it, then it leaves every page at once, and I
   can undo that straight away; undoing puts it back as it was.
2. Given a deleted Item, then its Reminders don't fire.

### ITM-003 — Recover a deleted Item

**As** Joe, **I want** to get back something I deleted days ago, **so
that** nothing is lost for good by accident.
Priority: Must · Status: verified

Acceptance criteria
1. Given Settings, then one Recently deleted page lists my deleted Items of
   every Type, the most recently deleted first, with each one's Type and
   when it was deleted.
2. Given a deleted Item there, when I restore it, then it is back where it
   was, with its Labels, links and Reminders.
3. Given a repeat I changed or stopped, then the occurrences it took away,
   which I had never changed, are not listed: I didn't delete them
   ([TSK-011](../views/tasks.md#tsk-011--change-or-stop-a-repeat)).

### ITM-004 — Convert an Item

**As** Joe, **I want** to change what kind of thing an Item is, **so that**
a Note that turned out to be a job becomes a Task.
Priority: Must · Status: verified

Acceptance criteria
1. Given an Item, then I'm offered only the Types it can be converted into,
   among the Types that exist.
2. Given I convert a Note into a Task, then it keeps its title, body,
   Labels, links and Reminders, and its history records the conversion; its
   status is kept where the new Type has it, else it is active (a done
   Thought becomes an active Note).
3. Given I've just converted an Item, then I can undo it, and it is the
   Type it was, as it was (Joe, 12 October).

### ITM-005 — Labels on Thoughts, Notes and Tasks

**As** Joe, **I want** one set of Labels for my Thoughts, Notes and Tasks
(and Events, from Stage 3) that I can tidy, **so that** "Home" means the
same thing everywhere.
Priority: Must · Status: verified (Events: agreed, Stage 3)

Acceptance criteria
1. Given a Thought, a Note, a Task or an Event, when I type a Label's name, then I
   can pick an existing Label or make a new one.
2. Given I rename a Label, then every Item with it shows the new name; when
   I delete a Label, it is removed from every Item, and they are kept.
3. Given a Label "Home" exists, when I make "home", then I get the existing
   one rather than a second.
4. Given any other Type, then Labels aren't offered.

Non-goals (Stage 2): Recent Items; one Starred list across Types; links
between Items made by hand, beyond Tasks *for* an Event (Stage 3, [EVT-006](events.md#evt-006--tasks-for-an-event)); attachments; an Item's
history shown on it; exporting.

### ITM-006 — Food Items

**As** Joe, **I want** Recipes, Meals and Shopping lists to open, delete,
recover and convert like everything else, **so that** food works the way
the rest of LifeOS does.
Priority: Must · Status: built for Recipes (1 and 4 verified, 2 and 6 built; a link of its own, `/item/…`, opens the Recipe's page, a Variation's on it) and Meals (1 and 3: a Meal opens over the page, and removing it takes its leftovers) and Shopping lists (1 and 3: its own page, `/shopping/…`; 5 and 6 with Stage 4b's step 8)

Acceptance criteria
1. Given a Recipe, a Meal or a Shopping list, then it opens as set above,
   and has a link of its own.
2. Given I delete my Recipe, then it goes to Recently deleted with its
   Variations and log, and recovering it brings them all back; a Variation
   deleted alone is recovered the same way.
3. Given I delete a Meal or a Shopping list, then it goes to Recently
   deleted, with Undo; removing a Meal takes its leftovers with it.
4. Given a Thought, when I make it a Recipe, then it becomes an Idea: its
   text is the name, and any link in it becomes a source.
5. Given a Thought, when I make it a Shopping list, then its text is split
   at the commas into lines ("buy milk, bread, eggs" → Milk, Bread, Eggs),
   "buy" dropped, each line matched to the Pantry where it can be; a food
   shop when any line matches a Pantry ingredient, else a list
   ([SHP-003](../modules/meals.md#shp-003--extra) 5).
6. Given a Note, when I make it a Recipe, then it becomes an Idea: its
   title is the name and its body the notes; made a Shopping list, each line
   or checklist item of its body becomes a line.
