-- A Google birthday is Google's on any calendar (GCL-004 3), and the
-- morning digest counts everything on Today (REM-008 1).
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(9);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'ann@example.com');
select id as a_space from core.spaces where created_by = '00000000-0000-4000-8000-00000000000a' \gset

select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}', true),
  set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000a', true);

-- ---------------------------------------------------------------------------
-- GCL-004 3: a birthday from a two-way calendar.

set local role authenticated;
select core.calendar_begin('https://lifeos-bice-mu.vercel.app/settings') as state \gset
reset role;
select core.calendar_connected(:'state', 'ann@gmail.com', 'refresh-1');
select (select id from core.connections) as conn \gset
select core.calendar_set_calendars(:'conn', '[
  {"id": "ann@gmail.com", "name": "Ann", "can_edit": true, "primary": true}
]');
select (select id from core.calendar_links) as main \gset
update core.calendar_links set level = 'two_way' where id = :'main';
select core.calendar_save_events(:'main', '[
  {"external_id": "b_20261125", "etag": "1", "title": "Rowan''s birthday", "starts_at": "2026-11-25T00:00:00Z",
   "ends_at": "2026-11-26T00:00:00Z", "all_day": true,
   "raw": {"id": "b_20261125", "eventType": "birthday", "recurringEventId": "b"}},
  {"external_id": "e1", "etag": "1", "title": "Dentist", "starts_at": "2026-11-25T08:30:00Z",
   "ends_at": "2026-11-25T09:00:00Z", "all_day": false, "raw": {"id": "e1", "eventType": "default"}}
]');
select (select item_id from core.external_refs where external_id = 'b_20261125') as birthday \gset
select (select item_id from core.external_refs where external_id = 'e1') as dentist \gset
delete from core_private.calendar_outbox;

set local role authenticated;
select throws_ok(
  format($$select core.update_item(%L, '{"all_day": false, "starts_at": "2026-11-25T09:00:00Z", "ends_at": "2026-11-25T10:00:00Z"}')$$, :'birthday'),
  '42501', null,
  'GCL-004 3: a Google birthday can''t be changed here, on a two-way calendar either'
);
select throws_ok(
  format($$select core.archive_item(%L)$$, :'birthday'),
  '42501', null,
  'GCL-004 3: nor deleted'
);
select lives_ok(
  format($$select core.add_alert('00000000-0000-7000-8000-0000000000a1', %L, '{"anchor": "starts_at", "offset_days": -1, "at_time": "09:00"}')$$, :'birthday'),
  'GCL-004 2: it can still have an Alert'
);
select lives_ok(
  format($$select core.update_item(%L, '{"title": "Dentist (check-up)"}')$$, :'dentist'),
  'GCL-005: any other Event from a two-way calendar can be changed'
);
reset role;
select is(
  (select array_agg(item_id order by item_id) from core_private.calendar_outbox),
  array[:'dentist'::uuid],
  'GCL-004 3: nothing of a birthday waits to go to Google'
);
select lives_ok(
  format($$select core.calendar_save_events(%L, '[
    {"external_id": "b_20261125", "etag": "2", "title": "Rowan''s 30th", "starts_at": "2026-11-25T00:00:00Z",
     "ends_at": "2026-11-26T00:00:00Z", "all_day": true,
     "raw": {"id": "b_20261125", "eventType": "birthday", "recurringEventId": "b"}}]')$$, :'main'),
  'GCL-003 2: a change to it in Google still comes in'
);

-- ---------------------------------------------------------------------------
-- REM-008 1: the digest is Today in one notification.

delete from core.items;
select is(
  (select array[c.overdue, c.today] from core_private.day_counts('00000000-0000-4000-8000-00000000000a', '2026-11-25') c),
  array[0, 0],
  'REM-008 2: nothing on Today, nothing to say'
);
insert into core.items (id, type, title, space_id, owner_id, do_on, due_on, starts_at, ends_at, all_day, slot, status) values
  ('00000000-0000-7000-8000-000000000021', 'task', 'Bins', :'a_space', '00000000-0000-4000-8000-00000000000a', '2026-11-25', null, null, null, null, null, 'active'),
  ('00000000-0000-7000-8000-000000000022', 'task', 'Tax return', :'a_space', '00000000-0000-4000-8000-00000000000a', null, '2026-11-20', null, null, null, null, 'active'),
  ('00000000-0000-7000-8000-000000000023', 'task', 'Post the card', :'a_space', '00000000-0000-4000-8000-00000000000a', '2026-11-25', null, null, null, null, null, 'done'),
  ('00000000-0000-7000-8000-000000000024', 'event', 'Squash', :'a_space', '00000000-0000-4000-8000-00000000000a', null, null, '2026-11-25T19:00:00Z', '2026-11-25T20:00:00Z', false, null, 'active'),
  ('00000000-0000-7000-8000-000000000025', 'reminder', 'Take the bins in', :'a_space', '00000000-0000-4000-8000-00000000000a', '2026-11-25', null, null, null, null, null, 'active'),
  ('00000000-0000-7000-8000-000000000026', 'thought', 'Paint the shed', :'a_space', '00000000-0000-4000-8000-00000000000a', null, null, null, null, null, null, 'active'),
  ('00000000-0000-7000-8000-000000000027', 'event', 'Tomorrow''s lunch', :'a_space', '00000000-0000-4000-8000-00000000000a', null, null, '2026-11-26T12:00:00Z', '2026-11-26T13:00:00Z', false, null, 'active');
insert into core.alerts (item_id, person_id, anchor, offset_days, at_time) values
  ('00000000-0000-7000-8000-000000000025', '00000000-0000-4000-8000-00000000000a', 'do_on', 0, '18:00');
select is(
  (select array[c.overdue, c.today, c.to_sort] from core_private.day_counts('00000000-0000-4000-8000-00000000000a', '2026-11-25') c),
  array[1, 3, 0],
  'REM-008 1: an overdue Task; today a Task, an Event and a Reminder, not what is done, tomorrow''s or a Thought'
);
delete from core.items where type = 'task';
select is(
  (select array[c.overdue, c.today] from core_private.day_counts('00000000-0000-4000-8000-00000000000a', '2026-11-25') c),
  array[0, 2],
  'REM-008 1: a day with no Task still has a digest'
);

select * from finish();
rollback;
