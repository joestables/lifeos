-- A shared Event in every member's Google calendar (GCL-007; Joe, 4
-- November): a copy for each member, in their default calendar; an edit to
-- a copy changes the Event for everyone; a copy deleted in Google leaves
-- only that calendar; leaving takes the copies away. ADR-0048.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(12);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'ann@example.com'),
  ('00000000-0000-4000-8000-00000000000b', 'ben@example.com');
select id as ann_space from core.spaces
  where created_by = '00000000-0000-4000-8000-00000000000a' and kind = 'personal' \gset

create function pg_temp.sign_in(p_person uuid, p_email text) returns void language sql as $$
  select set_config('request.jwt.claims',
      json_build_object('sub', p_person, 'role', 'authenticated', 'email', p_email)::text, true),
    set_config('request.jwt.claim.sub', p_person::text, true)
$$;
grant execute on function pg_temp.sign_in(uuid, text) to authenticated;

-- Each connects Google, with a two-way default calendar.
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000a', 'ann@example.com');
set local role authenticated;
select core.calendar_begin('https://lifeos-bice-mu.vercel.app/settings') as state \gset
reset role;
select core.calendar_connected(:'state', 'ann@gmail.com', 'refresh') ->> 'connection' as ann_conn \gset
select core.calendar_set_calendars(:'ann_conn', '[{"id": "ann@gmail.com", "name": "Ann", "can_edit": true, "primary": true}]');
select id as ann_cal from core.calendar_links where calendar_id = 'ann@gmail.com' \gset
set local role authenticated;
select core.set_calendar_level(:'ann_cal', 'two_way');
select core.set_new_events_calendar(:'ann_cal');

select pg_temp.sign_in('00000000-0000-4000-8000-00000000000b', 'ben@example.com');
select core.calendar_begin('https://lifeos-bice-mu.vercel.app/settings') as state \gset
reset role;
select core.calendar_connected(:'state', 'ben@gmail.com', 'refresh') ->> 'connection' as ben_conn \gset
select core.calendar_set_calendars(:'ben_conn', '[{"id": "ben@gmail.com", "name": "Ben", "can_edit": true, "primary": true}]');
select id as ben_cal from core.calendar_links where calendar_id = 'ben@gmail.com' \gset
set local role authenticated;
select core.set_calendar_level(:'ben_cal', 'two_way');
select core.set_new_events_calendar(:'ben_cal');

-- Ann's Household, which Ben joins.
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000a', 'ann@example.com');
select core.create_household('00000000-0000-7000-8000-0000000000f1', 'Home');
select core.invite('00000000-0000-7000-8000-0000000000a1', '00000000-0000-7000-8000-0000000000f1', 'ben@example.com');
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000b', 'ben@example.com');
select core.join_household('00000000-0000-7000-8000-0000000000a1');

-- ---------------------------------------------------------------------------
-- Ann shares "Dinner at Mum's": a job for her calendar and a copy for Ben's.
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000a', 'ann@example.com');
insert into core.items (id, type, title, space_id, owner_id, starts_at, ends_at, all_day) values
  ('00000000-0000-7000-8000-000000000001', 'event', 'Dinner at Mum''s', '00000000-0000-7000-8000-0000000000f1',
   '00000000-0000-4000-8000-00000000000a', now() + interval '2 days', now() + interval '2 days 3 hours', false);
reset role;
select is(
  (select array_agg(person_id::text || ':' || copy order by person_id) from core_private.calendar_outbox
   where item_id = '00000000-0000-7000-8000-000000000001' and sent_at is null),
  array['00000000-0000-4000-8000-00000000000a:false', '00000000-0000-4000-8000-00000000000b:true'],
  'GCL-007 1: a shared Event waits to go to the maker''s calendar and to each member''s'
);

select core.calendar_outbox_claim() as jobs \gset
select is(
  (select array_agg(j ->> 'calendar_id' order by j ->> 'calendar_id') from jsonb_array_elements(:'jobs'::jsonb) j),
  array['ann@gmail.com', 'ben@gmail.com'],
  'GCL-007 1: each to its own default calendar'
);

-- Both are sent; Google gives each its own event.
select core.calendar_sent(
  (select (j ->> 'outbox')::bigint from jsonb_array_elements(:'jobs'::jsonb) j where j ->> 'calendar_id' = 'ann@gmail.com'),
  jsonb_build_array(jsonb_build_object('item_id', '00000000-0000-7000-8000-000000000001', 'link', :'ann_cal',
    'external_id', 'g-ann-1', 'etag', '"1"', 'updated', now())), null, null);
select core.calendar_sent(
  (select (j ->> 'outbox')::bigint from jsonb_array_elements(:'jobs'::jsonb) j where j ->> 'calendar_id' = 'ben@gmail.com'),
  jsonb_build_array(jsonb_build_object('item_id', '00000000-0000-7000-8000-000000000001', 'link', :'ben_cal',
    'external_id', 'g-ben-1', 'etag', '"1"', 'updated', now())), null, null);
select is(
  (select array_agg(external_id) from core_private.event_copies where item_id = '00000000-0000-7000-8000-000000000001'),
  array['g-ben-1'],
  'GCL-007 1: Ben''s copy is kept apart from Ann''s own'
);
select is(
  (select external_id from core.external_refs where item_id = '00000000-0000-7000-8000-000000000001'),
  'g-ann-1',
  'Ann''s own is kept as before'
);

-- ---------------------------------------------------------------------------
-- Ben moves his copy in Google: the Event moves for everyone, and Ann's
-- calendar follows; his sync doesn't make an Event of its own.
select core.calendar_save_events(:'ben_cal', jsonb_build_array(jsonb_build_object(
  'external_id', 'g-ben-1', 'etag', '"2"', 'updated', now() + interval '1 minute',
  'title', 'Dinner at Mum''s', 'starts_at', now() + interval '3 days', 'ends_at', now() + interval '3 days 3 hours',
  'all_day', false, 'raw', '{}'::jsonb)));
select ok(
  (select starts_at > now() + interval '2 days 12 hours' from core.items where id = '00000000-0000-7000-8000-000000000001'),
  'GCL-007 2: an edit to a member''s copy changes the shared Event'
);
select is(
  (select array_agg(person_id::text) from core_private.calendar_outbox
   where item_id = '00000000-0000-7000-8000-000000000001' and sent_at is null),
  array['00000000-0000-4000-8000-00000000000a'],
  'GCL-007 2: and goes to the maker''s calendar, not back to his'
);
select is(
  (select count(*)::int from core.items where owner_id = '00000000-0000-4000-8000-00000000000b'),
  0,
  'A member''s copy never becomes an Event of his own'
);

-- Ben deletes his copy in Google: it leaves only his calendar.
select core.calendar_save_events(:'ben_cal', jsonb_build_array(jsonb_build_object(
  'external_id', 'g-ben-1', 'cancelled', true, 'updated', now() + interval '2 minutes')));
select is(
  (select (archived_at is null)::text || ':' || (select dropped::text from core_private.event_copies
     where item_id = '00000000-0000-7000-8000-000000000001')
   from core.items where id = '00000000-0000-7000-8000-000000000001'),
  'true:true',
  'GCL-007 3: a copy deleted in Google is dropped; the Event stays'
);
update core_private.calendar_outbox set sent_at = now() where sent_at is null;
update core.items set title = 'Dinner at Mum''s, 7pm' where id = '00000000-0000-7000-8000-000000000001';
select core.calendar_outbox_claim() as jobs \gset
select is(
  (select array_agg(j ->> 'calendar_id') from jsonb_array_elements(:'jobs'::jsonb) j),
  array['ann@gmail.com'],
  'GCL-007 3: and isn''t sent to him again'
);

-- ---------------------------------------------------------------------------
-- A second shared Event, read from Ben's calendar before its send was
-- recorded: known as his copy by the id it carries.
insert into core.items (id, type, title, space_id, owner_id, starts_at, ends_at, all_day) values
  ('00000000-0000-7000-8000-000000000002', 'event', 'Cinema', '00000000-0000-7000-8000-0000000000f1',
   '00000000-0000-4000-8000-00000000000a', now() + interval '4 days', now() + interval '4 days 2 hours', false);
select core.calendar_save_events(:'ben_cal', jsonb_build_array(jsonb_build_object(
  'external_id', 'g-ben-2', 'etag', '"1"', 'updated', now(),
  'title', 'Cinema', 'starts_at', now() + interval '4 days', 'ends_at', now() + interval '4 days 2 hours',
  'all_day', false,
  'raw', jsonb_build_object('extendedProperties', jsonb_build_object('private',
    jsonb_build_object('lifeosId', '00000000-0000-7000-8000-000000000002'))))));
select is(
  (select external_id from core_private.event_copies
   where item_id = '00000000-0000-7000-8000-000000000002' and person_id = '00000000-0000-4000-8000-00000000000b'),
  'g-ben-2',
  'GCL-007 1: a copy read back early is known, not made an Event of his own'
);

-- ---------------------------------------------------------------------------
-- Ben leaves: his copy is taken out of his calendar.
update core_private.calendar_outbox set sent_at = now() where sent_at is null;
set local role authenticated;
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000b', 'ben@example.com');
select core.leave_household('00000000-0000-7000-8000-0000000000f1');
reset role;
select core.calendar_outbox_claim() as jobs \gset
select is(
  (select jsonb_agg(jsonb_build_object('cal', j ->> 'calendar_id', 'gone', j -> 'item' -> 'archived', 'ext', j -> 'item' ->> 'external_id'))
   from jsonb_array_elements(:'jobs'::jsonb) j),
  '[{"cal": "ben@gmail.com", "ext": "g-ben-2", "gone": true}]'::jsonb,
  'HSH-005 6: leaving takes my copies out of my calendar'
);

-- An Event from an incoming-only calendar can't be shared: it is Google's.
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000a', 'ann@example.com');
insert into core.items (id, type, title, space_id, owner_id, starts_at, ends_at, all_day) values
  ('00000000-0000-7000-8000-000000000003', 'event', 'Bank holiday', :'ann_space',
   '00000000-0000-4000-8000-00000000000a', now(), now() + interval '1 hour', false);
insert into core.external_refs (item_id, connection_id, calendar_link_id, external_id)
  values ('00000000-0000-7000-8000-000000000003', :'ann_conn', null, 'g-holiday');
select throws_ok(
  $$update core.items set space_id = '00000000-0000-7000-8000-0000000000f1' where id = '00000000-0000-7000-8000-000000000003'$$,
  '42501', null,
  'GCL-004: an Event from an incoming-only calendar stays as Google has it'
);

select * from finish();
rollback;
