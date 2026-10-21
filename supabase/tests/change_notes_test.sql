-- Notes on a Recipe's changes (RCP-013): whoever made a change may say what
-- changed; whoever can read the Recipe reads it.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(9);

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

select pg_temp.sign_in('00000000-0000-4000-8000-00000000000a');
select food.create_recipe('00000000-0000-7000-8000-000000000001', '00000000-0000-7000-8000-000000000002',
  'Katsu curry', 'active', 'Standard');
-- Made yesterday, so today's change is logged.
reset role;
update core.items set created_at = now() - interval '1 day'
  where id in ('00000000-0000-7000-8000-000000000001', '00000000-0000-7000-8000-000000000002');
set local role authenticated;
select food.update_variation('00000000-0000-7000-8000-000000000002', '{"servings": 4}');
select id as change from core.activity
  where item_id = '00000000-0000-7000-8000-000000000002' and changed ? 'servings' \gset

select food.note_change(:change, '  More honey  ');
select food.note_change(:change, 'More honey, less salt');
select is(
  (select array_agg(note) from food.change_notes),
  array['More honey, less salt'],
  'RCP-013: my note on my change, kept trimmed, in place of the last'
);

select pg_temp.sign_in('00000000-0000-4000-8000-00000000000b');
select is((select count(*)::int from food.change_notes), 1,
  'RCP-013: a Household member reads the note');
select throws_ok(
  format($$select food.note_change(%s, 'Not mine')$$, :change),
  '42501', null,
  'RCP-013: only who made a change notes it'
);
select throws_ok(
  $$insert into food.change_notes (activity_id, item_id, note, person_id)
    select id, item_id, 'x', '00000000-0000-4000-8000-00000000000b' from core.activity limit 1$$,
  '42501', null,
  'RCP-013: nor writes a note on someone else''s Recipe'
);

select pg_temp.sign_in('00000000-0000-4000-8000-00000000000a');
select throws_ok(
  format($$insert into food.change_notes (activity_id, item_id, note) values (%s, '00000000-0000-7000-8000-000000000002', 'x')$$, :change + 1000),
  '42501', null,
  'RCP-013: a note is written only through note_change, even on my own Recipe'
);
select throws_ok(
  $$update food.change_notes set note = 'x'$$, '42501', null, 'RCP-013: nor changed directly'
);

-- A copied Variation's rows take the ids the app chose (RCP-009, RCP-016 1).
select food.add_line('00000000-0000-7000-8000-0000000000d1', '00000000-0000-7000-8000-000000000002',
  '{"position": "a", "text": "Honey"}');
select food.add_variation('00000000-0000-7000-8000-000000000005', '00000000-0000-7000-8000-000000000001',
  'Air fryer', '00000000-0000-7000-8000-000000000002',
  '{"00000000-0000-7000-8000-0000000000d1": "00000000-0000-7000-8000-0000000000e1"}');
select is(
  (select array_agg(id::text) from food.variation_lines where variation_id = '00000000-0000-7000-8000-000000000005'),
  array['00000000-0000-7000-8000-0000000000e1'],
  'RCP-009: a copied line takes the id the app chose'
);

select food.note_change(:change, '   ');
select is((select count(*)::int from food.change_notes), 0, 'RCP-013: an emptied note goes');
select throws_ok(
  $$select food.note_change(999999, 'x')$$, 'P0002', null, 'A change that isn''t there can''t be noted'
);

select * from finish();
rollback;
