# Integrations

*Each Integration's requirements are written in its stage. This page records
the shared pattern, what is known about each source, and Google Calendar's
requirements (Stage 3).*

## The pattern

Connect (OAuth) → fetch new data (schedule or webhook) → store the raw
payload → map to Items, tagged with `external_id` so re-runs never duplicate.
Tokens in Supabase Vault (`core.connections`); ids and raw payloads in
`core.external_refs` ([contracts](../../20-architecture/contracts.md#integrationadapter)).
A broken Integration shows in Inbox and in the nightly health check.

## By source

| Source | Stage | What is known |
|---|---|---|
| **Google Calendar** | 3 | The events scope is "sensitive"; in *Testing* mode refresh tokens expire after 7 days, so publish the Google app to Production unverified (warning screen; at most 100 users over the project's life) and request `calendar.calendarlist.readonly` and `calendar.events` only (re-checked 14 October). Supabase's Google sign-in doesn't hand over a lasting Calendar refresh token, so connecting Calendar is a separate OAuth flow run by an Edge Function. Repeating events are imported as individual instances. Stage 3's choices and requirements: [below](#google-calendar). |
| **Oura** | 8 | Reported: personal access tokens were retired at the end of 2025, so OAuth only; new apps are limited to 10 users; Gen3+ rings need an active Oura Membership. No native app needed. Re-check before Stage 8. Sleep and readiness stay out of the Items table ([ADR-0015](../../20-architecture/adr/0015-health-data-as-a-time-series.md)). |
| **Health Connect** | 7–8 | Native Android only (e.g. `@capgo/capacitor-health`), so it waits for the wrapper. |
| **Finance** | 9 | Nationwide and Barclaycard via Open Banking aggregators (check current personal-use availability); Vanguard and Moneybox have no Open Banking or public API — manual balances or CSV import. |
| **Weather** | Later | An opportunity: feeds outfit suggestions and run planning ([roadmap](../../roadmap.md#later-opportunities)). |

Setup steps: [integration setup](../../40-operations/integration-setup.md).

## Google Calendar

*Stage 3. The decisions come first; the requirements, drafted at the start
of Stage 3 ([plan](../../50-progress/plans/stage-3.md)), are at the end.*

### Decisions

- **Each person connects their own Google Calendar**, from Settings; the
  connection is theirs alone.
- **The sync level is per calendar** (Joe, 14 October): each of my Google
  calendars is *off*, *incoming* (Google → LifeOS) or *two-way*. One two-way
  calendar is where new LifeOS Events go.
- **What comes in is always Personal** (Joe, 14 October): Events from Google
  land in my Personal Space and can't be shared.
- **Only Events go out** (Joe, 14 October): on two-way, the Events I make or
  change in LifeOS go to Google — my Personal Events and, from Stage 4, the
  Household's — never Tasks, Meals, Workouts or Shops.
- **An Event from an incoming-only calendar is Google's** (Joe, 14
  October): it can't be changed, moved or deleted in LifeOS, only opened in
  Google Calendar. Labels, Reminders and Tasks *for* it are LifeOS's own,
  and stay in LifeOS on either level.
- **No Reminder by default** on an Event from Google (Joe, 14 October);
  Google's own notifications are left to Google.
- **Deleting follows** (Joe, 14 October): an Event deleted in Google goes to
  Recently deleted in LifeOS; on two-way, deleting in LifeOS deletes it in
  Google.
- **Repeating events** come in as individual instances
  ([ADR-0022](../../20-architecture/adr/0022-repeating-items.md)); how a
  LifeOS repeating Event goes out, how sync runs, and who wins when both
  sides change: [ADR-0047](../../20-architecture/adr/0047-google-calendar-sync.md)
  and [ADR-0048](../../20-architecture/adr/0048-google-calendar-two-way.md)
  (Provisionally agreed).
- **A broken connection shows in Inbox** and in the nightly health check;
  the Events already in LifeOS stay.

### Requirements

*Stage 3. Statuses: proposed → agreed → built → verified. Browser tests use a
stand-in for Google; a real connection is checked by hand.*

#### GCL-001 — Connect my Google Calendar

**As** Joe, **I want** to connect my Google Calendar to LifeOS, **so that**
everything I'm doing is on Plan.
Priority: Must · Status: verified (a real connection is checked by hand)

Acceptance criteria
1. Given Settings, when I choose Connect Google Calendar and allow it at
   Google, then my Google calendars are listed in Settings.
2. Given I connect, then my main calendar is *incoming* and the rest *off*,
   until I change them.
3. Given I disconnect, then LifeOS stops reading and writing my calendars,
   and the Events it brought in leave Plan; Events I made in LifeOS stay.

#### GCL-002 — Choose each calendar's sync level

**As** Joe, **I want** to choose, calendar by calendar, whether it only
comes in or goes both ways, **so that** LifeOS changes only what I let it.
Priority: Must · Status: verified

Acceptance criteria
1. Given my calendars in Settings, then I can set each to off, incoming or
   two-way; two-way only on a calendar I can edit in Google.
2. Given any calendar is two-way, then I choose one of them as where new
   Events go; with none two-way, Events I make stay in LifeOS.
3. Given I turn a calendar off, then its Events leave Plan.

#### GCL-003 — Events come in from Google

**As** Joe, **I want** what's in my Google Calendar to show on Plan and keep
up to date, **so that** I needn't look in two places.
Priority: Must · Status: verified

Acceptance criteria
1. Given a calendar set to incoming or two-way, then its Events from four
   weeks ago onwards are on Plan as Events in my Personal Space, each marked
   as from Google Calendar, with no Reminder.
2. Given an Event is added, changed or deleted in Google, then Plan shows
   the change within a few minutes; a deleted one goes to Recently deleted.
3. Given a repeating event in Google, then each instance is its own Event on
   its day, and changing one instance in Google changes only that one.
4. Given the same sync runs twice, then nothing is duplicated.
5. Given an Event from Google, then it can't be shared with the Household.

#### GCL-004 — Incoming Events are Google's

**As** Joe, **I want** Events from an incoming-only calendar to stay as
Google has them, **so that** Google stays the one place they're changed.
Priority: Must · Status: verified

Acceptance criteria
1. Given an Event from an incoming-only calendar, when I open it, then its
   title, times, place, notes and repeat can't be changed, it can't be
   deleted or dragged, and it offers "Open in Google Calendar".
2. Given that Event, then I can still give it Labels, Reminders and Tasks
   *for* it, which stay in LifeOS.

#### GCL-005 — Two-way: my Events go to Google

**As** Joe, **I want** Events I make or change in LifeOS to be in my Google
Calendar, **so that** Google Calendar stays complete.
Priority: Must · Status: verified (against a stand-in for Google; a real
calendar is checked by hand)

Acceptance criteria
1. Given a calendar where new Events go, when I make an Event in LifeOS,
   then it is in that Google calendar within a minute of reaching the
   server.
2. Given an Event from a two-way calendar, when I change its title, times,
   place, notes or repeat in LifeOS, then the change is made in Google, in
   the calendar it came from; when I delete it, it is deleted in Google, and
   restoring it puts it back.
3. Given a repeating Event made in LifeOS, then Google has it as a repeating
   event.
4. Given an Event's Labels, Reminders and Tasks *for* it, then they aren't
   sent to Google.
5. Given a Task, or any Type but Event, then nothing is sent to Google.
6. Given I make an Event offline, then it goes to Google once it reaches the
   server.

#### GCL-006 — A broken connection tells me

**As** Joe, **I want** to know when Google Calendar stops syncing, **so
that** Plan isn't quietly out of date.
Priority: Must · Status: verified

Acceptance criteria
1. Given Google refuses LifeOS's access (I revoked it, or it expired), then
   Inbox shows "Google Calendar isn't syncing" with Reconnect, and the
   nightly health check records it.
2. Given I reconnect, then sync carries on from where it stopped, with
   nothing duplicated, and the entry leaves Inbox.
3. Given it is broken, then the Events already in LifeOS stay on Plan.

Non-goals (Stage 3): calendars other than Google's; Tasks, Meals or other
Types sent to Google; Google's own reminders brought in; inviting people or
replying to invitations; Household Events sent to Google (Stage 4, when
Households arrive); choosing calendars by Label.

## References

[Google sensitive scope verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification) ·
[Testing-mode token expiry](https://developers.google.com/identity/protocols/oauth2#expiration) ·
[Oura API support article](https://support.ouraring.com/hc/en-us/articles/4415266939155-The-Oura-API) ·
[Oura access restrictions](https://tryterra.co/blog/oura-api-ai-apps-access-permissions-commercial-restrictions) ·
[Capgo health plugin](https://capgo.app/docs/plugins/health/)
