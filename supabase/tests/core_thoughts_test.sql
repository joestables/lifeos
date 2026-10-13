-- Thoughts ticked off and labelled (Joe, 13 October).
-- INB-001, INB-006, CAP-009, ITM-004, ITM-005, REM-008; ADR-0014, ADR-0037.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(8);

insert into auth.users (id, email) values ('00000000-0000-4000-8000-00000000000a', 'ann@example.com');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}', true),
  set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000a', true);
set local role authenticated;

select core.create_item('00000000-0000-7000-8000-000000000001', 'thought', '{"title": "Paint the shed"}');
select core.create_item('00000000-0000-7000-8000-000000000002', 'thought', '{"title": "Gift for Sam"}');
select core.create_item('00000000-0000-7000-8000-000000000003', 'thought', '{"title": "Japan in spring"}');
select core.create_label('00000000-0000-7000-8000-0000000000a1', 'Home');

-- CAP-009, ITM-005: a Thought takes a Label, and keeps it as a Task.
select core.add_label('00000000-0000-7000-8000-000000000001', '00000000-0000-7000-8000-0000000000a1');
select is(
  (select count(*)::int from core.item_labels where item_id = '00000000-0000-7000-8000-000000000001'),
  1,
  'CAP-009: a Thought is given a Label'
);
select core.convert_item('00000000-0000-7000-8000-000000000001', 'task');
select is(
  (select count(*)::int from core.item_labels where item_id = '00000000-0000-7000-8000-000000000001'),
  1,
  'ITM-004: a labelled Thought made a Task keeps its Label'
);

-- INB-006: a Thought ticked off is done, and can be unticked.
select lives_ok(
  $$select core.update_item('00000000-0000-7000-8000-000000000002', '{"status": "done"}')$$,
  'INB-006: a Thought can be ticked off'
);
select throws_ok(
  $$select core.update_item('00000000-0000-7000-8000-000000000003', '{"status": "idea"}')$$,
  '23514', null,
  'INB-006: a Thought has no Someday'
);

-- REM-008: the digest counts only the Thoughts still to deal with.
reset role;
select is(
  (select c.to_sort from core_private.day_counts('00000000-0000-4000-8000-00000000000a', '2026-10-13') c),
  1,
  'REM-008: a Thought ticked off isn''t counted'
);
set local role authenticated;

-- ITM-004: converting keeps the status where the new Type has it.
select core.convert_item('00000000-0000-7000-8000-000000000002', 'note');
select is(
  (select status from core.items where id = '00000000-0000-7000-8000-000000000002'),
  'active',
  'ITM-004: a Thought ticked off and made a Note is an active Note'
);
select core.update_item('00000000-0000-7000-8000-000000000003', '{"status": "done"}');
select core.convert_item('00000000-0000-7000-8000-000000000003', 'task');
select is(
  (select status from core.items where id = '00000000-0000-7000-8000-000000000003'),
  'done',
  'ITM-004: a Thought ticked off and made a Task is a done Task'
);
select core.update_item('00000000-0000-7000-8000-000000000003', '{"status": "active"}');
select is(
  (select status from core.items where id = '00000000-0000-7000-8000-000000000003'),
  'active',
  'ITM-004: and, as a Task, is open again when unticked'
);

select * from finish();
rollback;
