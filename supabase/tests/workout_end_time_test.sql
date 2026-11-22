-- A finished workout's end time corrected (GYM-012 6; Joe, 22 November).
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(8);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'ann@example.com'),
  ('00000000-0000-4000-8000-00000000000b', 'ben@example.com');

create function pg_temp.sign_in(p_person uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_person, 'role', 'authenticated')::text, true),
    set_config('request.jwt.claim.sub', p_person::text, true)
$$;
grant execute on function pg_temp.sign_in(uuid) to authenticated;
set local role authenticated;
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000a');

-- Ann's Monday workout, ended four hours late; Tuesday's, still going.
select fitness.plan_workout('00000000-0000-7000-8000-000000000020', '2026-11-16');
select fitness.start_workout('00000000-0000-7000-8000-000000000020', '2026-11-16 18:00+00');
select fitness.end_workout('00000000-0000-7000-8000-000000000020', null, null, null, '2026-11-16 23:10+00');
select fitness.plan_workout('00000000-0000-7000-8000-000000000021', '2026-11-17');
select fitness.start_workout('00000000-0000-7000-8000-000000000021', '2026-11-17 18:00+00');

select fitness.update_workout('00000000-0000-7000-8000-000000000020', '{"ended_at": "2026-11-16T19:05:00Z"}');
select is(
  (select ended_at from fitness.workout where item_id = '00000000-0000-7000-8000-000000000020'),
  '2026-11-16 19:05+00'::timestamptz,
  'GYM-012 6: a finished workout''s end is corrected'
);
select is(
  (select array[started_at::text, i.do_on::text] from fitness.workout w
    join core.items i on i.id = w.item_id where w.item_id = '00000000-0000-7000-8000-000000000020'),
  array[('2026-11-16 18:00+00'::timestamptz)::text, '2026-11-16'],
  'GYM-012 6: its start and day stay'
);
select throws_ok(
  $$select fitness.update_workout('00000000-0000-7000-8000-000000000020', '{"ended_at": "2026-11-16T17:59:00Z"}')$$,
  '23514', null,
  'GYM-012 6: it can''t end before it starts'
);
select throws_ok(
  $$select fitness.update_workout('00000000-0000-7000-8000-000000000020', '{"ended_at": "2026-11-17T18:01:00Z"}')$$,
  '23514', null,
  'GYM-012 6: nor more than a day after'
);
select throws_ok(
  $$select fitness.update_workout('00000000-0000-7000-8000-000000000020',
    jsonb_build_object('ended_at', now() + interval '1 hour'))$$,
  '23514', null,
  'GYM-012 6: nor later than now'
);
select throws_ok(
  $$select fitness.update_workout('00000000-0000-7000-8000-000000000021', '{"ended_at": "2026-11-17T19:00:00Z"}')$$,
  '23514', null,
  'GYM-012 6: a workout in progress is ended, not given an end'
);
select throws_ok(
  $$select fitness.update_workout('00000000-0000-7000-8000-000000000020', '{"started_at": "2026-11-16T17:00:00Z"}')$$,
  null, null,
  'GYM-012 6: its start can''t be changed'
);

-- Ben can't change Ann's.
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000b');
select throws_ok(
  $$select fitness.update_workout('00000000-0000-7000-8000-000000000020', '{"ended_at": "2026-11-16T19:30:00Z"}')$$,
  '23514', null,
  'GYM-012 6: nor anyone else''s'
);

select * from finish();
rollback;
