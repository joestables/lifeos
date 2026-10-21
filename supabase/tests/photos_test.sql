-- Photos (ADR-0052): one per Item, kept in Storage's `photos` bucket at
-- `{item id}/{attachment id}.webp`; read by whoever can read the Item, added
-- and removed by whoever can write it. RCP-006 3, RCP-016 1.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(12);

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

create function pg_temp.sign_in(p_person uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_person, 'role', 'authenticated')::text, true),
    set_config('request.jwt.claim.sub', p_person::text, true)
$$;
grant execute on function pg_temp.sign_in(uuid) to authenticated;
set local role authenticated;

select pg_temp.sign_in('00000000-0000-4000-8000-00000000000a');
select food.create_recipe('00000000-0000-7000-8000-000000000001', '00000000-0000-7000-8000-000000000002',
  'Katsu curry', 'active', 'Standard');

-- Ann uploads a photo to her Recipe's folder, then keeps it.
insert into storage.objects (bucket_id, name)
values ('photos', '00000000-0000-7000-8000-000000000001/00000000-0000-7000-8000-0000000000a1.webp');
select core.set_photo('00000000-0000-7000-8000-0000000000a1', '00000000-0000-7000-8000-000000000001', 800, 600, 240000);
select core.set_photo('00000000-0000-7000-8000-0000000000a1', '00000000-0000-7000-8000-000000000001', 800, 600, 240000);
select is(
  (select array_agg(path) from core.attachments),
  array['00000000-0000-7000-8000-000000000001/00000000-0000-7000-8000-0000000000a1.webp'],
  'RCP-006: a photo is kept at its Item''s folder, its path made from the ids; sent twice, once'
);

-- A new photo takes the old one's place.
select core.set_photo('00000000-0000-7000-8000-0000000000a2', '00000000-0000-7000-8000-000000000001', 800, 800, 200000);
select is(
  (select array_agg(id) from core.attachments),
  array['00000000-0000-7000-8000-0000000000a2'::uuid],
  'RCP-006: an Item has one photo; a new one replaces it'
);
select throws_ok(
  $$select core.set_photo('00000000-0000-7000-8000-0000000000a3', '00000000-0000-7000-8000-000000000001', 800, 800, 3000000)$$,
  '23514', null,
  'ADR-0052: a photo is made small on the device; anything over 2 MB is refused'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('photos', 'not-an-item/x.webp')$$,
  '42501', null,
  'Storage: a file goes only in the folder of an Item'
);

-- Ben, in Ann's Household, sees it but can't change it.
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000b');
select is((select count(*)::int from core.attachments), 1,
  'RCP-017: a Household member sees the photo of a Recipe they can see');
select is(
  (select count(*)::int from storage.objects where bucket_id = 'photos'),
  1,
  'Storage: a Household member can read the file'
);
select throws_ok(
  $$select core.set_photo('00000000-0000-7000-8000-0000000000b1', '00000000-0000-7000-8000-000000000001', 10, 10, 100)$$,
  '42501', null,
  'ADR-0051: a Household member can''t change the photo of a Recipe that isn''t theirs'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('photos', '00000000-0000-7000-8000-000000000001/00000000-0000-7000-8000-0000000000b2.webp')$$,
  '42501', null,
  'Storage: nor upload to its folder'
);
select core.remove_photo('00000000-0000-7000-8000-000000000001');
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000a');
select is((select count(*)::int from core.attachments), 1,
  'ADR-0051: nor remove it');

-- Cat, outside, sees nothing.
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000c');
select is((select count(*)::int from core.attachments), 0, 'Someone outside sees no photo');
select is((select count(*)::int from storage.objects where bucket_id = 'photos'), 0,
  'Storage: nor its file');

-- Ann takes it off.
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000a');
select core.remove_photo('00000000-0000-7000-8000-000000000001');
select is((select count(*)::int from core.attachments), 0, 'RCP-006: a photo is removed');

select * from finish();
rollback;
