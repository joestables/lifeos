-- An Event's own Reminders and its notification (Stage 3, plan step 5).
-- EVT-003; REM-003, REM-004.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(8);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'ann@example.com');

select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}', true),
  set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000a', true);
set local role authenticated;

-- Saturday 17 October, 13:00 to 15:00 London time (BST).
select core.create_item('00000000-0000-7000-8000-000000000001', 'event',
  '{"title": "Mum''s birthday lunch", "place": "The Ivy, Richmond",
    "starts_at": "2026-10-17T12:00:00Z", "ends_at": "2026-10-17T14:00:00Z"}');

-- ---------------------------------------------------------------------------
-- EVT-003 3: before its start, by minutes or on a day at a time.

select core.add_reminder('00000000-0000-7000-8000-0000000000e1', '00000000-0000-7000-8000-000000000001',
  '{"anchor": "starts_at", "offset_minutes": -60}');
select is(
  (select fires_at from core.reminders where id = '00000000-0000-7000-8000-0000000000e1'),
  '2026-10-17 11:00:00+00'::timestamptz,
  'EVT-003 3: "1 hour before" a 13:00 Event is at 12:00'
);
select core.add_reminder('00000000-0000-7000-8000-0000000000e2', '00000000-0000-7000-8000-000000000001',
  '{"anchor": "starts_at", "offset_days": -1, "at_time": "18:00"}');
select is(
  (select fires_at from core.reminders where id = '00000000-0000-7000-8000-0000000000e2'),
  '2026-10-16 17:00:00+00'::timestamptz,
  'EVT-003 3: "1 day before at 18:00" is on Friday at 18:00, London time'
);
select core.update_item('00000000-0000-7000-8000-000000000001',
  '{"starts_at": "2026-10-24T12:00:00Z", "ends_at": "2026-10-24T14:00:00Z"}');
select is(
  (select array_agg(fires_at order by id) from core.reminders
   where id in ('00000000-0000-7000-8000-0000000000e1', '00000000-0000-7000-8000-0000000000e2')),
  array['2026-10-24 11:00:00+00', '2026-10-23 17:00:00+00']::timestamptz[],
  'EVT-003 1: moving the Event a week moves its Reminders with it'
);

-- ---------------------------------------------------------------------------
-- An all-day Event: its Reminders are on a day, at my default time unless set.

select core.create_item('00000000-0000-7000-8000-000000000002', 'event',
  '{"title": "Annual leave", "all_day": true, "starts_at": "2026-10-15T00:00:00Z", "ends_at": "2026-10-17T00:00:00Z"}');
select core.add_reminder('00000000-0000-7000-8000-0000000000e3', '00000000-0000-7000-8000-000000000002',
  '{"anchor": "starts_at", "offset_days": 0}');
select is(
  (select fires_at from core.reminders where id = '00000000-0000-7000-8000-0000000000e3'),
  '2026-10-15 08:00:00+00'::timestamptz,
  'EVT-003 3: an all-day Event''s Reminder is on its first day at my default time (09:00 London)'
);
select core.update_item('00000000-0000-7000-8000-000000000002',
  '{"starts_at": "2026-12-01T00:00:00Z", "ends_at": "2026-12-02T00:00:00Z"}');
select is(
  (select fires_at from core.reminders where id = '00000000-0000-7000-8000-0000000000e3'),
  '2026-12-01 09:00:00+00'::timestamptz,
  'EVT-003 1: moved into winter, it is still 09:00 London time'
);

-- ---------------------------------------------------------------------------
-- EVT-003 4: the notification says the title, the time and the place, with Snooze only.

reset role;
select is(
  core_private.notification_payload(jsonb_populate_record(null::core.reminder_deliveries,
    '{"kind": "reminder", "key": "reminder:x", "item_id": "00000000-0000-7000-8000-000000000001",
      "person_id": "00000000-0000-4000-8000-00000000000a"}')) ->> 'body',
  'Sat 24 Oct 13:00 · The Ivy, Richmond',
  'EVT-003 4: an Event''s notification says when and where'
);
select is(
  core_private.notification_payload(jsonb_populate_record(null::core.reminder_deliveries,
    '{"kind": "reminder", "key": "reminder:x", "item_id": "00000000-0000-7000-8000-000000000001",
      "person_id": "00000000-0000-4000-8000-00000000000a"}')) -> 'actions',
  '[{"action": "snooze", "title": "Snooze 1 hour"}]'::jsonb,
  'EVT-003 4: an Event offers Snooze, not Done'
);
select is(
  core_private.notification_payload(jsonb_populate_record(null::core.reminder_deliveries,
    '{"kind": "reminder", "key": "reminder:y", "item_id": "00000000-0000-7000-8000-000000000002",
      "person_id": "00000000-0000-4000-8000-00000000000a"}')) ->> 'body',
  'Tue 1 Dec',
  'EVT-003 4: an all-day Event''s notification says its day'
);

select * from finish();
rollback;
