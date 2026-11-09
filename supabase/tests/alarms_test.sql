-- Alarms (Stage 7 step 8b, REM-011, ADR-0063): a Reminder marked Alarm, off
-- by default, on any device; the phone reads it with the Item's Type; Web
-- Push's notification is unchanged.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(9);

insert into auth.users (id, email) values ('00000000-0000-4000-8000-00000000000a', 'ann@example.com');
select id as a_space from core.spaces where created_by = '00000000-0000-4000-8000-00000000000a' \gset
insert into core.push_devices (id, person_id, kind, endpoint, label, created_at) values
  ('00000000-0000-7000-8000-0000000000f1', '00000000-0000-4000-8000-00000000000a', 'fcm',
   'fcm-token-ann-phone-0123456789', 'Android app', '2030-01-01 00:00:00+00');

insert into core.items (id, type, title, space_id, owner_id, status) values
  ('00000000-0000-7000-8000-000000000001', 'task', 'Leave for the airport', :'a_space', '00000000-0000-4000-8000-00000000000a', 'active');

select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}', true),
  set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000a', true);
set local role authenticated;
select core.device_secret('00000000-0000-7000-8000-0000000000f1') as secret \gset


select core.add_alert('00000000-0000-7000-8000-0000000000e1', '00000000-0000-7000-8000-000000000001',
  jsonb_build_object('fixed_at', now() + interval '1 day'));
select is(
  (select alarm from core.alerts where id = '00000000-0000-7000-8000-0000000000e1'),
  false,
  'REM-011 1: a Reminder is not an Alarm to start'
);
select core.add_alert('00000000-0000-7000-8000-0000000000e2', '00000000-0000-7000-8000-000000000001',
  jsonb_build_object('fixed_at', now() + interval '2 days', 'alarm', true));
select is(
  (select alarm from core.alerts where id = '00000000-0000-7000-8000-0000000000e2'),
  true,
  'REM-011 1: one can be made an Alarm'
);
select core.update_alert('00000000-0000-7000-8000-0000000000e1', '{"alarm": true}');
select is(
  (select alarm from core.alerts where id = '00000000-0000-7000-8000-0000000000e1'),
  true,
  'and a Reminder made one'
);
select core.update_alert('00000000-0000-7000-8000-0000000000e2', '{"at_time": null}');
select is(
  (select alarm from core.alerts where id = '00000000-0000-7000-8000-0000000000e2'),
  true,
  'A change that doesn''t say leaves it an Alarm'
);
select throws_ok(
  $$select core.update_alert('00000000-0000-7000-8000-0000000000e2', '{"loud": true}')$$,
  '22023', null,
  'An unknown field is still refused'
);
reset role;

select is(
  (select array_agg((payload ->> 'alarm') || ' ' || (payload ->> 'type') order by fires_at)
   from core.device_alerts('00000000-0000-7000-8000-0000000000f1', :'secret')),
  array['true task', 'true task'],
  'REM-011 2: the phone reads each firing as an Alarm, with the Item''s Type'
);

-- Two of an Item's Reminders at one minute are one firing: an Alarm if either is.
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}', true);
set local role authenticated;
select core.update_alert('00000000-0000-7000-8000-0000000000e1',
  jsonb_build_object('fixed_at', (select fixed_at from core.alerts where id = '00000000-0000-7000-8000-0000000000e2'), 'alarm', false));
reset role;
select is(
  (select array_agg(payload ->> 'alarm')
   from core.device_alerts('00000000-0000-7000-8000-0000000000f1', :'secret')),
  array['true'],
  'One firing for one minute, an Alarm if either Reminder is'
);

-- Web Push's notification says nothing of it (REM-011 3).
select ok(
  not (core_private.notification_payload(jsonb_populate_record(null::core.alert_deliveries, jsonb_build_object(
    'kind', 'reminder', 'key', 'reminder:x', 'person_id', '00000000-0000-4000-8000-00000000000a',
    'item_id', '00000000-0000-7000-8000-000000000001',
    'alert_id', '00000000-0000-7000-8000-0000000000e2', 'fire_at', now()))) ? 'alarm'),
  'REM-011 3: elsewhere it is an ordinary notification'
);
select is(
  (select count(*)::int from core.alerts where alarm and person_id = '00000000-0000-4000-8000-00000000000a'),
  1,
  'and is kept with the Reminder'
);
select * from finish();
rollback;
