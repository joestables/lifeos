-- A Meal's own ingredients and a typed Meal's link (MPL-006): added,
-- changed and removed by whoever may edit the Meal, seen by whoever sees it,
-- never on leftovers; moved when Pantry entries merge.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(11);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'ann@example.com'),
  ('00000000-0000-4000-8000-00000000000b', 'ben@example.com'),
  ('00000000-0000-4000-8000-00000000000c', 'cat@example.com');
insert into core.spaces (id, kind, name, created_by) values
  ('00000000-0000-7000-8000-0000000000f1', 'household', 'Home', '00000000-0000-4000-8000-00000000000a');
insert into core.space_members (space_id, person_id, role) values
  ('00000000-0000-7000-8000-0000000000f1', '00000000-0000-4000-8000-00000000000a', 'owner'),
  ('00000000-0000-7000-8000-0000000000f1', '00000000-0000-4000-8000-00000000000b', 'member');

create function pg_temp.sign_in(p_person uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_person, 'role', 'authenticated')::text, true),
    set_config('request.jwt.claim.sub', p_person::text, true)
$$;
grant execute on function pg_temp.sign_in(uuid) to authenticated;
set local role authenticated;

select pg_temp.sign_in('00000000-0000-4000-8000-00000000000a');
select food.add_pantry('00000000-0000-7000-8000-0000000000e1', '{"name": "Milk", "aisle": "chilled"}');
select food.add_pantry('00000000-0000-7000-8000-0000000000e2', '{"name": "Semi-skimmed milk", "aisle": "chilled"}');
-- Today or later, so its lines keep their entries (PAN-001 4).
select food.plan_meal('00000000-0000-7000-8000-000000000001',
  jsonb_build_object('title', 'Cornflakes', 'do_on', current_date + 1, 'slot', 'breakfast',
    'space_id', '00000000-0000-7000-8000-0000000000f1', 'source', 'https://example.com/cornflakes'));
select food.add_meal_line('00000000-0000-7000-8000-0000000000d1', '00000000-0000-7000-8000-000000000001',
  '{"position": "a", "pantry_id": "00000000-0000-7000-8000-0000000000e2", "qty": 0.5, "unit": "cup"}');
select food.add_meal_line('00000000-0000-7000-8000-0000000000d1', '00000000-0000-7000-8000-000000000001',
  '{"position": "a", "pantry_id": "00000000-0000-7000-8000-0000000000e2", "qty": 0.5, "unit": "cup"}');
select is(
  (select count(*)::int from food.meal_lines where meal_id = '00000000-0000-7000-8000-000000000001'),
  1,
  'MPL-006 1: a Meal takes its own lines, once when sent twice'
);
select is(
  (select source from food.meal where item_id = '00000000-0000-7000-8000-000000000001'),
  'https://example.com/cornflakes',
  'MPL-006 5: a Meal is planned with its link'
);
select throws_ok(
  $$select food.update_meal('00000000-0000-7000-8000-000000000001', '{"source": "javascript:alert(1)"}')$$,
  '23514', null,
  'MPL-006 2: a link is a web address'
);

-- Ben, in Home: sees it and changes it.
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000b');
select is(
  (select count(*)::int from food.meal_lines where meal_id = '00000000-0000-7000-8000-000000000001'),
  1,
  'MPL-006: a Household Meal''s lines are seen by its members'
);
select food.add_meal_line('00000000-0000-7000-8000-0000000000d2', '00000000-0000-7000-8000-000000000001',
  '{"position": "b", "text": "Banana", "qty": 1}');
select food.update_meal_line('00000000-0000-7000-8000-0000000000d2', '{"qty": 2}');
select is(
  (select qty from food.meal_lines where id = '00000000-0000-7000-8000-0000000000d2'),
  2::numeric,
  'MPL-006 1: and added to and changed by them'
);

-- Cat, outside Home: neither.
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000c');
select is(
  (select count(*)::int from food.meal_lines),
  0,
  'MPL-006: someone outside the Household sees none of its lines'
);
select throws_ok(
  $$select food.add_meal_line('00000000-0000-7000-8000-0000000000d3', '00000000-0000-7000-8000-000000000001',
    '{"position": "c", "text": "Sugar"}')$$,
  null, null,
  'MPL-006: nor adds to them'
);

select pg_temp.sign_in('00000000-0000-4000-8000-00000000000a');
select food.plan_meal('00000000-0000-7000-8000-000000000002',
  jsonb_build_object('title', 'Cornflakes', 'do_on', current_date + 2, 'slot', 'breakfast',
    'leftovers_of', '00000000-0000-7000-8000-000000000001'));
select throws_ok(
  $$select food.add_meal_line('00000000-0000-7000-8000-0000000000d4', '00000000-0000-7000-8000-000000000002',
    '{"position": "a", "text": "Milk"}')$$,
  '23514', null,
  'MPL-006 1: leftovers have no lines of their own'
);

select food.merge_pantry('00000000-0000-7000-8000-0000000000e1', '00000000-0000-7000-8000-0000000000e2');
select is(
  (select pantry_id from food.meal_lines where id = '00000000-0000-7000-8000-0000000000d1'),
  '00000000-0000-7000-8000-0000000000e1'::uuid,
  'PAN-003: merging Pantry entries moves Meals'' lines too'
);
select throws_ok(
  $$select food.remove_pantry('00000000-0000-7000-8000-0000000000e1')$$,
  '23503', null,
  'PAN-001: an entry a Meal uses can''t be deleted'
);

select food.remove_meal_line('00000000-0000-7000-8000-0000000000d2');
select is(
  (select count(*)::int from food.meal_lines where meal_id = '00000000-0000-7000-8000-000000000001'),
  1,
  'MPL-006 1: a line removed goes'
);

select * from finish();
rollback;
