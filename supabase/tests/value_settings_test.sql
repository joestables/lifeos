-- Settings → Food keeps my lists (RCP-018 1, Joe, 26 October): a rename
-- reaches my Recipes, unlogged; a merge moves them; a deleted Recipe
-- brought back puts its names back on my lists.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(8);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'ann@example.com'),
  ('00000000-0000-4000-8000-00000000000b', 'ben@example.com');

create function pg_temp.sign_in(p_person uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_person, 'role', 'authenticated')::text, true),
    set_config('request.jwt.claim.sub', p_person::text, true)
$$;
grant execute on function pg_temp.sign_in(uuid) to authenticated;
set local role authenticated;

-- Ben's Recipe uses the same name, and keeps it.
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000b');
select food.create_recipe('00000000-0000-7000-8000-0000000000b1', '00000000-0000-7000-8000-0000000000b2',
  'Ben''s curry');
select food.update_recipe('00000000-0000-7000-8000-0000000000b1', '{"cuisine": "Chinese"}');

select pg_temp.sign_in('00000000-0000-4000-8000-00000000000a');
select food.create_recipe('00000000-0000-7000-8000-000000000001', '00000000-0000-7000-8000-000000000002',
  'Chicken curry');
select food.update_recipe('00000000-0000-7000-8000-000000000001',
  '{"cuisine": "Chinese", "tags": ["quick", "Spicy", "batch"], "protein": ["Chicken"]}');
select food.add_value('00000000-0000-7000-8000-0000000000c1', 'cuisine', 'Chinese');
select food.add_value('00000000-0000-7000-8000-0000000000c2', 'tag', 'spicy');
select food.add_value('00000000-0000-7000-8000-0000000000c3', 'tag', 'Batch');
-- Made in this transaction: nothing would be logged anyway, so age it.
reset role;
update core.items set created_at = now() - interval '1 day'
where id = '00000000-0000-7000-8000-000000000001';
set local role authenticated;
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000a');

select food.rename_value('00000000-0000-7000-8000-0000000000c1', ' Indian ');
select is(
  (select cuisine from food.recipe where item_id = '00000000-0000-7000-8000-000000000001'),
  'Indian',
  'RCP-018 1: a renamed cuisine is renamed on my Recipes'
);

select food.rename_value('00000000-0000-7000-8000-0000000000c2', 'Hot');
select is(
  (select tags from food.recipe where item_id = '00000000-0000-7000-8000-000000000001'),
  array['quick', 'Hot', 'batch'],
  'RCP-018 1: a renamed tag keeps its place, whatever its case'
);

select is(
  (select count(*)::int from core.activity
   where item_id = '00000000-0000-7000-8000-000000000001' and (changed ? 'cuisine' or changed ? 'tags')),
  0,
  'RCP-018 1: a list rename isn''t logged on each Recipe'
);

-- Merging Hot into Batch: once each, in the first one's place.
select food.move_value_uses('tag', 'Hot', 'Batch');
select food.remove_value('00000000-0000-7000-8000-0000000000c2');
select is(
  (select tags from food.recipe where item_id = '00000000-0000-7000-8000-000000000001'),
  array['quick', 'Batch'],
  'RCP-018 1: a merge leaves one of the name'
);
select is(
  (select count(*)::int from food.values where kind = 'tag' and person_id = '00000000-0000-4000-8000-00000000000a'),
  1,
  'RCP-018 1: the merged value is gone'
);

-- Deleted, its cuisine taken off my list, then brought back.
select core.archive_item('00000000-0000-7000-8000-000000000001');
select food.remove_value('00000000-0000-7000-8000-0000000000c1');
select core.restore_item('00000000-0000-7000-8000-000000000001');
select is(
  (select array_agg(kind || ':' || name order by kind, name) from food.values
   where person_id = '00000000-0000-4000-8000-00000000000a'),
  array['cuisine:Indian', 'protein:Chicken', 'tag:Batch', 'tag:quick'],
  'RCP-018 1: a Recipe brought back puts its names back on my lists'
);

select pg_temp.sign_in('00000000-0000-4000-8000-00000000000b');
select is(
  (select cuisine from food.recipe where item_id = '00000000-0000-7000-8000-0000000000b1'),
  'Chinese',
  'RCP-018 1: someone else''s Recipes keep their names'
);
select throws_ok(
  $$select food.move_value_uses('colour', 'a', 'b')$$,
  '22023', null,
  'RCP-018 1: only the five lists'
);

select * from finish();
rollback;
