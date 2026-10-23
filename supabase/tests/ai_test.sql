-- The AI service's allowance and keeping an import: cups, a new Draft with
-- its lines, steps, new Pantry entries and list names, all together; an
-- Idea imported into. RCP-007, RCP-014; ADR-0053, ADR-0054.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(14);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'ann@example.com'),
  ('00000000-0000-4000-8000-00000000000b', 'ben@example.com');

create function pg_temp.sign_in(p_person uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_person, 'role', 'authenticated')::text, true),
    set_config('request.jwt.claim.sub', p_person::text, true)
$$;
grant execute on function pg_temp.sign_in(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- The allowance, as the Edge Function's service role.
set local role service_role;
select is(core.ai_take('00000000-0000-4000-8000-00000000000a', 2, 'recipe.import'), true, 'ADR-0054: a use is taken');
select is(core.ai_take('00000000-0000-4000-8000-00000000000a', 2, 'recipe.import'), true, 'ADR-0054: and another');
select is(core.ai_take('00000000-0000-4000-8000-00000000000a', 2, 'recipe.import'), false,
  'ADR-0054: none left of a day''s allowance');
select is(
  (core.ai_left('00000000-0000-4000-8000-00000000000a', 2), core.ai_left('00000000-0000-4000-8000-00000000000b', 2)),
  (0, 2),
  'ADR-0054: each person has their own allowance'
);
select core.ai_failed('00000000-0000-4000-8000-00000000000a', 'recipe.import', 'Gemini: 429');
reset role;

set local role authenticated;
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000a');
select throws_ok(
  $$select core.ai_take('00000000-0000-4000-8000-00000000000a', 100, 'recipe.import')$$,
  '42501', null,
  'ADR-0054: people can''t take uses themselves'
);

-- ---------------------------------------------------------------------------
-- Cups (ADR-0053, amended 23 October).
select food.create_recipe('00000000-0000-7000-8000-000000000001', '00000000-0000-7000-8000-000000000002',
  'Porridge', 'active');
select lives_ok(
  $$select food.add_line('00000000-0000-7000-8000-0000000000d1', '00000000-0000-7000-8000-000000000002',
    '{"position": "a", "text": "Oats", "qty": 0.5, "unit": "cup"}')$$,
  'RCP-007: a line may be in cups'
);

-- ---------------------------------------------------------------------------
-- Keeping an import as a new Draft.
select food.add_pantry('00000000-0000-7000-8000-0000000000e1', '{"name": "Onion", "aisle": "fruit_veg"}');
select food.add_value('00000000-0000-7000-8000-0000000000c1', 'cuisine', 'Spanish');
create temp table draft as select $${
  "name": "Chicken and chorizo paella",
  "category": "Dinner", "cuisine": "spanish", "protein": ["Chicken", "Pork"], "carbs": ["Rice"],
  "servings": 4, "prep_min": 15, "cook_min": 40,
  "notes": "Bomba rice is best.", "sources": ["https://example.com/paella"],
  "steps": [{"position": "a", "text": "Dice 1 onion."}, {"position": "b", "text": "Fry it for 5 minutes."}],
  "lines": [
    {"position": "a", "heading": "For the stock"},
    {"position": "b", "pantry_id": "00000000-0000-7000-8000-0000000000e1", "qty": 1},
    {"position": "c", "new_pantry": {"id": "00000000-0000-7000-8000-0000000000e2", "name": "Chorizo", "aisle": "chilled", "default_unit": "g"}, "qty": 200, "unit": "g"},
    {"position": "d", "new_pantry": {"id": "00000000-0000-7000-8000-0000000000e3", "name": "onion", "aisle": "cupboard"}, "qty": 1, "approx": true},
    {"position": "e", "text": "Saffron", "qty": 1, "qty_max": 2, "unit": "tsp"}
  ]
}$$::jsonb as d;
grant select on draft to authenticated;
select food.keep_import('00000000-0000-7000-8000-000000000011', '00000000-0000-7000-8000-000000000012', (select d from draft));
select is(
  (select (r.status, f.category, f.cuisine, f.protein, f.carbs) from core.items r join food.recipe f on f.item_id = r.id
   where r.id = '00000000-0000-7000-8000-000000000011'),
  ('active'::text, 'Dinner'::text, 'spanish'::text, array['Chicken', 'Pork'], array['Rice']),
  'RCP-014 1: kept, it is a Draft with its heading'
);
select is(
  (select array_agg(coalesce(l.heading, p.name, l.text) || ':' || coalesce(l.qty::text, '') || coalesce(l.unit, '') order by l.position)
   from food.variation_lines l left join food.pantry p on p.id = l.pantry_id
   where l.variation_id = '00000000-0000-7000-8000-000000000012'),
  array['For the stock:', 'Onion:1', 'Chorizo:200g', 'Onion:1', 'Saffron:1tsp'],
  'RCP-014 3: its lines, a new Pantry entry added, one already there (by any case) used'
);
select is(
  (select array_agg(text order by position) from food.variation_steps where variation_id = '00000000-0000-7000-8000-000000000012'),
  array['Dice 1 onion.', 'Fry it for 5 minutes.'],
  'RCP-014 1: its method'
);
select is(
  (select array_agg(kind || ':' || name order by kind, name) from food.values),
  array['carb:Rice', 'category:Dinner', 'cuisine:Spanish', 'protein:Chicken', 'protein:Pork'],
  'RCP-014 8: names new to my lists are added; one there already (by any case) isn''t'
);
select food.keep_import('00000000-0000-7000-8000-000000000011', '00000000-0000-7000-8000-000000000012', (select d from draft));
select is(
  (select count(*)::int from food.variation_lines where variation_id = '00000000-0000-7000-8000-000000000012'),
  5,
  'RCP-014 3: kept twice (sent again), once'
);

-- ---------------------------------------------------------------------------
-- Importing into my Idea (RCP-014 4).
select food.create_recipe('00000000-0000-7000-8000-000000000021', '00000000-0000-7000-8000-000000000022', 'That paella');
select food.update_variation('00000000-0000-7000-8000-000000000022', '{"notes": "From TikTok", "sources": ["https://example.com/paella"]}');
select food.keep_import('00000000-0000-7000-8000-000000000021', '00000000-0000-7000-8000-000000000022',
  (select d - 'name' || '{"name": "Something else"}' from draft));
select is(
  (select (r.title, r.status, v.status, f.notes, f.sources) from core.items r
   join core.items v on v.id = '00000000-0000-7000-8000-000000000022'
   join food.variation f on f.item_id = v.id
   where r.id = '00000000-0000-7000-8000-000000000021'),
  ('That paella'::text, 'active'::text, 'active'::text, E'From TikTok\n\nBomba rice is best.'::text, array['https://example.com/paella']),
  'RCP-014 4: an Idea imported into becomes a Draft, keeping its name and notes'
);

select pg_temp.sign_in('00000000-0000-4000-8000-00000000000b');
select food.create_recipe('00000000-0000-7000-8000-000000000031', '00000000-0000-7000-8000-000000000032', 'Ben''s idea');
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000a');
select throws_ok(
  $$select food.keep_import('00000000-0000-7000-8000-000000000031', '00000000-0000-7000-8000-000000000032', (select d from draft))$$,
  null, null,
  'RCP-014 4: not someone else''s Idea'
);
select throws_ok(
  $$select food.keep_import('00000000-0000-7000-8000-000000000041', '00000000-0000-7000-8000-000000000042',
    (select d || '{"name": "Porridge"}' from draft))$$,
  '23505', null,
  'RCP-014 3: a name in use is refused, and nothing is kept'
);

select * from finish();
rollback;
