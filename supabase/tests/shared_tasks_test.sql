-- Tasks and Events shared with a Household (HSH-005; Joe, 4 November):
-- every member's own default Reminder, as their Settings give it; given and
-- taken as an Item moves between Spaces and as people join and leave; a
-- shared Task in every member's digest and overdue nudges; links across
-- the Household removed on leaving (ADR-0016).
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(15);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'ann@example.com'),
  ('00000000-0000-4000-8000-00000000000b', 'ben@example.com'),
  ('00000000-0000-4000-8000-00000000000c', 'cat@example.com');
select id as ann_space from core.spaces
  where created_by = '00000000-0000-4000-8000-00000000000a' and kind = 'personal' \gset
select id as ben_space from core.spaces
  where created_by = '00000000-0000-4000-8000-00000000000b' and kind = 'personal' \gset
-- Ben's default time is 08:00, and he has no default on Events.
update core.people set default_alert_time = '08:00', alert_defaults = '{"event": false}'
  where id = '00000000-0000-4000-8000-00000000000b';

create function pg_temp.sign_in(p_person uuid, p_email text) returns void language sql as $$
  select set_config('request.jwt.claims',
      json_build_object('sub', p_person, 'role', 'authenticated', 'email', p_email)::text, true),
    set_config('request.jwt.claim.sub', p_person::text, true)
$$;
grant execute on function pg_temp.sign_in(uuid, text) to authenticated;
set local role authenticated;

select pg_temp.sign_in('00000000-0000-4000-8000-00000000000a', 'ann@example.com');
select core.create_household('00000000-0000-7000-8000-0000000000f1', 'Home');
select core.invite('00000000-0000-7000-8000-0000000000a1', '00000000-0000-7000-8000-0000000000f1', 'ben@example.com');
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000b', 'ben@example.com');
select core.join_household('00000000-0000-7000-8000-0000000000a1');

-- ---------------------------------------------------------------------------
-- Ann makes a shared Task for 2030-01-08, and one of her own.
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000a', 'ann@example.com');
insert into core.items (id, type, title, space_id, owner_id, do_on) values
  ('00000000-0000-7000-8000-000000000001', 'task', 'Bins', '00000000-0000-7000-8000-0000000000f1', '00000000-0000-4000-8000-00000000000a', '2030-01-08'),
  ('00000000-0000-7000-8000-000000000002', 'task', 'Dentist', :'ann_space', '00000000-0000-4000-8000-00000000000a', '2030-01-08');
reset role;

select is(
  (select array_agg(person_id::text || ' ' || to_char(fires_at at time zone 'UTC', 'HH24:MI') order by person_id)
   from core.alerts where item_id = '00000000-0000-7000-8000-000000000001' and is_default),
  array['00000000-0000-4000-8000-00000000000a 09:00', '00000000-0000-4000-8000-00000000000b 08:00'],
  'HSH-005 4: each member has their own default on a shared Task, at their own time'
);
select is(
  (select count(*)::int from core.alerts where item_id = '00000000-0000-7000-8000-000000000002'),
  1,
  'A Personal Task has only its maker''s'
);

-- Ann shares her own Task, Labelled "Errands": Ben gains his default; hers
-- isn't doubled; her Personal Label comes off.
set local role authenticated;
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000a', 'ann@example.com');
select core.create_label('00000000-0000-7000-8000-0000000000c1', 'Errands');
select core.add_label('00000000-0000-7000-8000-000000000002', '00000000-0000-7000-8000-0000000000c1');
update core.items set space_id = '00000000-0000-7000-8000-0000000000f1' where id = '00000000-0000-7000-8000-000000000002';
reset role;
select is(
  (select count(*)::int from core.item_labels where item_id = '00000000-0000-7000-8000-000000000002'),
  0,
  'A Label is its Item''s Space''s: a Personal one comes off when the Item is shared'
);
select is(
  (select array_agg(person_id::text order by person_id) from core.alerts
   where item_id = '00000000-0000-7000-8000-000000000002' and is_default),
  array['00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000b'],
  'HSH-005 4: shared later, the other member gains their default'
);

-- And back to Personal: Ben's goes.
set local role authenticated;
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000a', 'ann@example.com');
update core.items set space_id = :'ann_space' where id = '00000000-0000-7000-8000-000000000002';
reset role;
select is(
  (select array_agg(person_id::text) from core.alerts where item_id = '00000000-0000-7000-8000-000000000002'),
  array['00000000-0000-4000-8000-00000000000a'],
  'HSH-005 4: made Personal again, the other member''s Reminders go'
);

-- A shared Event: Ben has no default on Events.
set local role authenticated;
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000a', 'ann@example.com');
insert into core.items (id, type, title, space_id, owner_id, starts_at, ends_at, all_day) values
  ('00000000-0000-7000-8000-000000000003', 'event', 'Dinner at Mum''s', '00000000-0000-7000-8000-0000000000f1',
   '00000000-0000-4000-8000-00000000000a', '2030-01-09 18:00+00', '2030-01-09 21:00+00', false);
reset role;
select is(
  (select array_agg(person_id::text) from core.alerts where item_id = '00000000-0000-7000-8000-000000000003'),
  array['00000000-0000-4000-8000-00000000000a'],
  'REM-007: a member whose Settings turn the default off has none'
);

-- Ben removes his default on the Bins; moving the date doesn't bring it back.
set local role authenticated;
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000b', 'ben@example.com');
select core.remove_default_alert('00000000-0000-7000-8000-000000000001');
update core.items set do_on = '2030-01-10' where id = '00000000-0000-7000-8000-000000000001';
reset role;
select is(
  (select array_agg(person_id::text) from core.alerts where item_id = '00000000-0000-7000-8000-000000000001'),
  array['00000000-0000-4000-8000-00000000000a'],
  'REM-002 2: a default one member removed stays removed; the other''s moves on'
);

-- ---------------------------------------------------------------------------
-- Cat joins: her defaults on what is still to come, not on the past.
insert into core.items (id, type, title, space_id, owner_id, do_on) values
  ('00000000-0000-7000-8000-000000000004', 'task', 'Last year''s', '00000000-0000-7000-8000-0000000000f1', '00000000-0000-4000-8000-00000000000a', '2020-01-01');
set local role authenticated;
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000a', 'ann@example.com');
select core.invite('00000000-0000-7000-8000-0000000000a2', '00000000-0000-7000-8000-0000000000f1', 'cat@example.com');
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000c', 'cat@example.com');
select core.join_household('00000000-0000-7000-8000-0000000000a2');
reset role;
select is(
  (select array_agg(item_id::text order by item_id) from core.alerts
   where person_id = '00000000-0000-4000-8000-00000000000c' and is_default),
  array['00000000-0000-7000-8000-000000000001', '00000000-0000-7000-8000-000000000003'],
  'HSH-005 6: joining gives my defaults on the Household''s Tasks and Events still to come'
);

update core.items set status = 'done' where id = '00000000-0000-7000-8000-000000000004';

-- ---------------------------------------------------------------------------
-- Everyone's Task: in each member's digest, and each one's overdue nudge.
select is(
  (select today from core_private.day_counts('00000000-0000-4000-8000-00000000000b', '2030-01-10')),
  1,
  'HSH-005 3: a shared Task counts in each member''s digest'
);
update core.people set digest_on = false;
insert into core.push_devices (id, person_id, endpoint, p256dh, auth, label, enabled) values
  ('00000000-0000-7000-8000-0000000000d1', '00000000-0000-4000-8000-00000000000a', 'https://push.example/ann', 'k', 'a', 'Ann', true),
  ('00000000-0000-7000-8000-0000000000d2', '00000000-0000-4000-8000-00000000000b', 'https://push.example/ben', 'k', 'a', 'Ben', true);
update core.items set due_on = '2030-01-10' where id = '00000000-0000-7000-8000-000000000001';
select core_private.queue_notifications('2030-01-11 09:00:30+00');
select is(
  (select array_agg(person_id::text order by person_id) from core.alert_deliveries
   where kind = 'overdue' and item_id = '00000000-0000-7000-8000-000000000001'),
  array['00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000b'],
  'REM-009: an overdue shared Task nudges each member, at their own time'
);
select core_private.queue_notifications('2030-01-11 09:05:30+00');
select is(
  (select count(*)::int from core.alert_deliveries where kind = 'overdue'),
  2,
  'REM-009 3: once each'
);

-- ---------------------------------------------------------------------------
-- Ben links a Task of his own to the shared Event, then leaves.
set local role authenticated;
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000b', 'ben@example.com');
insert into core.items (id, type, title, space_id, owner_id) values
  ('00000000-0000-7000-8000-000000000005', 'task', 'Buy wine', :'ben_space', '00000000-0000-4000-8000-00000000000b');
select throws_ok(
  $$insert into core.links (from_item, to_item, link_type, created_by) values
    ('00000000-0000-7000-8000-000000000005', '00000000-0000-7000-8000-000000000003', 'for', '00000000-0000-4000-8000-00000000000b')$$,
  '42501', null,
  'ADR-0017: a member can''t link a Personal Task to someone else''s shared Event'
);
reset role;
-- (Linking across Spaces needs both Items mine: made here as the database.)
insert into core.links (from_item, to_item, link_type, created_by) values
  ('00000000-0000-7000-8000-000000000005', '00000000-0000-7000-8000-000000000001', 'relates_to', '00000000-0000-4000-8000-00000000000b')
on conflict do nothing;
set local role authenticated;
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000b', 'ben@example.com');
select core.leave_household('00000000-0000-7000-8000-0000000000f1');
reset role;
select is(
  (select count(*)::int from core.alerts r join core.items i on i.id = r.item_id
   where r.person_id = '00000000-0000-4000-8000-00000000000b' and i.space_id = '00000000-0000-7000-8000-0000000000f1'),
  0,
  'HSH-004 5: leaving takes my Reminders on the Household''s Items'
);
select is(
  (select count(*)::int from core.links where from_item = '00000000-0000-7000-8000-000000000005'),
  0,
  'HSH-004 1: leaving removes links between my Items and the Household''s'
);
select is(
  (select count(*)::int from core.items i where i.id = '00000000-0000-7000-8000-000000000001'),
  1,
  'The Household''s Task stays'
);

select * from finish();
rollback;
