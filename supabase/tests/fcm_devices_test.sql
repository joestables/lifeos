-- The Android app as an FCM device (Stage 7 step 7, ADR-0063, REM-001 4):
-- registered by its token, sent to with its kind, tinted with its Type's
-- colour; the Firebase key is send-notifications' alone.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(9);

insert into auth.users (id, email) values ('00000000-0000-4000-8000-00000000000a', 'ann@example.com');
select id as a_space from core.spaces where created_by = '00000000-0000-4000-8000-00000000000a' \gset
update core.people set digest_on = false where id = '00000000-0000-4000-8000-00000000000a';

-- As Ann, in the Android app.
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}', true),
  set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000a', true);
set local role authenticated;
select core.register_fcm_device('00000000-0000-7000-8000-0000000000f1', 'fcm-token-ann-phone-0123456789', 'Android app');
select is(
  (select row(kind, endpoint, p256dh, auth, label, enabled)::text from core.push_devices),
  row('fcm', 'fcm-token-ann-phone-0123456789', null::text, null::text, 'Android app', true)::text,
  'REM-001 4: the Android app is an FCM device, its token the endpoint'
);
select core.set_device('00000000-0000-7000-8000-0000000000f1', false);
select core.register_fcm_device('00000000-0000-7000-8000-0000000000f2', 'fcm-token-ann-phone-0123456789', 'Android app');
select is(
  (select row(count(*), bool_and(enabled))::text from core.push_devices),
  row(1::bigint, true)::text,
  'REM-001 4: registering the same token again keeps one device, turned on'
);
select throws_ok(
  $$select core.register_fcm_device('00000000-0000-7000-8000-0000000000f3', 'short', 'Android app')$$,
  '22023', null,
  'A token that isn''t one is refused'
);
select throws_ok(
  $$select core.fcm_service_account()$$,
  '42501', null,
  'ADR-0063: the Firebase key is send-notifications'' alone'
);
reset role;

select set_config('request.jwt.claims', '', true), set_config('request.jwt.claim.sub', '', true);
set local role anon;
select throws_ok(
  $$select core.register_fcm_device('00000000-0000-7000-8000-0000000000f4', 'fcm-token-anyone-0123456789', 'Android app')$$,
  '42501', null,
  'Signed out, nothing is registered'
);
reset role;

-- A Task with a Reminder at 09:00, due now: claimed for the Android app.
insert into core.items (id, type, title, space_id, owner_id, do_on, status) values
  ('00000000-0000-7000-8000-000000000001', 'task', 'Renew car insurance', :'a_space', '00000000-0000-4000-8000-00000000000a', '2030-01-08', 'active');
insert into core.alerts (id, item_id, person_id, anchor, at_time) values
  ('00000000-0000-7000-8000-0000000000e1', '00000000-0000-7000-8000-000000000001', '00000000-0000-4000-8000-00000000000a', 'do_on', '09:00')
on conflict do nothing;
select core_private.queue_notifications('2030-01-08 09:00:20+00');
update core.alert_deliveries set fire_at = now() - interval '1 minute';
create temp table claimed on commit drop as select * from core.claim_deliveries();
select is(
  (select row(kind, endpoint)::text from claimed limit 1),
  row('fcm', 'fcm-token-ann-phone-0123456789')::text,
  'ADR-0063: a claimed delivery says its device is an FCM one'
);
select is(
  (select payload ->> 'colour' from claimed limit 1),
  'blue',
  'A notification carries its Type''s colour, for the Android app to tint it'
);
select is(
  (select payload ->> 'title' from claimed limit 1),
  'Renew car insurance',
  'Its words are as for Web Push'
);
select ok(
  (select (payload ? 'delivery') and (payload ? 'token') from claimed limit 1),
  'Its delivery and token come with it, for Done and Snooze'
);
select * from finish();
rollback;
