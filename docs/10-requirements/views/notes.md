# Notes

*Stage 2. The decisions come first; the requirements, drafted at the start of
Stage 2, are at the end.*

> **Changing in Stage 7b** (spec agreed 9 November, not yet built): Gives Notes a **Thoughts** tab, where Thoughts are sorted (NTE-005). [Today, Reminders and Plan](../cross-cutting/today-reminders-plan.md). Until it is built, this page is how it works.

**In one line:** Notes, like Google Keep
([ADR-0026](../../20-architecture/adr/0026-navigation-drawer.md),
Provisionally agreed). Shopping lists have their own page, Shopping, and
Recipe ideas live in Recipes.

## Decisions

- **A Note is just a note**, like one in Google Keep: a title and a body,
  kept here. It has no *idea* status. Thoughts wait in Inbox, not here
  ([ADR-0037](../../20-architecture/adr/0037-thoughts.md), Provisionally
  agreed).
- **Notes are Personal only**; something to share becomes a Shareable Type,
  such as a Shopping list. A packing or DIY list is a Note
  with a checklist ([ADR-0050](../../20-architecture/adr/0050-shopping-list.md)).
- **Labels filter the page**, as in Google Keep; a Note's own title is its
  heading. Thoughts, Notes, Tasks and Events share one set of Labels
  ([ADR-0014](../../20-architecture/adr/0014-reference-data-and-labels.md),
  Provisionally agreed).
- **Notes are pinned**, not starred: pinning is the Note's mark, kept at the
  top of the page.
- **Notes are yellow**, with Thoughts and Shopping lists; the page takes that
  colour, and a Note has no colour of its own
  ([ADR-0043](../../20-architecture/adr/0043-colour-by-type.md),
  Provisionally agreed).
- A Note can be converted into any other Capturable Type but a Reminder,
  which is a title only (RMD-006).

## What the page shows (Stage 2)

My Notes, pinned ones first, then the rest with the most recently changed
first; each shows its title and the start of its body. "New note" is the
page's main action. My Labels are pills above the Notes: choosing one or
more narrows the page to the Notes with any of them, until I unchoose
them. A Note opens as a
popup over the page on a computer, and on a page of its own on a phone
([ITM-001](../cross-cutting/items.md#itm-001--open-an-item)).

## Requirements

*Stage 2. Statuses: proposed → agreed → built → verified.*

### NTE-001 — Write a Note

**As** Joe, **I want** to write a note and find it again, **so that** what
I want to keep has a home.
Priority: Must · Status: verified

Acceptance criteria
1. Given the Notes View, when I start a new Note and type a title and a body,
   then it is kept as I type, with nothing to save, offline too.
2. Given a Note, when I open it again, then I see what I wrote and can
   change it.
3. Given a Note with no title, then its first line stands in for one.
4. Given I change a Note, then it moves to the top of the unpinned Notes.

### NTE-002 — Labels on Notes

**As** Joe, **I want** to label Notes and see only some Labels' Notes,
**so that** I can find a Note among many.
Priority: Must · Status: verified

Acceptance criteria
1. Given a Note, when I give it a Label, then I can pick one I already have
   or make a new one; a Note can have several.
2. Given Notes labelled Home and Recipes, when I choose Home, then only Notes
   labelled Home show, until I unchoose it; choosing Recipes too shows
   Notes with either.
3. Given the Labels I use on Tasks, then the same Labels are offered on
   Notes ([ITM-005](../cross-cutting/items.md#itm-005--labels-on-thoughts-notes-and-tasks)).

### NTE-003 — Pin a Note

**As** Joe, **I want** to pin the Notes I use most, **so that** they are at
the top.
Priority: Should · Status: verified

Acceptance criteria
1. Given I pin a Note, then it shows above every unpinned Note, also when
   the page is narrowed to a Label it has; unpinning puts it back among the
   rest.

### NTE-004 — Simple formatting

**As** Joe, **I want** lists, checklists, bold, italic and links in a Note,
**so that** a note can be more than a paragraph.
Priority: Should · Status: verified

Acceptance criteria
1. Given I am writing a Note, then I can make a bulleted or numbered list,
   a checklist, bold or italic text and a link without leaving the keyboard,
   and the Note shows them formatted.
2. Given a checklist in a Note, when I tick a line, then the Note keeps it
   ticked.

Non-goals (Stage 2): a colour per Note; an *idea* state; images and
attachments; sharing a Note; shopping lists (the Shopping page); other
Types' ideas on this page.
