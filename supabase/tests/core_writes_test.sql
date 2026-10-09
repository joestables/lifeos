-- The write functions and the rules the database enforces.
-- OFF-002, OFF-003; ADR-0007, ADR-0008, ADR-0018, ADR-0030, ADR-0032, ADR-0037.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(20);

insert into auth.users (id, email) values ('00000000-0000-4000-8000-00000000000a', 'ann@example.com');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}', true),
  set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000a', true);
set local role authenticated;

-- OFF-002: a create sent twice counts once.
select core.create_item('00000000-0000-7000-8000-000000000001', 'thought', '{"title": "Milk"}');
select is(
  (select title from core.create_item('00000000-0000-7000-8000-000000000001', 'thought', '{"title": "Milk"}')),
  'Milk',
  'OFF-002: a repeated create returns the Item'
);
select is(
  (select count(*)::int from core.items where id = '00000000-0000-7000-8000-000000000001'),
  1,
  'OFF-002: a create sent twice makes one Item, with the device''s ID'
);

-- OFF-003: patches change only their fields; the last to arrive wins a field.
select core.create_item('00000000-0000-7000-8000-000000000002', 'task', '{"title": "Book dentist"}');
select core.update_item('00000000-0000-7000-8000-000000000002', '{"title": "Book the dentist"}');
select core.update_item('00000000-0000-7000-8000-000000000002', '{"do_on": "2026-10-12"}');
select is(
  (select row(title, do_on)::text from core.items where id = '00000000-0000-7000-8000-000000000002'),
  row('Book the dentist', '2026-10-12'::date)::text,
  'OFF-003: edits to different fields both survive'
);
select core.update_item('00000000-0000-7000-8000-000000000002', '{"title": "Dentist"}');
select is(
  (select title from core.items where id = '00000000-0000-7000-8000-000000000002'),
  'Dentist',
  'OFF-003: when both change the same field, the last received wins'
);
select throws_ok(
  $$select core.update_item('00000000-0000-7000-8000-000000000002', '{"colour": "red"}')$$,
  '22023', null,
  'ADR-0042: a write with an unknown field is refused'
);

-- The ontology, enforced (ADR-0007, ADR-0008).
select throws_ok(
  $$select core.create_item('00000000-0000-7000-8000-000000000003', 'thought', '{"do_on": "2026-10-12"}')$$,
  '23514', null,
  'ADR-0007: a Type can''t set a time field it doesn''t use'
);
select throws_ok(
  $$select core.create_item('00000000-0000-7000-8000-000000000004', 'note', '{"status": "done"}')$$,
  '23514', null,
  'ADR-0007: only Completable Types can be done'
);
select lives_ok(
  $$select core.update_item('00000000-0000-7000-8000-000000000002', '{"status": "done"}')$$,
  'ADR-0007: a Task can be done'
);
select throws_ok(
  $$select core.create_item('00000000-0000-7000-8000-000000000005', 'bookmark')$$,
  '23503', null,
  'ADR-0008: only Types declared in the ontology exist'
);

-- Conversions in place (ADR-0018) and the log that records them (ADR-0030).
update core.items set type = 'task' where id = '00000000-0000-7000-8000-000000000001';
select is(
  (select verb from core.activity where item_id = '00000000-0000-7000-8000-000000000001' order by id desc limit 1),
  'converted',
  'ADR-0030: a conversion is logged'
);
select throws_ok(
  $$update core.items set type = 'note' where id = '00000000-0000-7000-8000-000000000002'$$,
  '23514', null,
  'ADR-0018: a Task can''t be converted in place into a Note'
);
select is(
  (select changed -> 'title' ->> 'to' from core.activity
   where item_id = '00000000-0000-7000-8000-000000000002' and verb = 'updated' order by id limit 1),
  'Book the dentist',
  'ADR-0030: an edit logs the fields that changed'
);

-- Links (ADR-0008 link rules).
select core.create_item('00000000-0000-7000-8000-000000000006', 'event', '{"title": "Mum''s lunch", "starts_at": "2026-10-11T12:00:00Z"}');
select core.create_item('00000000-0000-7000-8000-000000000007', 'note', '{"title": "Ideas"}');
select throws_ok(
  $$select core.link_items('00000000-0000-7000-8000-000000000020',
    '00000000-0000-7000-8000-000000000007', '00000000-0000-7000-8000-000000000006', 'for')$$,
  '23514', null,
  'ADR-0008: a link type connects only the Types it allows'
);
select core.link_items('00000000-0000-7000-8000-000000000021',
  '00000000-0000-7000-8000-000000000007', '00000000-0000-7000-8000-000000000006', 'relates_to');
select core.link_items('00000000-0000-7000-8000-000000000022',
  '00000000-0000-7000-8000-000000000006', '00000000-0000-7000-8000-000000000007', 'relates_to');
select is(
  (select count(*)::int from core.links where link_type = 'relates_to'),
  1,
  'A symmetric link is stored once, whichever way round it is made'
);
select is(
  (select count(*)::int from core.activity where verb = 'linked'
   and item_id in ('00000000-0000-7000-8000-000000000006', '00000000-0000-7000-8000-000000000007')),
  2,
  'ADR-0030: a link is logged on both its Items'
);
select core.unlink_items('00000000-0000-7000-8000-000000000006', '00000000-0000-7000-8000-000000000007', 'relates_to');
select is(
  (select count(*)::int from core.links where link_type = 'relates_to'),
  0,
  'A symmetric link can be removed from either end'
);

-- Thoughts and Notes are always Personal (ADR-0037).
reset role;
insert into core.spaces (id, kind, name, created_by)
values ('00000000-0000-7000-8000-0000000000aa', 'household', 'Home', '00000000-0000-4000-8000-00000000000a');
insert into core.space_members (space_id, person_id)
values ('00000000-0000-7000-8000-0000000000aa', '00000000-0000-4000-8000-00000000000a');
set local role authenticated;
select throws_ok(
  $$select core.create_item('00000000-0000-7000-8000-000000000008', 'thought',
    '{"space_id": "00000000-0000-7000-8000-0000000000aa"}')$$,
  '23514', null,
  'ADR-0037: a Thought can''t be in the Household'
);

-- Delete means archive (ADR-0032).
select core.archive_item('00000000-0000-7000-8000-000000000007');
select isnt(
  (select archived_at from core.items where id = '00000000-0000-7000-8000-000000000007'),
  null,
  'ADR-0032: deleting archives the Item'
);
select throws_ok(
  $$delete from core.items where id = '00000000-0000-7000-8000-000000000007'$$,
  '42501', null,
  'ADR-0032: Items can''t be deleted for good'
);
select core.restore_item('00000000-0000-7000-8000-000000000007');
select is(
  (select array_agg(verb order by id) from core.activity
   where item_id = '00000000-0000-7000-8000-000000000007' and verb in ('archived', 'restored')),
  array['archived', 'restored'],
  'ADR-0032: a deleted Item can be recovered, and both are logged'
);
reset role;

select * from finish(true);
rollback;
