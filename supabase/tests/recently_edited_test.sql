-- Recently edited (RCP-001 6): a line or step added, changed or removed
-- moves its Variation's updated_at; nothing is added to the activity log.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(5);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'ann@example.com');

create function pg_temp.sign_in(p_person uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_person, 'role', 'authenticated')::text, true),
    set_config('request.jwt.claim.sub', p_person::text, true)
$$;
grant execute on function pg_temp.sign_in(uuid) to authenticated;

-- Back to an old time, as if last edited long ago.
create function pg_temp.age() returns void language sql as $$
  alter table food.variation disable trigger variation_updated_at;
  update food.variation set updated_at = '2026-01-01' where item_id = '00000000-0000-7000-8000-000000000002';
  alter table food.variation enable trigger variation_updated_at;
$$;
create function pg_temp.edited() returns boolean language sql as $$
  select updated_at = now() from food.variation where item_id = '00000000-0000-7000-8000-000000000002'
$$;
grant execute on function pg_temp.edited() to authenticated;

set local role authenticated;
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000a');
select food.create_recipe('00000000-0000-7000-8000-000000000001', '00000000-0000-7000-8000-000000000002',
  'Paella', 'active', 'Standard');
reset role;
-- Made earlier, so its lines and steps are logged (log_food skips rows made with their Item).
update core.items set created_at = '2026-01-01' where id in
  ('00000000-0000-7000-8000-000000000001', '00000000-0000-7000-8000-000000000002');
select pg_temp.age();
-- The log, from here.
create temp table logged as select count(*)::int as n from core.activity;
grant select on logged to authenticated;

set local role authenticated;
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000a');
select food.add_line('00000000-0000-7000-8000-0000000000d1', '00000000-0000-7000-8000-000000000002',
  '{"position": "a", "text": "Rice", "qty": 300, "unit": "g"}');
select ok(pg_temp.edited(), 'RCP-001 6: a line added edits its Variation');

reset role;
select pg_temp.age();
set local role authenticated;
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000a');
select food.update_line('00000000-0000-7000-8000-0000000000d1', '{"qty": 350}');
select ok(pg_temp.edited(), 'RCP-001 6: a line changed edits its Variation');

reset role;
select pg_temp.age();
set local role authenticated;
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000a');
select food.remove_line('00000000-0000-7000-8000-0000000000d1');
select ok(pg_temp.edited(), 'RCP-001 6: a line removed edits its Variation');

reset role;
select pg_temp.age();
set local role authenticated;
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000a');
select food.add_step('00000000-0000-7000-8000-0000000000f1', '00000000-0000-7000-8000-000000000002', 'Fry the chorizo.', 'a');
select ok(pg_temp.edited(), 'RCP-001 6: a step added edits its Variation');

reset role;
select is(
  (select count(*)::int from core.activity) - (select n from logged),
  4,
  'RCP-013: each line and step change is logged; the touch is not'
);

select * from finish();
rollback;
