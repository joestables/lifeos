-- The Gym in the database: equipment, muscle groups, Exercises, templates,
-- workouts and sets; the rules ADR-0058 asks the database to keep.
-- GYM-001, GYM-002, GYM-004–GYM-012, GYM-017, GYM-020; ADR-0058.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(60);

-- Ann and Ben share a Household; Cat is on her own.
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'ann@example.com'),
  ('00000000-0000-4000-8000-00000000000b', 'ben@example.com'),
  ('00000000-0000-4000-8000-00000000000c', 'cat@example.com');
insert into core.spaces (id, kind, name, created_by) values
  ('00000000-0000-7000-8000-0000000000f1', 'household', 'Home', '00000000-0000-4000-8000-00000000000a');
insert into core.space_members (space_id, person_id) values
  ('00000000-0000-7000-8000-0000000000f1', '00000000-0000-4000-8000-00000000000a'),
  ('00000000-0000-7000-8000-0000000000f1', '00000000-0000-4000-8000-00000000000b');
select id as chest from fitness.muscle_groups where body_part = 'chest' \gset
select id as triceps from fitness.muscle_groups where body_part = 'triceps' \gset
select id as front_delts from fitness.muscle_groups where body_part = 'front_delts' \gset

create function pg_temp.sign_in(p_person uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_person, 'role', 'authenticated')::text, true),
    set_config('request.jwt.claim.sub', p_person::text, true)
$$;
grant execute on function pg_temp.sign_in(uuid) to authenticated;
set local role authenticated;
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000a');

-- ---------------------------------------------------------------------------
-- Equipment and muscle groups.

select is(
  (select array_agg(category || ':' || n order by category) from (
    select category, count(*) n from fitness.muscle_groups group by category) c),
  array['core:3', 'legs:7', 'pull:6', 'push:4'],
  'GYM-002: twenty muscle groups are built in, in four categories'
);
select is(
  (select default_recovery from fitness.muscle_groups where body_part = 'quads'),
  'slow',
  'GYM-002: each has its default recovery type (Joe, 29 October)'
);
update fitness.muscle_groups set name = 'Pecs' where body_part = 'chest';
select is(
  (select name from fitness.muscle_groups where body_part = 'chest'),
  'Chest',
  'GYM-002: a built-in group can''t be renamed'
);
select fitness.save_equipment('00000000-0000-7000-8000-0000000000e1', ' Cable ', 0.625);
select fitness.save_equipment('00000000-0000-7000-8000-0000000000e2', 'Barbell', 2.5);
select is(
  (select increment * 3 from fitness.equipment where id = '00000000-0000-7000-8000-0000000000e1'),
  1.875::numeric,
  'GYM-001: an increment of 0.625 kg steps exactly'
);
select throws_ok(
  $$select fitness.save_equipment('00000000-0000-7000-8000-0000000000e3', 'cable', 1)$$,
  '23505', null,
  'GYM-001: one piece of equipment of a name'
);
select throws_ok(
  $$select fitness.save_muscle_group('00000000-0000-7000-8000-0000000000a1', 'chest', 'push')$$,
  '23505', null,
  'GYM-002: a group of my own can''t take a built-in name'
);
select fitness.save_muscle_group('00000000-0000-7000-8000-0000000000a2', 'Serratus', 'push');
select is(
  (select count(*)::int from fitness.muscle_groups),
  21,
  'GYM-002: my own group joins the twenty'
);

-- ---------------------------------------------------------------------------
-- Exercises.

select throws_ok(
  format($$select fitness.create_exercise('00000000-0000-7000-8000-000000000001', 'Bench press', null, %L, 60, 8::smallint)$$, :'chest'),
  '23502', null,
  'GYM-001 3: no Exercise without equipment'
);
select fitness.create_exercise('00000000-0000-7000-8000-000000000001', 'Bench press',
  '00000000-0000-7000-8000-0000000000e2', :'chest', 60, 8::smallint, 'Bench at 4');
select fitness.create_exercise('00000000-0000-7000-8000-000000000001', 'Bench press',
  '00000000-0000-7000-8000-0000000000e2', :'chest', 60, 8::smallint, 'Bench at 4');
select is(
  (select array[i.type, i.status, s.kind, x.current_weight::text, x.current_reps::text, x.notes]
   from core.items i join core.spaces s on s.id = i.space_id
   join fitness.exercise x on x.item_id = i.id where i.id = '00000000-0000-7000-8000-000000000001'),
  array['exercise', 'active', 'personal', '60.000', '8', 'Bench at 4'],
  'GYM-004: an Exercise, Personal, with its equipment, current set and notes; made twice, once'
);
select is(
  (select array_agg(contribution order by contribution) from fitness.exercise_muscles
   where exercise_id = '00000000-0000-7000-8000-000000000001'),
  array[1.0]::numeric[],
  'GYM-004: its primary group at 1.0'
);
select throws_ok(
  format($$select fitness.create_exercise('00000000-0000-7000-8000-000000000002', ' bench   PRESS ', '00000000-0000-7000-8000-0000000000e2', %L, 50, 8::smallint)$$, :'chest'),
  '23505', null,
  'GYM-004 5: a name is unique among my Exercises, whatever its case and spaces'
);
select fitness.set_secondary_muscle('00000000-0000-7000-8000-000000000001', :'triceps', 0.4);
select fitness.set_secondary_muscle('00000000-0000-7000-8000-000000000001', :'front_delts', 0.3);
select is(
  (select array_agg(contribution order by contribution) from fitness.exercise_muscles
   where exercise_id = '00000000-0000-7000-8000-000000000001'),
  array[0.3, 0.4, 1.0]::numeric[],
  'GYM-004 2: secondary groups with their contributions'
);
select throws_ok(
  format($$select fitness.set_secondary_muscle('00000000-0000-7000-8000-000000000001', %L, 0.45)$$, :'triceps'),
  '22023', null,
  'GYM-004 2: a contribution steps by 0.1'
);
select throws_ok(
  format($$select fitness.set_secondary_muscle('00000000-0000-7000-8000-000000000001', %L, 0.5)$$, :'chest'),
  '23514', null,
  'GYM-004 2: the primary group can''t also be secondary'
);
select throws_ok(
  format($$insert into fitness.exercise_muscles values ('00000000-0000-7000-8000-000000000001', %L, 1.0)
           on conflict (exercise_id, muscle_id) do update set contribution = 1.0$$, :'triceps'),
  '23505', null,
  'ADR-0058: exactly one primary group'
);
select throws_ok(
  format($$select fitness.set_primary_muscle('00000000-0000-7000-8000-000000000001', %L)$$, :'triceps'),
  '23514', null,
  'GYM-004 2: a secondary group comes off before it becomes primary'
);
-- Made yesterday, so today's change is logged.
reset role;
update core.items set created_at = now() - interval '1 day' where id = '00000000-0000-7000-8000-000000000001';
set local role authenticated;
select fitness.update_exercise('00000000-0000-7000-8000-000000000001', '{"current_weight": 62.5, "current_reps": 8}');
select is(
  (select current_weight from fitness.exercise where item_id = '00000000-0000-7000-8000-000000000001'),
  62.5::numeric,
  'GYM-012 4: the current set changes'
);
select ok(
  exists (select 1 from core.activity where item_id = '00000000-0000-7000-8000-000000000001'
          and changed ? 'current_weight'),
  'ADR-0058: the change is in the activity log'
);
select throws_ok(
  $$insert into core.items (id, type, title, space_id, status)
    values ('00000000-0000-7000-8000-000000000003', 'exercise', 'Squat',
            '00000000-0000-7000-8000-0000000000f1', 'active')$$,
  '23514', null,
  'ADR-0058: the Gym stays Personal'
);
select fitness.create_exercise('00000000-0000-7000-8000-000000000004', 'Cable fly',
  '00000000-0000-7000-8000-0000000000e1', :'chest', 15, 12::smallint);
select fitness.create_exercise('00000000-0000-7000-8000-000000000005', 'Pec deck',
  '00000000-0000-7000-8000-0000000000e1', :'chest', 40, 12::smallint);

-- ---------------------------------------------------------------------------
-- Templates.

select fitness.create_template('00000000-0000-7000-8000-000000000010', 'Push A');
select fitness.add_template_exercise('00000000-0000-7000-8000-000000000011',
  '00000000-0000-7000-8000-000000000010', '00000000-0000-7000-8000-000000000001', 'a', 3::smallint);
select fitness.add_template_exercise('00000000-0000-7000-8000-000000000012',
  '00000000-0000-7000-8000-000000000010', '00000000-0000-7000-8000-000000000004', 'b');
select fitness.add_template_exercise('00000000-0000-7000-8000-000000000013',
  '00000000-0000-7000-8000-000000000010', '00000000-0000-7000-8000-000000000005', 'c');
select is(
  (select array_agg(sets order by position) from fitness.template_exercises
   where template_id = '00000000-0000-7000-8000-000000000010'),
  array[3, 1, 1]::smallint[],
  'GYM-006: a template''s exercises in order, each added with one set'
);
select throws_ok(
  $$select fitness.add_template_exercise('00000000-0000-7000-8000-000000000014',
    '00000000-0000-7000-8000-000000000010', '00000000-0000-7000-8000-000000000010', 'd')$$,
  '23514', null,
  'ADR-0058: a template holds Exercises'
);
select fitness.update_template_exercise('00000000-0000-7000-8000-000000000012', '{"position": "0", "sets": 2}');
select is(
  (select array_agg(exercise_id::text order by position) from fitness.template_exercises
   where template_id = '00000000-0000-7000-8000-000000000010'),
  array['00000000-0000-7000-8000-000000000004', '00000000-0000-7000-8000-000000000001',
        '00000000-0000-7000-8000-000000000005'],
  'GYM-006 3: exercises are reordered'
);
select fitness.archive_exercise('00000000-0000-7000-8000-000000000005');

-- ---------------------------------------------------------------------------
-- Workouts.

select fitness.plan_workout('00000000-0000-7000-8000-000000000020', '2026-11-02',
  '00000000-0000-7000-8000-000000000010');
select is(
  (select array[i.title, i.status, i.do_on::text, w.stage]
   from core.items i join fitness.workout w on w.item_id = i.id
   where i.id = '00000000-0000-7000-8000-000000000020'),
  array['Push A', 'active', '2026-11-02', 'planned'],
  'GYM-007 1: planned for a day, named after its template'
);
select ok(
  exists (select 1 from core.links where from_item = '00000000-0000-7000-8000-000000000020'
          and to_item = '00000000-0000-7000-8000-000000000010' and link_type = 'follows'),
  'ADR-0058: it follows its template'
);
select fitness.plan_workout('00000000-0000-7000-8000-000000000021', '2026-11-03');
select is(
  (select title from core.items where id = '00000000-0000-7000-8000-000000000021'),
  'Workout',
  'GYM-007 1: an empty one is called "Workout"'
);
select fitness.plan_workout('00000000-0000-7000-8000-000000000029', '2026-11-03',
  '00000000-0000-7000-8000-000000000010');
select core.unlink_items('00000000-0000-7000-8000-000000000029',
  '00000000-0000-7000-8000-000000000010', 'follows');
select core.link_items('00000000-0000-7000-8000-00000000002a', '00000000-0000-7000-8000-000000000029',
  '00000000-0000-7000-8000-000000000010', 'follows');
select is(
  (select count(*)::int from core.links where from_item = '00000000-0000-7000-8000-000000000029'
     and link_type = 'follows'),
  1,
  'GYM-007 3: a planned workout''s template is changed with core''s link writes'
);
select core.archive_item('00000000-0000-7000-8000-000000000029');
select fitness.start_workout('00000000-0000-7000-8000-000000000020', '2026-11-02 18:02+00');
select is(
  (select array[stage, (started_at = '2026-11-02 18:02+00')::text] from fitness.workout
   where item_id = '00000000-0000-7000-8000-000000000020'),
  array['in_progress', 'true'],
  'GYM-008 1: Start makes it In progress, its start kept'
);
select is(
  (select array_agg(place || ':' || planned_sets || ':' || (snapshot ->> 'current_weight') order by position)
   from fitness.workout_entries where workout_id = '00000000-0000-7000-8000-000000000020'),
  array['backlog:2:15.000', 'backlog:3:62.500'],
  'GYM-008 1, GYM-005 2: its template copied into the backlog with sets and current sets, the archived exercise left out'
);
select throws_ok(
  $$select fitness.start_workout('00000000-0000-7000-8000-000000000021')$$,
  '23505', null,
  'GYM-008 7: one workout in progress at a time'
);
select throws_ok(
  $$select fitness.update_workout('00000000-0000-7000-8000-000000000020', '{"day": "2026-11-05"}')$$,
  '23514', null,
  'GYM-007 3: only a planned workout moves to another day'
);
select id as bench_entry from fitness.workout_entries
  where workout_id = '00000000-0000-7000-8000-000000000020'
    and exercise_id = '00000000-0000-7000-8000-000000000001' \gset
select id as fly_entry from fitness.workout_entries
  where workout_id = '00000000-0000-7000-8000-000000000020'
    and exercise_id = '00000000-0000-7000-8000-000000000004' \gset
select throws_ok(
  format($$select fitness.log_set('00000000-0000-7000-8000-000000000030', %L, 'a', 60, 8::smallint, 2::smallint)$$, :'bench_entry'),
  '23514', null,
  'GYM-008: sets are logged once an exercise is in the session'
);
select fitness.begin_entry(:'bench_entry');
select is(
  (select place from fitness.workout_entries where id = :'bench_entry'),
  'session',
  'GYM-008 3: Add moves it into the session'
);
select fitness.log_set('00000000-0000-7000-8000-000000000030', :'bench_entry', 'a', 62.5, 8::smallint, 2::smallint);
select fitness.log_set('00000000-0000-7000-8000-000000000030', :'bench_entry', 'a', 62.5, 8::smallint, 2::smallint);
select fitness.log_set('00000000-0000-7000-8000-000000000031', :'bench_entry', 'b');
select is(
  (select array_agg(coalesce(weight::text, '-') || 'x' || coalesce(reps::text, '-') || '@' || coalesce(rir::text, '-') order by position)
   from fitness.workout_sets where entry_id = :'bench_entry'),
  array['62.500x8@2', '-x-@-'],
  'GYM-010: a tracked set, logged once, and a quick set'
);
select throws_ok(
  format($$select fitness.log_set('00000000-0000-7000-8000-000000000032', %L, 'c', 60, null, 2::smallint)$$, :'bench_entry'),
  '23514', null,
  'GYM-010 3: weight, reps and RIR are all there or none'
);
select fitness.update_set('00000000-0000-7000-8000-000000000031', 60, 9::smallint, 1::smallint);
select is(
  (select array[weight::text, reps::text, rir::text] from fitness.workout_sets
   where id = '00000000-0000-7000-8000-000000000031'),
  array['60.000', '9', '1'],
  'GYM-010 4: a set is changed'
);
select throws_ok(
  format($$select fitness.begin_entry(%L, false)$$, :'bench_entry'),
  '23514', null,
  'GYM-008 6: an exercise with sets stays in the session'
);
select throws_ok(
  format($$select fitness.swap_entry(%L, '00000000-0000-7000-8000-000000000004')$$, :'bench_entry'),
  '23514', null,
  'GYM-009 4: only an exercise not yet begun is swapped'
);
select fitness.swap_entry(:'fly_entry', '00000000-0000-7000-8000-000000000005');
select is(
  (select snapshot ->> 'name' from fitness.workout_entries where id = :'fly_entry'),
  'Pec deck',
  'GYM-009 4: a swapped exercise takes the new one''s current set'
);
select fitness.mark_entry_done(:'bench_entry');
select fitness.mark_entry_done(:'bench_entry', false);
select is(
  (select done_at from fitness.workout_entries where id = :'bench_entry'),
  null,
  'GYM-011 3: done can be undone'
);
select fitness.update_exercise('00000000-0000-7000-8000-000000000001', '{"current_weight": 65}');
select is(
  (select snapshot ->> 'current_weight' from fitness.workout_entries where id = :'bench_entry'),
  '62.500',
  'ADR-0013: a workout keeps the current set it started with'
);
select fitness.end_workout('00000000-0000-7000-8000-000000000020', 4::smallint, 2::smallint, 'Grip went',
  '2026-11-02 19:00+00');
select is(
  (select array[w.stage, i.status, w.how_it_went::text, w.motivation::text, (w.ended_at = '2026-11-02 19:00+00')::text]
   from fitness.workout w join core.items i on i.id = w.item_id
   where w.item_id = '00000000-0000-7000-8000-000000000020'),
  array['complete', 'done', '4', '2', 'true'],
  'GYM-012 1: End makes it Complete, with how it went and motivation'
);
select throws_ok(
  $$select fitness.end_workout('00000000-0000-7000-8000-000000000021')$$,
  '23514', null,
  'GYM-012 1: only a workout in progress ends'
);
select lives_ok(
  $$select fitness.start_workout('00000000-0000-7000-8000-000000000021')$$,
  'GYM-008 7: once ended, another can start'
);
select core.archive_item('00000000-0000-7000-8000-000000000021');
select is(
  (select array[stage, discarded::text] from fitness.workout
   where item_id = '00000000-0000-7000-8000-000000000021'),
  array['complete', 'true'],
  'GYM-012 7: a workout in progress discarded ends'
);
select fitness.plan_workout('00000000-0000-7000-8000-000000000022', '2026-11-04');
select lives_ok(
  $$select fitness.start_workout('00000000-0000-7000-8000-000000000022')$$,
  'GYM-008 7: so another can start'
);
select core.restore_item('00000000-0000-7000-8000-000000000021');
select is(
  (select stage from fitness.workout where item_id = '00000000-0000-7000-8000-000000000021'),
  'complete',
  'GYM-012 7: brought back while another is in progress, it stays ended'
);
select core.archive_item('00000000-0000-7000-8000-000000000022');
select core.restore_item('00000000-0000-7000-8000-000000000022');
select is(
  (select array[stage, discarded::text, (ended_at is null)::text] from fitness.workout
   where item_id = '00000000-0000-7000-8000-000000000022'),
  array['in_progress', 'false', 'true'],
  'GYM-012 7: Undo brings it back in progress'
);

-- ---------------------------------------------------------------------------
-- Removals (stage5_fitness_removing).

select throws_ok(
  $$select fitness.remove_equipment('00000000-0000-7000-8000-0000000000e2')$$,
  '23503', null,
  'GYM-001 4: equipment in use can''t be removed'
);
select throws_ok(
  format($$select fitness.remove_entry(%L)$$, :'bench_entry'),
  '23514', null,
  'GYM-009 5: an exercise with sets stays in the workout'
);
select fitness.remove_set('00000000-0000-7000-8000-000000000031');
select fitness.remove_secondary_muscle('00000000-0000-7000-8000-000000000001', :'front_delts');
select fitness.remove_secondary_muscle('00000000-0000-7000-8000-000000000001', :'chest');
select is(
  (select array[
     (select count(*) from fitness.workout_sets where entry_id = :'bench_entry'),
     (select count(*) from fitness.exercise_muscles where exercise_id = '00000000-0000-7000-8000-000000000001')]::int[]),
  array[1, 2],
  'GYM-010 4, GYM-004 2: a set and a secondary group are removed, never the primary'
);
select fitness.remove_muscle_group('00000000-0000-7000-8000-0000000000a2');
select is(
  (select count(*)::int from fitness.muscle_groups),
  20,
  'GYM-002 2: a group of my own no Exercise uses is removed'
);

-- ---------------------------------------------------------------------------
-- Settings.

select fitness.update_settings('{"preferred_rir": 2}');
select is(
  (select array[preferred_rir::text, t_normal_h::text] from fitness.settings),
  array['2', '42.0'],
  'GYM-020 1: Preferred RIR set; the engine''s settings start at their defaults'
);
select is(
  (select workouts_to_stall from fitness.settings),
  5::smallint,
  'GYM-020 3: Workouts to stall starts at 5'
);
select fitness.update_settings('{"workouts_to_stall": 4}');
select throws_ok(
  $$select fitness.update_settings('{"workouts_to_stall": 1}')$$,
  '23514', null,
  'GYM-020 3: Workouts to stall is 2 to 20, here 4'
);
select throws_ok(
  $$select fitness.update_settings('{"goal": 1}')$$,
  '22023', null,
  'GYM-020: only the Gym''s settings'
);
select fitness.set_muscle_settings(:'chest', 'slow', 3::smallint, 6);
select is(
  (select array[recovery_type, frequency_target::text, stimulus_target::text] from fitness.muscle_settings),
  array['slow', '3', '6.0'],
  'GYM-017 1: a group''s recovery type, desired weekly frequency and stimulus target'
);

-- ---------------------------------------------------------------------------
-- Who sees what: the Gym is Personal, a Household or not.

select pg_temp.sign_in('00000000-0000-4000-8000-00000000000b');
select is(
  (select array[
     (select count(*) from core.items where type in ('exercise', 'workout_template', 'workout')),
     (select count(*) from fitness.exercise),
     (select count(*) from fitness.workout_sets),
     (select count(*) from fitness.equipment),
     (select count(*) from fitness.muscle_groups)]::int[]),
  array[0, 0, 0, 0, 20],
  'ADR-0058: a Household member sees none of my Gym, only the built-in groups'
);
select throws_ok(
  format($$select fitness.log_set('00000000-0000-7000-8000-000000000033', %L, 'z', 1, 1::smallint, 1::smallint)$$, :'bench_entry'),
  '23514', null,
  'ADR-0058: nor logs a set in my workout'
);
select pg_temp.sign_in('00000000-0000-4000-8000-00000000000c');
select throws_ok(
  format($$select fitness.create_exercise('00000000-0000-7000-8000-000000000040', 'Squat', '00000000-0000-7000-8000-0000000000e2', %L, 100, 5::smallint)$$, :'chest'),
  '23514', null,
  'GYM-001: an Exercise uses its owner''s equipment'
);
select lives_ok(
  $$select fitness.save_equipment('00000000-0000-7000-8000-0000000000e9', 'Barbell', 2.5)$$,
  'GYM-001: equipment names are each person''s'
);

select * from finish();
rollback;
