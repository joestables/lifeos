-- A Meal's line on a shop has the same id every time it is written (SHP-004
-- 3; Joe, 26 October): a tick sent before the Meal, or across a rewrite,
-- reaches it.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(4);

insert into auth.users (id, email) values ('00000000-0000-4000-8000-00000000000a', 'ann@example.com');
create function pg_temp.sign_in(p_person uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_person, 'role', 'authenticated')::text, true),
    set_config('request.jwt.claim.sub', p_person::text, true)
$$;
grant execute on function pg_temp.sign_in(uuid) to authenticated;

-- The app's mealLineId gives the same (src/lib/line-id.test.ts).
select is(
  shopping_private.line_id('00000000-0000-7000-8000-000000000021', '00000000-0000-7000-8000-000000000011',
    '00000000-0000-7000-8000-0000000000d1'),
  '4e544205-b123-98de-a9b9-0e38b01601e0'::uuid,
  'SHP-004 3: the three ids hashed, as the app hashes them'
);

set local role authenticated;
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000a');
select food.add_pantry('00000000-0000-7000-8000-0000000000e1', '{"name": "Beef mince", "aisle": "protein"}');
select food.create_recipe('00000000-0000-7000-8000-000000000001', '00000000-0000-7000-8000-000000000002',
  'Chilli con carne', 'active', 'Standard');
select food.update_variation('00000000-0000-7000-8000-000000000002', '{"servings": 4}');
select food.add_line('00000000-0000-7000-8000-0000000000d1', '00000000-0000-7000-8000-000000000002',
  '{"position": "a", "pantry_id": "00000000-0000-7000-8000-0000000000e1", "qty": 500, "unit": "g"}');
select food.plan_meal('00000000-0000-7000-8000-000000000011',
  '{"do_on": "2026-10-31", "slot": "dinner", "variation": "00000000-0000-7000-8000-000000000002"}');
select shopping.create_list('00000000-0000-7000-8000-000000000021',
  '{"title": "Big shop", "kind": "food", "meals": ["00000000-0000-7000-8000-000000000011"]}');

select is(
  (select id from shopping.lines where meal_id = '00000000-0000-7000-8000-000000000011'),
  shopping_private.line_id('00000000-0000-7000-8000-000000000021', '00000000-0000-7000-8000-000000000011',
    '00000000-0000-7000-8000-0000000000d1'),
  'SHP-004 3: a Meal''s line has the id its shop, Meal and source line give it'
);

-- Rewritten (its servings changed), the line keeps its id: a tick sent after reaches it.
select food.update_meal('00000000-0000-7000-8000-000000000011', '{"servings": 8}');
select shopping.tick(array[shopping_private.line_id('00000000-0000-7000-8000-000000000021',
  '00000000-0000-7000-8000-000000000011', '00000000-0000-7000-8000-0000000000d1')], true);
select is(
  (select checked from shopping.lines where meal_id = '00000000-0000-7000-8000-000000000011'),
  true,
  'SHP-004 3: a tick reaches the line after its Meal rewrote it'
);
select is(
  (select qty from shopping.lines where meal_id = '00000000-0000-7000-8000-000000000011'),
  1000::numeric,
  'SHP-002 5: and the line is the rewritten one'
);

select * from finish();
rollback;
