-- An entry's default unit learnt from its first line with a unit (PAN-004
-- 3), and a Recipe's Meal serving what its Variation does (MPL-002 2).
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(5);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'ann@example.com');

create function pg_temp.sign_in(p_person uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_person, 'role', 'authenticated')::text, true),
    set_config('request.jwt.claim.sub', p_person::text, true)
$$;
grant execute on function pg_temp.sign_in(uuid) to authenticated;
set local role authenticated;
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000a');

select food.create_recipe('00000000-0000-7000-8000-000000000001', '00000000-0000-7000-8000-000000000002',
  'Katsu curry', 'active', 'Standard');
select food.add_pantry('00000000-0000-7000-8000-0000000000e1', '{"name": "Rice"}');
select food.add_pantry('00000000-0000-7000-8000-0000000000e2', '{"name": "Panko", "default_unit": "g"}');
select food.add_pantry('00000000-0000-7000-8000-0000000000e3', '{"name": "Milk", "aisle": "chilled"}');

select food.add_line('00000000-0000-7000-8000-0000000000d1', '00000000-0000-7000-8000-000000000002',
  '{"position": "a", "pantry_id": "00000000-0000-7000-8000-0000000000e1", "qty": 2}');
select is(
  (select default_unit from food.pantry where id = '00000000-0000-7000-8000-0000000000e1'),
  null,
  'PAN-004 3: a line with no unit teaches nothing'
);
select food.update_line('00000000-0000-7000-8000-0000000000d1', '{"unit": "cup"}');
select is(
  (select default_unit from food.pantry where id = '00000000-0000-7000-8000-0000000000e1'),
  'cup',
  'PAN-004 3: the first unit given becomes the entry''s default'
);
select food.add_line('00000000-0000-7000-8000-0000000000d2', '00000000-0000-7000-8000-000000000002',
  '{"position": "b", "pantry_id": "00000000-0000-7000-8000-0000000000e2", "qty": 1, "unit": "kg"}');
select is(
  (select default_unit from food.pantry where id = '00000000-0000-7000-8000-0000000000e2'),
  'g',
  'PAN-004 3: a default already set stays'
);

select food.plan_meal('00000000-0000-7000-8000-000000000003',
  '{"title": "Cornflakes", "do_on": "2026-10-24", "slot": "breakfast"}');
select food.add_meal_line('00000000-0000-7000-8000-0000000000d3', '00000000-0000-7000-8000-000000000003',
  '{"position": "a", "pantry_id": "00000000-0000-7000-8000-0000000000e3", "qty": 200, "unit": "ml"}');
select is(
  (select default_unit from food.pantry where id = '00000000-0000-7000-8000-0000000000e3'),
  'ml',
  'PAN-004 3: a Meal''s line teaches it too'
);

select food.plan_meal('00000000-0000-7000-8000-000000000004',
  '{"title": "Katsu curry", "do_on": "2026-10-24", "slot": "dinner", "variation": "00000000-0000-7000-8000-000000000002"}');
select food.update_variation('00000000-0000-7000-8000-000000000002', '{"servings": 4}');
select is(
  (select servings from food.meal where item_id = '00000000-0000-7000-8000-000000000004'),
  null,
  'MPL-002 2: a Recipe''s Meal keeps no servings of its own, so it serves the Variation''s'
);

select * from finish();
rollback;
