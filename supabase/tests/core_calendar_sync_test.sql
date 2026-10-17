-- Google Calendar's sync, as the Edge Functions drive it (Stage 3, plan
-- step 9). GCL-001, GCL-002, GCL-003, GCL-006; ADR-0047.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(23);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'ann@example.com');

select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}', true),
  set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000a', true);

-- ---------------------------------------------------------------------------
-- GCL-001: I start; Google says yes; the token is in Vault.

set local role authenticated;
select core.calendar_begin('https://lifeos-bice-mu.vercel.app/settings') as state \gset
select throws_ok(
  $$select core.calendar_token(null)$$,
  '42501', null,
  'ADR-0047: the app can''t read a refresh token'
);
reset role;

select is(
  core.calendar_connected(:'state', 'ann@gmail.com', 'refresh-1') ->> 'return_to',
  'https://lifeos-bice-mu.vercel.app/settings',
  'GCL-001: Google''s answer finds me, and where to send me back'
);
select (select id from core.connections) as conn \gset
select is(core.calendar_token(:'conn'), 'refresh-1', 'ADR-0047: the refresh token is kept in Vault');
select throws_ok(
  format($$select core.calendar_connected(%L, 'ann@gmail.com', 'refresh-2')$$, :'state'),
  '22023', null,
  'GCL-001: a state is good once'
);

-- ---------------------------------------------------------------------------
-- GCL-001 2: my main calendar incoming, the rest off; later, levels are kept.

select core.calendar_set_calendars(:'conn', '[
  {"id": "ann@gmail.com", "name": "Ann", "can_edit": true, "primary": true},
  {"id": "family", "name": "Family", "can_edit": true},
  {"id": "holidays", "name": "UK holidays", "can_edit": false}
]');
select is(
  (select array_agg(level order by name) from core.calendar_links),
  array['incoming', 'off', 'off'],
  'GCL-001 2: the main calendar is incoming and the rest off'
);
select (select id from core.calendar_links where calendar_id = 'ann@gmail.com') as main \gset
select (select id from core.calendar_links where calendar_id = 'family') as family \gset
update core.calendar_links set level = 'incoming' where id = :'family';
select core.calendar_set_calendars(:'conn', '[
  {"id": "ann@gmail.com", "name": "Ann", "can_edit": true, "primary": true},
  {"id": "family", "name": "Family (shared)", "can_edit": true},
  {"id": "work", "name": "Work", "can_edit": false}
]');
select is(
  (select array_agg(name || ':' || level order by name) from core.calendar_links),
  array['Ann:incoming', 'Family (shared):incoming', 'UK holidays:off', 'Work:off'],
  'GCL-002: a level I chose is kept; a new calendar starts off'
);
select is(
  (select count(*)::int from core.calendars_to_sync(:'conn')),
  2,
  'ADR-0047: only the calendars that are on are read'
);

-- ---------------------------------------------------------------------------
-- GCL-003: Events come in, once, Personal, with no Reminder.

select core.calendar_save_events(:'main', '[
  {"external_id": "e1", "etag": "1", "updated": "2026-10-16T09:00:00Z", "title": "Dentist",
   "place": "Smile Clinic", "starts_at": "2026-10-20T08:30:00Z", "ends_at": "2026-10-20T09:00:00Z",
   "all_day": false, "raw": {"id": "e1"}},
  {"external_id": "e2", "etag": "1", "title": "Edinburgh", "starts_at": "2026-10-24T00:00:00Z",
   "ends_at": "2026-10-27T00:00:00Z", "all_day": true, "raw": {"id": "e2"}},
  {"external_id": "w_20261021", "etag": "1", "title": "5-a-side", "starts_at": "2026-10-21T18:00:00Z",
   "ends_at": "2026-10-21T19:00:00Z", "all_day": false, "raw": {"id": "w_20261021", "recurringEventId": "w"}},
  {"external_id": "w_20261028", "etag": "1", "title": "5-a-side", "starts_at": "2026-10-28T19:00:00Z",
   "ends_at": "2026-10-28T20:00:00Z", "all_day": false, "raw": {"id": "w_20261028", "recurringEventId": "w"}}
]');
select (select item_id from core.external_refs where external_id = 'e1') as dentist \gset
select is(
  (select row(type, title, place, s.kind)::text from core.items i join core.spaces s on s.id = i.space_id where i.id = :'dentist'),
  row('event', 'Dentist', 'Smile Clinic', 'personal')::text,
  'GCL-003 1: an Event from Google is an Event in my Personal Space'
);
select is(
  (select count(*)::int from core.reminders r join core.external_refs x on x.item_id = r.item_id),
  0,
  'GCL-003 1: an Event from Google has no Reminder'
);
select core.calendar_save_events(:'main', '[
  {"external_id": "e1", "etag": "2", "title": "Dentist (check-up)", "place": "Smile Clinic",
   "starts_at": "2026-10-20T09:30:00Z", "ends_at": "2026-10-20T10:00:00Z", "all_day": false, "raw": {"id": "e1"}}
]');
select is(
  (select count(*)::int from core.items where type = 'event'),
  4,
  'GCL-003 4: the same event again makes nothing new'
);
select is(
  (select title || ' ' || starts_at::text from core.items where id = :'dentist'),
  'Dentist (check-up) 2026-10-20 09:30:00+00',
  'GCL-003 2: a change in Google changes the Event'
);
select is(
  (select all_day::text || ' ' || ends_at::text from core.items i join core.external_refs x on x.item_id = i.id where x.external_id = 'e2'),
  'true 2026-10-27 00:00:00+00',
  'EVT-001 3: an all-day event comes in as its dates'
);

select core.calendar_save_events(:'main', '[{"external_id": "e1", "cancelled": true}]');
select isnt(
  (select archived_at from core.items where id = :'dentist'),
  null,
  'GCL-003 2: deleted in Google, it goes to Recently deleted'
);
select core.calendar_save_events(:'main', '[
  {"external_id": "e1", "etag": "3", "title": "Dentist (check-up)", "starts_at": "2026-10-20T09:30:00Z",
   "ends_at": "2026-10-20T10:00:00Z", "all_day": false, "raw": {"id": "e1"}}
]');
select is((select archived_at from core.items where id = :'dentist'), null, 'GCL-003 2: back in Google, it is back');

select core.calendar_save_events(:'main', '[{"external_id": "w_20261028", "cancelled": true}]');
select is(
  (select array_agg(x.external_id order by x.external_id) from core.items i join core.external_refs x on x.item_id = i.id
   where i.archived_at is null and x.external_id like 'w\_%'),
  array['w_20261021'],
  'GCL-003 3: one instance deleted in Google takes only that one'
);
select core.calendar_save_events(:'main', '[{"external_id": "w", "cancelled": true}]');
select is(
  (select count(*)::int from core.items i join core.external_refs x on x.item_id = i.id
   where i.archived_at is null and x.external_id like 'w\_%'),
  0,
  'GCL-003 3: a repeating event deleted in Google takes its instances'
);

set local role authenticated;
select throws_ok(
  format($$select core.calendar_save_events(%L, '[]')$$, :'main'),
  '42501', null,
  'ADR-0047: only the sync writes what Google sends'
);
select is(
  (select count(*)::int from core.external_refs),
  4,
  'GCL-003: I can see which Events came from Google'
);
reset role;

-- ---------------------------------------------------------------------------
-- GCL-006: broken, recorded and counted; GCL-001 3: disconnected.

select core.calendar_broken(:'conn', 'invalid_grant');
select is(
  (select state from core.connections where id = :'conn'),
  'broken',
  'GCL-006 1: Google refusing the token breaks the connection'
);
select ok(
  (ops.health_check()).problems @> '[{"check": "calendar"}]',
  'GCL-006 1: the nightly health check counts it'
);
select is(
  (select count(*)::int from core.calendars_to_sync(:'conn')),
  0,
  'GCL-006: a broken connection isn''t read'
);

select core.calendar_disconnected(:'conn');
select is(
  (select count(*)::int from core.items i join core.external_refs x on x.item_id = i.id where i.archived_at is null),
  0,
  'GCL-001 3: disconnected, the Events it brought in leave Plan'
);
select is(core.calendar_token(:'conn'), '', 'GCL-001 3: disconnected, the token is gone');

select * from finish();
rollback;
