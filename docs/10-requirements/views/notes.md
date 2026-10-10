# Notes

*Stage 2. The decisions come first; the requirements, drafted at the start of
Stage 2, are at the end. Lists join this page in Stage 3.*

**In one line:** Notes, **Lists and Ideas** together
([ADR-0026](../../20-architecture/adr/0026-navigation-drawer.md),
Provisionally agreed).

## Decisions

- **A Note is a note:** kept, labelled and shown here. Thoughts wait in
  Inbox, not here ([ADR-0037](../../20-architecture/adr/0037-thoughts.md),
  Provisionally agreed).
- **Notes are Personal only**; something to share becomes a Shareable Type,
  such as a List.
- **Labels are the headings**, like Google Keep: a Note appears under each
  of its Labels, unlabelled ones under "Other"
  ([ADR-0014](../../20-architecture/adr/0014-reference-data-and-labels.md),
  Provisionally agreed).
- **A Note can be an idea** (its *idea* status) and can be converted into any
  other Capturable Type.

## What the page shows (Stage 2)

"New note" is the page's primary action. Below it: **Pinned** first, then one
group per Label that has Notes (alphabetical), then **Other**. Each Note is a
Card with its title and its first few lines; a grid on a computer, one column
on a phone. A pinned Note shows only under Pinned. Tabs: **All** and
**Ideas** (Notes in the *idea* status; NTE-005).

## Requirements

*Stage 2. Statuses: proposed → agreed → built → verified.*

### NTE-001 — Write a Note

**As** Joe, **I want** to write a note and find it again, **so that** what
I want to keep has a home.
Priority: Must · Status: proposed

Acceptance criteria
1. Given the Notes View, when I choose "New note" and type a title and a
   body, then the Note is saved as I type, with no Save button, offline too.
2. Given a Note, when I open it again, then I see what I wrote and can
   change it.
3. Given a Note with no title, then its first line stands in for one.

### NTE-002 — Labels as headings

**As** Joe, **I want** Notes grouped under their Labels, **so that** I can
browse them like Google Keep.
Priority: Must · Status: proposed

Acceptance criteria
1. Given Notes labelled Home and Recipes and one with no Label, then the
   page shows "Home", "Recipes" and "Other", each with its Notes.
2. Given a Note labelled both Home and Recipes, then it appears under both.
3. Given a Note, when I add a Label that doesn't exist yet, then it is
   created and the Note appears under it.

### NTE-003 — Pin a Note

**As** Joe, **I want** to pin the Notes I use most, **so that** they are at
the top.
Priority: Should · Status: proposed

Acceptance criteria
1. Given I pin a Note, then it moves to Pinned, above every Label, and only
   there; unpinning puts it back under its Labels.

### NTE-004 — Simple formatting

**As** Joe, **I want** lists, checklists and emphasis in a Note, **so that**
a note can be more than a paragraph.
Priority: Should · Status: proposed

Acceptance criteria
1. Given I type `- ` or `1. ` at the start of a line, `[ ] `, `**bold**`,
   `*italic*` or a web address, then the Note shows a list, a checklist, bold,
   italic or a link when I'm not editing it.
2. Given a checklist in a Note I'm reading, when I tick a line, then the
   Note is saved with it ticked.

### NTE-005 — Notes as ideas

**As** Joe, **I want** to keep a Note as an idea, **so that** ideas are
together and apart from settled notes.
Priority: Could · Status: proposed

Acceptance criteria
1. Given a Note marked as an idea, then it appears on the Ideas tab as well
   as under its Labels.

Non-goals (Stage 2): Note colour (colour means Module —
[question 2](../../50-progress/plans/stage-2.md#questions-for-joe-step-1));
images and attachments; a formatting toolbar; sharing a Note; Lists (Stage 3).
