# ADR-0037: Capture makes a Thought; Notes are organised thoughts

**Status:** Provisionally agreed · 2026-10-09

## Context

Capture made a Note by default, so the Note Type mixed two things: raw,
unsorted captures, and notes worth keeping. An Unsorted / Filed flag told them
apart. Joe prefers to capture **Thoughts** into the Inbox, sort them later,
and keep **Notes** as organised thoughts.

## Decision

- **Thought is a new core Type**: a raw, unsorted capture. **Capture makes a
  Thought by default**; the one-tap switch to Task stays.
- **Thoughts live in Inbox until sorted.** Sorting a Thought converts it in
  place into any Capturable Type — a Note, Task, List, Shop, Event, Recipe,
  Goal or Garment — or deletes it (archived, with undo). It keeps its id,
  links, Reminders and history.
- **A Note is an organised thought**: kept, labelled, and shown in the Notes
  View. Note becomes a Capturable Type. The Unsorted / Filed flag goes: a
  Thought is unsorted by definition, and a Note is kept by definition.
- **An idea** is still a status, not a Type: a Thought can be sorted into a
  Type in its *idea* status (a Recipe idea, a "Someday" Task, a Note kept as
  an idea).
- **A Thought whose text contains a date gets a Reminder** for that date, as
  a Note did before ([ADR-0023](0023-reminders.md)).
- A Thought is created in its capturer's Personal Space and isn't Shareable:
  it is shared by sorting it into a Shareable Type.

## Consequences

- Amends ADR-0005, 0006, 0007, 0018, 0019, 0023, 0027, 0028 and 0033.
- The core is built from four Types: Thought, Note, Task and Event.
- Inbox shows Thoughts to sort; the Notes View shows only Notes.
- Open: whether a Thought should be Shareable, so a Household member could
  capture straight into a shared Inbox.
