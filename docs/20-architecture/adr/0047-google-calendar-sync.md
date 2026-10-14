# ADR-0047: How Google Calendar comes in

**Status:** Proposed · 2026-10-14

## Context

Stage 3's [Google Calendar requirements](../../10-requirements/cross-cutting/integrations.md#google-calendar)
(GCL-001–006) ask for each person to connect their own Google Calendar,
choose each calendar's sync level, see changes on Plan within a few minutes,
never get a duplicate, and be told when the connection breaks.
[ADR-0022](0022-repeating-items.md) says Google's repeating events come in
as individual instances, and the [IntegrationAdapter](../contracts.md#integrationadapter)
pattern keeps tokens in Vault and raw payloads in `core.external_refs`.
Re-checked 14 October 2026 (Google's pages couldn't be opened from the
session; from search): `calendar.events` and
`calendar.calendarlist.readonly` are the scopes; an unverified app In
production shows a warning screen and is capped at 100 users over the
project's life, and its refresh tokens don't expire after 7 days as
Testing's do; push notifications ("watch" channels) last about a week and
must be renewed, and whether their address needs a verified domain is
unconfirmed; a sync token can't be combined with a time range, and a
stale one returns 410, meaning sync again from scratch.

## Decision

- **Connecting is LifeOS's own OAuth flow, run by Edge Functions**
  (`calendar-connect` and its callback), on the same Google Cloud project as
  sign-in, asking offline access for `calendar.calendarlist.readonly` and
  `calendar.events` only. The refresh token goes into Vault; its id, the
  Google account and the connection's state are in `core.connections`, one
  per person, readable only by its owner. The client secret is an Edge
  Function secret.
- **Each calendar is a row** (`core.calendar_links`: connection, Google
  calendar id, name, whether I can edit it, level *off · incoming · two-way*,
  whether new Events go there, the sync token). Settings changes these
  through database functions, like everything else.
- **Polling first, with sync tokens.** A `pg_cron` job every five minutes
  wakes a `calendar-sync` Edge Function (through `pg_net`, with a secret in
  Vault, as [ADR-0044](0044-reminder-delivery.md) does) for the calendars
  that are on; the app also asks for a sync when Plan opens, at most once a
  minute. Each calendar is read with its sync token, so a quiet calendar
  costs one small request. Google's push notifications can come later if
  five minutes proves too slow; nothing here depends on them.
- **The first sync reads from four weeks back**, with
  `singleEvents=false`, so a repeating event arrives once, as its rule.
  LifeOS asks Google for that event's instances (`events.instances`) up to
  12 weeks ahead — the same window as LifeOS's own series
  ([ADR-0045](0045-extending-series.md)) — and keeps each instance as an
  Event. `extend-series`' nightly run asks for the next stretch. Google
  expands its own rules, so LifeOS never has to understand every RRULE
  Google allows.
- **Each Event from Google is an Item** of Type Event in its owner's
  Personal Space, with a `core.external_refs` row: the calendar, Google's
  event id (an instance's own id), its `etag`, its `updated` time, the raw
  payload and the mapping's version. A unique key on the calendar and
  Google's id means a sync run twice changes nothing. A cancelled instance
  or deleted event is archived (Recently deleted); one that comes back is
  restored. The database refuses to move an Item that has an external
  reference out of its Personal Space.
- **Google's fields are Google's on an incoming calendar.** `core.update_item`
  refuses a change to an imported Event's title, times, place, notes,
  repeat or archive state unless its calendar is two-way; Labels,
  Reminders and links aren't Google's and stay allowed. The app hides
  those controls, but the database is the check (GCL-004).
- **Broken is a state of the connection.** Google's `invalid_grant`, or a
  revoked scope, marks the connection *broken*, writes to `ops.events`,
  shows in Inbox (GCL-006) and is counted by the nightly health check.
  Imported Events stay. Reconnecting resumes from the stored sync tokens; a
  410 starts that calendar again from scratch, matched by Google's ids so
  nothing doubles.
- **Disconnecting** revokes the token at Google, deletes it from Vault,
  and archives the Events that connection brought in.
- **Tested against a stand-in for Google** (a small fake of the endpoints
  used), in unit tests of the mapping and in the browser walks; a real
  connection is checked by hand.

## Consequences

- A change in Google reaches Plan within about five minutes, or as soon as
  Plan is opened.
- A repeating event with no end holds about 12 weeks of instances, like a
  LifeOS series.
- Adding sensitive scopes to the project that also signs people in is fine
  for sign-in, which asks only for `openid`, `email` and `profile`; the
  unverified-app warning appears only when connecting Calendar.
- Two-way sync: [ADR-0048](0048-google-calendar-two-way.md) (Proposed).
