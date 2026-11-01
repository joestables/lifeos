-- Stage 5 (plan step 4): the Gym's write functions (ADR-0042: every write is
-- a database function, replayed by the write queue, so each is idempotent on
-- its id). Removals are in stage5_fitness_removing, run by Joe
-- (migrations.md). gym.md GYM-001–GYM-022; ADR-0058.
--
-- Security invoker throughout: row-level security decides, and each
-- function checks what it must say plainly.

create function fitness_private.check_keys(p_patch jsonb, p_allowed text[]) returns void
language plpgsql immutable set search_path = '' as $$
declare
  unknown text;
begin
  select k into unknown from jsonb_object_keys(p_patch) k where not k = any (p_allowed) limit 1;
  if unknown is not null then
    raise exception 'Unknown field %', unknown using errcode = '22023';
  end if;
end
$$;

create function fitness_private.personal_space() returns uuid
language sql stable security definer set search_path = '' as $$
  select s.id from core.spaces s where s.kind = 'personal' and s.created_by = (select auth.uid())
$$;

-- What an entry copies from its Exercise when it joins a workout (ADR-0013,
-- ADR-0058): its name, equipment, increment and current set; never its
-- muscle groups.
create function fitness_private.snapshot(p_exercise uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'name', i.title,
    'equipment', e.name,
    'increment', e.increment,
    'current_weight', x.current_weight,
    'current_reps', x.current_reps)
  from core.items i
  join fitness.exercise x on x.item_id = i.id
  left join fitness.equipment e on e.id = x.equipment_id
  where i.id = p_exercise
$$;

-- ---------------------------------------------------------------------------
-- Reference data and settings (GYM-001, GYM-002, GYM-017, GYM-019, GYM-020).

create function fitness.save_equipment(p_id uuid, p_name text, p_increment numeric)
returns fitness.equipment
language plpgsql set search_path = '' as $$
declare
  r fitness.equipment;
begin
  insert into fitness.equipment (id, name, increment) values (p_id, btrim(p_name), p_increment)
  on conflict (id) do update set name = excluded.name, increment = excluded.increment
  returning * into r;
  return r;
end
$$;

create function fitness.save_muscle_group(p_id uuid, p_name text, p_category text)
returns fitness.muscle_groups
language plpgsql set search_path = '' as $$
declare
  r fitness.muscle_groups;
begin
  insert into fitness.muscle_groups (id, person_id, name, category)
  values (p_id, (select auth.uid()), btrim(p_name), p_category)
  on conflict (id) do update set name = excluded.name, category = excluded.category
  returning * into r;
  return r;
end
$$;

create function fitness.set_muscle_settings(p_muscle uuid, p_recovery text,
  p_frequency smallint, p_stimulus numeric)
returns fitness.muscle_settings
language plpgsql set search_path = '' as $$
declare
  r fitness.muscle_settings;
begin
  insert into fitness.muscle_settings (muscle_id, recovery_type, frequency_target, stimulus_target)
  values (p_muscle, p_recovery, p_frequency, p_stimulus)
  on conflict (person_id, muscle_id) do update set
    recovery_type = excluded.recovery_type,
    frequency_target = excluded.frequency_target,
    stimulus_target = excluded.stimulus_target
  returning * into r;
  return r;
end
$$;

create function fitness.update_settings(p_patch jsonb)
returns fitness.settings
language plpgsql set search_path = '' as $$
declare
  r fitness.settings;
begin
  perform fitness_private.check_keys(p_patch,
    array['preferred_rir', 'points_per_fatigue_set', 't_fast_h', 't_normal_h', 't_slow_h']);
  insert into fitness.settings (person_id) values ((select auth.uid())) on conflict do nothing;
  update fitness.settings s set
    preferred_rir = coalesce((p_patch ->> 'preferred_rir')::smallint, s.preferred_rir),
    points_per_fatigue_set = coalesce((p_patch ->> 'points_per_fatigue_set')::numeric, s.points_per_fatigue_set),
    t_fast_h = coalesce((p_patch ->> 't_fast_h')::numeric, s.t_fast_h),
    t_normal_h = coalesce((p_patch ->> 't_normal_h')::numeric, s.t_normal_h),
    t_slow_h = coalesce((p_patch ->> 't_slow_h')::numeric, s.t_slow_h)
  where s.person_id = (select auth.uid())
  returning * into r;
  return r;
end
$$;

-- ---------------------------------------------------------------------------
-- Exercises (GYM-004, GYM-005).

-- A new Exercise: its name, equipment (needed: GYM-001 3), primary muscle
-- group and current set.
create function fitness.create_exercise(p_id uuid, p_name text, p_equipment uuid,
  p_primary uuid, p_weight numeric, p_reps smallint, p_notes text default null)
returns core.items
language plpgsql set search_path = '' as $$
declare
  r core.items;
begin
  if not exists (select 1 from core.items where id = p_id) then
    if p_equipment is null then
      raise exception 'An Exercise needs equipment' using errcode = '23502';
    end if;
    insert into core.items (id, type, title, space_id, status)
    values (p_id, 'exercise', btrim(p_name), fitness_private.personal_space(), 'active');
    update fitness.exercise set equipment_id = p_equipment, current_weight = p_weight,
      current_reps = p_reps, notes = nullif(btrim(p_notes), '')
    where item_id = p_id;
    insert into fitness.exercise_muscles (exercise_id, muscle_id, contribution)
    values (p_id, p_primary, 1.0);
  end if;
  select * into r from core.items where id = p_id;
  return r;
end
$$;

-- An Exercise's name, equipment, current set and notes (GYM-004 3; the
-- review's Update current, GYM-012 4).
create function fitness.update_exercise(p_id uuid, p_patch jsonb)
returns fitness.exercise
language plpgsql set search_path = '' as $$
declare
  r fitness.exercise;
begin
  perform fitness_private.check_keys(p_patch,
    array['name', 'equipment_id', 'current_weight', 'current_reps', 'notes']);
  if p_patch ? 'equipment_id' and p_patch ->> 'equipment_id' is null then
    raise exception 'An Exercise needs equipment' using errcode = '23502';
  end if;
  if p_patch ? 'name' then
    update core.items set title = btrim(p_patch ->> 'name') where id = p_id and type = 'exercise';
  end if;
  update fitness.exercise x set
    equipment_id = coalesce((p_patch ->> 'equipment_id')::uuid, x.equipment_id),
    current_weight = coalesce((p_patch ->> 'current_weight')::numeric, x.current_weight),
    current_reps = coalesce((p_patch ->> 'current_reps')::smallint, x.current_reps),
    notes = case when p_patch ? 'notes' then nullif(btrim(p_patch ->> 'notes'), '') else x.notes end
  where x.item_id = p_id
  returning * into r;
  if r.item_id is null then
    raise exception 'No Exercise % to update', p_id using errcode = 'P0002';
  end if;
  return r;
end
$$;

-- An Exercise's primary group (GYM-004 2): a group that is a secondary of it
-- is taken off as a secondary first, in stage5_fitness_removing.
create function fitness.set_primary_muscle(p_exercise uuid, p_muscle uuid)
returns void
language plpgsql set search_path = '' as $$
begin
  if exists (select 1 from fitness.exercise_muscles
             where exercise_id = p_exercise and muscle_id = p_muscle and contribution < 1.0) then
    raise exception 'That group is a secondary of this Exercise' using errcode = '23514';
  end if;
  update fitness.exercise_muscles set muscle_id = p_muscle
  where exercise_id = p_exercise and contribution = 1.0;
  if not found then
    raise exception 'No Exercise % to change', p_exercise using errcode = 'P0002';
  end if;
end
$$;

-- A secondary group and its contribution, 0.1 to 0.9 in steps of 0.1.
create function fitness.set_secondary_muscle(p_exercise uuid, p_muscle uuid, p_contribution numeric)
returns fitness.exercise_muscles
language plpgsql set search_path = '' as $$
declare
  r fitness.exercise_muscles;
begin
  if p_contribution not between 0.1 and 0.9 or p_contribution <> round(p_contribution, 1) then
    raise exception 'A secondary contributes 0.1 to 0.9, in steps of 0.1' using errcode = '22023';
  end if;
  if exists (select 1 from fitness.exercise_muscles
             where exercise_id = p_exercise and muscle_id = p_muscle and contribution = 1.0) then
    raise exception 'That group is this Exercise''s primary' using errcode = '23514';
  end if;
  insert into fitness.exercise_muscles (exercise_id, muscle_id, contribution)
  values (p_exercise, p_muscle, p_contribution)
  on conflict (exercise_id, muscle_id) do update set contribution = excluded.contribution
  returning * into r;
  return r;
end
$$;

-- Archived, not deleted (GYM-005): it leaves the library and pickers.
create function fitness.archive_exercise(p_id uuid, p_archived boolean default true)
returns core.items
language plpgsql set search_path = '' as $$
declare
  r core.items;
begin
  update core.items set status = case when p_archived then 'cancelled' else 'active' end
  where id = p_id and type = 'exercise'
  returning * into r;
  if r.id is null then
    raise exception 'No Exercise % to archive', p_id using errcode = 'P0002';
  end if;
  return r;
end
$$;

-- ---------------------------------------------------------------------------
-- Templates (GYM-006, GYM-022).

create function fitness.create_template(p_id uuid, p_name text)
returns core.items
language plpgsql set search_path = '' as $$
declare
  r core.items;
begin
  insert into core.items (id, type, title, space_id, status)
  values (p_id, 'workout_template', btrim(p_name), fitness_private.personal_space(), 'active')
  on conflict (id) do nothing;
  select * into r from core.items where id = p_id;
  return r;
end
$$;

-- An exercise added to a template comes with one set (GYM-006 1).
create function fitness.add_template_exercise(p_id uuid, p_template uuid, p_exercise uuid,
  p_position text, p_sets smallint default 1)
returns fitness.template_exercises
language plpgsql set search_path = '' as $$
declare
  r fitness.template_exercises;
begin
  insert into fitness.template_exercises (id, template_id, exercise_id, position, sets)
  values (p_id, p_template, p_exercise, p_position, p_sets)
  on conflict (id) do nothing;
  select * into r from fitness.template_exercises where id = p_id;
  return r;
end
$$;

-- Its place (dragged) and its number of sets.
create function fitness.update_template_exercise(p_id uuid, p_patch jsonb)
returns fitness.template_exercises
language plpgsql set search_path = '' as $$
declare
  r fitness.template_exercises;
begin
  perform fitness_private.check_keys(p_patch, array['position', 'sets', 'exercise_id']);
  update fitness.template_exercises t set
    position = coalesce(p_patch ->> 'position', t.position),
    sets = coalesce((p_patch ->> 'sets')::smallint, t.sets),
    exercise_id = coalesce((p_patch ->> 'exercise_id')::uuid, t.exercise_id)
  where t.id = p_id
  returning * into r;
  if r.id is null then
    raise exception 'No template exercise % to update', p_id using errcode = 'P0002';
  end if;
  return r;
end
$$;

-- ---------------------------------------------------------------------------
-- Workouts (GYM-007–GYM-012).

-- Planned for a day, from a template (linked: *follows*) or from scratch,
-- called "Workout" until renamed (GYM-007 1).
create function fitness.plan_workout(p_id uuid, p_day date, p_template uuid default null)
returns core.items
language plpgsql set search_path = '' as $$
declare
  r core.items;
begin
  if not exists (select 1 from core.items where id = p_id) then
    insert into core.items (id, type, title, space_id, status, do_on)
    values (p_id, 'workout',
            coalesce((select title from core.items where id = p_template and type = 'workout_template'), 'Workout'),
            fitness_private.personal_space(), 'active', p_day);
    if p_template is not null then
      insert into core.links (from_item, to_item, link_type, origin)
      values (p_id, p_template, 'follows', 'action');
    end if;
  end if;
  select * into r from core.items where id = p_id;
  return r;
end
$$;

-- A planned workout's day and name; its template is changed by removing
-- the link (core) and planning afresh.
create function fitness.update_workout(p_id uuid, p_patch jsonb)
returns fitness.workout
language plpgsql set search_path = '' as $$
declare
  r fitness.workout;
begin
  perform fitness_private.check_keys(p_patch, array['name', 'day', 'how_it_went', 'motivation', 'notes']);
  if p_patch ? 'day' and (select stage from fitness.workout where item_id = p_id) <> 'planned' then
    raise exception 'Only a planned workout moves to another day' using errcode = '23514';
  end if;
  update core.items i set
    title = coalesce(nullif(btrim(p_patch ->> 'name'), ''), i.title),
    do_on = coalesce((p_patch ->> 'day')::date, i.do_on)
  where i.id = p_id and i.type = 'workout' and (p_patch ? 'name' or p_patch ? 'day');
  update fitness.workout w set
    how_it_went = case when p_patch ? 'how_it_went' then (p_patch ->> 'how_it_went')::smallint else w.how_it_went end,
    motivation = case when p_patch ? 'motivation' then (p_patch ->> 'motivation')::smallint else w.motivation end,
    notes = case when p_patch ? 'notes' then nullif(btrim(p_patch ->> 'notes'), '') else w.notes end
  where w.item_id = p_id
  returning * into r;
  if r.item_id is null then
    raise exception 'No workout % to update', p_id using errcode = 'P0002';
  end if;
  return r;
end
$$;

-- Start (GYM-008 1): In progress, its start kept, and its template's
-- exercises copied into the backlog with their numbers of sets and each
-- Exercise as it stands; archived ones left out (GYM-005 2). One workout in
-- progress at a time.
create function fitness.start_workout(p_id uuid, p_at timestamptz default now())
returns fitness.workout
language plpgsql set search_path = '' as $$
declare
  r fitness.workout;
  tmpl uuid;
begin
  select * into r from fitness.workout where item_id = p_id;
  if r.item_id is null then
    raise exception 'No workout % to start', p_id using errcode = 'P0002';
  end if;
  if r.stage <> 'planned' then
    return r;
  end if;
  if exists (select 1 from fitness.workout w
             where w.owner_id = r.owner_id and w.stage = 'in_progress') then
    raise exception 'Another workout is in progress' using errcode = '23505';
  end if;
  update fitness.workout set stage = 'in_progress', started_at = p_at where item_id = p_id
  returning * into r;
  select l.to_item into tmpl from core.links l where l.from_item = p_id and l.link_type = 'follows';
  if tmpl is not null and not exists (select 1 from fitness.workout_entries where workout_id = p_id) then
    insert into fitness.workout_entries (workout_id, exercise_id, place, position, planned_sets, snapshot)
    select p_id, t.exercise_id, 'backlog', t.position, t.sets, fitness_private.snapshot(t.exercise_id)
    from fitness.template_exercises t
    join core.items x on x.id = t.exercise_id and x.status = 'active' and x.archived_at is null
    where t.template_id = tmpl;
  end if;
  return r;
end
$$;

-- An exercise added to a workout, in the backlog or straight into the
-- session, with one set (GYM-009 1).
create function fitness.add_entry(p_id uuid, p_workout uuid, p_exercise uuid, p_position text,
  p_begin boolean default false, p_planned_sets smallint default 1)
returns fitness.workout_entries
language plpgsql set search_path = '' as $$
declare
  r fitness.workout_entries;
begin
  insert into fitness.workout_entries (id, workout_id, exercise_id, place, position, planned_sets, begun_at, snapshot)
  values (p_id, p_workout, p_exercise,
          case when p_begin then 'session' else 'backlog' end,
          p_position, p_planned_sets,
          case when p_begin then now() end,
          fitness_private.snapshot(p_exercise))
  on conflict (id) do nothing;
  select * into r from fitness.workout_entries where id = p_id;
  return r;
end
$$;

-- Add (GYM-008 3): into the session, the order begun kept by begun_at; or
-- back to the backlog while it has no sets (GYM-008 6).
create function fitness.begin_entry(p_id uuid, p_begin boolean default true, p_at timestamptz default now())
returns fitness.workout_entries
language plpgsql set search_path = '' as $$
declare
  r fitness.workout_entries;
begin
  if not p_begin and exists (select 1 from fitness.workout_sets where entry_id = p_id) then
    raise exception 'An exercise with sets stays in the session' using errcode = '23514';
  end if;
  update fitness.workout_entries e set
    place = case when p_begin then 'session' else 'backlog' end,
    begun_at = case when p_begin then coalesce(e.begun_at, p_at) end,
    done_at = case when p_begin then e.done_at end
  where e.id = p_id
  returning * into r;
  if r.id is null then
    raise exception 'No exercise % in a workout', p_id using errcode = 'P0002';
  end if;
  return r;
end
$$;

-- Swap (GYM-009 4): an exercise not yet begun takes another's place and
-- its number of sets, at the new one's current set.
create function fitness.swap_entry(p_id uuid, p_exercise uuid)
returns fitness.workout_entries
language plpgsql set search_path = '' as $$
declare
  r fitness.workout_entries;
begin
  update fitness.workout_entries set exercise_id = p_exercise,
    snapshot = fitness_private.snapshot(p_exercise)
  where id = p_id and place = 'backlog'
  returning * into r;
  if r.id is null then
    raise exception 'Only an exercise not yet begun is swapped' using errcode = '23514';
  end if;
  return r;
end
$$;

-- Done, or done undone (GYM-011).
create function fitness.mark_entry_done(p_id uuid, p_done boolean default true)
returns fitness.workout_entries
language plpgsql set search_path = '' as $$
declare
  r fitness.workout_entries;
begin
  update fitness.workout_entries set done_at = case when p_done then coalesce(done_at, now()) end
  where id = p_id and place = 'session'
  returning * into r;
  if r.id is null then
    raise exception 'Only an exercise in the session is done' using errcode = '23514';
  end if;
  return r;
end
$$;

-- A set (GYM-010): weight, reps and RIR, or none of them for a quick set.
-- Logged on an exercise in the session, in a workout in progress or, to
-- correct it, finished.
create function fitness.log_set(p_id uuid, p_entry uuid, p_position text,
  p_weight numeric default null, p_reps smallint default null, p_rir smallint default null,
  p_at timestamptz default now())
returns fitness.workout_sets
language plpgsql set search_path = '' as $$
declare
  r fitness.workout_sets;
begin
  if not exists (select 1 from fitness.workout_sets where id = p_id) then
    if not exists (
      select 1 from fitness.workout_entries e join fitness.workout w on w.item_id = e.workout_id
      where e.id = p_entry and e.place = 'session' and w.stage <> 'planned'
    ) then
      raise exception 'Sets are logged on an exercise in the session' using errcode = '23514';
    end if;
    insert into fitness.workout_sets (id, entry_id, position, weight, reps, rir, logged_at)
    values (p_id, p_entry, p_position, p_weight, p_reps, p_rir, p_at);
  end if;
  select * into r from fitness.workout_sets where id = p_id;
  return r;
end
$$;

-- A set changed, tracked or quick (GYM-010 4).
create function fitness.update_set(p_id uuid, p_weight numeric, p_reps smallint, p_rir smallint)
returns fitness.workout_sets
language plpgsql set search_path = '' as $$
declare
  r fitness.workout_sets;
begin
  update fitness.workout_sets set weight = p_weight, reps = p_reps, rir = p_rir
  where id = p_id
  returning * into r;
  if r.id is null then
    raise exception 'No set % to change', p_id using errcode = 'P0002';
  end if;
  return r;
end
$$;

-- End (GYM-012 1): Complete, its end kept, with how it went (1–5) and
-- motivation beforehand (1–3: low, okay, high). What is left in the backlog
-- stays out of the finished workout.
create function fitness.end_workout(p_id uuid, p_how_it_went smallint default null,
  p_motivation smallint default null, p_notes text default null, p_at timestamptz default now())
returns fitness.workout
language plpgsql set search_path = '' as $$
declare
  r fitness.workout;
begin
  update fitness.workout set stage = 'complete', ended_at = greatest(p_at, started_at),
    how_it_went = p_how_it_went, motivation = p_motivation, notes = nullif(btrim(p_notes), '')
  where item_id = p_id and stage = 'in_progress'
  returning * into r;
  if r.item_id is null then
    select * into r from fitness.workout where item_id = p_id and stage = 'complete';
    if r.item_id is null then
      raise exception 'Only a workout in progress ends' using errcode = '23514';
    end if;
  end if;
  return r;
end
$$;

-- ---------------------------------------------------------------------------
-- Who may call them.

grant execute on function
  fitness.save_equipment(uuid, text, numeric),
  fitness.save_muscle_group(uuid, text, text),
  fitness.set_muscle_settings(uuid, text, smallint, numeric),
  fitness.update_settings(jsonb),
  fitness.create_exercise(uuid, text, uuid, uuid, numeric, smallint, text),
  fitness.update_exercise(uuid, jsonb),
  fitness.set_primary_muscle(uuid, uuid),
  fitness.set_secondary_muscle(uuid, uuid, numeric),
  fitness.archive_exercise(uuid, boolean),
  fitness.create_template(uuid, text),
  fitness.add_template_exercise(uuid, uuid, uuid, text, smallint),
  fitness.update_template_exercise(uuid, jsonb),
  fitness.plan_workout(uuid, date, uuid),
  fitness.update_workout(uuid, jsonb),
  fitness.start_workout(uuid, timestamptz),
  fitness.add_entry(uuid, uuid, uuid, text, boolean, smallint),
  fitness.begin_entry(uuid, boolean, timestamptz),
  fitness.swap_entry(uuid, uuid),
  fitness.mark_entry_done(uuid, boolean),
  fitness.log_set(uuid, uuid, text, numeric, smallint, smallint, timestamptz),
  fitness.update_set(uuid, numeric, smallint, smallint),
  fitness.end_workout(uuid, smallint, smallint, text, timestamptz)
to authenticated;

grant execute on function
  fitness_private.check_keys(jsonb, text[]),
  fitness_private.personal_space(),
  fitness_private.snapshot(uuid)
to authenticated;
