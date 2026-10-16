-- Two-way Google Calendar: what goes out, and how it comes back (Stage 3,
-- plan step 10). GCL-002, GCL-005; ADR-0048.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(16);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'ann@example.com');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}', true),
  set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000a', true);

-- Ann is connected, her own calendar can be edited.
set local role authenticated;
select core.calendar_begin('https://lifeos-bice-mu.vercel.app/settings') as state \gset
reset role;
select core.calendar_connected(:'state', 'ann@gmail.com', 'refresh') ->> 'connection' as conn \gset
select core.calendar_set_calendars(:'conn', '[
  {"id": "ann@gmail.com", "name": "Ann", "can_edit": true, "primary": true},
  {"id": "holidays", "name": "UK holidays", "can_edit": false}
]');
select (select id from core.calendar_links where calendar_id = 'ann@gmail.com') as main \gset
select (select id from core.calendar_links where calendar_id = 'holidays') as holidays \gset

-- ---------------------------------------------------------------------------
-- GCL-005 5, 1: nothing is queued until a calendar is two-way; then a new
-- Event goes to the calendar where new Events go.

set local role authenticated;
select core.create_item('00000000-0000-7000-8000-000000000001', 'event',
  '{"title": "Squash", "starts_at": "2026-10-20T18:00:00Z", "ends_at": "2026-10-20T19:00:00Z"}');
reset role;
select is((select count(*)::int from core_private.calendar_outbox), 0, 'GCL-005: nothing waits while no calendar is two-way');

set local role authenticated;
select throws_ok(
  format($$select core.set_calendar_level(%L, 'two_way')$$, :'holidays'),
  '23514', null,
  'GCL-002 1: two-way only on a calendar I can edit'
);
select core.set_calendar_level(:'main', 'two_way');
select core.set_new_events_calendar(:'main');
select core.create_item('00000000-0000-7000-8000-000000000002', 'event',
  '{"title": "Dinner", "place": "Dishoom", "starts_at": "2026-10-21T18:30:00Z", "ends_at": "2026-10-21T20:30:00Z"}');
select core.create_item('00000000-0000-7000-8000-000000000003', 'task', '{"title": "Bins"}');
select core.create_label('00000000-0000-7000-8000-0000000000c1', 'Family');
select core.add_label('00000000-0000-7000-8000-000000000002', '00000000-0000-7000-8000-0000000000c1');
reset role;
select is(
  (select array_agg(item_id::text) from core_private.calendar_outbox where sent_at is null),
  array['00000000-0000-7000-8000-000000000002'],
  'GCL-005 1, 4, 5: a new Event waits to go out; a Task and a Label don''t'
);

set local role authenticated;
select core.update_item('00000000-0000-7000-8000-000000000002', '{"title": "Dinner with Sam"}');
reset role;
select is((select count(*)::int from core_private.calendar_outbox where sent_at is null), 1, 'A second change waits in the same row');

-- ---------------------------------------------------------------------------
-- calendar-push claims it, to the calendar where new Events go.

select core.calendar_outbox_claim() as jobs \gset
select is(jsonb_array_length(:'jobs'::jsonb), 1, 'ADR-0048: one job');
select is(:'jobs'::jsonb -> 0 ->> 'calendar_id', 'ann@gmail.com', 'GCL-005 1: to the calendar where new Events go');
select is(:'jobs'::jsonb -> 0 -> 'item' ->> 'title', 'Dinner with Sam', 'GCL-005 1: with the Event as it is now');
select is(jsonb_array_length(core.calendar_outbox_claim()), 0, 'ADR-0048: a claimed job isn''t claimed again at once');

select core.calendar_pushed((:'jobs'::jsonb -> 0 ->> 'outbox')::bigint,
  jsonb_build_array(jsonb_build_object('item_id', '00000000-0000-7000-8000-000000000002',
    'link', :'main', 'external_id', 'g-dinner', 'etag', '"1"', 'updated', '2026-10-16T10:00:00Z')));
select is(
  (select external_id from core.external_refs where item_id = '00000000-0000-7000-8000-000000000002'),
  'g-dinner',
  'GCL-005 1: sent, the Event knows its Google event'
);

-- Coming back, it is the same Event, not a copy (no echo).
select core.calendar_save_events(:'main', '[{"external_id": "g-dinner", "etag": "\"1\"", "updated": "2026-10-16T10:00:00Z",
  "title": "Dinner with Sam", "place": "Dishoom", "starts_at": "2026-10-21T18:30:00Z", "ends_at": "2026-10-21T20:30:00Z",
  "all_day": false, "raw": {"id": "g-dinner"}}]');
select is((select count(*)::int from core.items where type = 'event'), 2, 'ADR-0048: what I sent comes back as itself');
select is((select count(*)::int from core_private.calendar_outbox where sent_at is null), 0, 'ADR-0048: and isn''t sent again');

-- ---------------------------------------------------------------------------
-- GCL-005 2: changed and deleted in LifeOS goes out; a change waiting to go
-- out isn't undone by Google's older one.

set local role authenticated;
select core.update_item('00000000-0000-7000-8000-000000000002', '{"place": "Dishoom, Shoreditch"}');
reset role;
select core.calendar_save_events(:'main', '[{"external_id": "g-dinner", "etag": "\"1\"", "updated": "2026-10-16T10:00:00Z",
  "title": "Dinner with Sam", "place": "Dishoom", "starts_at": "2026-10-21T18:30:00Z", "ends_at": "2026-10-21T20:30:00Z",
  "all_day": false, "raw": {"id": "g-dinner"}}]');
select is(
  (select place from core.items where id = '00000000-0000-7000-8000-000000000002'),
  'Dishoom, Shoreditch',
  'ADR-0048: the later change wins: mine, still waiting, over Google''s older one'
);
set local role authenticated;
select core.archive_item('00000000-0000-7000-8000-000000000002');
reset role;
select ok(
  (select (core.calendar_outbox_claim() -> 0 -> 'item' ->> 'archived')::boolean),
  'GCL-005 2: deleted in LifeOS, it goes out to be deleted in Google'
);

-- An Event made in LifeOS that Google sends back before its reference was
-- kept is matched by its id.
set local role authenticated;
select core.create_item('00000000-0000-7000-8000-000000000004', 'event',
  '{"title": "Haircut", "starts_at": "2026-10-22T11:00:00Z", "ends_at": "2026-10-22T11:30:00Z"}');
reset role;
select core.calendar_save_events(:'main', '[{"external_id": "g-haircut", "updated": "2099-01-01T00:00:00Z", "title": "Haircut",
  "starts_at": "2026-10-22T11:00:00Z", "ends_at": "2026-10-22T11:30:00Z", "all_day": false,
  "raw": {"id": "g-haircut", "extendedProperties": {"private": {"lifeosId": "00000000-0000-7000-8000-000000000004"}}}}]');
select is(
  (select item_id::text from core.external_refs where external_id = 'g-haircut'),
  '00000000-0000-7000-8000-000000000004',
  'ADR-0048: Google''s copy of an Event I made is matched by my id'
);

-- ---------------------------------------------------------------------------
-- GCL-005 3: a repeating Event goes as its series.

set local role authenticated;
select core.create_item('00000000-0000-7000-8000-000000000005', 'event',
  '{"title": "5-a-side", "starts_at": "2026-10-21T18:00:00Z", "ends_at": "2026-10-21T19:00:00Z"}');
select core.set_repeat('00000000-0000-7000-8000-000000000005', '00000000-0000-7000-8000-0000000000f1',
  'schedule', 'FREQ=WEEKLY;BYDAY=WE', '2026-10-21', 'Europe/London',
  '{"title": "5-a-side", "start_time": "19:00", "duration_minutes": 60}',
  '[{"id": "00000000-0000-7000-8000-000000000005", "on": "2026-10-21"},
    {"id": "00000000-0000-7000-8000-000000000006", "on": "2026-10-28"}]', '2026-10-28');
reset role;
select is(
  (select count(*)::int from core_private.calendar_outbox where sent_at is null and series_id = '00000000-0000-7000-8000-0000000000f1'),
  1,
  'GCL-005 3: a repeating Event waits to go out once, as its series'
);
select is(
  (select jsonb_array_length(j -> 'series' -> 'occurrences') from jsonb_array_elements(core.calendar_outbox_claim()) j
   where j -> 'series' is not null and j -> 'series' <> 'null'),
  2,
  'GCL-005 3: with its rule and each occurrence'
);

select * from finish();
rollback;
