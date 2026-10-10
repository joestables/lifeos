# Working with Items

*Stage 2. What every Item offers, whatever its Type: its details, deleting
and recovering, converting, Labels, Starred and Recent. The decisions come
first; the requirements, drafted at the start of Stage 2, are at the end.*

## Decisions

- **Delete means archive**, with undo, and deleted Items are recovered from
  Settings; there is no Trash page
  ([ADR-0032](../../20-architecture/adr/0032-delete-means-archive.md),
  Provisionally agreed).
- **Conversion changes an Item's Type in place**: it keeps its id, links,
  Reminders and history. Thought → any Capturable Type; Note → any other
  Capturable Type; Task ↔ Event; List ↔ Shop. Everything else is "create
  from" + *became* ([ADR-0018](../../20-architecture/adr/0018-changing-an-items-type.md),
  [ADR-0019](../../20-architecture/adr/0019-conversion-keeps-space-and-status.md),
  Provisionally agreed). The ontology package decides which conversions
  exist.
- **Labels** are per Space, on any Item, one set for every Type
  ([ADR-0014](../../20-architecture/adr/0014-reference-data-and-labels.md),
  Provisionally agreed).
- **Starred and Recent are per person**
  ([spaces and sharing](spaces-and-sharing.md#decisions)).
- An Item's details open in a **Sheet** beside the list, so you don't lose
  your place ([components](../../30-design/components.md)).

## Requirements

*Stage 2. Statuses: proposed → agreed → built → verified.*

### ITM-001 — Open an Item

**As** Joe, **I want** to open any Item from wherever I see it, **so that**
I can read and change it without losing my place.
Priority: Must · Status: proposed

Acceptance criteria
1. Given a list of Items, when I open one, then its details open in a Sheet
   beside the list (the whole screen on a phone), and closing it returns me
   to where I was.
2. Given an open Item, then the address bar has a link of its own, and
   opening that link (from a notification, say) shows the same Item.
3. Given an Item I can't read, or that doesn't exist, then the link says
   it can't be found.

### ITM-002 — Delete with undo

**As** Joe, **I want** deleting to be quick and undoable, **so that** a
slip costs nothing.
Priority: Must · Status: proposed

Acceptance criteria
1. Given an Item, when I delete it, then it leaves every View at once, and a
   toast offers Undo for a few seconds; Undo puts it back as it was.
2. Given a deleted Item, then its Reminders don't fire.

### ITM-003 — Recover a deleted Item

**As** Joe, **I want** to get back something I deleted days ago, **so
that** nothing is lost for good by accident.
Priority: Must · Status: proposed

Acceptance criteria
1. Given Settings, then "Recently deleted" lists my deleted Items, the most
   recently deleted first, with each one's Type and when it was deleted.
2. Given a deleted Item there, when I restore it, then it is back where it
   was, with its Labels and links.

### ITM-004 — Convert an Item

**As** Joe, **I want** to change what kind of thing an Item is, **so that**
a Note that turned out to be a job becomes a Task.
Priority: Must · Status: proposed

Acceptance criteria
1. Given an Item, then "Convert to" offers only the conversions the ontology
   allows for its Type, among the Types that exist.
2. Given I convert a Note into a Task, then it keeps its id, title, body,
   Labels, links and Reminders, and the activity log records the conversion
   (database test).

### ITM-005 — Labels

**As** Joe, **I want** to make, rename and delete Labels, **so that** my
groups stay tidy.
Priority: Must · Status: proposed

Acceptance criteria
1. Given an Item, when I type a Label's name, then I can pick an existing
   Label or create a new one.
2. Given Settings, when I rename a Label, then every Item with it shows the
   new name; when I delete a Label, then it is removed from every Item, and
   the Items are kept.
3. Given two Labels can't have the same name in one Space (ignoring case),
   then creating a duplicate picks the existing one instead.

### ITM-006 — Star an Item

**As** Joe, **I want** to star the Items that matter now, **so that** I can
get back to them in one step.
Priority: Should · Status: proposed

Acceptance criteria
1. Given an Item, when I star it, then it shows as starred to me only, and
   appears on the Search Screen before I type and, for a Task, on the Tasks
   View's Starred tab.

### ITM-007 — Recent

**As** Joe, **I want** the Items I opened lately to be at hand, **so that**
going back to something is one tap.
Priority: Should · Status: proposed

Acceptance criteria
1. Given I have opened Items, then the Search Screen shows the last 10 I
   opened, newest first, before I type.

Non-goals (Stage 2): links between Items made by hand (Stage 3, with
Events); attachments; the activity log shown on an Item; exporting.
