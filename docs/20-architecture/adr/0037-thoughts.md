# ADR-0037: Capture makes a Thought, sorted from Inbox

**Status:** Provisionally agreed · 2026-10-09

## Context

Capture made a Note by default, so the Note Type mixed two things: raw,
unsorted captures, and notes worth keeping. An Unsorted / Filed flag told them
apart. Joe prefers to capture **Thoughts** into the Inbox and sort them
later.

## Decision

- **Thought is a new core Type**: a raw, unsorted capture. **Capture makes a
  Thought by default**; the one-tap switch to Task stays.
- **Thoughts live in Inbox until sorted.** Sorting a Thought converts it in
  place into any Capturable Type — a Note, Task, List, Shop, Event, Recipe,
  Goal or Garment — or deletes it (archived, with undo). It keeps its id,
  links, Reminders and history.
- **A Note is a note**: kept, labelled and shown in the Notes View. Note is a
  Capturable Type, so a Thought can become one, and a Note can still be
  converted into other Capturable Types. The Unsorted / Filed flag goes.
- **Thoughts and Notes are Personal only**: neither is Shareable. Something
  to share is converted into a Shareable Type, such as a List.
- **An idea** is still a status, not a Type: a Thought can be sorted into a
  Type in its *idea* status (a Recipe idea, a "Someday" Task, a Note kept as
  an idea).
- **A Thought whose text contains a date gets a Reminder** for that date, as
  a Note did before ([ADR-0023](0023-reminders.md)).

## Consequences

- Amends ADR-0005, 0006, 0007, 0018, 0019, 0023, 0027, 0028 and 0033.
- The core is built from four Types: Thought, Note, Task and Event.
- Inbox shows Thoughts to sort; the Notes View shows only Notes.
- A Personal Thought or Note can still be seen by a Household one hop away
  if it is linked to a shared Item ([ADR-0016](0016-sharing-and-visibility.md)).
