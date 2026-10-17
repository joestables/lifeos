-- Google Calendar, two-way: the bug hunt of 17 October (GCL-001, GCL-003,
-- GCL-004, GCL-005; ADR-0047, ADR-0048).
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(12);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'ann@example.com'),
  ('00000000-0000-4000-8000-00000000000b', 'bob@example.com');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}', true),
  set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000a', true);

set local role authenticated;
select core.calendar_begin('https://lifeos-bice-mu.vercel.app/settings') as state \gset
reset role;
select core.calendar_connected(:'state', 'ann@gmail.com', 'refresh') ->> 'connection' as conn \gset
select core.calendar_set_calendars(:'conn', '[
  {"id": "ann@gmail.com", "name": "Ann", "can_edit": true, "primary": true},
  {"id": "work", "name": "Work", "can_edit": true}
]');
select (select id from core.calendar_links where calendar_id = 'ann@gmail.com') as main \gset
select (select id from core.calendar_links where calendar_id = 'work') as work \gset
set local role authenticated;
select core.set_calendar_level(:'main', 'two_way');
select core.set_calendar_level(:'work', 'two_way');
select core.set_new_events_calendar(:'main');
-- Made in LifeOS: Dinner and Squash.
select core.create_item('00000000-0000-7000-8000-000000000001', 'event',
  '{"title": "Dinner", "starts_at": "2026-10-21T18:30:00Z", "ends_at": "2026-10-21T20:30:00Z"}');
select core.create_item('00000000-0000-7000-8000-000000000002', 'event',
  '{"title": "Squash", "starts_at": "2026-10-22T18:00:00Z", "ends_at": "2026-10-22T19:00:00Z"}');
reset role;
select core.calendar_sent(o.id, jsonb_build_array(jsonb_build_object('item_id', o.item_id,
  'link', :'main', 'external_id', 'g-' || right(o.item_id::text, 1), 'etag', '"1"',
  'updated', '2026-10-16T10:00:00Z')), null, o.queued_at)
from core_private.calendar_outbox o where o.sent_at is null;
-- From Google, in Work: Standup.
select core.calendar_save_events(:'work', '[{"external_id": "g-standup", "updated": "2026-10-16T09:00:00Z",
  "title": "Standup", "starts_at": "2026-10-20T09:00:00Z", "ends_at": "2026-10-20T09:15:00Z",
  "all_day": false, "raw": {"id": "g-standup"}}]');

select ok((select made_in_lifeos from core.external_refs where external_id = 'g-1'),
  'An Event sent from LifeOS is known as made in LifeOS');

-- A change made while its job is with Google stays waiting.
set local role authenticated;
select core.update_item('00000000-0000-7000-8000-000000000001', '{"title": "Dinner, 7"}');
reset role;
-- Claimed a minute ago (a test runs in one moment).
update core_private.calendar_outbox set queued_at = queued_at - interval '1 minute'
where item_id = '00000000-0000-7000-8000-000000000001' and sent_at is null;
select o.id as job, o.queued_at as claimed from core_private.calendar_outbox o
where o.item_id = '00000000-0000-7000-8000-000000000001' and o.sent_at is null \gset
set local role authenticated;
select core.update_item('00000000-0000-7000-8000-000000000001', '{"title": "Dinner, 8"}');
reset role;
select core.calendar_sent(:job, '[]', null, :'claimed');
select is((select count(*)::int from core_private.calendar_outbox where id = :job and sent_at is null), 1,
  'ADR-0048: a change made while its job was with Google still goes');

-- Deleted, then restored: Google's cancellation, older, doesn't win.
set local role authenticated;
select core.archive_item('00000000-0000-7000-8000-000000000002');
select core.restore_item('00000000-0000-7000-8000-000000000002');
reset role;
select core.calendar_save_events(:'main', '[{"external_id": "g-2", "cancelled": true, "updated": "2026-10-16T10:05:00Z"}]');
select ok((select archived_at is null from core.items where id = '00000000-0000-7000-8000-000000000002'),
  'ADR-0048: restored after a delete, Google''s older cancellation doesn''t delete it again');

-- An Event switched into a Task stays a Task when Google deletes its event.
set local role authenticated;
select core.convert_item('00000000-0000-7000-8000-000000000002', 'task');
reset role;
select core.calendar_save_events(:'main', '[{"external_id": "g-2", "cancelled": true, "updated": "2099-01-01T00:00:00Z"}]');
select ok((select archived_at is null from core.items where id = '00000000-0000-7000-8000-000000000002'),
  'ADR-0048: a Task switched from an Event isn''t deleted with its old Google event');
set local role authenticated;
select lives_ok($$select core.update_item('00000000-0000-7000-8000-000000000002', '{"status": "done"}')$$,
  'and it can be ticked off');
reset role;

-- My id is matched only to my own Event.
select core.calendar_save_events(:'work', '[{"external_id": "g-other", "title": "Bob''s",
  "starts_at": "2026-10-23T09:00:00Z", "ends_at": "2026-10-23T10:00:00Z", "all_day": false,
  "raw": {"id": "g-other", "extendedProperties": {"private": {"lifeosId": "00000000-0000-7000-8000-0000000000b1"}}}}]');
select is((select title from core.items i join core.external_refs r on r.item_id = i.id where r.external_id = 'g-other'),
  'Bob''s', 'Someone else''s id brings in a new Event of mine, not theirs');

-- A changed repeat in Google: instances it no longer has go.
select core.calendar_save_events(:'work', '[
  {"external_id": "r_1", "title": "Yoga", "starts_at": "2026-10-20T07:00:00Z", "ends_at": "2026-10-20T08:00:00Z", "all_day": false, "raw": {"id": "r_1", "recurringEventId": "r"}},
  {"external_id": "r_2", "title": "Yoga", "starts_at": "2026-10-27T07:00:00Z", "ends_at": "2026-10-27T08:00:00Z", "all_day": false, "raw": {"id": "r_2", "recurringEventId": "r"}}]');
select is(core.calendar_prune(:'work', '[{"master": "r", "keep": ["r_1"]}]',
  '2026-09-18T00:00:00Z', '2027-01-08T00:00:00Z'), 1, 'GCL-003 3: an instance a changed repeat dropped goes');
select ok((select archived_at is null from core.items i join core.external_refs r on r.item_id = i.id
  where r.external_id = 'r_1'), 'and one it still has stays');

-- An LifeOS-made Event on a calendar turned incoming is still mine to change.
set local role authenticated;
select core.set_calendar_level(:'main', 'incoming');
select lives_ok($$select core.update_item('00000000-0000-7000-8000-000000000001', '{"title": "Dinner at 8"}')$$,
  'GCL-004: an Event I made isn''t locked as Google''s');

-- Disconnecting: what Google brought in goes; what I made stays.
reset role;
select core.calendar_disconnected(:'conn');
select ok((select archived_at is null from core.items where id = '00000000-0000-7000-8000-000000000001'),
  'GCL-001 3: an Event I made stays when I disconnect');
select ok((select archived_at is not null from core.items i join core.external_refs r on r.item_id = i.id
  where r.external_id = 'g-standup'), 'GCL-001 3: one from Google goes');

-- A repeat I made, deleted in Google, ends in LifeOS.
insert into core.series (id, type, owner_id, space_id, mode, rule, starts_on, timezone, template)
select '00000000-0000-7000-8000-0000000000f1', 'event', p.id, s.id, 'schedule', 'FREQ=WEEKLY', '2026-10-21',
  'Europe/London', '{"title": "5-a-side"}'
from core.people p join core.spaces s on s.created_by = p.id and s.kind = 'personal'
where p.id = '00000000-0000-4000-8000-00000000000a';
insert into core_private.series_refs (series_id, calendar_link_id, external_id) values
  ('00000000-0000-7000-8000-0000000000f1', :'main', 'g-series');
select core.calendar_save_events(:'main', '[{"external_id": "g-series", "cancelled": true}]');
select ok((select ended_on is not null from core.series where id = '00000000-0000-7000-8000-0000000000f1'),
  'ADR-0048: a repeat I made, deleted in Google, ends in LifeOS');

select * from finish();
rollback;
