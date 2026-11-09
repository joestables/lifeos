-- Alerts by name (ADR-0065 4): the new names work, and until step 10 the
-- old ones do too, for a write queued before the rename, the app still open
-- in a browser, and the Android app as installed.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(10);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'ann@example.com'),
  ('00000000-0000-4000-8000-00000000000b', 'ben@example.com');

select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}', true),
  set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000a', true);
set local role authenticated;

select core.create_item('00000000-0000-7000-8000-000000000001', 'task', '{"title": "Bins", "do_on": "2030-01-08"}');

select lives_ok(
  $$select core.add_alert('00000000-0000-7000-8000-0000000000e1', '00000000-0000-7000-8000-000000000001',
      '{"fixed_at": "2030-01-08T19:00:00Z"}')$$,
  'An Alert is added by its new name'
);
select lives_ok(
  $$select core.add_reminder('00000000-0000-7000-8000-0000000000e2', '00000000-0000-7000-8000-000000000001',
      '{"fixed_at": "2030-01-08T20:00:00Z", "alarm": true}')$$,
  'A write queued before the rename, by the old name, still adds one'
);
select is(
  (select count(*)::int from core.alerts where item_id = '00000000-0000-7000-8000-000000000001' and not is_default),
  2,
  'Both are Alerts'
);
select is(
  (select count(*)::int from core.reminders where item_id = '00000000-0000-7000-8000-000000000001' and not is_default),
  2,
  'The app still open reads them by the old name'
);
select core.update_reminder('00000000-0000-7000-8000-0000000000e2', '{"alarm": false}');
select is(
  (select alarm from core.alerts where id = '00000000-0000-7000-8000-0000000000e2'),
  false,
  'The old update changes it'
);
select core.remove_reminder('00000000-0000-7000-8000-0000000000e2');
select is(
  (select count(*)::int from core.alerts where id = '00000000-0000-7000-8000-0000000000e2'),
  0,
  'The old remove removes it'
);
select core.update_settings('{"default_reminder_time": "08:00", "reminder_defaults": {"task": false}}');
select is(
  (select row(default_alert_time, alert_defaults ->> 'task')::text from core.people where id = '00000000-0000-4000-8000-00000000000a'),
  row(time '08:00', 'false')::text,
  'Settings queued by the old names are taken as the new'
);
select is(
  (select row(default_reminder_time, reminder_defaults ->> 'task')::text from core.people where id = '00000000-0000-4000-8000-00000000000a'),
  row(time '08:00', 'false')::text,
  'The app still open reads Settings by the old names'
);

reset role;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-00000000000b", "role": "authenticated"}', true),
  set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000b', true);
set local role authenticated;
select is(
  (select count(*)::int from core.reminders),
  0,
  'The old name shows only my own, as the table does'
);
reset role;

select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'core' and c.relname in ('reminder_deliveries', 'reminders') and c.relkind = 'r'),
  0,
  'No table keeps the old names'
);

select * from finish();
rollback;
