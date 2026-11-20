-- Lists (ADR-0069): a name and lines under my own subheadings, ticked as I
-- go; no date; done once completed; Personal or a Household's, its members
-- reading and ticking it; a Thought becomes one, a Note doesn't.
-- NTE-006, NTE-007, NTE-008.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(25);

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
-- A List's lines as "text", "# heading" and "text ✓", in order.
create function pg_temp.lines(p_list uuid) returns text[] language sql as $$
  select coalesce(array_agg(coalesce('# ' || heading, text || case when checked then ' ✓' else '' end)
    order by position, id), '{}')
  from core.list_lines where list_id = p_list
$$;
grant execute on function pg_temp.lines(uuid) to authenticated;
set local role authenticated;

-- ---------------------------------------------------------------------------
-- Ann's List: Personal to start, with no date.
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000a');
select core.create_item('00000000-0000-7000-8000-000000000001', 'list', '{"title": "Lisbon"}');
select is(
  (select s.kind from core.items i join core.spaces s on s.id = i.space_id
   where i.id = '00000000-0000-7000-8000-000000000001'),
  'personal',
  'NTE-007 1: a new List is Personal'
);
select throws_ok(
  $$select core.update_item('00000000-0000-7000-8000-000000000001', '{"do_on": "2026-11-21"}')$$,
  '23514', null,
  'ADR-0069: a List has no date'
);

select core.add_list_line('00000000-0000-7000-8000-0000000000a1', '00000000-0000-7000-8000-000000000001',
  '{"position": "a", "text": " Passport "}');
select core.add_list_line('00000000-0000-7000-8000-0000000000a1', '00000000-0000-7000-8000-000000000001',
  '{"position": "a", "text": "Passport"}');
select core.add_list_line('00000000-0000-7000-8000-0000000000a2', '00000000-0000-7000-8000-000000000001',
  '{"position": "b", "heading": "Clothes"}');
select core.add_list_line('00000000-0000-7000-8000-0000000000a3', '00000000-0000-7000-8000-000000000001',
  '{"position": "c", "text": "Shorts"}');
select is(
  pg_temp.lines('00000000-0000-7000-8000-000000000001'),
  array['Passport', '# Clothes', 'Shorts'],
  'NTE-006 3: lines and subheadings, trimmed, each made once when sent twice'
);
select throws_ok(
  $$select core.add_list_line('00000000-0000-7000-8000-0000000000a4', '00000000-0000-7000-8000-000000000001',
    '{"text": "  "}')$$,
  '23514', null,
  'NTE-006 3: a line has words'
);
select throws_ok(
  $$select core.add_list_line('00000000-0000-7000-8000-0000000000a4', '00000000-0000-7000-8000-000000000001',
    '{"text": "Socks", "pantry_id": "00000000-0000-7000-8000-0000000000e1"}')$$,
  '22023', null,
  'ADR-0069: a List''s line is typed, never a Pantry entry'
);
select core.create_item('00000000-0000-7000-8000-000000000002', 'note', '{"title": "Boiler"}');
select throws_ok(
  $$select core.add_list_line('00000000-0000-7000-8000-0000000000a4', '00000000-0000-7000-8000-000000000002',
    '{"text": "Socks"}')$$,
  '23514', null,
  'ADR-0069: lines belong to a List'
);
select throws_ok(
  $$update core.list_lines set list_id = '00000000-0000-7000-8000-000000000002'
    where id = '00000000-0000-7000-8000-0000000000a1'$$,
  '23514', null,
  'ADR-0069: a line stays on its List'
);

-- Ticking, renaming and removing.
select core.tick_list_lines(array['00000000-0000-7000-8000-0000000000a1'::uuid,
  '00000000-0000-7000-8000-0000000000a2'::uuid], true);
select is(
  pg_temp.lines('00000000-0000-7000-8000-000000000001'),
  array['Passport ✓', '# Clothes', 'Shorts'],
  'NTE-006 4: a line is ticked; a subheading never is'
);
select core.tick_list_lines(array['00000000-0000-7000-8000-0000000000a1'::uuid], false);
select is(
  pg_temp.lines('00000000-0000-7000-8000-000000000001'),
  array['Passport', '# Clothes', 'Shorts'],
  'NTE-006 4: and unticked'
);
select core.update_list_line('00000000-0000-7000-8000-0000000000a3', '{"text": "Swim shorts"}');
select core.update_list_line('00000000-0000-7000-8000-0000000000a2', '{"heading": "Wear", "text": "x"}');
select is(
  pg_temp.lines('00000000-0000-7000-8000-000000000001'),
  array['Passport', '# Wear', 'Swim shorts'],
  'NTE-006 3: a line or subheading is renamed, a subheading staying one'
);
select throws_ok(
  $$select core.update_list_line('00000000-0000-7000-8000-0000000000a3', '{"checked": true}')$$,
  '22023', null,
  'NTE-006 4: a tick is ticking, not an update'
);
select core.remove_list_line('00000000-0000-7000-8000-0000000000a3');
select is(
  pg_temp.lines('00000000-0000-7000-8000-000000000001'),
  array['Passport', '# Wear'],
  'NTE-006 3: a line is removed'
);

-- Completing (NTE-006 5): done, and back; never cancelled.
select core.update_item('00000000-0000-7000-8000-000000000001', '{"status": "done"}');
select is(
  (select status from core.items where id = '00000000-0000-7000-8000-000000000001'),
  'done',
  'NTE-006 5: a List is completed'
);
select core.update_item('00000000-0000-7000-8000-000000000001', '{"status": "active"}');
select throws_ok(
  $$select core.update_item('00000000-0000-7000-8000-000000000001', '{"status": "cancelled"}')$$,
  '23514', null,
  'NTE-006 5: done or not, nothing else'
);

-- Pinned and labelled as a Note is (NTE-007 3).
select core.set_mark('00000000-0000-7000-8000-000000000001', true);
select core.create_label('00000000-0000-7000-8000-0000000000b1', 'Travel');
select core.add_label('00000000-0000-7000-8000-000000000001', '00000000-0000-7000-8000-0000000000b1');
select is(
  (select count(*)::int from core.marks where item_id = '00000000-0000-7000-8000-000000000001')
    + (select count(*)::int from core.item_labels where item_id = '00000000-0000-7000-8000-000000000001'),
  2,
  'NTE-007 3: a List is pinned and labelled'
);

-- ---------------------------------------------------------------------------
-- A Thought becomes a List in place, keeping its Labels; a Note doesn't.
select core.create_item('00000000-0000-7000-8000-000000000003', 'thought', '{"title": "Garden"}');
select core.add_label('00000000-0000-7000-8000-000000000003', '00000000-0000-7000-8000-0000000000b1');
select core.convert_item('00000000-0000-7000-8000-000000000003', 'list');
select is(
  (select type || ':' || (select count(*) from core.item_labels l where l.item_id = i.id)
   from core.items i where i.id = '00000000-0000-7000-8000-000000000003'),
  'list:1',
  'NTE-007 4: a Thought becomes a List, keeping its Labels'
);
select core.add_list_line('00000000-0000-7000-8000-0000000000a5', '00000000-0000-7000-8000-000000000003',
  '{"text": "Mow"}');
select is(
  pg_temp.lines('00000000-0000-7000-8000-000000000003'),
  array['Mow'],
  'NTE-007 4: and takes lines'
);
select throws_ok(
  $$select core.convert_item('00000000-0000-7000-8000-000000000002', 'list')$$,
  '23514', null,
  'ADR-0069: a Note doesn''t become a List'
);
select throws_ok(
  $$select core.convert_item('00000000-0000-7000-8000-000000000003', 'task')$$,
  '23514', null,
  'ADR-0069: a List doesn''t become another Type'
);

-- ---------------------------------------------------------------------------
-- A Household's List (NTE-008): its members read and tick it; no one else.
select core.create_item('00000000-0000-7000-8000-000000000004', 'list',
  '{"title": "DIY", "space_id": "00000000-0000-7000-8000-0000000000f1"}');
select core.add_list_line('00000000-0000-7000-8000-0000000000a6', '00000000-0000-7000-8000-000000000004',
  '{"text": "Screws"}');

select pg_temp.sign_in('00000000-0000-4000-8000-00000000000b');
select is(
  pg_temp.lines('00000000-0000-7000-8000-000000000004'),
  array['Screws'],
  'NTE-008 1: a Household member reads its List'
);
select core.tick_list_lines(array['00000000-0000-7000-8000-0000000000a6'::uuid], true);
select core.add_list_line('00000000-0000-7000-8000-0000000000a7', '00000000-0000-7000-8000-000000000004',
  '{"text": "Filler"}');
select is(
  pg_temp.lines('00000000-0000-7000-8000-000000000004'),
  array['Screws ✓', 'Filler'],
  'NTE-008 1: and ticks and adds to it'
);
select is(
  pg_temp.lines('00000000-0000-7000-8000-000000000001'),
  '{}'::text[],
  'NTE-008 1: but sees none of Ann''s Personal Lists'
);

select pg_temp.sign_in('00000000-0000-4000-8000-00000000000c');
select is(
  pg_temp.lines('00000000-0000-7000-8000-000000000004'),
  '{}'::text[],
  'NTE-008 1: someone outside the Household sees none of it'
);
select throws_ok(
  $$select core.add_list_line('00000000-0000-7000-8000-0000000000a8', '00000000-0000-7000-8000-000000000004',
    '{"text": "Nails"}')$$,
  null, null,
  'NTE-008 1: and adds nothing to it'
);
select core.tick_list_lines(array['00000000-0000-7000-8000-0000000000a7'::uuid], true);
select core.remove_list_line('00000000-0000-7000-8000-0000000000a7');

select pg_temp.sign_in('00000000-0000-4000-8000-00000000000a');
select is(
  pg_temp.lines('00000000-0000-7000-8000-000000000004'),
  array['Screws ✓', 'Filler'],
  'NTE-008 1: nor ticks or removes its lines'
);

select * from finish();
rollback;
