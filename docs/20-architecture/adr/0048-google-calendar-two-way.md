# ADR-0048: Two-way Google Calendar

**Status:** Provisionally agreed · 2026-10-14

**Amended:** 2026-11-04 by Joe's answers on sharing Tasks and Events (a shared Event is one copy in each member's default calendar).

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
  calendar — or a new Event, when I have a default calendar or chose one for it —
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
- **Which Events:** those in my Personal Space, and the Household's: a
  shared Event is one copy in each member's default calendar, sent through
  that member's own connection (Joe, 4 November;
  [GCL-007](../../10-requirements/cross-cutting/integrations.md#gcl-007--a-shared-event-in-everyones-calendar)).
  An edit to any copy changes the Event; deleting a copy in Google takes it
  off that calendar only.
  Events from Google stay in the calendar they came from. An Event made
  before a calendar was two-way isn't sent until it changes.
- **Switching an Event into a Task** deletes it in Google; switching it back
  sends it again.

## As built (16 October, plan step 10)

Claude's choices while building, within the decision, and where it differs;
for Joe to confirm:

- **The later change wins for the whole event, not field by field.**
  `calendar-push` sends a change with Google's last-known `etag`; if Google
  refuses it (412), it reads Google's event: if Google's `updated` is after
  my change reached the server, Google's whole event is kept in LifeOS,
  otherwise mine is sent again in full. Incoming sync leaves an Event alone
  while a newer change of mine waits in the outbox. Field by field would
  need each field's change time kept; whole-event is simpler and the same
  whenever only one side changed.
- **The outbox:** `core_private.calendar_outbox` (one waiting row per Event
  or series and person, a second change bumping it: the maker's, and a
  `copy` for each member of a shared one's Household), filled by triggers on
  Events and series while that person has a two-way calendar; `core.calendar_outbox_claim`
  hands `calendar-push` up to 50 jobs, each to the calendar its Event came
  from or, for a new one, the calendar chosen as it was made
  (`core_private.event_calendars`, written just before the Event) or else
  my default calendar; a repeat made from an Event already in Google goes
  to that Event's calendar. `core.calendar_sent` and
  `core.calendar_unpushed` record the outcome; a job is tried again after 5
  minutes, doubling to 6 hours, and a broken connection's jobs wait a
  quarter of an hour at a time. A change made while its job was with Google
  stays waiting and goes next. A job with nowhere to go is closed.
  `pg_cron` job `calendar-push` checks every minute and wakes the function
  only while something waits.
- **A repeating Event's occurrences match Google's instances by their
  original day** (one occurrence a day), kept in `core_private.series_refs`
  (series ↔ Google's repeating event). It starts on its first occurrence's
  day at the series' own times, whatever became of that occurrence; a
  changed occurrence is sent as that instance's times, a deleted one
  cancels it, and an Event made to repeat has its single Google event
  replaced by the series. A timed repeat ends at the end of its last day
  in my timezone. Instances Google makes further ahead than LifeOS has
  occurrences aren't brought in until LifeOS makes those occurrences; a
  rule changed in Google isn't yet followed; a repeat I made, deleted in
  Google, ends in LifeOS.
- **Recognising my own Events coming back:** an Event by the private
  extended property `lifeosId`, a series' instances through `series_refs`
  and their day; a copy the sync had already made is archived.
- **Restoring** an Event sends it again: Google's cancelled event is
  updated back to confirmed (or made anew if Google has dropped it); a
  cancellation older than my waiting change doesn't delete it again.
- **An Event made in LifeOS stays mine** (`external_refs.made_in_lifeos`):
  disconnecting, or turning its calendar off or incoming, leaves it on Plan
  and editable; only Events Google made go. An Event switched into a Task
  has its Google event deleted and is a Task from then on, whatever Google
  says of its old event.

## Consequences

- A change reaches Google within about a minute of reaching the server; made
  offline, once the write queue has sent it.
- Google never sees Tasks, Meals, Workouts or Shopping lists.
- A Household Event is a copy per member's calendar, not Google's own
  invitations: each member's copy is theirs, and nobody's Google account
  sees another's.
