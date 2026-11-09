-- A default Reminder changed or removed in New task or New event, before
-- Save, goes once the Item is made (REM-002 1, EVT-003 1).
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(5);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'ann@example.com'),
  ('00000000-0000-4000-8000-00000000000b', 'ben@example.com');

select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}', true),
  set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000a', true);
set local role authenticated;

-- New task, its default changed to 19:00: the Item, its default gone, my own.
select core.create_item('00000000-0000-7000-8000-000000000001', 'task', '{"title": "Put the bins out", "do_on": "2030-01-08", "do_at": "20:00"}');
select core.remove_default_alert('00000000-0000-7000-8000-000000000001');
select core.add_alert('00000000-0000-7000-8000-0000000000e1', '00000000-0000-7000-8000-000000000001',
  '{"anchor": "do_on", "offset_days": 0, "at_time": "19:00"}');
select is(
  (select array_agg(row(is_default, at_time)::text) from core.alerts where item_id = '00000000-0000-7000-8000-000000000001'),
  array[row(false, '19:00:00'::time)::text],
  'REM-002 1: the default changed before Save leaves only the one I chose'
);

-- New event, its default removed.
select core.create_item('00000000-0000-7000-8000-000000000002', 'event',
  '{"title": "Dentist", "starts_at": "2030-01-09T10:00:00Z", "ends_at": "2030-01-09T11:00:00Z", "all_day": false}');
select is(
  (select count(*)::int from core.alerts where item_id = '00000000-0000-7000-8000-000000000002' and is_default),
  1,
  'EVT-003 1: a timed Event has its default'
);
select core.remove_default_alert('00000000-0000-7000-8000-000000000002');
select is(
  (select count(*)::int from core.alerts where item_id = '00000000-0000-7000-8000-000000000002'),
  0,
  'EVT-003 1: removed before Save, it has none'
);
select lives_ok(
  $$select core.remove_default_alert('00000000-0000-7000-8000-000000000002')$$,
  'Sent again (a reload while it was on its way), it changes nothing'
);
reset role;

-- Ben can't remove Ann's.
select core.create_item('00000000-0000-7000-8000-000000000003', 'task', '{"title": "Call mum", "do_on": "2030-01-10"}')
from (select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000a', true),
             set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}', true)) s;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-00000000000b", "role": "authenticated"}', true),
  set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000b', true);
set local role authenticated;
select core.remove_default_alert('00000000-0000-7000-8000-000000000003');
reset role;
select is(
  (select count(*)::int from core.alerts where item_id = '00000000-0000-7000-8000-000000000003' and is_default),
  1,
  'Someone else can''t remove my default'
);

select * from finish(true);
rollback;
