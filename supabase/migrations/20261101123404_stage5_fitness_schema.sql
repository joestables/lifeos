-- Stage 5 (plan step 4): the fitness Module's tables. Exercise, Workout
-- template and Workout are Items (core.items), always Personal; their
-- detail and child rows are here, with each person's equipment, muscle
-- groups and settings as reference data. gym.md; ADR-0058.
--
-- fitness          the API: tables read under RLS, and the write functions.
-- fitness_private  helpers and triggers the API can't reach.

create schema fitness;
create schema fitness_private;

grant usage on schema fitness to authenticated, service_role;
grant usage on schema fitness_private to authenticated, service_role;

alter default privileges in schema fitness revoke execute on functions from public;
alter default privileges in schema fitness_private revoke execute on functions from public;

-- ---------------------------------------------------------------------------
-- Reference data (ADR-0014, ADR-0058).

-- Equipment: all mine, none built in, each with its increment in kg, exact
-- (GYM-001). An Exercise needs one; one in use can't be deleted.
create table fitness.equipment (
  id uuid primary key default core_private.uuidv7(),
  person_id uuid not null default auth.uid() references core.people (id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 60),
  increment numeric(7,3) not null check (increment > 0 and increment <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index equipment_name on fitness.equipment (person_id, lower(btrim(name)));

-- Muscle groups (GYM-002): twenty built in, shared and read-only (no
-- person), each with its place on the body map; and each person's own.
-- Every group has a category and a default recovery type (Joe, 29 October).
create table fitness.muscle_groups (
  id uuid primary key default core_private.uuidv7(),
  person_id uuid references core.people (id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 40),
  category text not null check (category in ('push', 'pull', 'core', 'legs')),
  body_part text unique check (body_part ~ '^[a-z_]+$'),
  default_recovery text not null default 'normal' check (default_recovery in ('fast', 'normal', 'slow')),
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((person_id is null) = (body_part is not null))
);
create unique index muscle_groups_name
  on fitness.muscle_groups (coalesce(person_id, '00000000-0000-0000-0000-000000000000'), lower(btrim(name)));
create index muscle_groups_person on fitness.muscle_groups (person_id);

insert into fitness.muscle_groups (name, category, body_part, default_recovery, position) values
  ('Chest', 'push', 'chest', 'normal', 1),
  ('Front delts', 'push', 'front_delts', 'normal', 2),
  ('Lateral delts', 'push', 'lateral_delts', 'fast', 3),
  ('Triceps', 'push', 'triceps', 'fast', 4),
  ('Lats', 'pull', 'lats', 'normal', 5),
  ('Traps', 'pull', 'traps', 'normal', 6),
  ('Rear delts', 'pull', 'rear_delts', 'fast', 7),
  ('Biceps', 'pull', 'biceps', 'fast', 8),
  ('Brachialis', 'pull', 'brachialis', 'fast', 9),
  ('Forearms', 'pull', 'forearms', 'fast', 10),
  ('Abs', 'core', 'abs', 'fast', 11),
  ('Obliques', 'core', 'obliques', 'fast', 12),
  ('Erectors', 'core', 'erectors', 'slow', 13),
  ('Glutes', 'legs', 'glutes', 'slow', 14),
  ('Quads', 'legs', 'quads', 'slow', 15),
  ('Hamstrings', 'legs', 'hamstrings', 'slow', 16),
  ('Adductors', 'legs', 'adductors', 'normal', 17),
  ('Abductors', 'legs', 'abductors', 'normal', 18),
  ('Calves', 'legs', 'calves', 'fast', 19),
  ('Tibialis', 'legs', 'tibialis', 'fast', 20);

-- Each person's settings for a group (GYM-002 3, GYM-017): its recovery
-- type and two weekly targets. No row means the defaults: the group's own
-- recovery type, twice a week and 4 stimulus sets.
create table fitness.muscle_settings (
  person_id uuid not null default auth.uid() references core.people (id) on delete cascade,
  muscle_id uuid not null references fitness.muscle_groups (id) on delete cascade,
  recovery_type text not null check (recovery_type in ('fast', 'normal', 'slow')),
  frequency_target smallint not null default 2 check (frequency_target between 0 and 14),
  stimulus_target numeric(4,1) not null default 4 check (stimulus_target between 0 and 60),
  updated_at timestamptz not null default now(),
  primary key (person_id, muscle_id)
);
create index muscle_settings_muscle on fitness.muscle_settings (muscle_id);

-- Each person's Gym settings (GYM-019 3, GYM-020): Preferred RIR and the
-- recovery engine's four tunable settings (gym.md, Annex A2).
create table fitness.settings (
  person_id uuid primary key default auth.uid() references core.people (id) on delete cascade,
  preferred_rir smallint not null default 1 check (preferred_rir between 0 and 5),
  points_per_fatigue_set numeric(4,1) not null default 20 check (points_per_fatigue_set between 1 and 60),
  t_fast_h numeric(5,1) not null default 30 check (t_fast_h between 1 and 240),
  t_normal_h numeric(5,1) not null default 42 check (t_normal_h between 1 and 240),
  t_slow_h numeric(5,1) not null default 60 check (t_slow_h between 1 and 240),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Detail tables, one row per Item, made by a trigger with the Item
-- (stage5_fitness_rules) and filled by the write functions.

-- An Exercise: its equipment, its current set (GYM-004) and its setup and
-- form notes. No goal: goals are the Goals app's (Joe, 31 October).
create table fitness.exercise (
  item_id uuid primary key references core.items (id) on delete cascade,
  equipment_id uuid references fitness.equipment (id) on delete restrict,
  current_weight numeric(7,3) not null default 0 check (current_weight between 0 and 1000),
  current_reps smallint not null default 8 check (current_reps between 1 and 100),
  notes text check (length(notes) <= 2000),
  updated_at timestamptz not null default now()
);
create index exercise_equipment on fitness.exercise (equipment_id);

-- A Workout: its stage, when it started and ended, and how it went
-- (GYM-008, GYM-012). Its day is core.items.do_on; Skipped is worked out.
-- owner_id is the Item's, kept here so one workout is in progress a person.
create table fitness.workout (
  item_id uuid primary key references core.items (id) on delete cascade,
  owner_id uuid not null references core.people (id) on delete cascade,
  stage text not null default 'planned' check (stage in ('planned', 'in_progress', 'complete')),
  started_at timestamptz,
  ended_at timestamptz,
  how_it_went smallint check (how_it_went between 1 and 5),
  motivation smallint check (motivation between 1 and 3),
  notes text check (length(notes) <= 5000),
  updated_at timestamptz not null default now(),
  check ((stage = 'planned') = (started_at is null)),
  check ((stage = 'complete') = (ended_at is not null)),
  check (ended_at is null or ended_at >= started_at)
);
create unique index workout_one_in_progress on fitness.workout (owner_id) where stage = 'in_progress';

-- ---------------------------------------------------------------------------
-- Child rows.

-- An Exercise's muscle groups (GYM-004): exactly one primary at 1.0, any
-- number of secondaries at 0.1 to 0.9 in steps of 0.1.
create table fitness.exercise_muscles (
  exercise_id uuid not null references core.items (id) on delete cascade,
  muscle_id uuid not null references fitness.muscle_groups (id) on delete restrict,
  contribution numeric(2,1) not null check (contribution between 0.1 and 1.0),
  primary key (exercise_id, muscle_id)
);
create unique index exercise_muscles_one_primary on fitness.exercise_muscles (exercise_id)
  where contribution = 1.0;
create index exercise_muscles_muscle on fitness.exercise_muscles (muscle_id);

-- A template's exercises, in order, each with its number of sets (GYM-006).
create table fitness.template_exercises (
  id uuid primary key default core_private.uuidv7(),
  template_id uuid not null references core.items (id) on delete cascade,
  exercise_id uuid not null references core.items (id) on delete cascade,
  position text collate "C" not null,
  sets smallint not null default 1 check (sets between 1 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index template_exercises_template on fitness.template_exercises (template_id, position);
create index template_exercises_exercise on fitness.template_exercises (exercise_id);

-- A workout's exercises (GYM-008): in the backlog, in its order, or in the
-- session, in the order begun; the template's number of sets; done or
-- not; and what it copied from its Exercise when it joined (ADR-0013).
create table fitness.workout_entries (
  id uuid primary key default core_private.uuidv7(),
  workout_id uuid not null references core.items (id) on delete cascade,
  exercise_id uuid not null references core.items (id) on delete restrict,
  place text not null default 'backlog' check (place in ('backlog', 'session')),
  position text collate "C" not null,
  planned_sets smallint not null default 1 check (planned_sets between 1 and 20),
  begun_at timestamptz,
  done_at timestamptz,
  snapshot jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((place = 'session') = (begun_at is not null)),
  check (done_at is null or place = 'session')
);
create index workout_entries_workout on fitness.workout_entries (workout_id, position);
create index workout_entries_exercise on fitness.workout_entries (exercise_id);

-- A set (GYM-010): weight, reps and RIR, all there or, for a quick set,
-- all missing (the recovery engine counts it as 10 reps at RIR 2).
create table fitness.workout_sets (
  id uuid primary key default core_private.uuidv7(),
  entry_id uuid not null references fitness.workout_entries (id) on delete cascade,
  position text collate "C" not null,
  weight numeric(7,3) check (weight between 0 and 1000),
  reps smallint check (reps between 1 and 100),
  rir smallint check (rir between 0 and 10),
  logged_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((weight is null) = (reps is null) and (reps is null) = (rir is null))
);
create index workout_sets_entry on fitness.workout_sets (entry_id, position);

create trigger equipment_updated_at before update on fitness.equipment
for each row execute function core_private.touch_updated_at();
create trigger muscle_groups_updated_at before update on fitness.muscle_groups
for each row execute function core_private.touch_updated_at();
create trigger muscle_settings_updated_at before update on fitness.muscle_settings
for each row execute function core_private.touch_updated_at();
create trigger settings_updated_at before update on fitness.settings
for each row execute function core_private.touch_updated_at();
create trigger exercise_updated_at before update on fitness.exercise
for each row execute function core_private.touch_updated_at();
create trigger workout_updated_at before update on fitness.workout
for each row execute function core_private.touch_updated_at();
create trigger template_exercises_updated_at before update on fitness.template_exercises
for each row execute function core_private.touch_updated_at();
create trigger workout_entries_updated_at before update on fitness.workout_entries
for each row execute function core_private.touch_updated_at();
create trigger workout_sets_updated_at before update on fitness.workout_sets
for each row execute function core_private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row-level security. The Gym is Personal (ADR-0058), so what I can read
-- and write follows the Item's Space, as for every Item.

alter table fitness.equipment enable row level security;
alter table fitness.muscle_groups enable row level security;
alter table fitness.muscle_settings enable row level security;
alter table fitness.settings enable row level security;
alter table fitness.exercise enable row level security;
alter table fitness.workout enable row level security;
alter table fitness.exercise_muscles enable row level security;
alter table fitness.template_exercises enable row level security;
alter table fitness.workout_entries enable row level security;
alter table fitness.workout_sets enable row level security;

-- Reference data: mine, and the built-in groups everyone reads. Writes go
-- through the functions (stage5_fitness_writes), which run as me.
grant select, insert, update on fitness.equipment, fitness.muscle_settings, fitness.settings to authenticated;
grant select, insert, update on fitness.muscle_groups to authenticated;

create policy "I read my equipment" on fitness.equipment
  for select to authenticated using (person_id = (select auth.uid()));
create policy "I add equipment" on fitness.equipment
  for insert to authenticated with check (person_id = (select auth.uid()));
create policy "I change my equipment" on fitness.equipment
  for update to authenticated
  using (person_id = (select auth.uid())) with check (person_id = (select auth.uid()));

create policy "I read the built-in muscle groups and mine" on fitness.muscle_groups
  for select to authenticated using (person_id is null or person_id = (select auth.uid()));
create policy "I add muscle groups of my own" on fitness.muscle_groups
  for insert to authenticated with check (person_id = (select auth.uid()));
create policy "I change my own muscle groups" on fitness.muscle_groups
  for update to authenticated
  using (person_id = (select auth.uid())) with check (person_id = (select auth.uid()));

create policy "I read my muscle settings" on fitness.muscle_settings
  for select to authenticated using (person_id = (select auth.uid()));
create policy "I set my muscle settings" on fitness.muscle_settings
  for insert to authenticated with check (person_id = (select auth.uid()));
create policy "I change my muscle settings" on fitness.muscle_settings
  for update to authenticated
  using (person_id = (select auth.uid())) with check (person_id = (select auth.uid()));

create policy "I read my Gym settings" on fitness.settings
  for select to authenticated using (person_id = (select auth.uid()));
create policy "I set my Gym settings" on fitness.settings
  for insert to authenticated with check (person_id = (select auth.uid()));
create policy "I change my Gym settings" on fitness.settings
  for update to authenticated
  using (person_id = (select auth.uid())) with check (person_id = (select auth.uid()));

-- Detail rows are made by triggers, never by people; they go with their Item.
grant select, update on fitness.exercise, fitness.workout to authenticated;
create policy "I read the Exercises I can see" on fitness.exercise
  for select to authenticated using (item_id in (select core_private.readable_item_ids()));
create policy "I change the Exercises I can edit" on fitness.exercise
  for update to authenticated
  using (core_private.can_write(item_id)) with check (core_private.can_write(item_id));
create policy "I read the workouts I can see" on fitness.workout
  for select to authenticated using (item_id in (select core_private.readable_item_ids()));
create policy "I change the workouts I can edit" on fitness.workout
  for update to authenticated
  using (core_private.can_write(item_id)) with check (core_private.can_write(item_id));

grant select, insert, update on fitness.exercise_muscles, fitness.template_exercises,
  fitness.workout_entries, fitness.workout_sets to authenticated;

create policy "I read the muscles of what I can see" on fitness.exercise_muscles
  for select to authenticated using (exercise_id in (select core_private.readable_item_ids()));
create policy "I give muscles to what I can edit" on fitness.exercise_muscles
  for insert to authenticated with check (core_private.can_write(exercise_id));
create policy "I change the muscles of what I can edit" on fitness.exercise_muscles
  for update to authenticated
  using (core_private.can_write(exercise_id)) with check (core_private.can_write(exercise_id));

create policy "I read the exercises of templates I can see" on fitness.template_exercises
  for select to authenticated using (template_id in (select core_private.readable_item_ids()));
create policy "I add exercises to templates I can edit" on fitness.template_exercises
  for insert to authenticated
  with check (core_private.can_write(template_id) and core_private.can_write(exercise_id));
create policy "I change the exercises of templates I can edit" on fitness.template_exercises
  for update to authenticated
  using (core_private.can_write(template_id)) with check (core_private.can_write(template_id));

create policy "I read the exercises of workouts I can see" on fitness.workout_entries
  for select to authenticated using (workout_id in (select core_private.readable_item_ids()));
create policy "I add exercises to workouts I can edit" on fitness.workout_entries
  for insert to authenticated
  with check (core_private.can_write(workout_id) and core_private.can_write(exercise_id));
create policy "I change the exercises of workouts I can edit" on fitness.workout_entries
  for update to authenticated
  using (core_private.can_write(workout_id)) with check (core_private.can_write(workout_id));

create function fitness_private.workout_of(p_entry uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select workout_id from fitness.workout_entries where id = p_entry
$$;
grant execute on function fitness_private.workout_of(uuid) to authenticated;

create policy "I read the sets of workouts I can see" on fitness.workout_sets
  for select to authenticated
  using (fitness_private.workout_of(entry_id) in (select core_private.readable_item_ids()));
create policy "I log sets in workouts I can edit" on fitness.workout_sets
  for insert to authenticated with check (core_private.can_write(fitness_private.workout_of(entry_id)));
create policy "I change sets in workouts I can edit" on fitness.workout_sets
  for update to authenticated
  using (core_private.can_write(fitness_private.workout_of(entry_id)))
  with check (core_private.can_write(fitness_private.workout_of(entry_id)));

grant all on all tables in schema fitness to service_role;
