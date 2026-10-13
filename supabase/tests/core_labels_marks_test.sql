-- Labels, marks and sub-tasks, and what a conversion does to them.
-- ITM-004, ITM-005, NTE-002, NTE-003, TSK-004, TSK-005, TSK-006, TSK-012;
-- ADR-0014, ADR-0037.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(33);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'ann@example.com'),
  ('00000000-0000-4000-8000-00000000000b', 'ben@example.com');

select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}', true),
  set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000a', true);
set local role authenticated;

select core.create_item('00000000-0000-7000-8000-000000000001', 'note', '{"title": "Boiler"}');
select core.create_item('00000000-0000-7000-8000-000000000002', 'task', '{"title": "Service the boiler"}');
select core.create_item('00000000-0000-7000-8000-000000000003', 'thought', '{"title": "milk"}');

-- ITM-005: one set of Labels, shared by Thoughts, Notes and Tasks.
select core.create_label('00000000-0000-7000-8000-0000000000a1', 'Home');
select is(
  (select id from core.create_label('00000000-0000-7000-8000-0000000000a2', ' home ')),
  '00000000-0000-7000-8000-0000000000a1'::uuid,
  'ITM-005: making "home" when "Home" exists returns the existing Label'
);
select is(
  (select count(*)::int from core.labels),
  1,
  'ITM-005: and makes no second Label'
);
select core.add_label('00000000-0000-7000-8000-000000000001', '00000000-0000-7000-8000-0000000000a1');
select core.add_label('00000000-0000-7000-8000-000000000002', '00000000-0000-7000-8000-0000000000a1');
select core.add_label('00000000-0000-7000-8000-000000000002', '00000000-0000-7000-8000-0000000000a1');
select is(
  (select count(*)::int from core.item_labels),
  2,
  'NTE-002, TSK-004: a Note and a Task share a Label; adding it twice counts once'
);
select lives_ok(
  $$select core.add_label('00000000-0000-7000-8000-000000000003', '00000000-0000-7000-8000-0000000000a1')$$,
  'ITM-005: a Thought takes Labels too'
);
select core.remove_label('00000000-0000-7000-8000-000000000003', '00000000-0000-7000-8000-0000000000a1');
select core.create_label('00000000-0000-7000-8000-0000000000a3', 'Car');
select core.add_label('00000000-0000-7000-8000-000000000002', '00000000-0000-7000-8000-0000000000a3');
select is(
  (select count(*)::int from core.item_labels where item_id = '00000000-0000-7000-8000-000000000002'),
  2,
  'TSK-004: a Task can have two Labels'
);
select core.rename_label('00000000-0000-7000-8000-0000000000a1', 'House');
select is(
  (select l.name from core.item_labels il join core.labels l on l.id = il.label_id
   where il.item_id = '00000000-0000-7000-8000-000000000001'),
  'House',
  'ITM-005: a renamed Label shows its new name on every Item'
);
select throws_ok(
  $$select core.rename_label('00000000-0000-7000-8000-0000000000a3', 'house')$$,
  '23505', null,
  'ITM-005: a Label can''t be renamed to another''s name'
);
select core.delete_label('00000000-0000-7000-8000-0000000000a3');
select is(
  (select count(*)::int from core.items where id = '00000000-0000-7000-8000-000000000002' and archived_at is null),
  1,
  'ITM-005: deleting a Label keeps its Items'
);
select is(
  (select count(*)::int from core.item_labels where item_id = '00000000-0000-7000-8000-000000000002'),
  1,
  'ITM-005: and takes it off them'
);

-- Marks: a pinned Note, a starred Task, per person.
select core.set_mark('00000000-0000-7000-8000-000000000001', true);
select core.set_mark('00000000-0000-7000-8000-000000000002', true);
select core.set_mark('00000000-0000-7000-8000-000000000002', true);
select is(
  (select count(*)::int from core.marks),
  2,
  'NTE-003, TSK-005: a Note pinned and a Task starred; starring twice counts once'
);
select throws_ok(
  $$select core.set_mark('00000000-0000-7000-8000-000000000003', true)$$,
  '23514', null,
  'ADR-0014: a Thought has no mark'
);
select core.set_mark('00000000-0000-7000-8000-000000000002', false);
select is(
  (select count(*)::int from core.marks where item_id = '00000000-0000-7000-8000-000000000002'),
  0,
  'TSK-005: unstarring removes the star'
);

-- Sub-tasks (TSK-006).
select core.add_subtask('00000000-0000-7000-8000-0000000000c1', '00000000-0000-7000-8000-000000000002', 'Find the manual', 'a');
select core.add_subtask('00000000-0000-7000-8000-0000000000c2', '00000000-0000-7000-8000-000000000002', 'Book the engineer', 'b');
select core.add_subtask('00000000-0000-7000-8000-0000000000c2', '00000000-0000-7000-8000-000000000002', 'Book the engineer', 'b');
select core.update_subtask('00000000-0000-7000-8000-0000000000c1', '{"done": true}');
select is(
  (select count(*) filter (where done) || '/' || count(*) from core.subtasks
   where item_id = '00000000-0000-7000-8000-000000000002'),
  '1/2',
  'TSK-006: two sub-tasks, one ticked; a repeated add counts once'
);
select throws_ok(
  $$select core.add_subtask('00000000-0000-7000-8000-0000000000c3', '00000000-0000-7000-8000-000000000001', 'Nope', 'a')$$,
  '23514', null,
  'TSK-006: a Note has no sub-tasks'
);
select core.update_item('00000000-0000-7000-8000-000000000002', '{"status": "done"}');
select is(
  (select count(*) filter (where done)::int from core.subtasks where item_id = '00000000-0000-7000-8000-000000000002'),
  1,
  'TSK-006: ticking the Task done leaves its sub-tasks as they were'
);
select throws_ok(
  $$select core.update_subtask('00000000-0000-7000-8000-0000000000c1', '{"colour": "red"}')$$,
  '22023', null,
  'ADR-0042: a sub-task write with an unknown field is refused'
);

-- TSK-012: a hand-made order is kept.
select core.update_item('00000000-0000-7000-8000-000000000002', '{"position": "a0"}');
select is(
  (select position from core.items where id = '00000000-0000-7000-8000-000000000002'),
  'a0',
  'TSK-012: a Task''s place in its group is kept'
);

-- ITM-004: a Note converted into a Task keeps its Labels; its pin becomes a star.
select core.convert_item('00000000-0000-7000-8000-000000000001', 'task');
select core.convert_item('00000000-0000-7000-8000-000000000001', 'task');
select is(
  (select count(*)::int from core.activity
   where item_id = '00000000-0000-7000-8000-000000000001' and verb = 'converted'),
  1,
  'ITM-004: converting is recorded in its history, once however often it is sent'
);
select throws_ok(
  $$select core.convert_item('00000000-0000-7000-8000-000000000002', 'note')$$,
  '23514', null,
  'ITM-004: a Task can''t be converted into a Note'
);
select is(
  (select count(*)::int from core.item_labels where item_id = '00000000-0000-7000-8000-000000000001'),
  1,
  'ITM-004: a Note converted into a Task keeps its Labels'
);
select is(
  (select count(*)::int from core.marks where item_id = '00000000-0000-7000-8000-000000000001'),
  1,
  'ITM-004: its pin is kept, as the Task''s star'
);
-- Into a Type with neither: both go.
select core.convert_item('00000000-0000-7000-8000-000000000001', 'event');
select is(
  (select count(*)::int from core.item_labels where item_id = '00000000-0000-7000-8000-000000000001')
    + (select count(*)::int from core.marks where item_id = '00000000-0000-7000-8000-000000000001'),
  0,
  'ITM-004: converted into a Type without Labels or a mark, it loses them'
);

-- ADR-0037: a Note has no idea status.
select throws_ok(
  $$select core.create_item('00000000-0000-7000-8000-000000000004', 'note', '{"status": "idea"}')$$,
  '23514', null,
  'ADR-0037: a Note can''t be an idea'
);
reset role;

-- As Ben.
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-00000000000b", "role": "authenticated"}', true),
  set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000b', true);
set local role authenticated;
select is(
  (select count(*)::int from core.labels) + (select count(*)::int from core.item_labels)
    + (select count(*)::int from core.subtasks) + (select count(*)::int from core.marks),
  0,
  'ACC-002: Ben sees none of Ann''s Labels, sub-tasks or marks'
);
select throws_ok(
  $$select core.add_label('00000000-0000-7000-8000-000000000002', '00000000-0000-7000-8000-0000000000a1')$$,
  '42501', null,
  'ACC-002: Ben can''t label Ann''s Task'
);
select throws_ok(
  $$select core.add_subtask('00000000-0000-7000-8000-0000000000c9', '00000000-0000-7000-8000-000000000002', 'Ben', 'z')$$,
  '42501', null,
  'ACC-002: Ben can''t add a sub-task to Ann''s Task'
);
select throws_ok(
  $$select core.set_mark('00000000-0000-7000-8000-000000000002', true)$$,
  '42501', null,
  'ACC-002: Ben can''t star a Task he can''t see'
);
select core.create_label('00000000-0000-7000-8000-0000000000b1', 'Home');
select is(
  (select count(*)::int from core.labels),
  1,
  'ITM-005: Ben''s "Home" is his own Label, in his own Space'
);
select throws_ok(
  $$select core.rename_label('00000000-0000-7000-8000-0000000000a1', 'Ben''s now')$$,
  'P0002', null,
  'ACC-002: Ben can''t rename Ann''s Label'
);
-- ITM-004: a conversion can be undone, back to the Type it came from, even
-- where the ontology has no such conversion; nothing else goes back.
reset role;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}', true),
  set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000a', true);
set local role authenticated;
select core.create_item('00000000-0000-7000-8000-000000000021', 'thought', '{"title": "Bins"}');
select core.convert_item('00000000-0000-7000-8000-000000000021', 'task');
select core.convert_item('00000000-0000-7000-8000-000000000021', 'thought');
select is(
  (select type from core.items where id = '00000000-0000-7000-8000-000000000021'),
  'thought',
  'ITM-004: Undo takes a Task back to the Thought it was'
);
select throws_ok(
  $$select core.convert_item('00000000-0000-7000-8000-000000000002', 'thought')$$,
  '23514', null,
  'ITM-004: a Task that was never a Thought can''t become one'
);

-- ITM-005: a Label made on a device that didn't know the name was taken is
-- that Label, under the device's id too.
select core.create_label('00000000-0000-7000-8000-0000000000c1', 'Garden');
select core.create_label('00000000-0000-7000-8000-0000000000c2', 'garden');
select core.add_label('00000000-0000-7000-8000-000000000002', '00000000-0000-7000-8000-0000000000c2');
select is(
  (select array_agg(label_id::text) from core.item_labels where item_id = '00000000-0000-7000-8000-000000000002' and label_id in ('00000000-0000-7000-8000-0000000000c1', '00000000-0000-7000-8000-0000000000c2')),
  array['00000000-0000-7000-8000-0000000000c1'],
  'ITM-005: a Label made twice under two ids is one Label, given by either'
);
select core.remove_label('00000000-0000-7000-8000-000000000002', '00000000-0000-7000-8000-0000000000c2');
select is(
  (select count(*)::int from core.item_labels where item_id = '00000000-0000-7000-8000-000000000002' and label_id = '00000000-0000-7000-8000-0000000000c1'),
  0,
  'ITM-005: and taken off by either'
);
select * from finish();
rollback;
