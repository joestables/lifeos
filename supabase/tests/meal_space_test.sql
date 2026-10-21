-- Food shared through a Household: where new Meals go, a Meal in a
-- Household seen by its members, and the Household's staples.
-- MPL-001 5, MPL-002 2, MPL-005, PAN-002 1, HSH-003.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(9);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'ann@example.com'),
  ('00000000-0000-4000-8000-00000000000b', 'ben@example.com'),
  ('00000000-0000-4000-8000-00000000000c', 'cat@example.com');
insert into core.spaces (id, kind, name, created_by) values
  ('00000000-0000-7000-8000-0000000000f1', 'household', 'Home', '00000000-0000-4000-8000-00000000000a'),
  ('00000000-0000-7000-8000-0000000000f2', 'household', 'Cat''s', '00000000-0000-4000-8000-00000000000c');
insert into core.space_members (space_id, person_id, role) values
  ('00000000-0000-7000-8000-0000000000f1', '00000000-0000-4000-8000-00000000000a', 'owner'),
  ('00000000-0000-7000-8000-0000000000f1', '00000000-0000-4000-8000-00000000000b', 'member'),
  ('00000000-0000-7000-8000-0000000000f2', '00000000-0000-4000-8000-00000000000c', 'owner');

select id as ben_space from core.spaces
  where created_by = '00000000-0000-4000-8000-00000000000b' and kind = 'personal' \gset
select id as ann_space from core.spaces
  where created_by = '00000000-0000-4000-8000-00000000000a' and kind = 'personal' \gset

create function pg_temp.sign_in(p_person uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_person, 'role', 'authenticated')::text, true),
    set_config('request.jwt.claim.sub', p_person::text, true)
$$;
grant execute on function pg_temp.sign_in(uuid) to authenticated;
set local role authenticated;

select pg_temp.sign_in('00000000-0000-4000-8000-00000000000a');
select core.update_settings('{"meal_space_id": "00000000-0000-7000-8000-0000000000f1"}');
select is(
  (select meal_space_id from core.people where id = '00000000-0000-4000-8000-00000000000a'),
  '00000000-0000-7000-8000-0000000000f1'::uuid,
  'MPL-005: new Meals go to one of my Households'
);
select throws_ok(
  $$select core.update_settings('{"meal_space_id": "00000000-0000-7000-8000-0000000000f2"}')$$,
  '42501', null,
  'MPL-005: not to a Household I''m not in'
);
select core.update_settings('{"meal_space_id": null}');
select is(
  (select meal_space_id from core.people where id = '00000000-0000-4000-8000-00000000000a'),
  null,
  'MPL-005: or back to Personal'
);

select food.plan_meal('00000000-0000-7000-8000-000000000001',
  '{"title": "Out: Dishoom", "do_on": "2026-10-23", "slot": "dinner", "space_id": "00000000-0000-7000-8000-0000000000f1"}');
select food.add_pantry('00000000-0000-7000-8000-0000000000e1', '{"name": "Garlic"}');
select food.set_staple('00000000-0000-7000-8000-0000000000f1', '00000000-0000-7000-8000-0000000000e1', true, false);

select pg_temp.sign_in('00000000-0000-4000-8000-00000000000b');
select is(
  (select title from core.items where id = '00000000-0000-7000-8000-000000000001'),
  'Out: Dishoom',
  'MPL-001 5, HSH-003 1: a Meal in a Household is seen by its members'
);
select food.update_meal('00000000-0000-7000-8000-000000000001', '{"servings": 2}');
select is(
  (select servings from food.meal where item_id = '00000000-0000-7000-8000-000000000001'),
  2,
  'MPL-003: and any member changes it'
);
select throws_ok(
  format($$select core.update_item('00000000-0000-7000-8000-000000000001', '{"space_id": "%s"}')$$, :'ben_space'),
  '42501', null,
  'HSH-003 2: a member can''t take someone else''s Meal into their own Space'
);
select food.set_staple('00000000-0000-7000-8000-0000000000f1', '00000000-0000-7000-8000-0000000000e1', true, true);
select is(
  (select out_of_stock from food.staples where space_id = '00000000-0000-7000-8000-0000000000f1'),
  true,
  'PAN-002 1: any member marks the Household''s staple out of stock'
);

select pg_temp.sign_in('00000000-0000-4000-8000-00000000000a');
select core.update_item('00000000-0000-7000-8000-000000000001', format('{"space_id": "%s"}', :'ann_space')::jsonb);
select is(
  (select space_id from core.items where id = '00000000-0000-7000-8000-000000000001'),
  :'ann_space'::uuid,
  'HSH-003 2: its maker makes it Personal'
);
select core.update_item('00000000-0000-7000-8000-000000000001', '{"space_id": "00000000-0000-7000-8000-0000000000f1"}');

select pg_temp.sign_in('00000000-0000-4000-8000-00000000000c');
select is(
  (select count(*)::int from core.items where id = '00000000-0000-7000-8000-000000000001'),
  0,
  'HSH-003: someone outside the Household doesn''t see it'
);

select * from finish();
rollback;
