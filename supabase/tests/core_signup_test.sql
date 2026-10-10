-- Sign-up and IDs. ACC-001; ADR-0007 (UUIDv7).
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(5);

insert into auth.users (id, email, raw_user_meta_data)
values ('00000000-0000-4000-8000-00000000000a', 'ann@example.com', '{"full_name": "Ann"}');

select is(
  (select name from core.people where id = '00000000-0000-4000-8000-00000000000a'),
  'Ann',
  'ACC-001: signing up creates the person, named from Google'
);
select is(
  (select count(*)::int from core.spaces
   where created_by = '00000000-0000-4000-8000-00000000000a' and kind = 'personal'),
  1,
  'ACC-001: signing up creates one Personal Space'
);
select is(
  (select count(*)::int from core.space_members m join core.spaces s on s.id = m.space_id
   where m.person_id = '00000000-0000-4000-8000-00000000000a' and s.kind = 'personal'),
  1,
  'ACC-001: the person is the only member of their Personal Space'
);

select is(substr(core_private.uuidv7()::text, 15, 1), '7', 'uuidv7() makes version-7 UUIDs');

create temp table ids (n int, id uuid);
insert into ids values (1, core_private.uuidv7());
select pg_sleep(0.005);
insert into ids values (2, core_private.uuidv7());
select ok(
  (select id from ids where n = 1) < (select id from ids where n = 2),
  'uuidv7() sorts by creation time'
);

select * from finish(true);
rollback;
