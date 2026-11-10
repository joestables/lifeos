# Notes

*Stage 2; its Thoughts tab from Stage 7b. The decisions come first; the
requirements, drafted at the start of Stage 2 and in [Today, Reminders and
Plan](../cross-cutting/today-reminders-plan.md), are at the end.*

**In one line:** Notes, like Google Keep, and the Thoughts waiting to be sorted
([ADR-0026](../../20-architecture/adr/0026-navigation-drawer.md),
Provisionally agreed). Shopping lists have their own page, Shopping, and
Recipe ideas live in Recipes.

## Decisions

- **A Note is just a note**, like one in Google Keep: a title and a body,
  kept here. It has no *idea* status.
- **Thoughts wait on their own tab** (Joe, 9 November): Capture makes a
  Thought when the line has no time; it leaves the tab when it is
  converted into another Type, ticked off (done: it no longer matters) or
  deleted. Today says only how many wait
  ([ADR-0037](../../20-architecture/adr/0037-thoughts.md),
  [ADR-0065](../../20-architecture/adr/0065-reminders-alerts-and-the-day.md)
  12, Provisionally agreed).
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

## What the page shows

Two tabs, **Notes** and **Thoughts** (`/notes?tab=thoughts`), and under
them my Labels as pills: choosing one or more narrows either tab to what
has any of them, until I unchoose them.

**Notes:** pinned ones first, then the rest with the most recently changed
first; each shows its title and the start of its body. "New note" is the
tab's main action. A Note opens as a popup over the page on a computer,
and on a page of its own on a phone
([ITM-001](../cross-cutting/items.md#itm-001--open-an-item)).

**Thoughts:** my Thoughts not ticked off, newest first, each with when it
was captured and its Labels. Reminder, Task and Note are a tap each (on a
computer on hover; a swipe makes a Task on a phone); any other Type, and
Delete, are in its "…" menu. "New thought" is the tab's main action,
opening "New".

## Requirements

*Stage 2, and Stage 7b's NTE-005. Statuses: proposed → agreed → built → verified.*

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

### NTE-005 — Thoughts on Notes

**As** Joe, **I want** my Thoughts on Notes, on a tab of their own, **so
that** they're sorted somewhere calm rather than crowding my day.
Priority: Must · Status: verified (`thoughts.spec.ts`)

Acceptance criteria
1. Given Notes, then its tabs are **Notes** and **Thoughts**; my Labels
   are pills under them and narrow either tab (NTE-002).
2. Given Thoughts, then my Thoughts not ticked off are listed newest first,
   each with when it was captured and its Labels.
3. Given a Thought, then I can tick it off (INB-006), delete it, or convert
   it: Reminder, Task and Note one tap each, any other Capturable Type from
   its menu (INB-002, RMD-006 1).
4. Given the Thoughts tab, then the page's main action is New thought,
   opening "New" (NEW-002).

## Thoughts

*Inbox's requirements for Thoughts (Stage 2), which hold on Notes'
Thoughts tab from Stage 7b; their ids are kept.*

### INB-001 — Thoughts wait to be sorted

**As** Joe, **I want** everything I captured and haven't sorted in one
place, **so that** nothing captured is lost.
Priority: Must · Status: verified

Acceptance criteria
1. Given I have captured three Thoughts, when I open Notes' Thoughts, then
   they are there, newest first, each showing when it was captured and its
   Labels.
2. Given a Thought is sorted or deleted, then it leaves the tab at once,
   offline too.

### INB-002 — Sort a Thought in one action

**As** Joe, **I want** to turn a Thought into a Reminder, a Task or a Note
in one action, **so that** sorting takes seconds per line.
Priority: Must · Status: verified

Acceptance criteria
1. Given a Thought, when I make it a Task (one action, on a phone or a
   computer), then it becomes a Task in place, keeping its text, Alerts
   (one at the same moment as the Task's own isn't kept twice) and
   history, with any date in it understood as it was meant when captured
   ([CAP-003](../cross-cutting/capture.md#cap-003--dates-and-times-are-understood-the-same-way-everywhere)),
   and it leaves the tab for Plan.
2. Given a Thought, when I make it a Note (one action), then it becomes a
   Note in place and appears on the Notes tab.
3. Given a Thought, when I choose another Type, then only the Types a
   Thought can become that exist are offered (Reminder from Stage 7b,
   RMD-006 1; Event from Stage 3, its date understood as for a Task and
   kept as its start; Recipe and Shopping list from Stage 4, as
   [ITM-006](../cross-cutting/items.md#itm-006--food-items) sets).
4. Given a Thought, when I delete it, then it leaves the tab, and I can
   undo that at once or recover it later from Settings
   ([ITM-002, ITM-003](../cross-cutting/items.md#requirements)).

### INB-006 — Tick a Thought off

**As** Joe, **I want** to tick a Thought off when it no longer matters, as I
tick a Task, **so that** only what still needs me waits.
Priority: Should · Status: verified

Acceptance criteria
1. Given a Thought, when I tick it, then it is done, leaves the tab and
   Today's count of Thoughts to sort, and I can undo that at once.
2. Given a done Thought, opened from Search, when I untick it, then it is
   back on the tab.
3. Given a done Thought, when I convert it, then it is done as a Task, and
   an active Note.

Non-goals (Stage 2): a colour per Note; an *idea* state; images and
attachments; sharing a Note; shopping lists (the Shopping page); other
Types' ideas on this page.
