-- What the minute job queues, what is sent and recorded, and Done and
-- Snooze from a notification. REM-002, REM-004, REM-005, REM-006, REM-008,
-- REM-009, TSK-003; ADR-0044.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(30);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'ann@example.com'),
  ('00000000-0000-4000-8000-00000000000b', 'ben@example.com');
select id as a_space from core.spaces where created_by = '00000000-0000-4000-8000-00000000000a' \gset
select id as b_space from core.spaces where created_by = '00000000-0000-4000-8000-00000000000b' \gset

-- Ann has a phone (on) and a laptop (off); Ben a phone.
insert into core.push_devices (id, person_id, endpoint, p256dh, auth, label, enabled) values
  ('00000000-0000-7000-8000-0000000000d1', '00000000-0000-4000-8000-00000000000a', 'https://push.example/ann-phone', 'k', 'a', 'Phone', true),
  ('00000000-0000-7000-8000-0000000000d2', '00000000-0000-4000-8000-00000000000a', 'https://push.example/ann-laptop', 'k', 'a', 'Laptop', false),
  ('00000000-0000-7000-8000-0000000000d3', '00000000-0000-4000-8000-00000000000b', 'https://push.example/ben-phone', 'k', 'a', 'Phone', true);
-- Turned on long before the dates this test sends at (a device only gets
-- what comes due after it was turned on).
update core.push_devices set created_at = '2026-01-01 00:00:00+00';

-- Ann's Tasks, with their Reminders at fixed times, set the week before.
-- Ann has no digest.
update core.people set digest_on = false where id = '00000000-0000-4000-8000-00000000000a';
insert into core.items (id, type, title, space_id, owner_id, do_on, do_at, due_on, status) values
  ('00000000-0000-7000-8000-000000000001', 'task', 'Call mum', :'a_space', '00000000-0000-4000-8000-00000000000a', '2026-10-12', '18:30', null, 'active'),
  ('00000000-0000-7000-8000-000000000002', 'task', 'Return the jacket', :'a_space', '00000000-0000-4000-8000-00000000000a', null, null, null, 'done'),
  ('00000000-0000-7000-8000-000000000003', 'task', 'Renew insurance', :'a_space', '00000000-0000-4000-8000-00000000000a', null, null, '2026-10-11', 'active'),
  ('00000000-0000-7000-8000-000000000004', 'thought', 'Gift idea for Sam', :'a_space', '00000000-0000-4000-8000-00000000000a', null, null, null, 'active');
insert into core.alerts (id, item_id, person_id, fixed_at, updated_at) values
  ('00000000-0000-7000-8000-0000000000e1', '00000000-0000-7000-8000-000000000001', '00000000-0000-4000-8000-00000000000a', '2026-10-12 17:30:00+00', '2026-10-05 09:00:00+00'),
  ('00000000-0000-7000-8000-0000000000e2', '00000000-0000-7000-8000-000000000002', '00000000-0000-4000-8000-00000000000a', '2026-10-12 17:30:00+00', '2026-10-05 09:00:00+00'),
  ('00000000-0000-7000-8000-0000000000e4', '00000000-0000-7000-8000-000000000004', '00000000-0000-4000-8000-00000000000a', '2026-10-12 08:00:00+00', '2026-10-05 09:00:00+00');

-- 17:30:20 UTC on Monday 12 October.
select core_private.queue_notifications('2026-10-12 17:30:20+00');
select is(
  (select array_agg(device_id::text) from core.alert_deliveries where key = 'reminder:00000000-0000-7000-8000-0000000000e1'),
  array['00000000-0000-7000-8000-0000000000d1'],
  'REM-004: a due Reminder is queued for each device with notifications on, and not the one turned off'
);
select core_private.queue_notifications('2026-10-12 17:31:20+00');
select is(
  (select count(*)::int from core.alert_deliveries where key = 'reminder:00000000-0000-7000-8000-0000000000e1'),
  1,
  'REM-004 2: run again, it is still queued once'
);
select is(
  (select count(*)::int from core.alert_deliveries where key = 'reminder:00000000-0000-7000-8000-0000000000e2'),
  0,
  'REM-004 5, TSK-003: a done Task''s Reminder is not sent'
);
select is(
  (select status from core.alert_deliveries where key = 'reminder:00000000-0000-7000-8000-0000000000e4'),
  'waiting',
  'REM-004 3: one up to 12 hours late is still sent'
);
select core_private.queue_notifications('2026-10-12 08:30:00+00');
select core_private.queue_notifications('2026-10-12 09:00:00+00');
select is(
  (select count(*)::int from core.alert_deliveries where key = 'reminder:00000000-0000-7000-8000-0000000000e4'),
  1,
  'REM-004 3: and only once'
);

-- REM-004 3: more than 12 hours late, it is recorded as missed.
insert into core.alerts (id, item_id, person_id, fixed_at, updated_at) values
  ('00000000-0000-7000-8000-0000000000e5', '00000000-0000-7000-8000-000000000004', '00000000-0000-4000-8000-00000000000a', '2026-10-12 01:00:00+00', '2026-10-05 09:00:00+00');
select core_private.queue_notifications('2026-10-12 17:32:00+00');
select is(
  (select status from core.alert_deliveries where key = 'reminder:00000000-0000-7000-8000-0000000000e5'),
  'missed',
  'REM-004 3: more than 12 hours late it is recorded as missed, not sent'
);

-- REM-004: one set after its time (a Task captured at 15:00 for today, its
-- default at 09:00) isn't sent at all.
insert into core.alerts (id, item_id, person_id, fixed_at, updated_at) values
  ('00000000-0000-7000-8000-0000000000e6', '00000000-0000-7000-8000-000000000001', '00000000-0000-4000-8000-00000000000a', '2026-10-12 08:00:00+00', '2026-10-12 14:00:00+00');
select core_private.queue_notifications('2026-10-12 17:33:00+00');
select is(
  (select count(*)::int from core.alert_deliveries where key = 'reminder:00000000-0000-7000-8000-0000000000e6'),
  0,
  'REM-004: a Reminder already past when it was set isn''t sent'
);

-- REM-009: without a digest, an overdue Task is nudged at the default time
-- (09:00 London is 08:00 UTC), once.
select is(
  (select count(*)::int from core.alert_deliveries where key = 'overdue:00000000-0000-7000-8000-000000000003:2026-10-11'),
  1,
  'REM-009 1: a Task due yesterday is nudged at my default time'
);
select core_private.queue_notifications('2026-10-13 08:05:00+00');
select is(
  (select count(*)::int from core.alert_deliveries where key = 'overdue:00000000-0000-7000-8000-000000000003:2026-10-11'),
  1,
  'REM-009 3: it stays overdue, and is nudged only once'
);

-- REM-008: Ben's digest at 07:00 London (06:00 UTC); with nothing to say
-- it is skipped, so it doesn't come later in the day.
select core_private.queue_notifications('2026-10-12 06:00:30+00');
select is(
  (select status from core.alert_deliveries where key = 'digest:00000000-0000-4000-8000-00000000000b:2026-10-12'),
  'skipped',
  'REM-008 2: with nothing needing me, no digest is sent'
);
insert into core.items (id, type, title, space_id, owner_id, do_on, status) values
  ('00000000-0000-7000-8000-000000000011', 'task', 'Bins', :'b_space', '00000000-0000-4000-8000-00000000000b', '2026-10-13', 'active'),
  ('00000000-0000-7000-8000-000000000012', 'thought', 'Paint the shed', :'b_space', '00000000-0000-4000-8000-00000000000b', null, 'active');
select core_private.queue_notifications('2026-10-13 06:01:00+00');
select is(
  (select fire_at from core.alert_deliveries where key = 'digest:00000000-0000-4000-8000-00000000000b:2026-10-13'),
  '2026-10-13 06:00:00+00'::timestamptz,
  'REM-008 1: the digest is queued at my digest time, in my timezone'
);
select is(
  (select count(*)::int from core.alert_deliveries where kind = 'overdue' and person_id = '00000000-0000-4000-8000-00000000000b'),
  0,
  'REM-009 2: with the digest on, there are no separate nudges'
);
select is(
  (select array[c.overdue, c.today, c.to_sort] from core_private.day_counts('00000000-0000-4000-8000-00000000000b', '2026-10-13') c),
  array[0, 1, 1],
  'REM-008: the digest counts what is overdue, today and the Thoughts'
);

-- Sending: what is due now, by the real clock. A Reminder on Call mum and
-- one on the Thought, Ben's digest and Ann's overdue nudge, each a minute
-- ago.
delete from core.alert_deliveries;
delete from core.items where owner_id = '00000000-0000-4000-8000-00000000000b';
insert into core.items (id, type, title, space_id, owner_id, do_on, status) values
  ('00000000-0000-7000-8000-000000000013', 'task', 'Bins', :'b_space', '00000000-0000-4000-8000-00000000000b',
   (now() at time zone 'Europe/London')::date, 'active'),
  ('00000000-0000-7000-8000-000000000014', 'thought', 'Paint the shed', :'b_space', '00000000-0000-4000-8000-00000000000b', null, 'active');
insert into core.alert_deliveries (kind, key, person_id, device_id, alert_id, item_id, fire_at) values
  ('reminder', 'reminder:00000000-0000-7000-8000-0000000000e1', '00000000-0000-4000-8000-00000000000a',
   '00000000-0000-7000-8000-0000000000d1', '00000000-0000-7000-8000-0000000000e1', '00000000-0000-7000-8000-000000000001', now() - interval '1 minute'),
  ('reminder', 'reminder:00000000-0000-7000-8000-0000000000e4', '00000000-0000-4000-8000-00000000000a',
   '00000000-0000-7000-8000-0000000000d1', '00000000-0000-7000-8000-0000000000e4', '00000000-0000-7000-8000-000000000004', now() - interval '1 minute'),
  ('digest', 'digest:00000000-0000-4000-8000-00000000000b:now', '00000000-0000-4000-8000-00000000000b',
   '00000000-0000-7000-8000-0000000000d3', null, null, now() - interval '1 minute'),
  ('overdue', 'overdue:00000000-0000-7000-8000-000000000003:2026-10-11', '00000000-0000-4000-8000-00000000000a',
   '00000000-0000-7000-8000-0000000000d1', null, '00000000-0000-7000-8000-000000000003', now() - interval '1 minute');
create temp table claimed on commit drop as select * from core.claim_deliveries();
select is(
  (select payload - 'delivery' - 'token' from claimed where payload ->> 'tag' = 'reminder:00000000-0000-7000-8000-0000000000e1'),
  jsonb_build_object(
    'title', 'Call mum',
    'body', 'Mon 12 Oct 18:30',
    'url', '/item/00000000-0000-7000-8000-000000000001',
    'tag', 'reminder:00000000-0000-7000-8000-0000000000e1',
    'actions', jsonb_build_array(
      jsonb_build_object('action', 'done', 'title', 'Done'),
      jsonb_build_object('action', 'snooze', 'title', 'Snooze 1 hour')),
    'colour', 'blue'),
  'REM-004 1, REM-005, REM-006: the notification has the title, its time, its link, and Done and Snooze'
);
select is(
  (select payload -> 'actions' from claimed where payload ->> 'tag' = 'reminder:00000000-0000-7000-8000-0000000000e4'),
  jsonb_build_array(
    jsonb_build_object('action', 'done', 'title', 'Done'),
    jsonb_build_object('action', 'snooze', 'title', 'Snooze 1 hour')),
  'REM-005 1: a Thought''s notification offers Done and Snooze, as it can be ticked off'
);
select is(
  (select payload ->> 'title' from claimed where payload ->> 'tag' like 'digest:%'),
  '1 today · 1 thought',
  'REM-008 1: the digest says what needs me'
);
select is(
  (select payload ->> 'title' from claimed where payload ->> 'tag' like 'overdue:%'),
  'Overdue: Renew insurance',
  'REM-009 1: "Overdue: Renew insurance"'
);
select is(
  (select count(*)::int from core.claim_deliveries()),
  0,
  'ADR-0044: two runs never take the same row'
);

-- Done before it was sent: skipped, not sent (REM-004 5).
insert into core.alert_deliveries (kind, key, person_id, device_id, alert_id, item_id, fire_at) values
  ('reminder', 'reminder:00000000-0000-7000-8000-0000000000e2', '00000000-0000-4000-8000-00000000000a',
   '00000000-0000-7000-8000-0000000000d1', '00000000-0000-7000-8000-0000000000e2', '00000000-0000-7000-8000-000000000002', now() - interval '2 minutes');
select core.claim_deliveries();
select is(
  (select status from core.alert_deliveries where key = 'reminder:00000000-0000-7000-8000-0000000000e2'),
  'skipped',
  'REM-004 5: done before it went, it isn''t sent'
);

-- Recording: sent, and a device that has gone.
select core.record_deliveries(jsonb_build_array(
  jsonb_build_object('id', (select id from claimed where payload ->> 'tag' = 'reminder:00000000-0000-7000-8000-0000000000e1'), 'outcome', 'sent'),
  jsonb_build_object('id', (select id from claimed where payload ->> 'tag' like 'digest:%'), 'outcome', 'gone', 'error', '410 Gone')));
select is(
  (select status from core.alert_deliveries where key = 'reminder:00000000-0000-7000-8000-0000000000e1'),
  'sent',
  'ADR-0044: a sent notification is recorded'
);
select isnt(
  (select gone_at from core.push_devices where id = '00000000-0000-7000-8000-0000000000d3'),
  null,
  'REM-004 4: a device the push service says is gone stops being sent to'
);
select is(
  (select count(*)::int from ops.events where kind = 'push_device_gone'),
  1,
  'REM-004 4: and the failure is recorded where Claude can find it'
);

-- Buttons (REM-005), with the delivery's token.
select id as rid, token as rtoken from core.alert_deliveries
where key = 'reminder:00000000-0000-7000-8000-0000000000e1' \gset
select is(
  core.act_on_delivery(:rid, gen_random_uuid(), 'done'),
  false,
  'ADR-0044: a button without its delivery''s token does nothing'
);
select is(
  core.act_on_delivery(:rid, :'rtoken', 'snooze'),
  true,
  'REM-005 2: Snooze'
);
select ok(
  (select snoozed_until between now() + interval '59 minutes' and now() + interval '61 minutes'
   from core.alerts where id = '00000000-0000-7000-8000-0000000000e1'),
  'REM-005 2: snoozed, it comes back in an hour, for me only'
);
select is(
  core.act_on_delivery(:rid, :'rtoken', 'done'),
  true,
  'REM-005 1: Done'
);
select is(
  (select (status, touched_at is null)::text from core.items where id = '00000000-0000-7000-8000-000000000001'),
  '(done,t)',
  'REM-005 1: the Task is done'
);

-- REM-002 4: a repeating Task's own Reminders go to each occurrence.
insert into core.series (id, type, space_id, owner_id, mode, rule, starts_on, timezone, template)
values ('00000000-0000-7000-8000-0000000000f1', 'task', :'a_space', '00000000-0000-4000-8000-00000000000a',
        'schedule', 'FREQ=WEEKLY;BYDAY=MO', '2026-10-12', 'Europe/London',
        '{"title": "Bins", "reminders": [{"anchor": "do_on", "offset_days": -1, "at_time": "20:00"}]}');
select core_private.make_occurrences(
  (select s from core.series s where id = '00000000-0000-7000-8000-0000000000f1'),
  '[{"on": "2026-10-19"}]');
select is(
  (select array_agg(r.fires_at order by r.fires_at) from core.alerts r join core.items i on i.id = r.item_id
   where i.series_id = '00000000-0000-7000-8000-0000000000f1'),
  array['2026-10-18 19:00:00+00'::timestamptz, '2026-10-19 08:00:00+00'::timestamptz],
  'REM-002 4: each occurrence has the series'' Reminders, and its default'
);

-- Only the service role sends.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}', true);
select throws_ok('select * from core.claim_deliveries()', '42501', null,
  'ADR-0044: a person can''t take deliveries to send');
select throws_ok($$select core.act_on_delivery(1, gen_random_uuid(), 'done')$$, '42501', null,
  'ADR-0044: nor act on one except through notification-action');

select * from finish();
rollback;
