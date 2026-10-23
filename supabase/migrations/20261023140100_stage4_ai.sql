-- Stage 4 (plan step 9b): the AI service's daily allowance per person, and
-- keeping an imported recipe (ADR-0054; RCP-014).

-- ---------------------------------------------------------------------------
-- The daily allowance (ADR-0054): each use of the AI is an `ai` row in
-- ops.events, written by the `ai` Edge Function as the service role, never
-- with what was sent. A day is a UTC day.

create index events_ai on ops.events (person_id, at) where source = 'edge' and kind = 'ai';

-- What I have left today of an allowance.
create function core.ai_left(p_person uuid, p_allowance integer)
returns integer
language sql stable security definer set search_path = '' as $$
  select greatest(p_allowance - count(*)::integer, 0) from ops.events
  where source = 'edge' and kind = 'ai' and person_id = p_person
    and at >= date_trunc('day', now() at time zone 'utc') at time zone 'utc'
$$;

-- One use taken, if any is left: true when taken. Nothing of what was sent
-- is kept, only the task and the prompt's version.
create function core.ai_take(p_person uuid, p_allowance integer, p_task text, p_details jsonb default '{}')
returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtext('ai:' || p_person::text));
  if core.ai_left(p_person, p_allowance) < 1 then
    return false;
  end if;
  insert into ops.events (source, kind, message, details, person_id)
  values ('edge', 'ai', left(p_task, 200),
    case when jsonb_typeof(p_details) = 'object' and pg_column_size(p_details) <= 4000 then p_details else '{}' end,
    p_person);
  return true;
end
$$;

-- A failed use, for the health check: the task and why, never the content.
create function core.ai_failed(p_person uuid, p_task text, p_message text)
returns void
language sql security definer set search_path = '' as $$
  insert into ops.events (source, kind, message, details, person_id)
  values ('edge', 'ai_failed', left(coalesce(p_message, 'Failed'), 2000),
    jsonb_build_object('task', left(p_task, 200)), p_person)
$$;

revoke all on function core.ai_left(uuid, integer) from public;
revoke all on function core.ai_take(uuid, integer, text, jsonb) from public;
revoke all on function core.ai_failed(uuid, text, text) from public;
grant execute on function core.ai_left(uuid, integer) to service_role;
grant execute on function core.ai_take(uuid, integer, text, jsonb) to service_role;
grant execute on function core.ai_failed(uuid, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- Keeping an import (RCP-014 3, 4; ADR-0054): the Recipe, its Variation, its
-- lines and steps, new Pantry entries and new names on my lists, all
-- together, or nothing. As a new Draft, or into my Idea, which keeps its
-- name, photo and notes. Safe to send twice: a Recipe already kept is
-- returned as it is.
--
-- p_draft: name, category, cuisine, protein, carbs, servings, prep_min,
-- cook_min, notes, sources, steps (each position and text), lines (each position,
-- heading, pantry_id, text, qty, qty_max, approx, unit, or new_pantry
-- {id, name, aisle, default_unit} for an entry to add).

create function food.keep_import(p_recipe uuid, p_variation uuid, p_draft jsonb)
returns core.items
language plpgsql set search_path = '' as $$
declare
  r core.items;
  into_idea boolean := false;
  line jsonb;
  added jsonb;
  pantry uuid;
  step record;
  value record;
begin
  perform food_private.check_keys(p_draft, array['name', 'category', 'cuisine', 'protein', 'carbs',
    'servings', 'prep_min', 'cook_min', 'notes', 'sources', 'steps', 'lines']);
  select * into r from core.items where id = p_recipe;
  if r.id is not null then
    if r.type <> 'recipe' or r.status <> 'idea' then
      return r;
    end if;
    if r.owner_id is distinct from (select auth.uid())
      or food_private.recipe_of(p_variation) is distinct from p_recipe
      or (select owner_id from core.items where id = p_variation) is distinct from r.owner_id
    then
      raise exception 'Only my own Idea is imported into' using errcode = '42501';
    end if;
    into_idea := true;
  else
    perform food.create_recipe(p_recipe, p_variation, p_draft ->> 'name', 'active');
  end if;

  perform food.update_recipe(p_recipe, jsonb_build_object(
    'category', p_draft -> 'category', 'cuisine', p_draft -> 'cuisine',
    'protein', coalesce(p_draft -> 'protein', '[]'), 'carbs', coalesce(p_draft -> 'carbs', '[]')));
  for value in
    select 'category' as kind, p_draft ->> 'category' as name
    union all select 'cuisine', p_draft ->> 'cuisine'
    union all select 'protein', e from jsonb_array_elements_text(coalesce(p_draft -> 'protein', '[]')) e
    union all select 'carb', e from jsonb_array_elements_text(coalesce(p_draft -> 'carbs', '[]')) e
  loop
    if nullif(btrim(value.name), '') is not null then
      insert into food.values (kind, name) values (value.kind, btrim(value.name)) on conflict do nothing;
    end if;
  end loop;

  perform food.update_variation(p_variation, jsonb_build_object(
    'servings', p_draft -> 'servings', 'prep_min', p_draft -> 'prep_min', 'cook_min', p_draft -> 'cook_min',
    'notes', (select nullif(concat_ws(E'\n\n', nullif(btrim(v.notes), ''), nullif(btrim(p_draft ->> 'notes'), '')), '')
              from food.variation v where v.item_id = p_variation),
    'sources', (select to_jsonb(array(select distinct s from unnest(v.sources || food_private.text_array(coalesce(p_draft -> 'sources', '[]'))) s))
                from food.variation v where v.item_id = p_variation)));

  for line in select e from jsonb_array_elements(coalesce(p_draft -> 'lines', '[]')) e loop
    pantry := (line ->> 'pantry_id')::uuid;
    added := line -> 'new_pantry';
    if added is not null and jsonb_typeof(added) = 'object' then
      -- Someone may have added the same name since: that one is used.
      select p.id into pantry from food.pantry p
      where lower(regexp_replace(btrim(p.name), '\s+', ' ', 'g'))
        = lower(regexp_replace(btrim(added ->> 'name'), '\s+', ' ', 'g'));
      if pantry is null then
        pantry := (food.add_pantry((added ->> 'id')::uuid, jsonb_strip_nulls(jsonb_build_object(
          'name', added ->> 'name', 'aisle', added ->> 'aisle', 'default_unit', added ->> 'default_unit')))).id;
      end if;
    end if;
    perform food.add_line(core_private.uuidv7(), p_variation, jsonb_strip_nulls(jsonb_build_object(
      'position', line ->> 'position', 'heading', line ->> 'heading', 'pantry_id', pantry,
      'text', case when pantry is null then line ->> 'text' end,
      'qty', line -> 'qty', 'qty_max', line -> 'qty_max', 'approx', line -> 'approx', 'unit', line ->> 'unit')));
  end loop;

  for step in select e from jsonb_array_elements(coalesce(p_draft -> 'steps', '[]')) e loop
    perform food.add_step(core_private.uuidv7(), p_variation, step.e ->> 'text', step.e ->> 'position');
  end loop;

  if into_idea then
    update core.items set status = 'active' where id = p_variation;
  end if;
  select * into r from core.items where id = p_recipe;
  return r;
end
$$;
grant execute on function food.keep_import(uuid, uuid, jsonb) to authenticated;
