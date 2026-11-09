-- Two of my Reminders on one Item at the same moment send one notification
-- to each device, also when the one sent is snoozed (REM-004 2; the
-- production bug hunt of 29 October 2026).
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(5);

insert into auth.users (id, email) values ('00000000-0000-4000-8000-00000000000a', 'ann@example.com');
select id as a_space from core.spaces where created_by = '00000000-0000-4000-8000-00000000000a' \gset
update core.people set digest_on = false where id = '00000000-0000-4000-8000-00000000000a';
insert into core.push_devices (id, person_id, endpoint, p256dh, auth, label, enabled) values
  ('00000000-0000-7000-8000-0000000000d1', '00000000-0000-4000-8000-00000000000a', 'https://push.example/phone', 'k', 'a', 'Phone', true),
  ('00000000-0000-7000-8000-0000000000d2', '00000000-0000-4000-8000-00000000000a', 'https://push.example/laptop', 'k', 'a', 'Laptop', true);

-- "Put the bins out" at 20:00 on a Tuesday in winter (20:00 UTC), as on 27
-- October: its default follows its time, and Ann added "on the day at
-- 20:00" and "at 21:00" too.
insert into core.items (id, type, title, space_id, owner_id, do_on, do_at, status) values
  ('00000000-0000-7000-8000-000000000001', 'task', 'Put the bins out', :'a_space', '00000000-0000-4000-8000-00000000000a', '2030-01-08', '20:00', 'active');
insert into core.alerts (id, item_id, person_id, anchor, at_time) values
  ('00000000-0000-7000-8000-0000000000e2', '00000000-0000-7000-8000-000000000001', '00000000-0000-4000-8000-00000000000a', 'do_on', '20:00'),
  ('00000000-0000-7000-8000-0000000000e3', '00000000-0000-7000-8000-000000000001', '00000000-0000-4000-8000-00000000000a', 'do_on', '21:00');

select is(
  (select count(*)::int from core.alerts
   where item_id = '00000000-0000-7000-8000-000000000001' and fires_at = '2030-01-08 20:00:00+00'),
  2,
  'Two of its Reminders fire at 20:00'
);

select core_private.queue_notifications('2030-01-08 20:00:20+00');
select is(
  (select array_agg(device_id::text order by device_id) from core.alert_deliveries where fire_at = '2030-01-08 20:00:00+00'),
  array['00000000-0000-7000-8000-0000000000d1', '00000000-0000-7000-8000-0000000000d2'],
  'REM-004 2: at 20:00 each device gets one notification'
);

-- Snoozed from the phone: the one sent moves an hour on; the other stays
-- left out.
update core.alerts set snoozed_until = '2030-01-08 21:01:00+00'
where id = (select alert_id from core.alert_deliveries
            where fire_at = '2030-01-08 20:00:00+00' limit 1);
select core_private.queue_notifications('2030-01-08 20:01:20+00');
select is(
  (select count(*)::int from core.alert_deliveries where fire_at = '2030-01-08 20:00:00+00'),
  2,
  'REM-004 2: snoozing the one sent doesn''t send the other'
);

select core_private.queue_notifications('2030-01-08 21:00:20+00');
select is(
  (select count(*)::int from core.alert_deliveries where fire_at = '2030-01-08 21:00:00+00'),
  2,
  'REM-003: the 21:00 Reminder is still sent, once to each device'
);
select core_private.queue_notifications('2030-01-08 21:01:20+00');
select is(
  (select count(*)::int from core.alert_deliveries where fire_at = '2030-01-08 21:01:00+00'),
  2,
  'REM-005 2: the snoozed one comes back'
);

select * from finish(true);
rollback;
