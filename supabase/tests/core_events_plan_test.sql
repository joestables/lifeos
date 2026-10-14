-- Events, Plan's read and Google Calendar's rules (Stage 3). EVT-001,
-- EVT-003, EVT-004, EVT-005, PLN-001, PLN-004, GCL-002, GCL-003, GCL-004;
-- ADR-0021, ADR-0047, ADR-0049.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(35);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'ann@example.com'),
  ('00000000-0000-4000-8000-00000000000b', 'ben@example.com');

select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}', true),
  set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000a', true);
set local role authenticated;

-- ---------------------------------------------------------------------------
-- EVT-001: an Event with a place; a place only on a Type that has one.

select core.create_item('00000000-0000-7000-8000-000000000001', 'event',
  '{"title": "Mum''s birthday lunch", "place": "The Ivy, Richmond",
    "starts_at": "2026-10-17T12:00:00Z", "ends_at": "2026-10-17T14:00:00Z"}');
select is(
  (select place from core.items where id = '00000000-0000-7000-8000-000000000001'),
  'The Ivy, Richmond',
  'EVT-001: an Event keeps its place'
);
select throws_ok(
  $$select core.create_item('00000000-0000-7000-8000-000000000002', 'task', '{"title": "Bins", "place": "Outside"}')$$,
  '23514', null,
  'EVT-001: a Task has no place'
);
select throws_ok(
  $$select core.create_item('00000000-0000-7000-8000-000000000003', 'event',
    '{"title": "Away", "all_day": true, "starts_at": "2026-10-17T09:00:00Z"}')$$,
  '23514', null,
  'EVT-001 3: an all-day Event is kept as dates, midnight UTC'
);
select throws_ok(
  $$select core.create_item('00000000-0000-7000-8000-000000000004', 'event',
    '{"title": "Backwards", "starts_at": "2026-10-17T12:00:00Z", "ends_at": "2026-10-17T11:00:00Z"}')$$,
  '23514', null,
  'EVT-001 2: an end before the start is refused'
);

-- ---------------------------------------------------------------------------
-- EVT-003: a timed Event I make reminds me 30 minutes before; all day, none.

select is(
  (select fires_at from core.reminders where item_id = '00000000-0000-7000-8000-000000000001' and is_default),
  '2026-10-17 11:30:00+00'::timestamptz,
  'EVT-003 1: a 13:00 Event reminds me at 12:30'
);
select core.update_item('00000000-0000-7000-8000-000000000001', '{"starts_at": "2026-10-17T13:00:00Z", "ends_at": "2026-10-17T15:00:00Z"}');
select is(
  (select fires_at from core.reminders where item_id = '00000000-0000-7000-8000-000000000001' and is_default),
  '2026-10-17 12:30:00+00'::timestamptz,
  'EVT-003 1: moving the Event moves its Reminder'
);
select core.create_item('00000000-0000-7000-8000-000000000005', 'event',
  '{"title": "Annual leave", "all_day": true, "starts_at": "2026-10-15T00:00:00Z", "ends_at": "2026-10-17T00:00:00Z"}');
select is(
  (select count(*)::int from core.reminders where item_id = '00000000-0000-7000-8000-000000000005'),
  0,
  'EVT-003 2: an all-day Event has no Reminder until I add one'
);
select core.update_settings('{"reminder_defaults": {"event": false}}');
select core.create_item('00000000-0000-7000-8000-000000000006', 'event',
  '{"title": "Haircut", "starts_at": "2026-10-15T11:30:00Z"}');
select is(
  (select count(*)::int from core.reminders where item_id = '00000000-0000-7000-8000-000000000006'),
  0,
  'REM-007: with the Event default off, a new Event has none'
);
select core.update_settings('{"reminder_defaults": {"event": true}}');

-- ---------------------------------------------------------------------------
-- EVT-005: Task <-> Event maps the times, in my timezone, and keeps the rest.

select core.create_label('00000000-0000-7000-8000-0000000000c1', 'Family');
select core.create_item('00000000-0000-7000-8000-000000000010', 'task',
  '{"title": "Dinner with Sam", "do_on": "2026-10-16", "do_at": "19:00"}');
select core.add_label('00000000-0000-7000-8000-000000000010', '00000000-0000-7000-8000-0000000000c1');
select core.add_reminder('00000000-0000-7000-8000-0000000000e1', '00000000-0000-7000-8000-000000000010',
  '{"anchor": "do_on", "offset_days": -1, "at_time": "18:00"}');
select core.convert_item('00000000-0000-7000-8000-000000000010', 'event');
select is(
  (select array[starts_at::text, ends_at::text, all_day::text] from core.items where id = '00000000-0000-7000-8000-000000000010'),
  array['2026-10-16 18:00:00+00', '2026-10-16 19:00:00+00', 'false'],
  'EVT-005 1: a Task on Fri at 19:00 becomes an Event at 19:00 London time, an hour long'
);
select is(
  (select array[(do_on is null)::text, (do_at is null)::text] from core.items where id = '00000000-0000-7000-8000-000000000010'),
  array['true', 'true'],
  'EVT-005 1: it no longer has a do-on date'
);
select is(
  (select count(*)::int from core.item_labels where item_id = '00000000-0000-7000-8000-000000000010'),
  1,
  'EVT-005 1: it keeps its Labels'
);
select is(
  (select fires_at from core.reminders where id = '00000000-0000-7000-8000-0000000000e1'),
  '2026-10-15 17:00:00+00'::timestamptz,
  'EVT-005 1: my own Reminder keeps its moment'
);
select is(
  (select fires_at from core.reminders where item_id = '00000000-0000-7000-8000-000000000010' and is_default),
  '2026-10-16 17:30:00+00'::timestamptz,
  'EVT-005 1, EVT-003: it gains the Event''s default, 30 minutes before'
);
select core.convert_item('00000000-0000-7000-8000-000000000010', 'task');
select is(
  (select array[do_on::text, do_at::text, (starts_at is null)::text] from core.items where id = '00000000-0000-7000-8000-000000000010'),
  array['2026-10-16', '19:00:00', 'true'],
  'EVT-005 2: made a Task again, its start is its do-on date and time'
);
select core.create_item('00000000-0000-7000-8000-000000000011', 'task', '{"title": "Away day", "do_on": "2026-10-20"}');
select core.convert_item('00000000-0000-7000-8000-000000000011', 'event');
select is(
  (select array[starts_at::text, ends_at::text, all_day::text] from core.items where id = '00000000-0000-7000-8000-000000000011'),
  array['2026-10-20 00:00:00+00', '2026-10-21 00:00:00+00', 'true'],
  'EVT-005 1: with no time, it is all day'
);

-- ---------------------------------------------------------------------------
-- EVT-004: a weekly Event, made at its time in London either side of the
-- clocks changing (25 October 2026).

select core.create_item('00000000-0000-7000-8000-000000000020', 'event',
  '{"title": "5-a-side", "place": "Goals", "starts_at": "2026-10-21T18:00:00Z", "ends_at": "2026-10-21T19:00:00Z"}');
select core.set_repeat(
  '00000000-0000-7000-8000-000000000020', '00000000-0000-7000-8000-0000000002f1', 'schedule',
  'FREQ=WEEKLY;BYDAY=WE', '2026-10-21', 'Europe/London',
  '{"title": "5-a-side", "place": "Goals", "start_time": "19:00", "duration_minutes": 60,
    "reminders": [{"anchor": "starts_at", "offset_minutes": -60}]}',
  '[{"id": "00000000-0000-7000-8000-000000000020", "on": "2026-10-21"},
    {"id": "00000000-0000-7000-8000-000000000021", "on": "2026-10-28"}]',
  '2026-10-28');
select is(
  (select array_agg(starts_at::text order by starts_at) from core.items where series_id = '00000000-0000-7000-8000-0000000002f1'),
  array['2026-10-21 18:00:00+00', '2026-10-28 19:00:00+00'],
  'EVT-004 2: each occurrence is at 19:00 London time, either side of the clocks changing'
);
select is(
  (select place from core.items where id = '00000000-0000-7000-8000-000000000021'),
  'Goals',
  'EVT-004: each occurrence has the place'
);
select is(
  (select fires_at from core.reminders where item_id = '00000000-0000-7000-8000-000000000021' and not is_default),
  '2026-10-28 18:00:00+00'::timestamptz,
  'EVT-004: each occurrence has the series'' Reminders'
);
select throws_ok(
  $$select core.set_repeat(
    '00000000-0000-7000-8000-000000000006', '00000000-0000-7000-8000-0000000002f2', 'after_completion',
    'FREQ=WEEKLY', '2026-10-15', 'Europe/London', '{}',
    '[{"id": "00000000-0000-7000-8000-000000000006", "on": "2026-10-15"}]', '2026-10-15')$$,
  '22023', null,
  'EVT-004: an Event repeats on a schedule, not after it''s done'
);

-- ---------------------------------------------------------------------------
-- PLN-001: Plan's week, 12 to 18 October.

select core.create_item('00000000-0000-7000-8000-000000000030', 'task', '{"title": "Call mum", "do_on": "2026-10-14", "do_at": "18:00"}');
select core.create_item('00000000-0000-7000-8000-000000000031', 'task', '{"title": "Order present", "due_on": "2026-10-16"}');
select core.create_item('00000000-0000-7000-8000-000000000032', 'task', '{"title": "Someday", "status": "idea"}');
select core.create_item('00000000-0000-7000-8000-000000000033', 'event',
  '{"title": "Edinburgh", "all_day": true, "starts_at": "2026-10-17T00:00:00Z", "ends_at": "2026-10-20T00:00:00Z"}');
select core.create_item('00000000-0000-7000-8000-000000000034', 'event',
  '{"title": "Cancelled", "status": "cancelled", "starts_at": "2026-10-15T10:00:00Z"}');
select core.create_item('00000000-0000-7000-8000-000000000035', 'event',
  '{"title": "Late film", "starts_at": "2026-10-13T22:30:00Z", "ends_at": "2026-10-13T23:30:00Z"}');
select is(
  (select plan_from::text || '–' || plan_to::text from core.plan_items('2026-10-12', '2026-10-18') where (item).id = '00000000-0000-7000-8000-000000000031'),
  '2026-10-16–2026-10-16',
  'PLN-001 2: a Task with only a due date is on its due date'
);
select is(
  (select plan_from::text || '–' || plan_to::text from core.plan_items('2026-10-12', '2026-10-18') where (item).id = '00000000-0000-7000-8000-000000000033'),
  '2026-10-17–2026-10-19',
  'PLN-001 3: an all-day Event from Saturday to Monday is on each of its days'
);
select is(
  (select plan_from::text from core.plan_items('2026-10-12', '2026-10-18') where (item).id = '00000000-0000-7000-8000-000000000035'),
  '2026-10-13',
  'PLN-001: an Event at 23:30 London time is on its London day'
);
select ok(
  not exists (select 1 from core.plan_items('2026-10-12', '2026-10-18')
              where (item).id in ('00000000-0000-7000-8000-000000000032', '00000000-0000-7000-8000-000000000034')),
  'PLN-001 4: a Task in Someday and a cancelled Event aren''t on Plan'
);
select ok(
  exists (select 1 from core.plan_items('2026-10-19', '2026-10-25') where (item).id = '00000000-0000-7000-8000-000000000033')
  and exists (select 1 from core.plan_items('2026-10-26', '2026-11-01') where (item).id = '00000000-0000-7000-8000-000000000021' and repeats),
  'PLN-001 3, 5: the next week has the rest of the trip, and each occurrence of a repeat'
);

-- ---------------------------------------------------------------------------
-- PLN-004: the Types I've hidden, kept with my settings.

select core.update_settings('{"plan_hidden_types": ["task"]}');
select is(
  (select plan_hidden_types from core.people where id = '00000000-0000-4000-8000-00000000000a'),
  array['task'],
  'PLN-004 3: hiding Tasks is kept for me, on every device'
);
select throws_ok(
  $$select core.update_settings('{"plan_hidden_types": ["note"]}')$$,
  '22023', null,
  'PLN-004: only Types that can be planned can be hidden'
);
reset role;

-- ---------------------------------------------------------------------------
-- Google Calendar: a connection and two calendars, made as the sync makes
-- them (the service role), and one Event from each.

insert into core.connections (id, person_id, provider, account) values
  ('00000000-0000-7000-8000-0000000000d1', '00000000-0000-4000-8000-00000000000a', 'google_calendar', 'ann@example.com');
insert into core.calendar_links (id, connection_id, person_id, calendar_id, name, can_edit, level, sync_token) values
  ('00000000-0000-7000-8000-0000000000d2', '00000000-0000-7000-8000-0000000000d1', '00000000-0000-4000-8000-00000000000a', 'family', 'Family', false, 'incoming', 'secret-token'),
  ('00000000-0000-7000-8000-0000000000d3', '00000000-0000-7000-8000-0000000000d1', '00000000-0000-4000-8000-00000000000a', 'ann', 'Ann', true, 'two_way', null);
select set_config('lifeos.importing', 'on', true);
insert into core.items (id, type, title, space_id, owner_id, starts_at, ends_at) values
  ('00000000-0000-7000-8000-000000000040', 'event', 'Sarah''s party',
   (select id from core.spaces where created_by = '00000000-0000-4000-8000-00000000000a' and kind = 'personal'),
   '00000000-0000-4000-8000-00000000000a', '2026-10-24T18:00:00Z', '2026-10-24T22:00:00Z'),
  ('00000000-0000-7000-8000-000000000041', 'event', 'Dentist',
   (select id from core.spaces where created_by = '00000000-0000-4000-8000-00000000000a' and kind = 'personal'),
   '00000000-0000-4000-8000-00000000000a', '2026-10-22T08:30:00Z', '2026-10-22T09:00:00Z');
insert into core.external_refs (item_id, connection_id, calendar_link_id, external_id) values
  ('00000000-0000-7000-8000-000000000040', '00000000-0000-7000-8000-0000000000d1', '00000000-0000-7000-8000-0000000000d2', 'g-party'),
  ('00000000-0000-7000-8000-000000000041', '00000000-0000-7000-8000-0000000000d1', '00000000-0000-7000-8000-0000000000d3', 'g-dentist');
select set_config('lifeos.importing', '', true);
insert into core.spaces (id, kind, name, created_by)
values ('00000000-0000-7000-8000-0000000000aa', 'household', 'Home', '00000000-0000-4000-8000-00000000000a');
insert into core.space_members (space_id, person_id) values
  ('00000000-0000-7000-8000-0000000000aa', '00000000-0000-4000-8000-00000000000a');

select is(
  (select count(*)::int from core.reminders where item_id = '00000000-0000-7000-8000-000000000040'),
  0,
  'GCL-003 1: an Event from Google has no Reminder'
);

set local role authenticated;
select throws_ok(
  $$select core.update_item('00000000-0000-7000-8000-000000000040', '{"title": "My party"}')$$,
  '42501', null,
  'GCL-004 1: an Event from an incoming-only calendar can''t be changed here'
);
select throws_ok(
  $$select core.archive_item('00000000-0000-7000-8000-000000000040')$$,
  '42501', null,
  'GCL-004 1: nor deleted'
);
select lives_ok(
  $$select core.add_label('00000000-0000-7000-8000-000000000040', '00000000-0000-7000-8000-0000000000c1')$$,
  'GCL-004 2: it can still have my Labels'
);
select is(
  (select title from core.update_item('00000000-0000-7000-8000-000000000041', '{"title": "Dentist (check-up)"}')),
  'Dentist (check-up)',
  'GCL-005: an Event from a two-way calendar can be changed here'
);
select throws_ok(
  $$select core.update_item('00000000-0000-7000-8000-000000000041', '{"space_id": "00000000-0000-7000-8000-0000000000aa"}')$$,
  '42501', null,
  'GCL-003 5: an Event from Google can''t be shared with the Household'
);
select is(
  (select calendar_name || ' ' || calendar_level from core.plan_items('2026-10-19', '2026-10-25') where (item).id = '00000000-0000-7000-8000-000000000040'),
  'Family incoming',
  'GCL-004: Plan knows an Event is from an incoming-only calendar'
);
select throws_ok(
  $$select sync_token from core.calendar_links$$,
  '42501', null,
  'ADR-0047: the app never reads a sync token'
);
select core.set_calendar_level('00000000-0000-7000-8000-0000000000d2', 'off');
select ok(
  not exists (select 1 from core.plan_items('2026-10-19', '2026-10-25') where (item).id = '00000000-0000-7000-8000-000000000040'),
  'GCL-002 3: a calendar turned off takes its Events off Plan'
);
reset role;

select * from finish();
rollback;
