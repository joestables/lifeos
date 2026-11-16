-- The app's reads of my Google Calendar (src/data/calendar.ts, fetchCalendar)
-- run as me. These three tables are readable by column only, so a read that
-- names a column the app may not read is refused, and Settings says Google
-- Calendar "Couldn't load" (16 November). The column lists here are the
-- app's, word for word: src/data/calendar-reads.test.ts fails when they
-- drift.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(3);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'ann@example.com');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}', true),
  set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000a', true);

set local role authenticated;
select lives_ok(
  $$select id, account, state, broken_since, last_synced_at, disconnected_at from core.connections$$,
  'GCL-001: the app may read my connection'
);
select lives_ok(
  $$select id, calendar_id, name, can_edit, is_primary, level, new_events from core.calendar_links$$,
  'GCL-002: the app may read my calendars'
);
select lives_ok(
  $$select item_id, calendar_link_id, external_id, made_in_lifeos, event_type from core.external_refs$$,
  'GCL-003, GCL-004 3: the app may read which Events are Google''s, and which are birthdays'
);
reset role;

select * from finish();
rollback;
