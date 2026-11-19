-- The Wardrobe in the database: lists, garments, outfits, collections, the
-- Planned Outfits pane and days; the rules ADR-0066 asks the database to
-- keep. WRD-005, WRD-008, WRD-010, WRD-012–WRD-014, WRD-017–WRD-019,
-- WRD-021–WRD-025, WRD-028; ADR-0013, ADR-0066, ADR-0068.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(56);

-- Ann and Ben share a Household.
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'ann@example.com'),
  ('00000000-0000-4000-8000-00000000000b', 'ben@example.com');
insert into core.spaces (id, kind, name, created_by) values
  ('00000000-0000-7000-8000-0000000000f1', 'household', 'Home', '00000000-0000-4000-8000-00000000000a');
insert into core.space_members (space_id, person_id) values
  ('00000000-0000-7000-8000-0000000000f1', '00000000-0000-4000-8000-00000000000a'),
  ('00000000-0000-7000-8000-0000000000f1', '00000000-0000-4000-8000-00000000000b');

create function pg_temp.sign_in(p_person uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_person, 'role', 'authenticated')::text, true),
    set_config('request.jwt.claim.sub', p_person::text, true)
$$;
grant execute on function pg_temp.sign_in(uuid) to authenticated;
set local role authenticated;

-- Ben's own colour, to check Ann can't use it.
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000b');
select wardrobe.save_entry('colour', '00000000-0000-7000-8000-00000000bc01', 'Navy', '#1f2a44');
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000a');

-- ---------------------------------------------------------------------------
-- Lists (WRD-028).

select is((select count(*)::int from wardrobe.categories), 0, 'WRD-028: every list starts empty');
select wardrobe.save_entry('category', '00000000-0000-7000-8000-0000000000c1', ' T-shirt ');
select wardrobe.save_entry('category', '00000000-0000-7000-8000-0000000000c2', 'Trousers');
select wardrobe.save_entry('category', '00000000-0000-7000-8000-0000000000c3', 'Shoes');
select is(
  (select array_agg(name order by position) from wardrobe.categories),
  array['T-shirt', 'Trousers', 'Shoes'],
  'WRD-028 2: a new category goes last, its name trimmed'
);
select wardrobe.set_entry_position('category', '00000000-0000-7000-8000-0000000000c3', '0');
select is(
  (select array_agg(name order by position) from wardrobe.categories),
  array['Shoes', 'T-shirt', 'Trousers'],
  'WRD-028 2: categories are dragged into my order'
);
select throws_ok(
  $$select wardrobe.save_entry('category', '00000000-0000-7000-8000-0000000000c9', 't-SHIRT')$$,
  '23505', 'There''s already a category called "t-SHIRT"',
  'WRD-028: a name is unique in its list, ignoring case'
);
select throws_ok(
  $$select wardrobe.set_entry_position('brand', '00000000-0000-7000-8000-0000000000c1', 'a')$$,
  '22023', null,
  'WRD-028: brands are A–Z, not dragged'
);
select wardrobe.save_entry('size', '00000000-0000-7000-8000-0000000000d1', 'M');
select wardrobe.save_entry('size', '00000000-0000-7000-8000-0000000000d2', '32R');
select wardrobe.save_entry('brand', '00000000-0000-7000-8000-0000000000b1', 'Uniqlo');
select wardrobe.save_entry('brand', '00000000-0000-7000-8000-0000000000b2', 'Reiss');
select wardrobe.save_entry('fit', '00000000-0000-7000-8000-0000000000e1', 'Slim');
select wardrobe.save_entry('tag', '00000000-0000-7000-8000-0000000000a1', 'Gym');
select wardrobe.save_entry('tag', '00000000-0000-7000-8000-0000000000a2', 'Work');
select throws_ok(
  $$select wardrobe.save_entry('colour', '00000000-0000-7000-8000-0000000000f9', 'Teal')$$,
  '23502', null,
  'ADR-0067 5: a colour needs its swatch'
);
select throws_ok(
  $$select wardrobe.save_entry('colour', '00000000-0000-7000-8000-0000000000f9', 'Teal', 'teal')$$,
  '23514', null,
  'ADR-0067 5: a swatch is hex'
);
select wardrobe.save_entry('colour', '00000000-0000-7000-8000-0000000000f1', 'Navy', '#1F2A44');
select wardrobe.save_entry('colour', '00000000-0000-7000-8000-0000000000f2', 'Camel', '#b7895a');
select is(
  (select hex from wardrobe.colours where id = '00000000-0000-7000-8000-0000000000f1'),
  '#1f2a44',
  'ADR-0067 5: a colour is kept as lower-case hex'
);
select wardrobe.save_entry('collection', '00000000-0000-7000-8000-00000000c011', 'Lisbon');
select throws_ok(
  $$select wardrobe.save_entry('collection', '00000000-0000-7000-8000-00000000c019', 'My outfits')$$,
  '23514', null,
  'WRD-018 1: My Outfits is not a collection of my own'
);

-- ---------------------------------------------------------------------------
-- Garments (WRD-005, WRD-010, WRD-012, WRD-013; ADR-0066 2–4).

select throws_ok(
  $$select wardrobe.create_garment('00000000-0000-7000-8000-000000000101',
    '00000000-0000-7000-8000-0000000000c1', null,
    '00000000-0000-7000-8000-0000000000b1', '00000000-0000-7000-8000-0000000000f1')$$,
  '23502', null,
  'WRD-005 5: a garment can''t be saved without its size'
);
select wardrobe.create_garment('00000000-0000-7000-8000-000000000101',
  '00000000-0000-7000-8000-0000000000c1', '00000000-0000-7000-8000-0000000000d1',
  '00000000-0000-7000-8000-0000000000b1', '00000000-0000-7000-8000-0000000000f1',
  null, array['00000000-0000-7000-8000-0000000000a1']::uuid[]);
select is(
  (select title from core.items where id = '00000000-0000-7000-8000-000000000101'),
  'Navy Uniqlo T-shirt',
  'ADR-0066 3: a garment''s title is its colour, brand and category'
);
select is(
  (select array[type, status] from core.items where id = '00000000-0000-7000-8000-000000000101'),
  array['garment', 'active'],
  'ADR-0066 2: a new garment is Owned'
);
select wardrobe.create_garment('00000000-0000-7000-8000-000000000101',
  '00000000-0000-7000-8000-0000000000c2', '00000000-0000-7000-8000-0000000000d2',
  '00000000-0000-7000-8000-0000000000b2', '00000000-0000-7000-8000-0000000000f2');
select is(
  (select category_id::text from wardrobe.garment where item_id = '00000000-0000-7000-8000-000000000101'),
  '00000000-0000-7000-8000-0000000000c1',
  'ADR-0042: making a garment again changes nothing'
);
select wardrobe.create_garment('00000000-0000-7000-8000-000000000102',
  '00000000-0000-7000-8000-0000000000c2', '00000000-0000-7000-8000-0000000000d2',
  '00000000-0000-7000-8000-0000000000b1', '00000000-0000-7000-8000-0000000000f1');
select wardrobe.create_garment('00000000-0000-7000-8000-000000000103',
  '00000000-0000-7000-8000-0000000000c3', '00000000-0000-7000-8000-0000000000d1',
  '00000000-0000-7000-8000-0000000000b2', '00000000-0000-7000-8000-0000000000f2');
select wardrobe.create_garment('00000000-0000-7000-8000-000000000104',
  '00000000-0000-7000-8000-0000000000c1', '00000000-0000-7000-8000-0000000000d1',
  '00000000-0000-7000-8000-0000000000b2', '00000000-0000-7000-8000-0000000000f2',
  null, '{}', 'Wedding shirt');
select is(
  (select title from core.items where id = '00000000-0000-7000-8000-000000000104'),
  'Wedding shirt',
  'ADR-0066 3: a garment''s own name is its title'
);
select wardrobe.save_entry('colour', '00000000-0000-7000-8000-0000000000f1', 'Midnight');
select is(
  (select array_agg(title order by id) from core.items
   where id in ('00000000-0000-7000-8000-000000000101', '00000000-0000-7000-8000-000000000102')),
  array['Midnight Uniqlo T-shirt', 'Midnight Uniqlo Trousers'],
  'WRD-028 4: a colour renamed renames its garments'
);
select wardrobe.save_entry('colour', '00000000-0000-7000-8000-0000000000f1', 'Navy');
select throws_ok(
  $$select wardrobe.update_garment('00000000-0000-7000-8000-000000000101',
    '{"colour_id": "00000000-0000-7000-8000-00000000bc01"}')$$,
  '23514', null,
  'ADR-0066 5: a garment is described from its owner''s own lists'
);
select throws_ok(
  $$select wardrobe.update_garment('00000000-0000-7000-8000-000000000101', '{"brand_id": null}')$$,
  '23502', null,
  'WRD-010 2: the four required fields can''t be cleared'
);
-- Made yesterday, so its changes now are logged (rows made with an Item aren't).
reset role;
update core.items set created_at = now() - interval '1 day' where id = '00000000-0000-7000-8000-000000000101';
set local role authenticated;
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000a');
select wardrobe.update_garment('00000000-0000-7000-8000-000000000101',
  '{"fit_id": "00000000-0000-7000-8000-0000000000e1"}');
select wardrobe.update_garment('00000000-0000-7000-8000-000000000101', '{"fit_id": null}');
select is(
  (select fit_id from wardrobe.garment where item_id = '00000000-0000-7000-8000-000000000101'),
  null,
  'WRD-010 2: a fit can be cleared'
);
select ok(
  (select count(*) from core.activity
   where item_id = '00000000-0000-7000-8000-000000000101' and changed ? 'fit_id') = 2,
  'ADR-0066 15: a garment''s changes are in its log'
);
set constraints all immediate;
select throws_ok(
  $$insert into core.items (id, type, title, space_id, status)
    select '00000000-0000-7000-8000-000000000199', 'garment', 'Bare', s.id, 'active'
    from core.spaces s where s.kind = 'personal' and s.created_by = auth.uid()$$,
  '23502', null,
  'WRD-005 5: a garment isn''t made without its four fields'
);
set constraints all deferred;
select throws_ok(
  $$update core.items set space_id = '00000000-0000-7000-8000-0000000000f1'
    where id = '00000000-0000-7000-8000-000000000101'$$,
  '23514', null,
  'ADR-0066 1: a garment stays Personal'
);

select wardrobe.add_garment_tags(
  array['00000000-0000-7000-8000-000000000101', '00000000-0000-7000-8000-000000000102']::uuid[],
  array['00000000-0000-7000-8000-0000000000a1', '00000000-0000-7000-8000-0000000000a2']::uuid[]);
select is(
  (select count(*)::int from wardrobe.garment_tags),
  4,
  'WRD-012 2: tags are added to several garments at once'
);
select wardrobe.remove_garment_tags(
  array['00000000-0000-7000-8000-000000000101', '00000000-0000-7000-8000-000000000102']::uuid[],
  array['00000000-0000-7000-8000-0000000000a2']::uuid[]);
select is(
  (select array_agg(t.name order by g.garment_id) from wardrobe.garment_tags g join wardrobe.tags t on t.id = g.tag_id),
  array['Gym', 'Gym'],
  'WRD-012 2: and taken off them'
);
select wardrobe.retire_garment('00000000-0000-7000-8000-000000000104');
select is(
  (select status from core.items where id = '00000000-0000-7000-8000-000000000104'),
  'cancelled',
  'WRD-013 1: a retired garment is cancelled, "Retired"'
);
select core.set_mark('00000000-0000-7000-8000-000000000101', true);
select is(
  (select count(*)::int from core.marks where item_id = '00000000-0000-7000-8000-000000000101'),
  1,
  'WRD-011: a garment is a favourite of mine'
);

-- ---------------------------------------------------------------------------
-- Outfits and collections (WRD-014, WRD-017–WRD-019; ADR-0066 6).

select throws_ok(
  $$select wardrobe.create_outfit('00000000-0000-7000-8000-000000000201', '{}')$$,
  '23502', null,
  'WRD-014: an outfit needs a garment'
);
select wardrobe.create_outfit('00000000-0000-7000-8000-000000000201',
  array['00000000-0000-7000-8000-000000000101', '00000000-0000-7000-8000-000000000102']::uuid[],
  'Navy work', array['00000000-0000-7000-8000-00000000c011']::uuid[]);
select is(
  wardrobe_private.outfit_garments('00000000-0000-7000-8000-000000000201'),
  array['00000000-0000-7000-8000-000000000101', '00000000-0000-7000-8000-000000000102']::uuid[],
  'ADR-0066 6: an outfit includes its garments'
);
select throws_ok(
  $$select wardrobe.create_outfit('00000000-0000-7000-8000-000000000209',
    array['00000000-0000-7000-8000-000000000102', '00000000-0000-7000-8000-000000000101']::uuid[])$$,
  '23505', 'Those garments are already an outfit',
  'WRD-014 5: the same garments as another outfit are refused'
);
select wardrobe.create_outfit('00000000-0000-7000-8000-000000000202',
  array['00000000-0000-7000-8000-000000000101']::uuid[]);
select throws_ok(
  $$select wardrobe.add_outfit_garment('00000000-0000-7000-8000-000000000202', '00000000-0000-7000-8000-000000000102')$$,
  '23505', null,
  'WRD-014 5: adding a garment can''t make it another outfit'
);
select wardrobe.add_to_collections(
  array['00000000-0000-7000-8000-000000000202']::uuid[],
  array['00000000-0000-7000-8000-00000000c011']::uuid[]);
select wardrobe.remove_from_collection(
  array['00000000-0000-7000-8000-000000000201']::uuid[], '00000000-0000-7000-8000-00000000c011');
select is(
  (select array_agg(outfit_id) from wardrobe.outfit_collections),
  array['00000000-0000-7000-8000-000000000202']::uuid[],
  'WRD-019: outfits are added to and taken out of my collections'
);
select wardrobe.remove_entry('collection', '00000000-0000-7000-8000-00000000c011');
select is(
  (select count(*)::int from core.items where type = 'outfit' and archived_at is null),
  2,
  'WRD-018 3: deleting a collection keeps its outfits'
);

-- ---------------------------------------------------------------------------
-- Planned outfits and days (WRD-020–WRD-024; ADR-0066 7–11).

select wardrobe.add_planned(array['00000000-0000-7000-8000-000000000201', '00000000-0000-7000-8000-000000000202']::uuid[]);
select is(
  (select array_agg(outfit_id order by position) from wardrobe.planned_outfits where removed_at is null),
  array['00000000-0000-7000-8000-000000000201', '00000000-0000-7000-8000-000000000202']::uuid[],
  'WRD-021 1: outfits wait in Planned outfits, newest last'
);
select wardrobe.plan_outfit('00000000-0000-7000-8000-000000000301', '00000000-0000-7000-8000-000000000201', current_date + 2);
select wardrobe.plan_outfit('00000000-0000-7000-8000-000000000302', '00000000-0000-7000-8000-000000000201', current_date - 2);
select wardrobe.plan_outfit('00000000-0000-7000-8000-000000000303', '00000000-0000-7000-8000-000000000202', current_date + 2);
select is(
  (select array[title, do_on::text] from core.items where id = '00000000-0000-7000-8000-000000000301'),
  array['Navy work', (current_date + 2)::text],
  'WRD-021 2: an outfit planned for a day, under its name'
);
select is(
  (select count(*)::int from core.items where type = 'outfit_worn' and do_on = current_date + 2),
  2,
  'ADR-0066 7: a day holds several outfits'
);
select is(
  (select array_agg(garment_id order by garment_id) from wardrobe.worn_garments
   where worn_id = '00000000-0000-7000-8000-000000000301'),
  array['00000000-0000-7000-8000-000000000101', '00000000-0000-7000-8000-000000000102']::uuid[],
  'ADR-0013: a day keeps the garments its outfit had'
);
select is(
  (select array_agg(outfit_id) from wardrobe.planned_outfits where removed_at is null),
  null::uuid[],
  'WRD-021 2: a placed outfit leaves Planned outfits'
);
select wardrobe.add_planned(array['00000000-0000-7000-8000-000000000201']::uuid[]);
select is(
  (select count(*)::int from wardrobe.planned_outfits where removed_at is null),
  1,
  'WRD-021 1: and can be added again'
);
select wardrobe.clear_planned();
select is(
  (select count(*)::int from wardrobe.planned_outfits where removed_at is null),
  0,
  'WRD-021 1: Clear empties Planned outfits'
);

select wardrobe.add_outfit_garment('00000000-0000-7000-8000-000000000201', '00000000-0000-7000-8000-000000000103');
select is(
  (select array_agg(w.worn_id order by w.worn_id) from wardrobe.worn_garments w
   where w.garment_id = '00000000-0000-7000-8000-000000000103'),
  array['00000000-0000-7000-8000-000000000301']::uuid[],
  'ADR-0066 8: a garment added to an outfit joins the days to come, not days gone'
);
select wardrobe.remove_outfit_garment('00000000-0000-7000-8000-000000000201', '00000000-0000-7000-8000-000000000102');
select is(
  (select array_agg(w.worn_id order by w.worn_id) from wardrobe.worn_garments w
   where w.garment_id = '00000000-0000-7000-8000-000000000102'),
  array['00000000-0000-7000-8000-000000000302']::uuid[],
  'ADR-0066 8: a garment taken out leaves the days to come, not days gone'
);
select throws_ok(
  $$select wardrobe.remove_outfit_garment('00000000-0000-7000-8000-000000000202', '00000000-0000-7000-8000-000000000101')$$,
  '23514', null,
  'WRD-017: an outfit keeps one garment at least'
);
select wardrobe.rename_outfit('00000000-0000-7000-8000-000000000201', 'Office');
select is(
  (select array_agg(title order by id) from core.items
   where id in ('00000000-0000-7000-8000-000000000301', '00000000-0000-7000-8000-000000000302')),
  array['Office', 'Navy work'],
  'ADR-0066 8: an outfit renamed is renamed on the days to come'
);
select wardrobe.remove_day_garment('00000000-0000-7000-8000-000000000301', '00000000-0000-7000-8000-000000000103');
select is(
  (select count(*)::int from wardrobe.worn_garments where garment_id = '00000000-0000-7000-8000-000000000103'),
  0,
  'WRD-022 4: a garment taken off one day''s outfit'
);
select ok(
  '00000000-0000-7000-8000-000000000103' = any (wardrobe_private.outfit_garments('00000000-0000-7000-8000-000000000201')),
  'WRD-022 4: the outfit itself keeps it'
);
select wardrobe.move_worn('00000000-0000-7000-8000-000000000303', current_date + 3);
select is(
  (select do_on from core.items where id = '00000000-0000-7000-8000-000000000303'),
  current_date + 3,
  'WRD-022 2: a day''s outfit moves to another day'
);

select wardrobe.plan_garment('00000000-0000-7000-8000-000000000311', '00000000-0000-7000-8000-000000000102', current_date + 5);
select wardrobe.plan_garment('00000000-0000-7000-8000-000000000312', '00000000-0000-7000-8000-000000000103', current_date + 5);
select is(
  (select title from core.items where id = '00000000-0000-7000-8000-000000000311'),
  'Navy Uniqlo Trousers',
  'WRD-021 3: a single garment on a day, under its title'
);
select wardrobe.create_outfit_from_day('00000000-0000-7000-8000-000000000203', '00000000-0000-7000-8000-000000000313',
  array['00000000-0000-7000-8000-000000000311', '00000000-0000-7000-8000-000000000312']::uuid[]);
select is(
  (select array[
     (select count(*) from core.items where id in ('00000000-0000-7000-8000-000000000311', '00000000-0000-7000-8000-000000000312') and archived_at is not null)::text,
     (select do_on::text from core.items where id = '00000000-0000-7000-8000-000000000313'),
     (select count(*) from wardrobe.worn_garments where worn_id = '00000000-0000-7000-8000-000000000313')::text]),
  array['2', (current_date + 5)::text, '2'],
  'WRD-023 1: a day''s single garments become an outfit, worn in their place'
);

-- ---------------------------------------------------------------------------
-- Merging and removing list entries (WRD-028 3–5).

select throws_ok(
  $$select wardrobe.remove_entry('brand', '00000000-0000-7000-8000-0000000000b2')$$,
  '23503', null,
  'WRD-028 5: a brand in use can''t be deleted'
);
select wardrobe.merge_entry('brand', '00000000-0000-7000-8000-0000000000b2', '00000000-0000-7000-8000-0000000000b1');
select is(
  (select array[(select count(*) from wardrobe.brands)::text,
    (select title from core.items where id = '00000000-0000-7000-8000-000000000103')]),
  array['1', 'Camel Uniqlo Shoes'],
  'WRD-028 3: merging a brand moves its garments, retitled, and removes it'
);
select lives_ok(
  $$select wardrobe.merge_entry('brand', '00000000-0000-7000-8000-0000000000b2', '00000000-0000-7000-8000-0000000000b1')$$,
  'ADR-0042: a merge sent again is applied once'
);
select throws_ok(
  $$select wardrobe.merge_entry('colour', '00000000-0000-7000-8000-0000000000f1', '00000000-0000-7000-8000-00000000bc01')$$,
  'P0002', null,
  'WRD-028 3: nothing is merged into another''s entry'
);
select wardrobe.set_weather_place('Manchester', 53.48095, -2.23743);
select is(
  (select place_name from wardrobe.settings),
  'Manchester',
  'WRD-025: the weather''s place is kept'
);
select throws_ok(
  $$insert into wardrobe.settings (person_id, place_name)
    values ('00000000-0000-4000-8000-00000000000b', 'Leeds')$$,
  '42501', null,
  'ADR-0068 4: no one sets another''s place'
);

-- ---------------------------------------------------------------------------
-- Ben, in Ann's Household, sees none of her Wardrobe (ADR-0066).

select pg_temp.sign_in('00000000-0000-4000-8000-00000000000b');
select is(
  (select count(*)::int from core.items where type in ('garment', 'outfit', 'outfit_worn')),
  0,
  'ADR-0066: a Household member sees none of my garments, outfits or days'
);
select is(
  (select count(*)::int from wardrobe.garment) + (select count(*)::int from wardrobe.categories),
  0,
  'ADR-0066: nor their detail or my lists'
);
select throws_ok(
  $$select wardrobe.add_planned(array['00000000-0000-7000-8000-000000000201']::uuid[])$$,
  null, null,
  'ADR-0066 11: no one plans another''s outfit'
);

select * from finish();
rollback;
