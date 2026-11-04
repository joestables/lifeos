-- Two people in a Household, before others than Joe use LifeOS (the
-- multi-user bug hunt, 4 November 2026): who made an Item stays who made
-- it; a Reminder can't be moved onto what I can't see; and after leaving,
-- nothing more arrives about the Household's Items, and Done does nothing.
-- HSH-003 3, HSH-004, REM-004; ADR-0016.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(9);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'ann@example.com'),
  ('00000000-0000-4000-8000-00000000000b', 'ben@example.com');
select id as ann_space from core.spaces
  where created_by = '00000000-0000-4000-8000-00000000000a' and kind = 'personal' \gset
select id as ben_space from core.spaces
  where created_by = '00000000-0000-4000-8000-00000000000b' and kind = 'personal' \gset

create function pg_temp.sign_in(p_person uuid, p_email text) returns void language sql as $$
  select set_config('request.jwt.claims',
      json_build_object('sub', p_person, 'role', 'authenticated', 'email', p_email)::text, true),
    set_config('request.jwt.claim.sub', p_person::text, true)
$$;
grant execute on function pg_temp.sign_in(uuid, text) to authenticated;
set local role authenticated;

-- Ann's Household, which Ben joins; a shared Task, and one of her own.
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000a', 'ann@example.com');
select core.create_household('00000000-0000-7000-8000-0000000000f1', 'Home');
select core.invite('00000000-0000-7000-8000-0000000000a1', '00000000-0000-7000-8000-0000000000f1', 'ben@example.com');
insert into core.items (id, type, title, space_id, owner_id) values
  ('00000000-0000-7000-8000-000000000001', 'task', 'Bins', '00000000-0000-7000-8000-0000000000f1', '00000000-0000-4000-8000-00000000000a'),
  ('00000000-0000-7000-8000-000000000002', 'task', 'Private', :'ann_space', '00000000-0000-4000-8000-00000000000a');
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000b', 'ben@example.com');
select core.join_household('00000000-0000-7000-8000-0000000000a1');

-- ---------------------------------------------------------------------------
-- Who made it stays who made it.
select throws_ok(
  $$update core.items set owner_id = '00000000-0000-4000-8000-00000000000b'
    where id = '00000000-0000-7000-8000-000000000001'$$,
  '42501', null,
  'HSH-003 3: a member can''t make someone else''s shared Item theirs'
);
select throws_ok(
  format($$update core.items set owner_id = '00000000-0000-4000-8000-00000000000b', space_id = %L
    where id = '00000000-0000-7000-8000-000000000001'$$, :'ben_space'),
  '42501', null,
  'HSH-003 3: nor so take it to their own Personal Space'
);
select lives_ok(
  $$update core.items set title = 'Put the bins out' where id = '00000000-0000-7000-8000-000000000001'$$,
  'Editing a shared Item still works'
);

-- ---------------------------------------------------------------------------
-- A Reminder stays on something I can see.
insert into core.reminders (id, item_id, person_id, fixed_at) values
  ('00000000-0000-7000-8000-0000000000e1', '00000000-0000-7000-8000-000000000001',
   '00000000-0000-4000-8000-00000000000b', '2030-01-08 20:00+00');
select throws_ok(
  $$update core.reminders set item_id = '00000000-0000-7000-8000-000000000002'
    where id = '00000000-0000-7000-8000-0000000000e1'$$,
  '42501', null,
  'REM-002: my Reminder can''t be moved onto an Item I can''t see'
);
select lives_ok(
  $$update core.reminders set fixed_at = '2030-01-08 21:00+00' where id = '00000000-0000-7000-8000-0000000000e1'$$,
  'Changing my Reminder on what I can see still works'
);

-- ---------------------------------------------------------------------------
-- Ben is removed: what was waiting for him about the Household isn't sent.
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000a', 'ann@example.com');
select core.remove_member('00000000-0000-7000-8000-0000000000f1', '00000000-0000-4000-8000-00000000000b');
reset role;

insert into core.push_devices (id, person_id, endpoint, p256dh, auth, label, enabled) values
  ('00000000-0000-7000-8000-0000000000d1', '00000000-0000-4000-8000-00000000000a', 'https://push.example/ann', 'k', 'a', 'Ann', true),
  ('00000000-0000-7000-8000-0000000000d2', '00000000-0000-4000-8000-00000000000b', 'https://push.example/ben', 'k', 'a', 'Ben', true);
insert into core.reminders (id, item_id, person_id, fixed_at) values
  ('00000000-0000-7000-8000-0000000000e2', '00000000-0000-7000-8000-000000000001',
   '00000000-0000-4000-8000-00000000000a', '2030-01-08 20:00+00');
insert into core.reminder_deliveries (kind, key, person_id, device_id, reminder_id, item_id, fire_at) values
  ('reminder', 'reminder:ann', '00000000-0000-4000-8000-00000000000a', '00000000-0000-7000-8000-0000000000d1',
   '00000000-0000-7000-8000-0000000000e2', '00000000-0000-7000-8000-000000000001', now() - interval '1 minute'),
  ('reminder', 'reminder:ben', '00000000-0000-4000-8000-00000000000b', '00000000-0000-7000-8000-0000000000d2',
   '00000000-0000-7000-8000-0000000000e1', '00000000-0000-7000-8000-000000000001', now() - interval '1 minute');

select is(
  (select array_agg(endpoint) from core.claim_deliveries()),
  array['https://push.example/ann'],
  'REM-004: only Ann, still in the Household, is notified about its Task'
);
select is(
  (select status from core.reminder_deliveries where key = 'reminder:ben'),
  'skipped',
  'REM-004: Ben''s, after he was removed, is skipped'
);

-- His notification from before still has its Done button: it does nothing now.
select is(
  core.act_on_delivery(
    (select id from core.reminder_deliveries where key = 'reminder:ben'),
    (select token from core.reminder_deliveries where key = 'reminder:ben'),
    'done'),
  false,
  'HSH-004: Done from a notification does nothing after leaving'
);
select is(
  (select status from core.items where id = '00000000-0000-7000-8000-000000000001'),
  'active',
  'HSH-004: the Household''s Task stays open'
);

select * from finish();
rollback;
