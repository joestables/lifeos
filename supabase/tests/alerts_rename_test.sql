-- Alerts by name (ADR-0065 4): the new names work, and since step 10b the
-- old ones are gone.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(5);

insert into auth.users (id, email) values ('00000000-0000-4000-8000-00000000000a', 'ann@example.com');

select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}', true),
  set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000a', true);
set local role authenticated;

select core.create_item('00000000-0000-7000-8000-000000000001', 'task', '{"title": "Bins", "do_on": "2030-01-08"}');

select lives_ok(
  $$select core.add_alert('00000000-0000-7000-8000-0000000000e1', '00000000-0000-7000-8000-000000000001',
      '{"fixed_at": "2030-01-08T19:00:00Z"}')$$,
  'An Alert is added by its new name'
);
select throws_ok(
  $$select core.update_settings('{"default_reminder_time": "08:00"}')$$,
  '22023', null,
  'Settings by the old names are refused'
);
reset role;

select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'core' and c.relname in ('reminder_deliveries', 'reminders')),
  0,
  'No table or view keeps the old names'
);
select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'core' and p.proname like '%reminder%'),
  0,
  'Nor any function'
);
select is(
  (select count(*)::int from pg_attribute
   where attrelid = 'core.people'::regclass and attname like '%reminder%' and not attisdropped),
  0,
  'Nor my settings'
);

select * from finish();
rollback;
