-- Stage 5 (plan step 4): the rules the database keeps for the Gym (its write
-- functions follow in stage5_fitness_writes). gym.md; ADR-0030, ADR-0058.

-- ---------------------------------------------------------------------------
-- Detail rows: made when an Exercise or a Workout is made. A Workout's row
-- carries its owner, so one is in progress a person.

create function fitness_private.make_detail() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.type = 'exercise' then
    insert into fitness.exercise (item_id) values (new.id) on conflict do nothing;
  elsif new.type = 'workout' then
    insert into fitness.workout (item_id, owner_id) values (new.id, new.owner_id) on conflict do nothing;
  end if;
  return null;
end
$$;
create trigger items_fitness_detail after insert or update of type on core.items
for each row when (new.type in ('exercise', 'workout'))
execute function fitness_private.make_detail();

-- The Gym is always Personal (ADR-0058; spaces and sharing).
create function fitness_private.check_fitness_item() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (select s.kind from core.spaces s where s.id = new.space_id) = 'household' then
    raise exception 'A % stays Personal', replace(new.type, '_', ' ') using errcode = '23514';
  end if;
  return new;
end
$$;
create trigger items_fitness_check before insert or update of space_id, type on core.items
for each row when (new.type in ('exercise', 'workout_template', 'workout'))
execute function fitness_private.check_fitness_item();

-- ---------------------------------------------------------------------------
-- Child rows belong to the right Types.

create function fitness_private.is_type(p_item uuid, p_type text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from core.items where id = p_item and type = p_type)
$$;

create function fitness_private.check_child() returns trigger
language plpgsql set search_path = '' as $$
declare
  r jsonb := to_jsonb(new);
begin
  if tg_table_name = 'exercise_muscles' then
    if not fitness_private.is_type((r ->> 'exercise_id')::uuid, 'exercise') then
      raise exception 'Muscle groups belong to an Exercise' using errcode = '23514';
    end if;
  elsif tg_table_name = 'template_exercises' then
    if not fitness_private.is_type((r ->> 'template_id')::uuid, 'workout_template')
       or not fitness_private.is_type((r ->> 'exercise_id')::uuid, 'exercise') then
      raise exception 'A template holds Exercises' using errcode = '23514';
    end if;
  elsif tg_table_name = 'workout_entries' then
    if not fitness_private.is_type((r ->> 'workout_id')::uuid, 'workout')
       or not fitness_private.is_type((r ->> 'exercise_id')::uuid, 'exercise') then
      raise exception 'A workout holds Exercises' using errcode = '23514';
    end if;
  end if;
  return new;
end
$$;
create trigger exercise_muscles_check before insert or update on fitness.exercise_muscles
for each row execute function fitness_private.check_child();
create trigger template_exercises_check before insert or update of template_id, exercise_id
on fitness.template_exercises for each row execute function fitness_private.check_child();
create trigger workout_entries_check before insert or update of workout_id, exercise_id
on fitness.workout_entries for each row execute function fitness_private.check_child();

-- An Exercise's equipment is its owner's (GYM-001).
create function fitness_private.check_exercise() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.equipment_id is not null and not exists (
    select 1 from fitness.equipment e join core.items i on i.id = new.item_id
    where e.id = new.equipment_id and e.person_id = i.owner_id
  ) then
    raise exception 'An Exercise uses equipment of its own owner''s' using errcode = '23514';
  end if;
  return new;
end
$$;
create trigger exercise_check before insert or update of equipment_id on fitness.exercise
for each row execute function fitness_private.check_exercise();

-- An Exercise's muscle groups are built in or its owner's own.
create function fitness_private.check_exercise_muscle() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (
    select 1 from fitness.muscle_groups m join core.items i on i.id = new.exercise_id
    where m.id = new.muscle_id and (m.person_id is null or m.person_id = i.owner_id)
  ) then
    raise exception 'A muscle group is built in or your own' using errcode = '23514';
  end if;
  return new;
end
$$;
create trigger exercise_muscles_owner before insert or update of muscle_id on fitness.exercise_muscles
for each row execute function fitness_private.check_exercise_muscle();

-- A group of my own can't take a built-in group's name (GYM-002).
create function fitness_private.check_muscle_name() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.person_id is not null and exists (
    select 1 from fitness.muscle_groups m
    where m.person_id is null and lower(btrim(m.name)) = lower(btrim(new.name))
  ) then
    raise exception 'There''s already a muscle group called "%"', btrim(new.name) using errcode = '23505';
  end if;
  return new;
end
$$;
create trigger muscle_groups_name_check before insert or update of name on fitness.muscle_groups
for each row execute function fitness_private.check_muscle_name();

-- ---------------------------------------------------------------------------
-- An Exercise's name is unique among its owner's Exercises, archived ones
-- included (gym.md, Exercises).

create function fitness_private.name_key(p_name text) returns text
language sql immutable set search_path = '' as $$
  select lower(regexp_replace(btrim(p_name), '\s+', ' ', 'g'))
$$;

create function fitness_private.check_exercise_name() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and old.type = 'exercise' and old.title = new.title then
    return new;
  end if;
  if btrim(new.title) = '' then
    raise exception 'An Exercise needs a name' using errcode = '23514';
  end if;
  if exists (
    select 1 from core.items i
    where i.type = 'exercise' and i.id <> new.id and i.archived_at is null
      and i.owner_id = new.owner_id
      and fitness_private.name_key(i.title) = fitness_private.name_key(new.title)
  ) then
    raise exception 'There''s already an Exercise called "%"', btrim(new.title) using errcode = '23505';
  end if;
  return new;
end
$$;
create trigger items_exercise_name before insert or update of title, type on core.items
for each row when (new.type = 'exercise')
execute function fitness_private.check_exercise_name();

-- ---------------------------------------------------------------------------
-- A Workout's stage and its status agree: complete is done, the rest
-- active (ADR-0058).

create function fitness_private.sync_status() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update core.items
  set status = case when new.stage = 'complete' then 'done' else 'active' end
  where id = new.item_id
    and status is distinct from case when new.stage = 'complete' then 'done' else 'active' end;
  return null;
end
$$;
create trigger workout_status after insert or update of stage on fitness.workout
for each row execute function fitness_private.sync_status();

-- ---------------------------------------------------------------------------
-- The activity log grows to the Gym (ADR-0030, ADR-0058): an Exercise's
-- fields and muscle groups, a workout's, and a template's exercises. A
-- workout's sets are its own record and aren't logged one by one; rows made
-- with their Item aren't either.

create function fitness_private.log_fitness() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  r jsonb := to_jsonb(case when tg_op = 'DELETE' then old else new end);
  item uuid;
  old_row jsonb;
  new_row jsonb;
  changes jsonb := '{}';
  key text;
begin
  item := coalesce(r ->> 'item_id', r ->> 'exercise_id', r ->> 'template_id')::uuid;
  if tg_table_name = 'template_exercises' then
    item := (r ->> 'template_id')::uuid;
  end if;
  -- Gone with its Item, or made with it in this transaction.
  if not exists (select 1 from core.items i where i.id = item and i.created_at <> now()) then
    return null;
  end if;

  if tg_table_name in ('exercise', 'workout') then
    old_row := to_jsonb(old) - array['updated_at', 'item_id', 'owner_id'];
    new_row := to_jsonb(new) - array['updated_at', 'item_id', 'owner_id'];
    for key in select jsonb_object_keys(new_row) loop
      if new_row -> key is distinct from old_row -> key then
        changes := changes || jsonb_build_object(key, jsonb_build_object('from', old_row -> key, 'to', new_row -> key));
      end if;
    end loop;
    if changes = '{}' then
      return null;
    end if;
  else
    old_row := case when tg_op = 'INSERT' then null
      else to_jsonb(old) - array['created_at', 'updated_at', 'template_id', 'exercise_id'] end;
    new_row := case when tg_op = 'DELETE' then null
      else to_jsonb(new) - array['created_at', 'updated_at', 'template_id', 'exercise_id'] end;
    if tg_table_name = 'template_exercises' then
      old_row := case when old_row is null then null else old_row || jsonb_build_object('exercise_id', to_jsonb(old) -> 'exercise_id') end;
      new_row := case when new_row is null then null else new_row || jsonb_build_object('exercise_id', to_jsonb(new) -> 'exercise_id') end;
    end if;
    if old_row is not distinct from new_row then
      return null;
    end if;
    changes := jsonb_build_object(
      case tg_table_name when 'exercise_muscles' then 'muscle' else 'exercise' end,
      jsonb_build_object('from', old_row, 'to', new_row));
  end if;
  insert into core.activity (item_id, verb, changed) values (item, 'updated', changes);
  return null;
end
$$;
create trigger exercise_log after update on fitness.exercise
for each row execute function fitness_private.log_fitness();
create trigger workout_log after update on fitness.workout
for each row execute function fitness_private.log_fitness();
create trigger exercise_muscles_log after insert or update or delete on fitness.exercise_muscles
for each row execute function fitness_private.log_fitness();
create trigger template_exercises_log after insert or update or delete on fitness.template_exercises
for each row execute function fitness_private.log_fitness();

grant execute on function fitness_private.is_type(uuid, text) to authenticated;
grant execute on function fitness_private.name_key(text) to authenticated;
