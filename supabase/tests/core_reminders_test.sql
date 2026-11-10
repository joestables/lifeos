-- Reminders follow their Item, per person; devices; deliveries kept from the
-- app. REM-001, REM-002, REM-003, REM-005, REM-007, CAP-004, ITM-003;
-- ADR-0021, ADR-0023, ADR-0044.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(29);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'ann@example.com'),
  ('00000000-0000-4000-8000-00000000000b', 'ben@example.com');

select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}', true),
  set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000a', true);
set local role authenticated;

-- REM-002: a dated Task reminds me at my default time, in my timezone.
select core.create_item('00000000-0000-7000-8000-000000000001', 'task', '{"title": "Renew insurance", "do_on": "2026-10-16"}');
select is(
  (select fires_at from core.alerts where item_id = '00000000-0000-7000-8000-000000000001' and is_default),
  '2026-10-16 08:00:00+00'::timestamptz,
  'REM-002: a Task to do on Fri 16 Oct reminds me at 09:00 London time (BST)'
);
select core.update_item('00000000-0000-7000-8000-000000000001', '{"do_on": "2026-11-06"}');
select is(
  (select fires_at from core.alerts where item_id = '00000000-0000-7000-8000-000000000001' and is_default),
  '2026-11-06 09:00:00+00'::timestamptz,
  'REM-002, ADR-0021: moved past the clock change, it is still 09:00 London time (GMT)'
);
select core.update_item('00000000-0000-7000-8000-000000000001', '{"do_at": "18:30"}');
select is(
  (select fires_at from core.alerts where item_id = '00000000-0000-7000-8000-000000000001' and is_default),
  '2026-11-06 18:30:00+00'::timestamptz,
  'REM-002: with a time, it reminds me at that time'
);
select is(
  (select count(*)::int from core.alerts where item_id = '00000000-0000-7000-8000-000000000001'),
  1,
  'REM-002: moving the date keeps one default Reminder'
);

-- REM-003: my own Reminders, fixed or relative.
select core.add_alert('00000000-0000-7000-8000-0000000000e1', '00000000-0000-7000-8000-000000000001',
  '{"fixed_at": "2026-11-01T10:00:00Z"}');
select core.add_alert('00000000-0000-7000-8000-0000000000e1', '00000000-0000-7000-8000-000000000001',
  '{"fixed_at": "2026-11-01T10:00:00Z"}');
select core.update_item('00000000-0000-7000-8000-000000000001', '{"due_on": "2026-11-10"}');
select core.add_alert('00000000-0000-7000-8000-0000000000e2', '00000000-0000-7000-8000-000000000001',
  '{"anchor": "due_on", "offset_days": -1, "at_time": "18:00"}');
select is(
  (select fires_at from core.alerts where id = '00000000-0000-7000-8000-0000000000e2'),
  '2026-11-09 18:00:00+00'::timestamptz,
  'REM-003: "1 day before at 18:00" hangs on the due date'
);
select core.update_item('00000000-0000-7000-8000-000000000001', '{"due_on": "2026-11-12"}');
select is(
  (select fires_at from core.alerts where id = '00000000-0000-7000-8000-0000000000e2'),
  '2026-11-11 18:00:00+00'::timestamptz,
  'REM-003: when the due date moves, the Reminder moves with it'
);
select is(
  (select count(*)::int from core.alerts where item_id = '00000000-0000-7000-8000-000000000001'),
  3,
  'REM-003: an Item may have several Reminders; a repeated add counts once'
);

-- REM-002: clearing the date takes the default Reminder, not mine.
select core.update_item('00000000-0000-7000-8000-000000000001', '{"do_on": null, "do_at": null}');
select is(
  (select string_agg(id::text, ',' order by id) from core.alerts where item_id = '00000000-0000-7000-8000-000000000001'),
  '00000000-0000-7000-8000-0000000000e1,00000000-0000-7000-8000-0000000000e2',
  'REM-002: clearing the do-on date removes its Reminder; mine stay'
);

-- REM-005: snooze moves only that Reminder, until its date moves.
select core.snooze_alert('00000000-0000-7000-8000-0000000000e2', '2026-11-11T19:00:00Z');
select is(
  (select fires_at from core.alerts where id = '00000000-0000-7000-8000-0000000000e2'),
  '2026-11-11 19:00:00+00'::timestamptz,
  'REM-005: a snoozed Reminder comes back when snoozed to'
);
select core.update_item('00000000-0000-7000-8000-000000000001', '{"due_on": "2026-11-13"}');
select is(
  (select fires_at from core.alerts where id = '00000000-0000-7000-8000-0000000000e2'),
  '2026-11-12 18:00:00+00'::timestamptz,
  'REM-005: moving the date ends the snooze'
);

-- A Reminder hangs only on a time the Item has.
select core.create_item('00000000-0000-7000-8000-000000000002', 'thought', '{"title": "dentist tue 3pm?"}');
select throws_ok(
  $$select core.add_alert('00000000-0000-7000-8000-0000000000e3', '00000000-0000-7000-8000-000000000002', '{"anchor": "do_on"}')$$,
  '23514', null,
  'ADR-0023: a Thought has no do-on date to hang a Reminder on'
);
select throws_ok(
  $$select core.add_alert('00000000-0000-7000-8000-0000000000e3', '00000000-0000-7000-8000-000000000002', '{"snooze": true}')$$,
  '22023', null,
  'ADR-0042: a Reminder write with an unknown field is refused'
);

-- ALR-001 2: a Thought takes no Alert, even at a set time (CAP-004 went).
select throws_ok(
  $$select core.add_alert('00000000-0000-7000-8000-0000000000e4', '00000000-0000-7000-8000-000000000002',
      '{"fixed_at": "2026-10-13T14:00:00Z"}')$$,
  '23514', null,
  'ALR-001 2: a Thought takes no Alert'
);

-- ITM-003: restoring a deleted Item brings its Reminders back with it.
select core.archive_item('00000000-0000-7000-8000-000000000001');
select core.restore_item('00000000-0000-7000-8000-000000000001');
select is(
  (select count(*)::int from core.alerts where item_id = '00000000-0000-7000-8000-000000000001'),
  2,
  'ITM-003: a restored Item has its Reminders'
);

-- REM-002: the default is made when the Task gains its date. One I removed
-- doesn't come back when the date moves, and one I changed isn't joined by
-- a second.
select core.create_item('00000000-0000-7000-8000-000000000006', 'task', '{"title": "Dentist", "do_on": "2026-11-10"}');
select core.remove_alert((select id from core.alerts where item_id = '00000000-0000-7000-8000-000000000006'));
select core.update_item('00000000-0000-7000-8000-000000000006', '{"do_on": "2026-11-11"}');
select is(
  (select count(*)::int from core.alerts where item_id = '00000000-0000-7000-8000-000000000006'),
  0,
  'REM-002: a default I removed doesn''t come back when the date moves'
);
select core.create_item('00000000-0000-7000-8000-000000000007', 'task', '{"title": "Haircut", "do_on": "2026-11-10"}');
select core.update_alert((select id from core.alerts where item_id = '00000000-0000-7000-8000-000000000007'), '{"at_time": "07:00"}');
select core.update_item('00000000-0000-7000-8000-000000000007', '{"do_on": "2026-11-11"}');
select is(
  (select count(*)::int from core.alerts where item_id = '00000000-0000-7000-8000-000000000007'),
  1,
  'REM-002: a default I changed isn''t joined by a second when the date moves'
);
select core.update_item('00000000-0000-7000-8000-000000000007', '{"do_on": null}');
select core.update_item('00000000-0000-7000-8000-000000000007', '{"do_on": "2026-11-12"}');
select is(
  (select count(*)::int from core.alerts where item_id = '00000000-0000-7000-8000-000000000007' and is_default),
  1,
  'REM-002: given a date again, it has its default again'
);

-- REM-007: changing the default time moves new Reminders only; a Type's
-- default can be turned off.
select core.create_item('00000000-0000-7000-8000-000000000003', 'task', '{"title": "Bins", "do_on": "2026-11-16"}');
select core.update_settings('{"default_alert_time": "08:00"}');
select is(
  (select fires_at from core.alerts where item_id = '00000000-0000-7000-8000-000000000003'),
  '2026-11-16 09:00:00+00'::timestamptz,
  'REM-007: an existing Reminder keeps the default time it was made with'
);
select core.create_item('00000000-0000-7000-8000-000000000004', 'task', '{"title": "Plants", "do_on": "2026-11-16"}');
select is(
  (select fires_at from core.alerts where item_id = '00000000-0000-7000-8000-000000000004'),
  '2026-11-16 08:00:00+00'::timestamptz,
  'REM-007: a new Reminder uses the new default time'
);
select core.update_settings('{"alert_defaults": {"task": false}}');
select core.create_item('00000000-0000-7000-8000-000000000005', 'task', '{"title": "Post", "do_on": "2026-11-16"}');
select is(
  (select count(*)::int from core.alerts where item_id = '00000000-0000-7000-8000-000000000005'),
  0,
  'REM-007: with the Task default off, a dated Task gets no Reminder'
);
select throws_ok(
  $$select core.update_settings('{"timezone": "Mars/Olympus"}')$$,
  '22023', null,
  'REM-007: an unknown timezone is refused'
);
select core.update_settings('{"timezone": "America/New_York"}');
select is(
  (select fires_at from core.alerts where item_id = '00000000-0000-7000-8000-000000000003'),
  '2026-11-16 14:00:00+00'::timestamptz,
  'ADR-0021: a new home timezone moves my Reminders with it'
);

-- REM-001: my devices.
select core.register_device('00000000-0000-7000-8000-0000000000d1', 'https://push.example/ann-phone', 'k', 'a', 'Pixel');
select core.set_device('00000000-0000-7000-8000-0000000000d1', false);
select is(
  (select enabled from core.push_devices where id = '00000000-0000-7000-8000-0000000000d1'),
  false,
  'REM-001: I can turn notifications off for a device'
);
reset role;

-- As Ben.
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-00000000000b", "role": "authenticated"}', true),
  set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000b', true);
set local role authenticated;
select is(
  (select count(*)::int from core.alerts) + (select count(*)::int from core.push_devices),
  0,
  'ADR-0023: Ben sees none of Ann''s Reminders or devices'
);
select throws_ok(
  $$select core.add_alert('00000000-0000-7000-8000-0000000000e9', '00000000-0000-7000-8000-000000000003', '{"fixed_at": "2026-11-01T10:00:00Z"}')$$,
  '42501', null,
  'ADR-0023: Ben can''t set a Reminder on Ann''s Task'
);
select throws_ok(
  $$select count(*) from core.alert_deliveries$$,
  '42501', null,
  'ADR-0044: deliveries are the delivery job''s alone'
);
-- The same browser, now signed in as Ben, becomes his device.
select core.register_device('00000000-0000-7000-8000-0000000000d2', 'https://push.example/ann-phone', 'k2', 'a2', 'Pixel');
select is(
  (select row(id, enabled)::text from core.push_devices),
  row('00000000-0000-7000-8000-0000000000d1'::uuid, true)::text,
  'REM-001: a browser registered again by someone else becomes theirs, turned on'
);
select core.remove_device('00000000-0000-7000-8000-0000000000d1');
select is(
  (select count(*)::int from core.push_devices),
  0,
  'REM-001: I can remove a device'
);
reset role;
select is(
  (select count(*)::int from core.alerts where item_id = '00000000-0000-7000-8000-000000000003'),
  1,
  'ADR-0023: Ann''s Reminders are untouched by Ben'
);
select * from finish();
rollback;
