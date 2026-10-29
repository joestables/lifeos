-- A Pantry entry used only by past Meals can be deleted, their lines kept
-- as typed with its name; a Meal today or later keeps it (PAN-001 4).
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(3);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'ann@example.com');
create function pg_temp.sign_in(p_person uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_person, 'role', 'authenticated')::text, true),
    set_config('request.jwt.claim.sub', p_person::text, true)
$$;
grant execute on function pg_temp.sign_in(uuid) to authenticated;
set local role authenticated;
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000a');

select food.add_pantry('00000000-0000-7000-8000-0000000000e1', '{"name": "Milk", "aisle": "chilled"}');
select food.add_pantry('00000000-0000-7000-8000-0000000000e2', '{"name": "Banana", "aisle": "fruit_veg"}');
select food.plan_meal('00000000-0000-7000-8000-000000000001',
  '{"title": "Cornflakes", "do_on": "2020-01-01", "slot": "breakfast"}');
select food.plan_meal('00000000-0000-7000-8000-000000000002',
  '{"title": "Porridge", "do_on": "2099-01-01", "slot": "breakfast"}');
select food.add_meal_line('00000000-0000-7000-8000-0000000000d1', '00000000-0000-7000-8000-000000000001',
  '{"position": "a", "pantry_id": "00000000-0000-7000-8000-0000000000e1", "qty": 200, "unit": "ml"}');
select food.add_meal_line('00000000-0000-7000-8000-0000000000d2', '00000000-0000-7000-8000-000000000002',
  '{"position": "a", "pantry_id": "00000000-0000-7000-8000-0000000000e2", "qty": 1}');

select food.remove_pantry('00000000-0000-7000-8000-0000000000e1');
select is(
  (select count(*)::int from food.pantry where id = '00000000-0000-7000-8000-0000000000e1'),
  0,
  'PAN-001 4: an entry only past Meals use is deleted'
);
select is(
  (select coalesce(pantry_id::text, '') || '|' || text from food.meal_lines where id = '00000000-0000-7000-8000-0000000000d1'),
  '|Milk',
  'PAN-001 4: the past Meal''s line keeps its name, as typed'
);
select throws_ok(
  $$select food.remove_pantry('00000000-0000-7000-8000-0000000000e2')$$,
  '23503', null,
  'PAN-001 4: a Meal still to come keeps its entry'
);

select * from finish();
rollback;
