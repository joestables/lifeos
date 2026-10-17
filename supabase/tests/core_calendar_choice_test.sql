-- A new Event's calendar, chosen as it is made (GCL-002 2, GCL-005 1;
-- ADR-0048).
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(7);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'ann@example.com'),
  ('00000000-0000-4000-8000-00000000000b', 'bob@example.com');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}', true),
  set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000a', true);

set local role authenticated;
select core.calendar_begin('https://lifeos-bice-mu.vercel.app/settings') as state \gset
reset role;
select core.calendar_connected(:'state', 'ann@gmail.com', 'refresh') ->> 'connection' as conn \gset
select core.calendar_set_calendars(:'conn', '[
  {"id": "ann@gmail.com", "name": "Ann", "can_edit": true, "primary": true},
  {"id": "family", "name": "Family", "can_edit": true}
]');
select (select id from core.calendar_links where calendar_id = 'ann@gmail.com') as main \gset
select (select id from core.calendar_links where calendar_id = 'family') as family \gset

set local role authenticated;
select core.set_calendar_level(:'main', 'two_way');
select core.set_calendar_level(:'family', 'two_way');
select core.set_new_events_calendar(:'main');

-- Chosen first, then made: it goes to Family, not my default.
select core.set_event_calendar('00000000-0000-7000-8000-000000000001', :'family');
select core.create_item('00000000-0000-7000-8000-000000000001', 'event',
  '{"title": "Picnic", "starts_at": "2026-10-24T11:00:00Z", "ends_at": "2026-10-24T13:00:00Z"}');
-- None chosen: it stays in LifeOS.
select core.set_event_calendar('00000000-0000-7000-8000-000000000002', null);
select core.create_item('00000000-0000-7000-8000-000000000002', 'event',
  '{"title": "Think", "starts_at": "2026-10-24T15:00:00Z", "ends_at": "2026-10-24T16:00:00Z"}');
-- Nothing chosen (made elsewhere): my default.
select core.create_item('00000000-0000-7000-8000-000000000003', 'event',
  '{"title": "Gym", "starts_at": "2026-10-25T08:00:00Z", "ends_at": "2026-10-25T09:00:00Z"}');
reset role;

select core.calendar_outbox_claim() as jobs \gset
select is(
  (select j ->> 'calendar_id' from jsonb_array_elements(:'jobs'::jsonb) j where j -> 'item' ->> 'title' = 'Picnic'),
  'family', 'GCL-005 1: a new Event goes to the calendar chosen for it');
select is(
  (select j ->> 'calendar_id' from jsonb_array_elements(:'jobs'::jsonb) j where j -> 'item' ->> 'title' = 'Gym'),
  'ann@gmail.com', 'GCL-002 2: with none chosen, to my default calendar');
select is(
  (select count(*)::int from jsonb_array_elements(:'jobs'::jsonb) j where j -> 'item' ->> 'title' = 'Think'),
  0, 'GCL-002 2: chosen None, it isn''t sent');
select is(
  (select error from core_private.calendar_outbox where item_id = '00000000-0000-7000-8000-000000000002'),
  'nowhere to go', 'and its job is closed');

-- Only my own two-way calendars, and only my own Events.
set local role authenticated;
select core.set_calendar_level(:'family', 'incoming');
select throws_ok(
  format($$select core.set_event_calendar('00000000-0000-7000-8000-000000000009', %L)$$, :'family'),
  'P0002', null, 'GCL-002 2: only a two-way calendar can be chosen');
reset role;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-00000000000b", "role": "authenticated"}', true),
  set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000b', true);
set local role authenticated;
select throws_ok(
  $$select core.set_event_calendar('00000000-0000-7000-8000-000000000001', null)$$,
  'P0002', null, 'Someone else can''t choose for my Event');
reset role;

-- With no default, an Event made elsewhere stays in LifeOS.
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}', true),
  set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000a', true);
set local role authenticated;
select core.set_new_events_calendar(null);
select core.create_item('00000000-0000-7000-8000-000000000004', 'event',
  '{"title": "Swim", "starts_at": "2026-10-26T08:00:00Z", "ends_at": "2026-10-26T09:00:00Z"}');
reset role;
select is(
  (select count(*)::int from jsonb_array_elements(core.calendar_outbox_claim()) j where j -> 'item' ->> 'title' = 'Swim'),
  0, 'GCL-002 2: default None, a new Event stays in LifeOS');

select * from finish();
rollback;
