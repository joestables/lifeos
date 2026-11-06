-- The Android app sets its own Reminders (Stage 7 step 8a, ADR-0063,
-- REM-010): its secret, what it reads, being told to look again, Done and
-- Snooze from it, and never a second notification from the server. And a
-- device only gets what comes due after it was turned on.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(16);

insert into auth.users (id, email) values ('00000000-0000-4000-8000-00000000000a', 'ann@example.com');
select id as a_space from core.spaces where created_by = '00000000-0000-4000-8000-00000000000a' \gset
update core.people set digest_on = false where id = '00000000-0000-4000-8000-00000000000a';
insert into core.push_devices (id, person_id, kind, endpoint, label, created_at) values
  ('00000000-0000-7000-8000-0000000000f1', '00000000-0000-4000-8000-00000000000a', 'fcm',
   'fcm-token-ann-phone-0123456789', 'Android app', '2030-01-01 00:00:00+00'),
  ('00000000-0000-7000-8000-0000000000f2', '00000000-0000-4000-8000-00000000000a', 'web_push',
   'https://push.example/laptop', 'Mac · Chrome', '2030-01-01 00:00:00+00');
update core.push_devices set p256dh = 'k', auth = 'a' where id = '00000000-0000-7000-8000-0000000000f2';

-- As Ann, in the Android app: its secret.
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}', true),
  set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000a', true);
set local role authenticated;
select core.device_secret('00000000-0000-7000-8000-0000000000f1') as secret \gset
select is(length(:'secret'), 64, 'ADR-0063: the Android app gets a secret, shown once');
select throws_ok(
  $$select core.device_secret('00000000-0000-7000-8000-0000000000f2')$$,
  '42501', null,
  'Only an Android app device has one'
);
select throws_ok(
  $$select * from core.device_reminders('00000000-0000-7000-8000-0000000000f1', 'x')$$,
  '42501', null,
  'What the phone reads is the server''s to hand over, not the signed in''s'
);
reset role;
select is(
  (select secret_hash from core.push_devices where id = '00000000-0000-7000-8000-0000000000f1'),
  encode(sha256(convert_to(:'secret', 'UTF8')), 'hex'),
  'Only its hash is kept'
);

-- A Task tomorrow with a Reminder at 09:00, a week ahead and a fortnight ahead.
insert into core.items (id, type, title, space_id, owner_id, do_on, status) values
  ('00000000-0000-7000-8000-000000000001', 'task', 'Renew car insurance', :'a_space', '00000000-0000-4000-8000-00000000000a', (now() at time zone 'Europe/London')::date + 1, 'active'),
  ('00000000-0000-7000-8000-000000000002', 'task', 'Book the MOT', :'a_space', '00000000-0000-4000-8000-00000000000a', (now() at time zone 'Europe/London')::date + 14, 'active');
update core.push_devices set look_wanted_at = null;
insert into core.reminders (id, item_id, person_id, anchor, at_time) values
  ('00000000-0000-7000-8000-0000000000e1', '00000000-0000-7000-8000-000000000001', '00000000-0000-4000-8000-00000000000a', 'do_on', '09:00'),
  ('00000000-0000-7000-8000-0000000000e2', '00000000-0000-7000-8000-000000000002', '00000000-0000-4000-8000-00000000000a', 'do_on', '09:00')
on conflict do nothing;
select isnt(
  (select look_wanted_at from core.push_devices where id = '00000000-0000-7000-8000-0000000000f1'),
  null,
  'REM-010 2: a Reminder made tells the Android app to look again'
);
select is(
  (select array_agg(device_id) from core.claim_looks()),
  array['00000000-0000-7000-8000-0000000000f1'::uuid],
  'The look is taken once, by the Android app device'
);
select is(
  (select count(*)::int from core.push_devices where look_wanted_at is not null),
  0,
  'and not again'
);

select is(
  (select array_agg(payload ->> 'title' order by fires_at)
   from core.device_reminders('00000000-0000-7000-8000-0000000000f1', :'secret')),
  array['Renew car insurance'],
  'REM-010 1: the phone reads its Reminders a week ahead, with what each says'
);
select throws_ok(
  $$select * from core.device_reminders('00000000-0000-7000-8000-0000000000f1', 'wrong')$$,
  '42501', null,
  'With the wrong secret, nothing'
);

-- Done on the Task tells it to look again.
update core.items set status = 'done' where id = '00000000-0000-7000-8000-000000000001';
select isnt(
  (select look_wanted_at from core.push_devices where id = '00000000-0000-7000-8000-0000000000f1'),
  null,
  'REM-010 2: an Item done tells the Android app to look again'
);
update core.items set status = 'active' where id = '00000000-0000-7000-8000-000000000001';

-- Snooze from the phone, as Ann; not with the wrong secret.
select is(
  core.act_on_reminder('00000000-0000-7000-8000-0000000000f1', 'wrong', '00000000-0000-7000-8000-0000000000e1', 'snooze'),
  false,
  'REM-005: with the wrong secret, Snooze does nothing'
);
select ok(
  core.act_on_reminder('00000000-0000-7000-8000-0000000000f1', :'secret', '00000000-0000-7000-8000-0000000000e1', 'snooze'),
  'REM-005 2: Snooze from the phone is accepted'
);
select isnt(
  (select snoozed_until from core.reminders where id = '00000000-0000-7000-8000-0000000000e1'),
  null,
  'REM-005 2: and moves the Reminder an hour on'
);

-- When it comes due: the phone's is recorded, never sent; the laptop's waits.
update core.reminders set snoozed_until = null, fixed_at = '2030-01-08 09:00:00+00', anchor = null
where id = '00000000-0000-7000-8000-0000000000e1';
update core.reminders set updated_at = '2030-01-07 00:00:00+00' where id = '00000000-0000-7000-8000-0000000000e1';
select core_private.queue_notifications('2030-01-08 09:00:20+00');
select is(
  (select array_agg(row(device_id, status)::text order by device_id) from core.reminder_deliveries
   where reminder_id = '00000000-0000-7000-8000-0000000000e1'),
  array[
    row('00000000-0000-7000-8000-0000000000f1'::uuid, 'on_device')::text,
    row('00000000-0000-7000-8000-0000000000f2'::uuid, 'waiting')::text],
  'REM-010 4: the Android app''s Reminder is recorded, not sent; the laptop''s is sent'
);

-- A device turned on after a Reminder came due isn't sent it.
insert into core.push_devices (id, person_id, endpoint, p256dh, auth, label, created_at) values
  ('00000000-0000-7000-8000-0000000000f3', '00000000-0000-4000-8000-00000000000a',
   'https://push.example/new-phone', 'k', 'a', 'New phone', '2030-01-08 09:05:00+00');
select core_private.queue_notifications('2030-01-08 09:06:00+00');
select is(
  (select count(*)::int from core.reminder_deliveries where device_id = '00000000-0000-7000-8000-0000000000f3'),
  0,
  'REM-004: a device turned on later isn''t sent what came due before it'
);
select is(
  (select count(*)::int from core.reminder_deliveries where reminder_id = '00000000-0000-7000-8000-0000000000e1'),
  2,
  'and the others aren''t sent theirs twice'
);
select * from finish();
rollback;
