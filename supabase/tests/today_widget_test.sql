-- The Today widget (Stage 7 step 10, WID-002, ADR-0064): what the phone
-- reads is Plan's day, in Plan's order (the same examples as
-- src/lib/today-widget.test.ts); and a change elsewhere tells it to look.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(10);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'ann@example.com'),
  ('00000000-0000-4000-8000-00000000000b', 'bob@example.com');
select id as a_space from core.spaces where created_by = '00000000-0000-4000-8000-00000000000a' \gset
select id as b_space from core.spaces where created_by = '00000000-0000-4000-8000-00000000000b' \gset
update core.people set timezone = 'Europe/London';
insert into core.push_devices (id, person_id, kind, endpoint, label, created_at) values
  ('00000000-0000-7000-8000-0000000000f1', '00000000-0000-4000-8000-00000000000a', 'fcm',
   'fcm-token-ann-phone-0123456789', 'Android app', '2030-01-01 00:00:00+00');

select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}', true),
  set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000a', true);
set local role authenticated;
select core.device_secret('00000000-0000-7000-8000-0000000000f1') as secret \gset
reset role;

select (now() at time zone 'Europe/London')::date as today \gset
insert into core.items (id, type, title, space_id, owner_id, do_on, do_at, status, starts_at, ends_at, all_day, slot, created_at) values
  ('00000000-0000-7000-8000-000000000001', 'task', 'Pay rent', :'a_space', '00000000-0000-4000-8000-00000000000a',
   :'today', '09:00', 'active', null, null, null, null, '2026-10-01 09:00+00'),
  ('00000000-0000-7000-8000-000000000002', 'event', 'Dentist', :'a_space', '00000000-0000-4000-8000-00000000000a',
   null, null, 'active', (:'today'::date + time '14:00') at time zone 'Europe/London',
   (:'today'::date + time '15:00') at time zone 'Europe/London', false, null, '2026-10-01 09:00+00'),
  ('00000000-0000-7000-8000-000000000003', 'task', 'Renew insurance', :'a_space', '00000000-0000-4000-8000-00000000000a',
   :'today', null, 'done', null, null, null, null, '2026-10-01 09:00+00'),
  ('00000000-0000-7000-8000-000000000004', 'meal', 'Dinner', :'a_space', '00000000-0000-4000-8000-00000000000a',
   :'today', null, 'active', null, null, null, 'dinner', '2026-10-01 09:00+00'),
  ('00000000-0000-7000-8000-000000000005', 'task', 'Tomorrow', :'a_space', '00000000-0000-4000-8000-00000000000a',
   :'today'::date + 1, null, 'active', null, null, null, null, '2026-10-01 09:00+00'),
  ('00000000-0000-7000-8000-000000000007', 'task', 'Bob''s', :'b_space', '00000000-0000-4000-8000-00000000000b',
   :'today', null, 'active', null, null, null, null, '2026-10-01 09:00+00');

select is(
  (select array_agg(c ->> 'title' order by o)
   from core.device_plan('00000000-0000-7000-8000-0000000000f1', :'secret') p,
        jsonb_array_elements(p.cards) with ordinality as e(c, o)
   where p.day = :'today'),
  array['Renew insurance', 'Dinner', 'Pay rent', 'Dentist'],
  'WID-002 1: today in Plan''s order, untimed first, Meals by slot; nothing of Bob''s'
);
select is(
  (select array_agg(coalesce(c ->> 'time', '-') || ' ' || (c ->> 'done') order by o)
   from core.device_plan('00000000-0000-7000-8000-0000000000f1', :'secret') p,
        jsonb_array_elements(p.cards) with ordinality as e(c, o)
   where p.day = :'today'),
  array['- true', 'Dinner false', '09:00 false', '14:00 false'],
  'WID-002 1: each with Plan''s time, and done or not'
);
select is(
  (select c ->> 'colour' from core.device_plan('00000000-0000-7000-8000-0000000000f1', :'secret') p,
     jsonb_array_elements(p.cards) c where c ->> 'title' = 'Dentist'),
  'blue',
  'and its Type''s colour'
);
select is(
  (select array_agg(c ->> 'title') from core.device_plan('00000000-0000-7000-8000-0000000000f1', :'secret') p,
     jsonb_array_elements(p.cards) c where p.day = :'today'::date + 1),
  array['Tomorrow'],
  'WID-002 5: tomorrow is held too, for midnight'
);

update core.people set plan_hidden_types = '{meal,event}' where id = '00000000-0000-4000-8000-00000000000a';
select is(
  (select array_agg(c ->> 'title' order by o)
   from core.device_plan('00000000-0000-7000-8000-0000000000f1', :'secret') p,
        jsonb_array_elements(p.cards) with ordinality as e(c, o)
   where p.day = :'today'),
  array['Renew insurance', 'Pay rent'],
  'PLN-004: only the Types shown on Plan'
);
select isnt(
  (select look_wanted_at from core.push_devices where id = '00000000-0000-7000-8000-0000000000f1'),
  null,
  'Changing them elsewhere tells the phone to look'
);

select throws_ok(
  $$select * from core.device_plan('00000000-0000-7000-8000-0000000000f1', 'wrong')$$,
  '42501', null,
  'With the wrong secret, nothing'
);

-- A change to today, made elsewhere, tells the phone to look again.
update core.push_devices set look_wanted_at = null;
update core.items set title = 'Pay the rent' where id = '00000000-0000-7000-8000-000000000001';
select isnt(
  (select look_wanted_at from core.push_devices where id = '00000000-0000-7000-8000-0000000000f1'),
  null,
  'WID-002 5: an Item on today changed elsewhere: the phone looks again'
);
update core.push_devices set look_wanted_at = null;
update core.items set title = 'Bob''s own' where id = '00000000-0000-7000-8000-000000000007';
select is(
  (select look_wanted_at from core.push_devices where id = '00000000-0000-7000-8000-0000000000f1'),
  null,
  'Not for one it can''t read'
);
update core.items set title = 'Later' , do_on = :'today'::date + 30 where id = '00000000-0000-7000-8000-000000000005';
update core.push_devices set look_wanted_at = null;
update core.items set title = 'Much later' where id = '00000000-0000-7000-8000-000000000005';
select is(
  (select look_wanted_at from core.push_devices where id = '00000000-0000-7000-8000-0000000000f1'),
  null,
  'Nor for one a month away'
);
select * from finish();
rollback;
