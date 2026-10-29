-- Food in the database: Recipes seen through a Household, Variations,
-- states, unique names, the Pantry, staples, Meals and cooks.
-- RCP-002, RCP-006, RCP-007, RCP-009, RCP-010, RCP-012, RCP-017, RCP-018,
-- MPL-002, PAN-001, PAN-002, PAN-003; ADR-0011, 0051, 0052.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(50);

-- Ann and Ben share a Household; Cat is on her own.
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'ann@example.com'),
  ('00000000-0000-4000-8000-00000000000b', 'ben@example.com'),
  ('00000000-0000-4000-8000-00000000000c', 'cat@example.com');
insert into core.spaces (id, kind, name, created_by) values
  ('00000000-0000-7000-8000-0000000000f1', 'household', 'Home', '00000000-0000-4000-8000-00000000000a');
insert into core.space_members (space_id, person_id) values
  ('00000000-0000-7000-8000-0000000000f1', '00000000-0000-4000-8000-00000000000a'),
  ('00000000-0000-7000-8000-0000000000f1', '00000000-0000-4000-8000-00000000000b');
select id as ben_space from core.spaces
  where created_by = '00000000-0000-4000-8000-00000000000b' and kind = 'personal' \gset

create function pg_temp.sign_in(p_person uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_person, 'role', 'authenticated')::text, true),
    set_config('request.jwt.claim.sub', p_person::text, true)
$$;
grant execute on function pg_temp.sign_in(uuid) to authenticated;
set local role authenticated;

-- ---------------------------------------------------------------------------
-- Ann's Recipe.
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000a');
select food.create_recipe('00000000-0000-7000-8000-000000000001', '00000000-0000-7000-8000-000000000002',
  'Katsu curry', 'active', 'Standard');
select food.create_recipe('00000000-0000-7000-8000-000000000001', '00000000-0000-7000-8000-000000000002',
  'Katsu curry', 'active', 'Standard');
select is(
  (select array_agg(type || ':' || status || ':' || title order by type) from core.items),
  array['recipe:active:Katsu curry', 'variation:active:Standard'],
  'RCP-006: a new Recipe comes with its first Variation, both Drafts; made twice, once'
);
select is(
  (select default_variation from food.recipe where item_id = '00000000-0000-7000-8000-000000000001'),
  '00000000-0000-7000-8000-000000000002'::uuid,
  'RCP-009: the first Variation is the default'
);
select food.add_pantry('00000000-0000-7000-8000-0000000000e1', '{"name": " Panko   breadcrumbs ", "default_unit": "g"}');
select food.add_pantry('00000000-0000-7000-8000-0000000000e2', '{"name": "Bin bags", "kind": "household"}');
select is(
  (select array_agg(name || ':' || coalesce(aisle, '-') order by name) from food.pantry),
  array['Bin bags:-', 'Panko breadcrumbs:cupboard'],
  'PAN-001: an ingredient starts in the Cupboard; a household item has no aisle'
);
select throws_ok(
  $$select food.add_pantry('00000000-0000-7000-8000-0000000000e3', '{"name": "panko breadcrumbs"}')$$,
  '23505', null,
  'PAN-001: the Pantry holds one entry of a name, whatever its case'
);
select food.add_line('00000000-0000-7000-8000-0000000000d1', '00000000-0000-7000-8000-000000000002',
  '{"position": "a", "pantry_id": "00000000-0000-7000-8000-0000000000e1", "qty": 100, "unit": "g"}');
select food.add_line('00000000-0000-7000-8000-0000000000d2', '00000000-0000-7000-8000-000000000002',
  '{"position": "b", "heading": "For the sauce"}');
select food.add_line('00000000-0000-7000-8000-0000000000d3', '00000000-0000-7000-8000-000000000002',
  '{"position": "c", "text": "Honey", "qty": 1, "qty_max": 2, "unit": "tbsp"}');
select food.add_step('00000000-0000-7000-8000-0000000000c1', '00000000-0000-7000-8000-000000000002',
  'Air fry for 12 minutes.', 'a');
select is(
  (select count(*)::int from food.variation_lines where variation_id = '00000000-0000-7000-8000-000000000002'),
  3,
  'RCP-007: lines from the Pantry, typed, and a subheading'
);
select throws_ok(
  $$select food.add_line('00000000-0000-7000-8000-0000000000d4', '00000000-0000-7000-8000-000000000002',
    '{"position": "d", "text": "Salt", "unit": "pinch"}')$$,
  '23514', null,
  'RCP-007: units are metric: g, kg, ml, l, tsp, tbsp or none'
);
select throws_ok(
  $$select food.add_line('00000000-0000-7000-8000-0000000000d4', '00000000-0000-7000-8000-000000000002',
    '{"position": "d", "heading": "Sauce", "text": "Salt"}')$$,
  '23514', null,
  'RCP-007: a subheading is only a subheading'
);
-- Rows made with their Item aren't logged one by one; this test is one
-- transaction, so the Variation is made to look older.
reset role;
update core.items set created_at = now() - interval '1 day' where id = '00000000-0000-7000-8000-000000000002';
set local role authenticated;
select food.update_line('00000000-0000-7000-8000-0000000000d1', '{"qty": 150}');
select ok(
  exists (select 1 from core.activity where item_id = '00000000-0000-7000-8000-000000000002'
    and changed -> 'line' -> 'from' ->> 'qty' = '100' and changed -> 'line' -> 'to' ->> 'qty' = '150'),
  'RCP-013: a changed line is in the Variation''s log, from and to'
);
select food.update_recipe('00000000-0000-7000-8000-000000000001',
  '{"category": "Dinner", "cuisine": "Japanese", "tags": ["Quick", " "], "protein": ["Chicken"]}');
select is(
  (select array[category, cuisine, array_to_string(tags, ','), array_to_string(protein, ',')]
   from food.recipe where item_id = '00000000-0000-7000-8000-000000000001'),
  array['Dinner', 'Japanese', 'Quick', 'Chicken'],
  'RCP-006: the heading keeps category, cuisine, tags and protein'
);
select food.add_value('00000000-0000-7000-8000-0000000000b1', 'tag', 'Quick');
select throws_ok(
  $$select food.add_value('00000000-0000-7000-8000-0000000000b2', 'tag', 'quick ')$$,
  '23505', null,
  'RCP-018: my list holds a value once'
);
select food.keep_entry('00000000-0000-7000-8000-0000000000f1', '00000000-0000-7000-8000-0000000000e1', 'staple', true);

-- ---------------------------------------------------------------------------
-- States (RCP-010).
select throws_ok(
  $$select core.update_item('00000000-0000-7000-8000-000000000002', '{"status": "idea"}')$$,
  '23514', null,
  'RCP-010: a Variation with ingredients can''t go back to Idea'
);
select throws_ok(
  $$select core.update_item('00000000-0000-7000-8000-000000000001', '{"status": "done"}')$$,
  '23514', null,
  'RCP-010: a Recipe''s state isn''t set by hand'
);
select core.update_item('00000000-0000-7000-8000-000000000002', '{"status": "done"}');
select is(
  (select status from core.items where id = '00000000-0000-7000-8000-000000000001'),
  'done',
  'RCP-010: a Recipe takes its Variation''s state'
);
select throws_ok(
  format($$select core.create_item('00000000-0000-7000-8000-000000000009', 'recipe',
    '{"title": "Shared stew", "space_id": "%s"}')$$, '00000000-0000-7000-8000-0000000000f1'),
  '23514', null,
  'ADR-0051: a Recipe stays in its author''s Personal Space'
);
select throws_ok(
  $$select food.create_recipe('00000000-0000-7000-8000-000000000003', '00000000-0000-7000-8000-000000000004', '  KATSU   curry ')$$,
  '23505', null,
  'RCP: a Recipe''s name is unique, whatever its case and spacing'
);

-- ---------------------------------------------------------------------------
-- Ben, in Ann's Household (ADR-0051).
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000b');
select is(
  (select count(*)::int from core.items where id in ('00000000-0000-7000-8000-000000000001', '00000000-0000-7000-8000-000000000002')),
  2,
  'RCP-017: a Household member sees my Recipe and its Variation'
);
select is(
  (select count(*)::int from food.variation_lines where variation_id = '00000000-0000-7000-8000-000000000002'),
  3,
  'RCP-017: and its ingredients'
);
select is(
  (select count(*)::int from core.links where to_item = '00000000-0000-7000-8000-000000000001'),
  1,
  'RCP-017: and how they are linked'
);
select throws_ok(
  $$select core.update_item('00000000-0000-7000-8000-000000000001', '{"title": "Ben''s curry"}')$$,
  'P0002', null,
  'RCP-017: but can''t rename it'
);
select throws_ok(
  $$select food.update_recipe('00000000-0000-7000-8000-000000000001', '{"cuisine": "Thai"}')$$,
  'P0002', null,
  'RCP-017: or change its heading'
);
select throws_ok(
  $$select food.add_line('00000000-0000-7000-8000-0000000000d5', '00000000-0000-7000-8000-000000000002',
    '{"position": "z", "text": "Chilli"}')$$,
  '42501', null,
  'RCP-017: or add to its Variation'
);
select throws_ok(
  $$select food.create_recipe('00000000-0000-7000-8000-000000000003', '00000000-0000-7000-8000-000000000004', 'katsu curry')$$,
  '23505', null,
  'RCP: a name my Household uses is taken'
);
select food.add_variation('00000000-0000-7000-8000-000000000005', '00000000-0000-7000-8000-000000000001',
  'Air fryer', '00000000-0000-7000-8000-000000000002');
select is(
  (select array[space_id::text, owner_id::text, status] from core.items where id = '00000000-0000-7000-8000-000000000005'),
  array[:'ben_space', '00000000-0000-4000-8000-00000000000b', 'active'],
  'RCP-009, ADR-0051: my Variation of Ann''s Recipe is mine, in my Space, a Draft'
);
select is(
  (select count(*)::int from food.variation_lines where variation_id = '00000000-0000-7000-8000-000000000005'),
  3,
  'RCP-009: copied with its ingredients'
);
select is(
  (select count(*)::int from food.variation_steps where variation_id = '00000000-0000-7000-8000-000000000005'),
  1,
  'RCP-009: and its method'
);
select food.update_line((select id from food.variation_lines
  where variation_id = '00000000-0000-7000-8000-000000000005' and text = 'Honey'), '{"qty": 3, "qty_max": null}');
select is(
  (select qty::int from food.variation_lines where id = '00000000-0000-7000-8000-0000000000d3'),
  1,
  'RCP-009: changing my copy leaves Ann''s alone'
);
select throws_ok(
  $$select food.update_recipe('00000000-0000-7000-8000-000000000001', '{"default_variation": "00000000-0000-7000-8000-000000000005"}')$$,
  '23514', null,
  'RCP-009: the default is one of the author''s own Variations'
);
select food.add_value('00000000-0000-7000-8000-0000000000b3', 'cuisine', 'Korean');

-- Pantry: everyone reads it; only who added an entry changes it.
select is(
  (select count(*)::int from food.pantry),
  2,
  'PAN-001: everyone sees the Pantry'
);
select throws_ok(
  $$select food.update_pantry('00000000-0000-7000-8000-0000000000e1', '{"name": "Ben''s panko"}')$$,
  'P0002', null,
  'PAN-001: only who added an entry changes it'
);
select food.add_pantry('00000000-0000-7000-8000-0000000000e4', '{"name": "Gochujang", "aisle": "cupboard", "default_unit": "tbsp"}');
select is(
  (select needed from food.space_entries where pantry_id = '00000000-0000-7000-8000-0000000000e1'),
  true,
  'PAN-002: staples and out of stock are the Household''s, seen by its members'
);

-- A cook of Ann's Variation, and a Meal from my own.
select food.log_cook('00000000-0000-7000-8000-0000000000a1', '00000000-0000-7000-8000-000000000002',
  '{"verdict": 4, "notes": "More honey", "servings": 6}');
select is(
  (select array[snapshot ->> 'name', jsonb_array_length(snapshot -> 'lines')::text, snapshot -> 'lines' -> 0 ->> 'name']
   from food.cooks where id = '00000000-0000-7000-8000-0000000000a1'),
  array['Standard', '3', 'Panko breadcrumbs'],
  'RCP-012: a cook keeps a snapshot of the Variation as cooked'
);
select food.plan_meal('00000000-0000-7000-8000-000000000006',
  '{"do_on": "2026-10-22", "slot": "dinner", "servings": 4, "variation": "00000000-0000-7000-8000-000000000002"}');
select is(
  (select array[i.title, s.kind, m.servings::text]
   from core.items i join core.spaces s on s.id = i.space_id join food.meal m on m.item_id = i.id
   where i.id = '00000000-0000-7000-8000-000000000006'),
  array['Katsu curry', 'household', '4'],
  'MPL-002: a Meal from a Recipe is named after it, in the Household'
);
select is(
  (select to_item from core.links where from_item = '00000000-0000-7000-8000-000000000006' and link_type = 'uses'),
  '00000000-0000-7000-8000-000000000002'::uuid,
  'MPL-002: and uses the Variation, Ann''s though it is'
);
select throws_ok(
  $$select food.plan_meal('00000000-0000-7000-8000-000000000007', '{"do_on": "2026-10-22", "slot": "snack", "title": "Crisps"}')$$,
  '23514', null,
  'MPL-001: the slots are Breakfast, Lunch and Dinner'
);
select food.plan_meal('00000000-0000-7000-8000-000000000007',
  '{"do_on": "2026-10-23", "slot": "lunch", "title": "Leftovers", "leftovers_of": "00000000-0000-7000-8000-000000000006"}');
select is(
  (select leftovers_of from food.meal where item_id = '00000000-0000-7000-8000-000000000007'),
  '00000000-0000-7000-8000-000000000006'::uuid,
  'MPL-002: leftovers are of another Meal'
);

-- ---------------------------------------------------------------------------
-- Ann again.
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000a');
select is(
  (select count(*)::int from core.items where id = '00000000-0000-7000-8000-000000000005'),
  1,
  'RCP-017: the author sees a member''s Variation of her Recipe'
);
select is(
  (select count(*)::int from food.cooks where variation_id = '00000000-0000-7000-8000-000000000002'),
  1,
  'RCP-013: and the cooks of her Variation, whoever logged them'
);
select throws_ok(
  $$select food.update_cook('00000000-0000-7000-8000-0000000000a1', '{"verdict": 1}')$$,
  'P0002', null,
  'RCP-012: a cook is changed only by who logged it'
);
select is(
  (select array_agg(name order by name) from food.values),
  array['Korean', 'Quick'],
  'RCP-018: browsing pools the lists of my Household'
);
select throws_ok(
  $$select food.remove_pantry('00000000-0000-7000-8000-0000000000e1')$$,
  '23503', null,
  'PAN-001: an entry a Recipe uses can''t be deleted'
);
select throws_ok(
  $$select food.merge_pantry('00000000-0000-7000-8000-0000000000e1', '00000000-0000-7000-8000-0000000000e4')$$,
  '42501', null,
  'PAN-003: only entries I added are merged'
);
select food.add_pantry('00000000-0000-7000-8000-0000000000e5', '{"name": "Panko"}');
select food.update_line('00000000-0000-7000-8000-0000000000d1', '{"pantry_id": "00000000-0000-7000-8000-0000000000e5"}');
select food.merge_pantry('00000000-0000-7000-8000-0000000000e1', '00000000-0000-7000-8000-0000000000e5');
select is(
  (select count(*)::int from food.variation_lines where pantry_id = '00000000-0000-7000-8000-0000000000e1'),
  2,
  'PAN-003: merging moves every line to the entry kept, Ben''s too'
);

-- Archiving a Recipe archives every Variation; bringing it back restores them.
select core.update_item('00000000-0000-7000-8000-000000000001', '{"status": "cancelled"}');
select is(
  (select array_agg(status order by id) from core.items where type = 'variation'),
  array['cancelled', 'cancelled'],
  'RCP-010: archiving a Recipe archives all its Variations'
);
select core.update_item('00000000-0000-7000-8000-000000000001', '{"status": "active"}');
select is(
  (select array_agg(status order by id) from core.items where type in ('recipe', 'variation')),
  array['done', 'done', 'active'],
  'RCP-010: brought back, each is as it was, and the Recipe the highest'
);

-- A Thought sorted into a Recipe becomes an Idea, its link a source.
select core.create_item('00000000-0000-7000-8000-000000000008', 'thought',
  '{"title": "Birria tacos", "body": "https://www.youtube.com/watch?v=abc no slow cooker"}');
select core.convert_item('00000000-0000-7000-8000-000000000008', 'recipe');
select is(
  (select array[r.status, v.status, v.title, array_to_string(fv.sources, ','), fv.notes]
   from core.items r
   join core.links l on l.to_item = r.id and l.link_type = 'variation_of'
   join core.items v on v.id = l.from_item
   join food.variation fv on fv.item_id = v.id
   where r.id = '00000000-0000-7000-8000-000000000008'),
  array['idea', 'idea', 'Standard', 'https://www.youtube.com/watch?v=abc',
        'https://www.youtube.com/watch?v=abc no slow cooker'],
  'RCP-002: a Thought sorted into a Recipe is an Idea, its link kept as a source'
);
select is(
  (select default_variation is not null from food.recipe where item_id = '00000000-0000-7000-8000-000000000008'),
  true,
  'RCP-002: and its Variation is the default'
);

-- ---------------------------------------------------------------------------
-- Cat, in no Household with them.
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000c');
select is(
  (select count(*)::int from core.items),
  0,
  'ADR-0051: outside the Household, nothing is seen'
);
select is(
  (select count(*)::int from food.space_entries) + (select count(*)::int from food.values) + (select count(*)::int from food.cooks),
  0,
  'ADR-0051: nor its staples, lists or cooks'
);
select throws_ok(
  $$select food.add_variation('00000000-0000-7000-8000-00000000000a', '00000000-0000-7000-8000-000000000001', 'Mine')$$,
  'P0002', null,
  'ADR-0051: nor can a Variation be added to it'
);
select lives_ok(
  $$select food.create_recipe('00000000-0000-7000-8000-00000000000b', '00000000-0000-7000-8000-00000000000d', 'Katsu curry')$$,
  'RCP: a name is unique only among the Recipes I can see'
);

select * from finish();
rollback;
