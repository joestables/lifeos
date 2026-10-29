-- Noticing problems. OFF-004; ADR-0035; runbook.md#noticing-problems.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(9);

insert into auth.users (id, email) values ('00000000-0000-4000-8000-00000000000a', 'ann@example.com');

select is((select ok from ops.health_check()), true, 'The health check finds nothing wrong on a quiet day');

-- Each use of the AI is counted in ops.events (ADR-0054): a use, not a problem.
insert into ops.events (source, kind, message, person_id) values
  ('edge', 'ai', 'recipe.import', '00000000-0000-4000-8000-00000000000a');
select is((select ok from ops.health_check()), true, 'A day''s uses of the AI aren''t problems');

select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}', true),
  set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000a', true);
set local role authenticated;
select lives_ok(
  $$select core.report_event('write_refused', 'violates check', '/inbox',
      '[{"at": "2026-10-10T08:00:00Z", "did": "navigate /inbox"}]', '{"fn": "update_item"}', 'abc123')$$,
  'OFF-004: the app records a refused write'
);
select lives_ok(
  $$select core.report_event('error', repeat('x', 5000))$$,
  'A report never fails: an over-long message is cut'
);
select throws_ok('select * from ops.events', '42501', null, 'Nobody signed in can read the events');
select throws_ok(
  $$insert into ops.events (source, kind, message) values ('cron', 'error', 'pretending')$$,
  '42501', null,
  'The app can only report app events'
);
reset role;

select is(
  (select row(kind, screen, person_id::text, details ->> 'fn')::text from ops.events where source = 'app' order by id limit 1),
  row('write_refused', '/inbox', '00000000-0000-4000-8000-00000000000a', 'update_item')::text,
  'OFF-004: the event records the screen, the person and what failed'
);
select is((select length(message) from ops.events order by id desc limit 1), 2000, 'Messages are kept to 2,000 characters');

insert into ops.heartbeats (name, at, ok) values ('backup', now() - interval '2 days', true);
select is(
  (select jsonb_path_query_array(problems, '$[*].check') from ops.health_check()),
  '["events", "backup"]'::jsonb,
  'The health check reports the day''s events and a backup that is late'
);

select * from finish(true);
rollback;
