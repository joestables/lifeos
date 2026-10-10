-- Who can read and write what. ACC-002; ADR-0016, ADR-0017, ADR-0032.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(17);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'ann@example.com'),
  ('00000000-0000-4000-8000-00000000000b', 'ben@example.com');
select id as a_space from core.spaces where created_by = '00000000-0000-4000-8000-00000000000a' \gset

-- As Ann: a Task, then an edit.
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}', true),
  set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000a', true);
set local role authenticated;
select core.create_item('00000000-0000-7000-8000-000000000001', 'task', '{"title": "Ann''s task"}');
select core.update_item('00000000-0000-7000-8000-000000000001', '{"title": "Ann''s task, edited"}');
select is(
  (select count(*)::int from core.items where id = '00000000-0000-7000-8000-000000000001'),
  1,
  'ACC-002: Ann reads her own Item'
);
select ok(
  (select count(*) from core.activity where item_id = '00000000-0000-7000-8000-000000000001') >= 2,
  'ACC-002: Ann reads her Item''s activity log'
);
reset role;

-- As Ben.
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-00000000000b", "role": "authenticated"}', true),
  set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000b', true);
set local role authenticated;
select is(
  (select count(*)::int from core.items where id = '00000000-0000-7000-8000-000000000001'),
  0,
  'ACC-002: Ben can''t read Ann''s Item'
);
select is(
  (select count(*)::int from core.activity where item_id = '00000000-0000-7000-8000-000000000001'),
  0,
  'ACC-002: Ben can''t read the activity log of Ann''s Item'
);
select throws_ok(
  $$select core.update_item('00000000-0000-7000-8000-000000000001', '{"title": "Ben was here"}')$$,
  'P0002', null,
  'ACC-002: Ben can''t edit Ann''s Item'
);
select throws_ok(
  format($$insert into core.items (id, type, space_id, owner_id) values
    ('00000000-0000-7000-8000-000000000002', 'thought', %L, '00000000-0000-4000-8000-00000000000b')$$, :'a_space'),
  '42501', null,
  'ACC-002: Ben can''t create an Item in Ann''s Space'
);
select is(
  (select count(*)::int from core.spaces where id = :'a_space'),
  0,
  'ACC-002: Ben can''t see Ann''s Space'
);
select is(
  (select count(*)::int from core.people where id = '00000000-0000-4000-8000-00000000000a'),
  0,
  'ACC-002: Ben can''t see Ann'
);
select core.create_item('00000000-0000-7000-8000-000000000003', 'note', '{"title": "Ben''s note"}');
select throws_ok(
  $$select core.link_items('00000000-0000-7000-8000-000000000004',
    '00000000-0000-7000-8000-000000000003', '00000000-0000-7000-8000-000000000001', 'relates_to')$$,
  '42501', null,
  'ADR-0017: Ben can''t link his Item to Ann''s'
);
reset role;

set local role anon;
select throws_ok('select * from core.items', '42501', null, 'ACC-002: nobody signed out reads anything');
reset role;

-- A Household, made directly until Stage 4 builds them, with Ann and Ben in it.
insert into core.spaces (id, kind, name, created_by)
values ('00000000-0000-7000-8000-0000000000aa', 'household', 'Home', '00000000-0000-4000-8000-00000000000a');
insert into core.space_members (space_id, person_id) values
  ('00000000-0000-7000-8000-0000000000aa', '00000000-0000-4000-8000-00000000000a'),
  ('00000000-0000-7000-8000-0000000000aa', '00000000-0000-4000-8000-00000000000b');

-- As Ann: a shared Event; her Personal Task is for it; a Personal Note
-- relates to the Task.
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}', true),
  set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000a', true);
set local role authenticated;
select core.create_item('00000000-0000-7000-8000-000000000010', 'event',
  '{"title": "Dinner", "space_id": "00000000-0000-7000-8000-0000000000aa", "starts_at": "2026-10-10T19:00:00Z"}');
select core.link_items('00000000-0000-7000-8000-000000000011',
  '00000000-0000-7000-8000-000000000001', '00000000-0000-7000-8000-000000000010', 'for');
select core.create_item('00000000-0000-7000-8000-000000000012', 'note', '{"title": "Ann''s note"}');
select core.link_items('00000000-0000-7000-8000-000000000013',
  '00000000-0000-7000-8000-000000000012', '00000000-0000-7000-8000-000000000001', 'relates_to');
reset role;

select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-00000000000b", "role": "authenticated"}', true),
  set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000b', true);
set local role authenticated;
select is(
  (select count(*)::int from core.items where id = '00000000-0000-7000-8000-000000000010'),
  1,
  'ADR-0016: Ben reads the Household''s Event'
);
select is(
  (select title from core.items where id = '00000000-0000-7000-8000-000000000001'),
  'Ann''s task, edited',
  'ADR-0016: Ben reads Ann''s Personal Task, one hop from the shared Event'
);
select is(
  (select count(*)::int from core.links where id = '00000000-0000-7000-8000-000000000011'),
  1,
  'ADR-0016: Ben sees the link that makes the Task visible'
);
select throws_ok(
  $$select core.update_item('00000000-0000-7000-8000-000000000001', '{"title": "Ben was here"}')$$,
  'P0002', null,
  'ADR-0016: seeing an Item through a link doesn''t let Ben edit it'
);
select is(
  (select count(*)::int from core.items where id = '00000000-0000-7000-8000-000000000012'),
  0,
  'ADR-0016: one hop only: Ben can''t read the Note linked to the Task'
);
reset role;

-- Ann deletes the Event; its link stops counting.
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}', true),
  set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000a', true);
set local role authenticated;
select core.archive_item('00000000-0000-7000-8000-000000000010');
reset role;

select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-00000000000b", "role": "authenticated"}', true),
  set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000b', true);
set local role authenticated;
select is(
  (select count(*)::int from core.items where id = '00000000-0000-7000-8000-000000000001'),
  0,
  'ADR-0032: an archived Item''s links stop counting for visibility'
);
select is(
  (select count(*)::int from core.items where id = '00000000-0000-7000-8000-000000000010'),
  1,
  'ADR-0032: the archived Event is still there to recover'
);
reset role;

select * from finish(true);
rollback;
