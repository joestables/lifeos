-- Deleting a repeating Item: this one, or this and all following (Joe,
-- 14 November). ADR-0022 (amended), ITM-002 3.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(8);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'ann@example.com');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}', true),
  set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000a', true);

-- Ann's calendar goes both ways.
set local role authenticated;
select core.calendar_begin('https://lifeos-bice-mu.vercel.app/settings') as state \gset
reset role;
select core.calendar_connected(:'state', 'ann@gmail.com', 'refresh') ->> 'connection' as conn \gset
select core.calendar_set_calendars(:'conn', '[{"id": "ann@gmail.com", "name": "Ann", "can_edit": true, "primary": true}]');
select (select id from core.calendar_links where calendar_id = 'ann@gmail.com') as main \gset

-- "5-a-side" every Wednesday, four weeks made; the third one changed.
set local role authenticated;
select core.set_calendar_level(:'main', 'two_way');
select core.set_new_events_calendar(:'main');
select core.create_item('00000000-0000-7000-8000-000000000001', 'event',
  '{"title": "5-a-side", "starts_at": "2026-10-21T18:00:00Z", "ends_at": "2026-10-21T19:00:00Z"}');
select core.set_repeat('00000000-0000-7000-8000-000000000001', '00000000-0000-7000-8000-0000000000f1',
  'schedule', 'FREQ=WEEKLY;BYDAY=WE', '2026-10-21', 'Europe/London',
  '{"title": "5-a-side", "start_time": "19:00", "duration_minutes": 60}',
  '[{"id": "00000000-0000-7000-8000-000000000001", "on": "2026-10-21"},
    {"id": "00000000-0000-7000-8000-000000000002", "on": "2026-10-28"},
    {"id": "00000000-0000-7000-8000-000000000003", "on": "2026-11-04"},
    {"id": "00000000-0000-7000-8000-000000000004", "on": "2026-11-11"}]', '2026-11-11');
select core.update_item('00000000-0000-7000-8000-000000000003', '{"title": "5-a-side, the final"}');
reset role;
update core_private.calendar_outbox set sent_at = now() where sent_at is null;

-- Repeat None keeps the one I changed (ADR-0022) ...
set local role authenticated;
select core.stop_repeat('00000000-0000-7000-8000-000000000001');
reset role;
select is(
  (select count(*)::int from core.items where series_id = '00000000-0000-7000-8000-0000000000f1' and archived_at is null),
  2,
  'ADR-0022: Repeat None ends the series but keeps the occurrence I changed'
);
update core.series set ended_on = null where id = '00000000-0000-7000-8000-0000000000f1';
update core.items set archived_at = null where series_id = '00000000-0000-7000-8000-0000000000f1';
update core_private.calendar_outbox set sent_at = now() where sent_at is null;

-- ... Delete, this and all following, takes it too.
set local role authenticated;
select core.delete_following('00000000-0000-7000-8000-000000000002');
reset role;
select is(
  (select array_agg(occurrence_on::text order by occurrence_on) from core.items
   where series_id = '00000000-0000-7000-8000-0000000000f1' and archived_at is null),
  array['2026-10-21'],
  'ITM-002 3: this occurrence and every later one go, the changed one too; the earlier stays'
);
select is(
  (select ended_on::text from core.series where id = '00000000-0000-7000-8000-0000000000f1'),
  '2026-10-27',
  'ITM-002 3: the series ends the day before'
);
select is(
  (select array_agg(coalesce(item_id::text, 'series')) from core_private.calendar_outbox where sent_at is null),
  array['series'],
  'ITM-002 3: Google is sent the series, not a delete of each instance'
);

-- From the first: the whole series.
set local role authenticated;
select core.delete_following('00000000-0000-7000-8000-000000000001');
reset role;
select is(
  (select count(*)::int from core.items where series_id = '00000000-0000-7000-8000-0000000000f1' and archived_at is null),
  0,
  'ITM-002 3: from the first occurrence, every one goes'
);

-- One that doesn't repeat is simply deleted.
set local role authenticated;
select core.create_item('00000000-0000-7000-8000-000000000009', 'task', '{"title": "Bins"}');
select core.delete_following('00000000-0000-7000-8000-000000000009');
reset role;
select isnt(
  (select archived_at from core.items where id = '00000000-0000-7000-8000-000000000009'),
  null,
  'ITM-002 3: an Item that doesn''t repeat is deleted'
);

-- Only my own.
insert into auth.users (id, email) values ('00000000-0000-4000-8000-00000000000b', 'ben@example.com');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-00000000000b", "role": "authenticated"}', true),
  set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000b', true);
set local role authenticated;
select throws_ok(
  $$select core.delete_following('00000000-0000-7000-8000-000000000001')$$,
  'P0002', null,
  'ADR-0023: Ben can''t delete Ann''s'
);
reset role;
select is(
  (select ended_on::text from core.series where id = '00000000-0000-7000-8000-0000000000f1'),
  '2026-10-20',
  'ADR-0023: and her series is as she left it'
);

select * from finish();
rollback;
