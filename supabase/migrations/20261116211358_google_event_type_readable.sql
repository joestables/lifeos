-- A fix to google_birthdays_and_digest (16 November). The app reads each
-- Google Event's type, to show a Google birthday read only (GCL-004 3), and
-- read it from the raw payload, which the app may not read: every read of
-- my calendars was refused (403), so Settings said Google Calendar
-- "Couldn't load". The type is a column of its own now, which the app may
-- read; the raw payload (attendees, descriptions…) stays the server's.

alter table core.external_refs
  add column event_type text generated always as (raw ->> 'eventType') stored;

grant select (event_type) on core.external_refs to authenticated;
