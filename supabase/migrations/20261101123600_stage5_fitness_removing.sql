-- Stage 5 (plan step 4), after stage5_fitness_writes: the Gym's removals.
-- Run by Joe in the SQL editor: its delete statements wait on a
-- confirmation the Supabase tool can't show (migrations.md).
-- gym.md GYM-001, GYM-002, GYM-004, GYM-006, GYM-009, GYM-010; ADR-0058.

grant delete on fitness.equipment, fitness.muscle_groups, fitness.exercise_muscles,
  fitness.template_exercises, fitness.workout_entries, fitness.workout_sets to authenticated;

create policy "I remove my equipment" on fitness.equipment
  for delete to authenticated using (person_id = (select auth.uid()));
create policy "I remove my own muscle groups" on fitness.muscle_groups
  for delete to authenticated using (person_id = (select auth.uid()));
create policy "I take muscles off what I can edit" on fitness.exercise_muscles
  for delete to authenticated using (core_private.can_write(exercise_id));
create policy "I take exercises off templates I can edit" on fitness.template_exercises
  for delete to authenticated using (core_private.can_write(template_id));
create policy "I take exercises out of workouts I can edit" on fitness.workout_entries
  for delete to authenticated using (core_private.can_write(workout_id));
create policy "I remove sets in workouts I can edit" on fitness.workout_sets
  for delete to authenticated using (core_private.can_write(fitness_private.workout_of(entry_id)));

-- Equipment and groups are refused while an Exercise uses them (GYM-001 4,
-- GYM-002 2): the foreign keys restrict, and say so.
create function fitness.remove_equipment(p_id uuid)
returns void
language plpgsql set search_path = '' as $$
begin
  if exists (select 1 from fitness.exercise where equipment_id = p_id) then
    raise exception 'An Exercise uses this equipment' using errcode = '23503';
  end if;
  delete from fitness.equipment where id = p_id;
end
$$;

create function fitness.remove_muscle_group(p_id uuid)
returns void
language plpgsql set search_path = '' as $$
begin
  if exists (select 1 from fitness.exercise_muscles where muscle_id = p_id) then
    raise exception 'An Exercise uses this muscle group' using errcode = '23503';
  end if;
  delete from fitness.muscle_groups where id = p_id and person_id is not null;
end
$$;

-- A secondary group taken off an Exercise; never its primary.
create function fitness.remove_secondary_muscle(p_exercise uuid, p_muscle uuid)
returns void
language sql set search_path = '' as $$
  delete from fitness.exercise_muscles
  where exercise_id = p_exercise and muscle_id = p_muscle and contribution < 1.0
$$;

create function fitness.remove_template_exercise(p_id uuid)
returns void
language sql set search_path = '' as $$
  delete from fitness.template_exercises where id = p_id
$$;

-- An exercise taken out of a workout while it has no sets (GYM-009 5).
create function fitness.remove_entry(p_id uuid)
returns void
language plpgsql set search_path = '' as $$
begin
  if exists (select 1 from fitness.workout_sets where entry_id = p_id) then
    raise exception 'An exercise with sets stays in the workout' using errcode = '23514';
  end if;
  delete from fitness.workout_entries where id = p_id;
end
$$;

create function fitness.remove_set(p_id uuid)
returns void
language sql set search_path = '' as $$
  delete from fitness.workout_sets where id = p_id
$$;

grant execute on function
  fitness.remove_equipment(uuid),
  fitness.remove_muscle_group(uuid),
  fitness.remove_secondary_muscle(uuid, uuid),
  fitness.remove_template_exercise(uuid),
  fitness.remove_entry(uuid),
  fitness.remove_set(uuid)
to authenticated;
