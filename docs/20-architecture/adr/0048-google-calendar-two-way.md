# ADR-0048: Two-way Google Calendar

**Status:** Proposed · 2026-10-14

## Context

On a calendar set to two-way, GCL-005 sends the Events I make, change or
delete in LifeOS to Google, Events only, including (from Stage 4) the
Household's; Labels, Reminders and Tasks *for* an Event stay in LifeOS. A
repeating LifeOS Event must be a repeating event in Google. Changes made on
both sides must neither loop nor be lost. LifeOS's writes already reach the
server through its write queue, last write winning field by field
([ADR-0031](0031-offline-and-concurrent-edits.md), [ADR-0042](0042-data-layer.md)).

## Decision

- **An outbox on the server.** A trigger on Events (and their series)
  writes a row to `core_private.calendar_outbox` when an Event on a two-way
  calendar — or a new Event, when I have a calendar marked for new Events —
  is made, changed in a field Google has, archived or restored. Writes made
  by `calendar-sync` itself set a flag that the trigger skips, so nothing
  echoes back. The minute job wakes `calendar-push` when rows are waiting;
  it claims them, sends each to Google, and stores the `etag` and `updated`
  Google returns. Failures retry with backoff; a broken connection holds
  them until it is fixed.
- **Who wins: the later change, field by field.** `calendar-push` sends a
  change with Google's last-known `etag`. If Google has changed the event
  since, it fetches Google's version and keeps, for each field, whichever
  change is later — LifeOS's by when it reached the server, Google's by its
  `updated` time — then sends the result. Incoming sync does the same when
  it finds an event with a change still waiting in the outbox.
- **A repeating Event goes to Google as a repeating event**, with its rule
  as an RRULE in Europe/London, so Google shows one series.
  - LifeOS's occurrences match Google's instances by their original start
    (`occurrence_on` and the time), so changing one occurrence changes that
    instance only.
  - "This and all following" ends the Google event's rule with `UNTIL` and
    starts a new repeating event; stopping a repeat sets `UNTIL`; deleting
    one occurrence cancels that instance.
  - If the rule is changed in Google, LifeOS stops making occurrences for
    that series and takes Google's instances as they come
    ([ADR-0047](0047-google-calendar-sync.md)).
- **What is sent:** title, start and end (or all-day dates), place as
  `location`, notes as `description`, and the repeat. Google's event keeps
  LifeOS's id in a private extended property, so an Event made in LifeOS
  is recognised when it comes back in.
- **Which Events:** those in my Personal Space, and from Stage 4 the
  Household's, each sent by the person who has them on a two-way calendar.
  Events from Google stay in the calendar they came from. An Event made
  before a calendar was two-way isn't sent until it changes.
- **Switching an Event into a Task** deletes it in Google; switching it back
  sends it again.

## Consequences

- A change reaches Google within about a minute of reaching the server; made
  offline, once the write queue has sent it.
- Google never sees Tasks, Meals, Workouts or Shops.
- A Household Event will be sent by each member who has a two-way calendar
  (Stage 4 decides whether that means one copy per member's calendar, or
  Google's own invitations).
