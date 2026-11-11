-- A Reminder's notification (RMD-005, Stage 7b step 10): it says its
-- Alert's time and offers Done and Snooze; Done clears it and changes
-- nothing; Snooze moves that Alert an hour on, mine only.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(6);

insert into auth.users (id, email) values ('00000000-0000-4000-8000-00000000000a', 'ann@example.com');
update core.people set timezone = 'Europe/London';

select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}', true),
  set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000a', true);
set local role authenticated;
select core.create_item('00000000-0000-7000-8000-000000000001', 'reminder', '{"title": "Parcel", "do_on": "2030-01-08"}');
select core.add_alert('00000000-0000-7000-8000-0000000000e1', '00000000-0000-7000-8000-000000000001',
  '{"anchor": "do_on", "offset_days": 0, "at_time": "09:00"}');
select core.create_item('00000000-0000-7000-8000-000000000002', 'event',
  '{"title": "Dentist", "starts_at": "2030-01-08T14:00:00Z", "ends_at": "2030-01-08T15:00:00Z"}');
reset role;

-- The delivery the notification is sent from.
create temp table d as
select jsonb_populate_record(null::core.alert_deliveries, jsonb_build_object(
  'kind', 'reminder', 'key', 'reminder:00000000-0000-7000-8000-0000000000e1',
  'person_id', '00000000-0000-4000-8000-00000000000a',
  'item_id', '00000000-0000-7000-8000-000000000001',
  'alert_id', '00000000-0000-7000-8000-0000000000e1',
  'fire_at', '2030-01-08 09:00:00+00')) as x;

select is(
  (select core_private.notification_payload(x) ->> 'body' from d),
  'Tue 8 Jan 09:00',
  'RMD-005 1: a Reminder''s notification says its Alert''s time'
);
select is(
  (select array_agg(b ->> 'title') from d, jsonb_array_elements(core_private.notification_payload(x) -> 'actions') b),
  array['Done', 'Snooze 1 hour'],
  'RMD-005 1: with Done and Snooze'
);
select is(
  (select core_private.act_on(x, 'done', null, null) from d),
  true,
  'RMD-005 2: Done clears it'
);
select is(
  (select array[status, do_on::text] from core.items where id = '00000000-0000-7000-8000-000000000001'),
  array['active', '2030-01-08'],
  'RMD-005 2: and changes nothing: the Reminder stays on its day'
);
select core_private.act_on(x, 'snooze', null, null) from d;
select isnt(
  (select snoozed_until from core.alerts where id = '00000000-0000-7000-8000-0000000000e1'),
  null,
  'RMD-005 3: Snooze moves that Alert an hour on'
);
-- An Event can't be done: its notification offers Snooze alone (REM-005).
select is(
  (select array_agg(b ->> 'title') from jsonb_array_elements(core_private.notification_payload(
    jsonb_populate_record(null::core.alert_deliveries, jsonb_build_object(
      'kind', 'reminder', 'key', 'k', 'person_id', '00000000-0000-4000-8000-00000000000a',
      'item_id', '00000000-0000-7000-8000-000000000002', 'fire_at', '2030-01-08 13:30:00+00'))) -> 'actions') b),
  array['Snooze 1 hour'],
  'REM-005: an Event''s notification has no Done'
);
select * from finish();
rollback;
