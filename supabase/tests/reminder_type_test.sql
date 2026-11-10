-- The Reminder Type (ADR-0065; RMD-001-004, 006): only the Types that take
-- Alerts have them; a Reminder's Alerts hang on its day, so moving it moves
-- them; it converts to and from a Task and an Event, and from a Thought; it
-- repeats on a schedule only.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(18);

insert into auth.users (id, email) values ('00000000-0000-4000-8000-00000000000a', 'ann@example.com');

select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}', true),
  set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000a', true);
set local role authenticated;

-- ADR-0065 5: a Note takes no Alerts.
select core.create_item('00000000-0000-7000-8000-000000000001', 'note', '{"title": "Wifi codes"}');
select throws_ok(
  $$select core.add_alert('00000000-0000-7000-8000-0000000000e1', '00000000-0000-7000-8000-000000000001',
      '{"fixed_at": "2030-01-08T09:00:00Z"}')$$,
  '23514', null,
  'ADR-0065 5: a Note takes no Alerts'
);

-- RMD-001, RMD-002: a Reminder, its Alerts on its day.
select core.create_item('00000000-0000-7000-8000-000000000002', 'reminder', '{"title": "Parcel", "do_on": "2030-01-08"}');
select core.add_alert('00000000-0000-7000-8000-0000000000e2', '00000000-0000-7000-8000-000000000002',
  '{"anchor": "do_on", "offset_days": 0, "at_time": "09:00"}');
select core.add_alert('00000000-0000-7000-8000-0000000000e3', '00000000-0000-7000-8000-000000000002',
  '{"anchor": "do_on", "offset_days": 1, "at_time": "12:00", "alarm": true}');
select is(
  (select array_agg(fires_at order by fires_at) from core.alerts where item_id = '00000000-0000-7000-8000-000000000002'),
  array['2030-01-08 09:00:00+00'::timestamptz, '2030-01-09 12:00:00+00'::timestamptz],
  'RMD-002 1: a Reminder alerts at 09:00 on its day and at 12:00 the day after'
);
select is(
  (select is_default from core.alerts where item_id = '00000000-0000-7000-8000-000000000002' limit 1),
  false,
  'A Reminder is given no default Alert'
);

-- RMD-003 3: moving its day moves its Alerts.
select core.update_item('00000000-0000-7000-8000-000000000002', '{"do_on": "2030-01-15"}');
select is(
  (select array_agg(fires_at order by fires_at) from core.alerts where item_id = '00000000-0000-7000-8000-000000000002'),
  array['2030-01-15 09:00:00+00'::timestamptz, '2030-01-16 12:00:00+00'::timestamptz],
  'RMD-003 3: moved a week on, its Alerts move with it'
);

-- RMD-004 1: on a schedule only.
select throws_ok(
  $$select core.set_repeat('00000000-0000-7000-8000-000000000002', '00000000-0000-7000-8000-0000000000f1',
      'after_completion', 'FREQ=WEEKLY', '2030-01-15', 'Europe/London', '{"title": "Parcel"}',
      '[{"id": "00000000-0000-7000-8000-000000000002", "on": "2030-01-15"}]', '2030-01-15')$$,
  '22023', null,
  'RMD-004 1: a Reminder repeats on a schedule, not after it is done'
);

-- RMD-006 1: a Thought with an Alert to come becomes a Reminder on its day.
select core.create_item('00000000-0000-7000-8000-000000000003', 'thought', '{"title": "Ring the garage"}');
select core.add_alert('00000000-0000-7000-8000-0000000000e4', '00000000-0000-7000-8000-000000000003',
  '{"fixed_at": "2030-02-05T10:00:00Z"}');
select core.convert_item('00000000-0000-7000-8000-000000000003', 'reminder');
select is(
  (select row(type, do_on, status)::text from core.items where id = '00000000-0000-7000-8000-000000000003'),
  row('reminder', date '2030-02-05', 'active')::text,
  'RMD-006 1: a Thought becomes a Reminder on the day of its Alert'
);
select is(
  (select row(anchor, offset_days, at_time, fires_at)::text from core.alerts where id = '00000000-0000-7000-8000-0000000000e4'),
  row('do_on', 0, time '10:00', timestamptz '2030-02-05 10:00:00+00')::text,
  'Its Alert stays at its time, now on the Reminder''s day'
);

-- A Thought with no Alert: one an hour from now.
select core.create_item('00000000-0000-7000-8000-000000000004', 'thought', '{"title": "Water the plants"}');
select core.convert_item('00000000-0000-7000-8000-000000000004', 'reminder');
select ok(
  (select count(*) = 1 and min(fires_at) between now() + interval '58 minutes' and now() + interval '61 minutes'
   from core.alerts where item_id = '00000000-0000-7000-8000-000000000004'),
  'RMD-006 1: with no Alert, it gets one an hour from now'
);

-- RMD-006 3: a Task into a Reminder keeps its Alert at its time, not as a default.
select core.create_item('00000000-0000-7000-8000-000000000005', 'task',
  '{"title": "Bins out", "do_on": "2030-03-04", "do_at": "19:00", "due_on": "2030-03-05"}');
select core.convert_item('00000000-0000-7000-8000-000000000005', 'reminder');
select is(
  (select row(type, do_on, do_at, due_on)::text from core.items where id = '00000000-0000-7000-8000-000000000005'),
  row('reminder', date '2030-03-04', null::time, null::date)::text,
  'RMD-006 3: a Task becomes a Reminder on its do-on date, its due date gone'
);
select is(
  (select array_agg(row(fires_at, is_default)::text) from core.alerts where item_id = '00000000-0000-7000-8000-000000000005'),
  array[row(timestamptz '2030-03-04 19:00:00+00', false)::text],
  'Its Alert at 19:00 kept, no longer a default'
);

-- RMD-006 2: back into a Task, at its next Alert, no default beside it.
select core.convert_item('00000000-0000-7000-8000-000000000005', 'task');
select is(
  (select row(type, do_on, do_at)::text from core.items where id = '00000000-0000-7000-8000-000000000005'),
  row('task', date '2030-03-04', time '19:00')::text,
  'RMD-006 2: a Reminder becomes a Task at its next Alert'
);
select is(
  (select count(*)::int from core.alerts where item_id = '00000000-0000-7000-8000-000000000005'),
  1,
  'Its Alert kept, with no default beside it'
);

-- RMD-006 2: into an Event, starting at its next Alert, for an hour.
select core.convert_item('00000000-0000-7000-8000-000000000002', 'event');
select is(
  (select row(type, starts_at, ends_at, all_day, do_on)::text from core.items where id = '00000000-0000-7000-8000-000000000002'),
  row('event', timestamptz '2030-01-15 09:00:00+00', timestamptz '2030-01-15 10:00:00+00', false, null::date)::text,
  'RMD-006 2: a Reminder becomes an Event at its next Alert, for an hour'
);
select is(
  (select array_agg(row(anchor, fires_at)::text order by fires_at) from core.alerts where item_id = '00000000-0000-7000-8000-000000000002'),
  array[row(null::text, timestamptz '2030-01-15 09:00:00+00')::text, row(null::text, timestamptz '2030-01-16 12:00:00+00')::text],
  'Its Alerts kept, each at its set time, with no default beside them'
);

-- An Event back into a Reminder.
select core.convert_item('00000000-0000-7000-8000-000000000002', 'reminder');
select is(
  (select row(type, do_on, starts_at)::text from core.items where id = '00000000-0000-7000-8000-000000000002'),
  row('reminder', date '2030-01-15', null::timestamptz)::text,
  'An Event becomes a Reminder on the day of its first Alert'
);
select is(
  (select count(*)::int from core.alerts where item_id = '00000000-0000-7000-8000-000000000002' and anchor = 'do_on'),
  2,
  'Its Alerts hang on that day again'
);

-- ADR-0065 5: into a Note, its Alerts go.
select core.create_item('00000000-0000-7000-8000-000000000006', 'thought', '{"title": "Gift ideas"}');
select core.add_alert('00000000-0000-7000-8000-0000000000e6', '00000000-0000-7000-8000-000000000006',
  '{"fixed_at": "2030-04-01T09:00:00Z"}');
select core.convert_item('00000000-0000-7000-8000-000000000006', 'note');
select is(
  (select count(*)::int from core.alerts where item_id = '00000000-0000-7000-8000-000000000006'),
  0,
  'ADR-0065 5: a Thought converted into a Note keeps no Alert'
);

-- RMD-001 3: never done.
select throws_ok(
  $$select core.update_item('00000000-0000-7000-8000-000000000003', '{"status": "done"}')$$,
  null, null,
  'RMD-001 3: a Reminder can''t be ticked done'
);
reset role;

select * from finish();
rollback;
