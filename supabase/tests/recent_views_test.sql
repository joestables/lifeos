-- The Recipes I viewed last (MPL-002 1, Joe, 26 October): kept per person,
-- the latest view winning, read by no one else, gone with the Recipe.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(6);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'ann@example.com'),
  ('00000000-0000-4000-8000-00000000000b', 'ben@example.com');

create function pg_temp.sign_in(p_person uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_person, 'role', 'authenticated')::text, true),
    set_config('request.jwt.claim.sub', p_person::text, true)
$$;
grant execute on function pg_temp.sign_in(uuid) to authenticated;
set local role authenticated;

select pg_temp.sign_in('00000000-0000-4000-8000-00000000000a');
select food.create_recipe('00000000-0000-7000-8000-000000000001', '00000000-0000-7000-8000-000000000002',
  'Katsu curry');
select food.view_recipe('00000000-0000-7000-8000-000000000001', '2026-10-26 09:00+00');
select food.view_recipe('00000000-0000-7000-8000-000000000001', '2026-10-26 10:00+00');
-- Sent late by the queue: an earlier view doesn't move it back.
select food.view_recipe('00000000-0000-7000-8000-000000000001', '2026-10-26 08:00+00');
select is(
  (select viewed_at from food.recent_views),
  '2026-10-26 10:00+00'::timestamptz,
  'MPL-002 1: a Recipe viewed keeps its latest view'
);
select is((select count(*)::int from food.recent_views), 1, 'MPL-002 1: once per Recipe');
-- Not a Recipe: nothing kept.
select food.view_recipe('00000000-0000-7000-8000-000000000002');
select is((select count(*)::int from food.recent_views), 1, 'MPL-002 1: only Recipes are kept');

select pg_temp.sign_in('00000000-0000-4000-8000-00000000000b');
select is((select count(*)::int from food.recent_views), 0, 'MPL-002 1: no one else reads mine');
select throws_ok(
  $$insert into food.recent_views (person_id, recipe_id)
    values ('00000000-0000-4000-8000-00000000000a', '00000000-0000-7000-8000-000000000001')$$,
  '42501', null,
  'MPL-002 1: nor writes them'
);

reset role;
delete from core.items where id = '00000000-0000-7000-8000-000000000001';
select is((select count(*)::int from food.recent_views), 0, 'MPL-002 1: gone with its Recipe');

select * from finish();
rollback;
