-- Shopping (Stage 4b; ADR-0057): a food shop in its Space, its Meals' lines
-- written by the database as the Meals change, ticks kept, lines added by
-- hand, staples and Essentials, and who sees what.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(31);

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
-- A shop's Meal lines as "name qty", in order.
create function pg_temp.meal_lines(p_list uuid) returns text[] language sql as $$
  select array_agg(coalesce(p.name, l.text) || ' ' || coalesce(l.qty::numeric(10, 2)::text, '-')
    || case when l.checked then ' ticked' else '' end
    order by coalesce(p.name, l.text), l.checked)
  from shopping.lines l left join food.pantry p on p.id = l.pantry_id
  where l.list_id = p_list and l.meal_id is not null
$$;
grant execute on function pg_temp.meal_lines(uuid) to authenticated;
set local role authenticated;

-- ---------------------------------------------------------------------------
-- Ann's Recipe (serves 4), a Household dinner of it for 8, and a shop.
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000a');
select food.add_pantry('00000000-0000-7000-8000-0000000000e1', '{"name": "Beef mince", "aisle": "protein"}');
select food.add_pantry('00000000-0000-7000-8000-0000000000e2', '{"name": "Kidney beans"}');
select food.add_pantry('00000000-0000-7000-8000-0000000000e3', '{"name": "Salt"}');
select food.add_pantry('00000000-0000-7000-8000-0000000000e4', '{"name": "Milk", "aisle": "chilled"}');
select food.create_recipe('00000000-0000-7000-8000-000000000001', '00000000-0000-7000-8000-000000000002',
  'Chilli con carne', 'active', 'Standard');
select food.update_variation('00000000-0000-7000-8000-000000000002', '{"servings": 4}');
select food.add_line('00000000-0000-7000-8000-0000000000d1', '00000000-0000-7000-8000-000000000002',
  '{"position": "a", "pantry_id": "00000000-0000-7000-8000-0000000000e1", "qty": 500, "unit": "g"}');
select food.add_line('00000000-0000-7000-8000-0000000000d2', '00000000-0000-7000-8000-000000000002',
  '{"position": "b", "pantry_id": "00000000-0000-7000-8000-0000000000e2", "qty": 1}');
select food.add_line('00000000-0000-7000-8000-0000000000d3', '00000000-0000-7000-8000-000000000002',
  '{"position": "c", "heading": "To serve"}');
select food.plan_meal('00000000-0000-7000-8000-000000000011',
  '{"do_on": "2026-10-31", "slot": "dinner", "space_id": "00000000-0000-7000-8000-0000000000f1",
    "servings": 8, "variation": "00000000-0000-7000-8000-000000000002"}');

select shopping.create_list('00000000-0000-7000-8000-000000000021',
  '{"title": "Big shop", "do_on": "2026-10-26", "space_id": "00000000-0000-7000-8000-0000000000f1",
    "kind": "food", "meals": ["00000000-0000-7000-8000-000000000011"]}');
select shopping.create_list('00000000-0000-7000-8000-000000000021',
  '{"title": "Big shop", "do_on": "2026-10-26", "space_id": "00000000-0000-7000-8000-0000000000f1",
    "kind": "food", "meals": ["00000000-0000-7000-8000-000000000011"]}');
select is(
  (select count(*)::int from core.items where type = 'shopping_list'),
  1,
  'SHP-001 2: a new shop is made once when sent twice'
);
select is(
  (select kind from shopping.shopping_list where item_id = '00000000-0000-7000-8000-000000000021'),
  'food',
  'SHP-001: a food shop'
);
select throws_ok(
  $$select core.update_item('00000000-0000-7000-8000-000000000021', '{"do_at": "10:00"}')$$,
  null, null,
  'ADR-0050: a Shopping list has a date, never a time'
);
select is(
  pg_temp.meal_lines('00000000-0000-7000-8000-000000000021'),
  array['Beef mince 1000.00', 'Kidney beans 2.00'],
  'SHP-002 2: a Meal''s Recipe lines come onto the shop scaled to its servings, subheadings not'
);

-- A Meal's own line joins; its servings change and the shop follows.
select food.add_meal_line('00000000-0000-7000-8000-0000000000d4', '00000000-0000-7000-8000-000000000011',
  '{"position": "z", "text": "Scotch bonnet", "qty": 1}');
select food.update_meal('00000000-0000-7000-8000-000000000011', '{"servings": 4}');
select is(
  pg_temp.meal_lines('00000000-0000-7000-8000-000000000021'),
  array['Beef mince 500.00', 'Kidney beans 1.00', 'Scotch bonnet 1.00'],
  'SHP-002 5, MPL-003 4: a Meal''s own lines come too, and its servings change what the shop needs'
);

-- Ticked, a line stays as it is; the Recipe changes and the rest follow.
select shopping.tick(array(
  select id from shopping.lines where list_id = '00000000-0000-7000-8000-000000000021' and pantry_id = '00000000-0000-7000-8000-0000000000e1'
), true);
select food.update_line('00000000-0000-7000-8000-0000000000d1', '{"qty": 750}');
select food.update_line('00000000-0000-7000-8000-0000000000d2', '{"qty": 3}');
select is(
  pg_temp.meal_lines('00000000-0000-7000-8000-000000000021'),
  array['Beef mince 500.00 ticked', 'Kidney beans 3.00', 'Scotch bonnet 1.00'],
  'SHP-002 5: a ticked line stays as it is, unticked ones follow the Recipe'
);

-- A Meal's line is the Meal's: only its tick changes on the shop.
select throws_ok(
  format($$select shopping.update_line(%L, '{"qty": 9}')$$,
    (select id from shopping.lines where text = 'Scotch bonnet')),
  '42501', null,
  'SHP-003 2: a Meal''s line isn''t changed on the shop'
);
select throws_ok(
  format($$select shopping.delete_line(%L)$$, (select id from shopping.lines where text = 'Scotch bonnet')),
  '42501', null,
  'SHP-003 2: nor deleted'
);

-- A line added by hand: added, changed, ticked and deleted.
select shopping.add_line('00000000-0000-7000-8000-0000000000a1', '00000000-0000-7000-8000-000000000021',
  '{"position": "a", "text": "Sourdough", "qty": 1}');
select shopping.add_line('00000000-0000-7000-8000-0000000000a1', '00000000-0000-7000-8000-000000000021',
  '{"position": "a", "text": "Sourdough", "qty": 1}');
select shopping.update_line('00000000-0000-7000-8000-0000000000a1', '{"qty": 2}');
select is(
  (select qty from shopping.lines where id = '00000000-0000-7000-8000-0000000000a1'),
  2::numeric,
  'SHP-003 1: a line added by hand, once when sent twice, and changed'
);
select throws_ok(
  $$insert into shopping.lines (list_id, text, meal_id) values
    ('00000000-0000-7000-8000-000000000021', 'Sneaky', '00000000-0000-7000-8000-000000000011')$$,
  '42501', null,
  'SHP-003 2: nobody writes a Meal''s line by hand'
);
select shopping.delete_line('00000000-0000-7000-8000-0000000000a1');
select is(
  (select count(*)::int from shopping.lines where id = '00000000-0000-7000-8000-0000000000a1'),
  0,
  'SHP-003: a line added by hand is deleted'
);

-- ---------------------------------------------------------------------------
-- Ben, in Home, sees and ticks; Cat, outside it, sees nothing.
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000b');
select is(
  (select count(*)::int from shopping.lines where list_id = '00000000-0000-7000-8000-000000000021'),
  3,
  'SHP-004 1: a Household''s shop is seen by its members'
);
select shopping.tick(array(select id from shopping.lines where text = 'Scotch bonnet'), true);
select is(
  (select checked from shopping.lines where text = 'Scotch bonnet'),
  true,
  'SHP-004 2: and ticked by them'
);
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000c');
select is(
  (select count(*)::int from shopping.lines) + (select count(*)::int from shopping.list_meals)
    + (select count(*)::int from shopping.meals_of('00000000-0000-7000-8000-000000000021')),
  0,
  'SHP-004: someone outside the Household sees none of the shop'
);

-- ---------------------------------------------------------------------------
-- Ann's Personal lunch on the Household's shop: Ben sees its lines and name.
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000a');
select food.plan_meal('00000000-0000-7000-8000-000000000012',
  format('{"title": "Chilli for lunch", "do_on": "2026-11-01", "slot": "lunch", "space_id": "%s",
    "variation": "00000000-0000-7000-8000-000000000002"}',
    (select id from core.spaces where kind = 'personal' and created_by = '00000000-0000-4000-8000-00000000000a'))::jsonb);
select shopping.add_meals('00000000-0000-7000-8000-000000000021', array['00000000-0000-7000-8000-000000000012'::uuid]);
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000b');
select is(
  (select array_agg(title || ':' || personal order by do_on) from shopping.meals_of('00000000-0000-7000-8000-000000000021')),
  array['Chilli con carne:false', 'Chilli for lunch:true'],
  'SHP-001 6, ADR-0051: a shop''s members see its Personal Meals too, marked Personal'
);
select is(
  (select count(*)::int from shopping.lines where meal_id = '00000000-0000-7000-8000-000000000012'),
  2,
  'SHP-004 1: and their lines'
);

-- A Meal is on one open shop at most.
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000a');
select shopping.create_list('00000000-0000-7000-8000-000000000022',
  '{"title": "Top-up", "space_id": "00000000-0000-7000-8000-0000000000f1"}');
select throws_ok(
  $$select shopping.add_meals('00000000-0000-7000-8000-000000000022', array['00000000-0000-7000-8000-000000000011'::uuid])$$,
  '23505', null,
  'SHP-002 4: a Meal is on one open food shop at most'
);

-- Taken off, a Meal's unticked lines go and ticked ones stay.
select shopping.remove_meal('00000000-0000-7000-8000-000000000021', '00000000-0000-7000-8000-000000000011');
select is(
  pg_temp.meal_lines('00000000-0000-7000-8000-000000000021'),
  array['Beef mince 750.00', 'Beef mince 500.00 ticked', 'Kidney beans 3.00', 'Scotch bonnet 1.00 ticked'],
  'SHP-002 5: a Meal taken off takes its unticked lines; ticked ones stay'
);

-- Deleted, a Meal's unticked lines go; brought back, they return.
select core.archive_item('00000000-0000-7000-8000-000000000012');
select is(
  (select count(*)::int from shopping.lines where meal_id = '00000000-0000-7000-8000-000000000012'),
  0,
  'SHP-002 5: a Meal deleted takes its unticked lines'
);
select core.restore_item('00000000-0000-7000-8000-000000000012');
select is(
  (select count(*)::int from shopping.lines where meal_id = '00000000-0000-7000-8000-000000000012'),
  2,
  'SHP-002 5: brought back, they come back'
);

-- Leftovers bring nothing.
select food.plan_meal('00000000-0000-7000-8000-000000000013',
  '{"title": "Leftovers", "do_on": "2026-11-02", "slot": "lunch", "space_id": "00000000-0000-7000-8000-0000000000f1",
    "leftovers_of": "00000000-0000-7000-8000-000000000011"}');
select shopping.add_meals('00000000-0000-7000-8000-000000000021', array['00000000-0000-7000-8000-000000000013'::uuid]);
select is(
  (select count(*)::int from shopping.lines where meal_id = '00000000-0000-7000-8000-000000000013'),
  0,
  'SHP-002 2: leftovers bring no lines'
);

-- A done shop no longer follows its Meals.
select core.update_item('00000000-0000-7000-8000-000000000021', '{"status": "done"}');
select food.update_line('00000000-0000-7000-8000-0000000000d2', '{"qty": 5}');
select is(
  (select qty from shopping.lines where meal_id = '00000000-0000-7000-8000-000000000012' and pantry_id = '00000000-0000-7000-8000-0000000000e2'),
  3::numeric,
  'ADR-0057: a done shop no longer follows its Meals'
);
select core.update_item('00000000-0000-7000-8000-000000000021', '{"status": "active"}');
select is(
  (select qty from shopping.lines where meal_id = '00000000-0000-7000-8000-000000000012' and pantry_id = '00000000-0000-7000-8000-0000000000e2'),
  5::numeric,
  'SHP-001 5: brought back with Undo, it follows them again'
);

-- ---------------------------------------------------------------------------
-- Staples and Essentials (SHP-005); ticking clears out of stock or Required
-- where the line came from, else in the shop's Space (SHP-003 4).
select food.keep_entry('00000000-0000-7000-8000-0000000000f1', '00000000-0000-7000-8000-0000000000e3', 'staple', true);
select food.keep_entry('00000000-0000-7000-8000-0000000000f1', '00000000-0000-7000-8000-0000000000e4', 'essential', true);
select food.keep_entry(
  (select id from core.spaces where kind = 'personal' and created_by = '00000000-0000-4000-8000-00000000000a'),
  '00000000-0000-7000-8000-0000000000e3', 'staple', true);
select is(
  (select array_agg(kind || ':' || out_of_stock order by kind) from food.staples
   where space_id = '00000000-0000-7000-8000-0000000000f1'),
  array['essential:true', 'staple:true'],
  'SHP-005 2: a Space keeps staples, out of stock, and Essentials, Required'
);
select shopping.add_line('00000000-0000-7000-8000-0000000000a2', '00000000-0000-7000-8000-000000000021',
  format('{"pantry_id": "00000000-0000-7000-8000-0000000000e3", "needed_space_id": "%s"}',
    (select id from core.spaces where kind = 'personal' and created_by = '00000000-0000-4000-8000-00000000000a'))::jsonb);
select shopping.add_line('00000000-0000-7000-8000-0000000000a3', '00000000-0000-7000-8000-000000000021',
  '{"pantry_id": "00000000-0000-7000-8000-0000000000e4", "qty": 4}');
select shopping.tick(array['00000000-0000-7000-8000-0000000000a2'::uuid, '00000000-0000-7000-8000-0000000000a3'::uuid], true);
select is(
  (select array_agg(s.kind || ':' || st.out_of_stock order by s.kind)
   from food.staples st join core.spaces s on s.id = st.space_id
   where st.pantry_id = '00000000-0000-7000-8000-0000000000e3'),
  array['household:true', 'personal:false'],
  'SHP-003 4: a line added from a Space''s Needed clears it there, and nowhere else'
);
select is(
  (select out_of_stock from food.staples where pantry_id = '00000000-0000-7000-8000-0000000000e4'),
  false,
  'SHP-003 4: any other line clears it in the shop''s own Space'
);

-- A Thought sorted into a Shopping list gets its detail row.
select core.create_item('00000000-0000-7000-8000-000000000031', 'thought', '{"title": "buy milk, bread"}');
select core.convert_item('00000000-0000-7000-8000-000000000031', 'shopping_list');
select shopping.update_list('00000000-0000-7000-8000-000000000031', '{"kind": "list"}');
select is(
  (select kind from shopping.shopping_list where item_id = '00000000-0000-7000-8000-000000000031'),
  'list',
  'ITM-006 5: a Thought made a Shopping list'
);

-- A Pantry entry deleted leaves its shopping lines as typed.
select food.add_pantry('00000000-0000-7000-8000-0000000000e5', '{"name": "Tea bags"}');
select shopping.add_line('00000000-0000-7000-8000-0000000000a4', '00000000-0000-7000-8000-000000000031',
  '{"pantry_id": "00000000-0000-7000-8000-0000000000e5"}');
select food.remove_pantry('00000000-0000-7000-8000-0000000000e5');
select is(
  (select coalesce(pantry_id::text, '-') || ':' || text from shopping.lines where id = '00000000-0000-7000-8000-0000000000a4'),
  '-:Tea bags',
  'PAN-001 4: a deleted entry''s shopping lines keep its name, as typed'
);

-- Merging two entries moves shopping lines and keeps each Space's kind.
select food.add_pantry('00000000-0000-7000-8000-0000000000e6', '{"name": "Whole milk", "aisle": "chilled"}');
select food.keep_entry('00000000-0000-7000-8000-0000000000f1', '00000000-0000-7000-8000-0000000000e6', 'essential', false);
select shopping.add_line('00000000-0000-7000-8000-0000000000a5', '00000000-0000-7000-8000-000000000031',
  '{"pantry_id": "00000000-0000-7000-8000-0000000000e6"}');
select food.merge_pantry('00000000-0000-7000-8000-0000000000e4', '00000000-0000-7000-8000-0000000000e6');
select is(
  (select pantry_id from shopping.lines where id = '00000000-0000-7000-8000-0000000000a5'),
  '00000000-0000-7000-8000-0000000000e4'::uuid,
  'PAN-003: a merge moves shopping lines'
);
select is(
  (select kind from food.staples where space_id = '00000000-0000-7000-8000-0000000000f1' and pantry_id = '00000000-0000-7000-8000-0000000000e4'),
  'essential',
  'PAN-003: and keeps a Space''s Essential an Essential'
);

-- My first Household takes my staples and Essentials, each its kind.
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000c');
select food.keep_entry(
  (select id from core.spaces where kind = 'personal' and created_by = '00000000-0000-4000-8000-00000000000c'),
  '00000000-0000-7000-8000-0000000000e4', 'essential', false);
select core.create_household('00000000-0000-7000-8000-0000000000f2', 'Flat');
select is(
  (select kind from food.staples where space_id = '00000000-0000-7000-8000-0000000000f2'),
  'essential',
  'SHP-005 4: my first Household starts with a copy of my staples and Essentials'
);

select * from finish();
rollback;
