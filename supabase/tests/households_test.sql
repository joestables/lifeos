-- Households: made, renamed, invitations sent, joined, declined and
-- withdrawn; leaving, removing and deleting, with what each person keeps.
-- HSH-001, HSH-002, HSH-004, PAN-002; ADR-0016, ADR-0039, ADR-0051.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(33);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-00000000000a', 'ann@example.com', '{"full_name": "Ann Lee"}'),
  ('00000000-0000-4000-8000-00000000000b', 'ben@example.com', '{"full_name": "Ben Ng"}'),
  ('00000000-0000-4000-8000-00000000000c', 'cat@example.com', '{"full_name": "Cat Ito"}');
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

-- ---------------------------------------------------------------------------
-- Ann makes a Household; her staples come with her first.
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000a', 'ann@example.com');
select food.add_pantry('00000000-0000-7000-8000-0000000000e1', '{"name": "Garlic"}');
select food.keep_entry(:'ann_space', '00000000-0000-7000-8000-0000000000e1', 'staple', true);
select core.create_household('00000000-0000-7000-8000-0000000000f1', ' Home ');
select core.create_household('00000000-0000-7000-8000-0000000000f1', 'Home');
select is(
  (select array_agg(s.name || ':' || m.role) from core.spaces s join core.space_members m on m.space_id = s.id
   where s.kind = 'household'),
  array['Home:owner'],
  'HSH-001 1: a new Household, its maker the owner; made twice, once'
);
select is(
  (select array_agg(pantry_id::text || ':' || needed) from food.space_entries
   where space_id = '00000000-0000-7000-8000-0000000000f1'),
  array['00000000-0000-7000-8000-0000000000e1:true'],
  'PAN-002 1: my first Household starts with a copy of my staples'
);
select core.create_household('00000000-0000-7000-8000-0000000000f2', 'Allotment');
select is(
  (select count(*)::int from food.space_entries where space_id = '00000000-0000-7000-8000-0000000000f2'),
  0,
  'PAN-002 1: a second Household starts with none'
);
select throws_ok(
  $$select core.create_household('00000000-0000-7000-8000-0000000000f3', '  ')$$,
  '23514', null,
  'HSH-001 1: a Household needs a name'
);
select core.rename_household('00000000-0000-7000-8000-0000000000f1', 'The flat');
select is(
  (select name from core.spaces where id = '00000000-0000-7000-8000-0000000000f1'),
  'The flat',
  'HSH-001 3: the owner renames it'
);

-- ---------------------------------------------------------------------------
-- Invitations, by email (HSH-002).
select core.invite('00000000-0000-7000-8000-0000000000a1', '00000000-0000-7000-8000-0000000000f1', ' Ben@Example.com ');
select core.invite('00000000-0000-7000-8000-0000000000a2', '00000000-0000-7000-8000-0000000000f1', 'ben@example.com');
select core.invite('00000000-0000-7000-8000-0000000000a3', '00000000-0000-7000-8000-0000000000f1', 'cat@example.com');
select core.invite('00000000-0000-7000-8000-0000000000a4', '00000000-0000-7000-8000-0000000000f2', 'cat@example.com');
select is(
  (select array_agg(email order by email) from core.space_invites
   where space_id = '00000000-0000-7000-8000-0000000000f1'),
  array['ben@example.com', 'cat@example.com'],
  'HSH-002 1: the owner sees the invitations, one an address, in lower case'
);
select core.withdraw_invite('00000000-0000-7000-8000-0000000000a3');
select is(
  (select count(*)::int from core.space_invites where email = 'cat@example.com'),
  1,
  'HSH-002 4: the owner withdraws an invitation'
);
select throws_ok(
  $$select core.invite('00000000-0000-7000-8000-0000000000a5', '00000000-0000-7000-8000-0000000000f1', 'nobody')$$,
  '23514', null,
  'HSH-002 1: an invitation needs an email address'
);

select pg_temp.sign_in('00000000-0000-4000-8000-00000000000b', 'ben@example.com');
select is(
  (select array_agg(space_name || ' from ' || from_name) from core.my_invites()),
  array['The flat from Ann Lee'],
  'HSH-002 2: Ben sees the invitation waiting for him, and who sent it'
);
select is(
  (select count(*)::int from core.space_invites),
  0,
  'HSH-002: only the owner reads a Household''s invitations'
);
select throws_ok(
  $$select core.join_household('00000000-0000-7000-8000-0000000000a4')$$,
  'P0002', null,
  'HSH-002 2: Ben can''t take up Cat''s invitation'
);
select throws_ok(
  $$select core.invite('00000000-0000-7000-8000-0000000000a5', '00000000-0000-7000-8000-0000000000f1', 'dan@example.com')$$,
  '42501', null,
  'HSH-002: only the owner invites'
);
select is(
  (select count(*)::int from core.people where id = '00000000-0000-4000-8000-00000000000a'),
  0,
  'ACC-002: Ben doesn''t see Ann before he joins'
);
select core.join_household('00000000-0000-7000-8000-0000000000a1');
select is(
  (select role from core.space_members
   where space_id = '00000000-0000-7000-8000-0000000000f1' and person_id = '00000000-0000-4000-8000-00000000000b'),
  'member',
  'HSH-002 2: Ben joins as a member'
);
select is(
  (select count(*)::int from core.my_invites()),
  0,
  'HSH-002 2: the invitation is used up'
);
select is(
  (select array_agg(name order by name) from core.people),
  array['Ann Lee', 'Ben Ng'],
  'HSH-001 2: Ben sees the people of his Households'
);
select throws_ok(
  $$select core.rename_household('00000000-0000-7000-8000-0000000000f1', 'Mine')$$,
  '42501', null,
  'HSH-001 3: only the owner renames'
);
select throws_ok(
  $$select core.remove_member('00000000-0000-7000-8000-0000000000f1', '00000000-0000-4000-8000-00000000000a')$$,
  '42501', null,
  'HSH-004 2: only the owner removes people'
);

select pg_temp.sign_in('00000000-0000-4000-8000-00000000000c', 'cat@example.com');
select core.decline_invite('00000000-0000-7000-8000-0000000000a4');
select is(
  (select count(*)::int from core.my_invites()),
  0,
  'HSH-002 3: Cat declines'
);

-- ---------------------------------------------------------------------------
-- Leaving (HSH-004, ADR-0016, ADR-0051).
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000a', 'ann@example.com');
select food.create_recipe('00000000-0000-7000-8000-000000000001', '00000000-0000-7000-8000-000000000002',
  'Katsu curry', 'active', 'Standard');
select food.update_recipe('00000000-0000-7000-8000-000000000001', '{"category": "Dinner", "cuisine": "Japanese"}');
select core.create_item('00000000-0000-7000-8000-000000000010', 'task',
  '{"title": "Ann''s shared task", "space_id": "00000000-0000-7000-8000-0000000000f1"}');

select pg_temp.sign_in('00000000-0000-4000-8000-00000000000b', 'ben@example.com');
select food.add_variation('00000000-0000-7000-8000-000000000003', '00000000-0000-7000-8000-000000000001', 'Ben''s');
select core.create_item('00000000-0000-7000-8000-000000000011', 'task',
  '{"title": "Ben''s shared task", "space_id": "00000000-0000-7000-8000-0000000000f1"}');
select throws_ok(
  $$select core.delete_household('00000000-0000-7000-8000-0000000000f1')$$,
  '42501', null,
  'HSH-004 3: only the owner deletes'
);
select core.leave_household('00000000-0000-7000-8000-0000000000f1');
select is(
  (select space_id from core.items where id = '00000000-0000-7000-8000-000000000011'),
  :'ben_space'::uuid,
  'HSH-004 1: the shared Items Ben made become his Personal ones'
);
select is(
  (select count(*)::int from core.items where id in (
    '00000000-0000-7000-8000-000000000010', '00000000-0000-7000-8000-000000000001')),
  0,
  'HSH-004 1: he no longer sees Ann''s'
);
select is(
  (select array[r.title, r.space_id::text, fr.cuisine, (fr.default_variation = v.id)::text, r.status]
   from core.links l join core.items r on r.id = l.to_item join food.recipe fr on fr.item_id = r.id
   join core.items v on v.id = l.from_item
   where l.from_item = '00000000-0000-7000-8000-000000000003' and l.link_type = 'variation_of'),
  array['Katsu curry', :'ben_space', 'Japanese', 'true', 'idea'],
  'HSH-004 1, ADR-0051: Ben keeps his Variation under his own copy of the heading'
);
select is(
  (select count(*)::int from core.space_members where person_id = '00000000-0000-4000-8000-00000000000b'
   and space_id = '00000000-0000-7000-8000-0000000000f1'),
  0,
  'HSH-004 1: he''s no longer a member'
);

select pg_temp.sign_in('00000000-0000-4000-8000-00000000000a', 'ann@example.com');
select is(
  (select array_agg(l.from_item) from core.links l
   where l.to_item = '00000000-0000-7000-8000-000000000001' and l.link_type = 'variation_of'),
  array['00000000-0000-7000-8000-000000000002'::uuid],
  'ADR-0051: Ann''s Recipe keeps only her own'
);
select throws_ok(
  $$select core.leave_household('00000000-0000-7000-8000-0000000000f1')$$,
  '23514', null,
  'HSH-004 3: an owner can''t leave, only delete'
);

-- Back again, then removed.
select core.invite('00000000-0000-7000-8000-0000000000a6', '00000000-0000-7000-8000-0000000000f1', 'ben@example.com');
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000b', 'ben@example.com');
select core.join_household('00000000-0000-7000-8000-0000000000a6');
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000a', 'ann@example.com');
select core.remove_member('00000000-0000-7000-8000-0000000000f1', '00000000-0000-4000-8000-00000000000b');
select is(
  (select array_agg(person_id) from core.space_members where space_id = '00000000-0000-7000-8000-0000000000f1'),
  array['00000000-0000-4000-8000-00000000000a'::uuid],
  'HSH-004 2: the owner removes a member'
);
select throws_ok(
  $$select core.remove_member('00000000-0000-7000-8000-0000000000f1', '00000000-0000-4000-8000-00000000000a')$$,
  '23514', null,
  'HSH-004 2: an owner can''t remove themself'
);

-- Deleted: every shared Item goes Personal to whoever made it.
select core.delete_household('00000000-0000-7000-8000-0000000000f1');
select is(
  (select count(*)::int from core.spaces where id = '00000000-0000-7000-8000-0000000000f1'),
  0,
  'HSH-004 3: the owner deletes the Household'
);
select is(
  (select space_id from core.items where id = '00000000-0000-7000-8000-000000000010'),
  :'ann_space'::uuid,
  'HSH-004 3: its Items become Personal to whoever made them'
);
select is(
  (select array_agg(s.name) from core.spaces s where s.kind = 'household'),
  array['Allotment'],
  'HSH-004 3: her other Household stays'
);

-- Signed out, nothing.
reset role;
set local role anon;
select throws_ok(
  $$select core.create_household('00000000-0000-7000-8000-0000000000f4', 'Nope')$$,
  '42501', null,
  'HSH-001: signed out, no Household'
);
select throws_ok(
  $$select * from core.my_invites()$$,
  '42501', null,
  'HSH-002: signed out, no invitations'
);

select * from finish();
rollback;
