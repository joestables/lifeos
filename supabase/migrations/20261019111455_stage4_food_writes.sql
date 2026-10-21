-- Stage 4 (plan step 4): food's write functions for Recipes, Variations,
-- lines, steps and cooks (ADR-0042: every write is a database function,
-- replayed by the write queue, so each is idempotent on its id). RCP-002,
-- RCP-006–RCP-012.

-- ---------------------------------------------------------------------------
-- Write functions. Security invoker unless they must reach past row-level
-- security, and then they check for themselves.

create function food_private.check_keys(p_patch jsonb, p_allowed text[]) returns void
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

create function food_private.text_array(p_value jsonb) returns text[]
language sql immutable set search_path = '' as $$
  select coalesce(array(select btrim(e) from jsonb_array_elements_text(p_value) e where btrim(e) <> ''), '{}')
$$;

create function food_private.personal_space() returns uuid
language sql stable security definer set search_path = '' as $$
  select s.id from core.spaces s where s.kind = 'personal' and s.created_by = (select auth.uid())
$$;

-- A new Recipe with its first Variation, both an Idea or both a Draft
-- (RCP-002, RCP-006). The first Variation's name is given by the app.
create function food.create_recipe(p_id uuid, p_variation uuid, p_name text,
  p_status text default 'idea', p_variation_name text default 'Standard')
returns core.items
language plpgsql set search_path = '' as $$
declare
  r core.items;
begin
  if p_status not in ('idea', 'active') then
    raise exception 'A new Recipe is an Idea or a Draft' using errcode = '22023';
  end if;
  if not exists (select 1 from core.items where id = p_id) then
    insert into core.items (id, type, title, space_id, status)
    values (p_id, 'recipe', btrim(p_name), food_private.personal_space(), p_status);
    insert into core.items (id, type, title, space_id, status)
    values (p_variation, 'variation', coalesce(nullif(btrim(p_variation_name), ''), 'Standard'),
            food_private.personal_space(), p_status);
    insert into core.links (from_item, to_item, link_type, origin)
    values (p_variation, p_id, 'variation_of', 'action');
    update food.recipe set default_variation = p_variation where item_id = p_id;
  end if;
  select * into r from core.items where id = p_id;
  return r;
end
$$;

-- A Recipe's heading: category, cuisine, tags, protein, carbs and its
-- default Variation (one of the author's own).
create function food.update_recipe(p_id uuid, p_patch jsonb)
returns food.recipe
language plpgsql set search_path = '' as $$
declare
  r food.recipe;
begin
  perform food_private.check_keys(p_patch, array['category', 'cuisine', 'tags', 'protein', 'carbs', 'default_variation']);
  if p_patch ? 'default_variation' and p_patch ->> 'default_variation' is not null and not exists (
    select 1 from core.links l join core.items v on v.id = l.from_item
    join core.items rc on rc.id = l.to_item
    where l.from_item = (p_patch ->> 'default_variation')::uuid and l.to_item = p_id
      and l.link_type = 'variation_of' and v.owner_id = rc.owner_id
  ) then
    raise exception 'The default is one of the Recipe''s own Variations' using errcode = '23514';
  end if;
  update food.recipe f set
    category = case when p_patch ? 'category' then nullif(btrim(p_patch ->> 'category'), '') else f.category end,
    cuisine = case when p_patch ? 'cuisine' then nullif(btrim(p_patch ->> 'cuisine'), '') else f.cuisine end,
    tags = case when p_patch ? 'tags' then food_private.text_array(p_patch -> 'tags') else f.tags end,
    protein = case when p_patch ? 'protein' then food_private.text_array(p_patch -> 'protein') else f.protein end,
    carbs = case when p_patch ? 'carbs' then food_private.text_array(p_patch -> 'carbs') else f.carbs end,
    default_variation = case when p_patch ? 'default_variation'
      then (p_patch ->> 'default_variation')::uuid else f.default_variation end
  where f.item_id = p_id
  returning * into r;
  if r.item_id is null then
    raise exception 'No Recipe % to update', p_id using errcode = 'P0002';
  end if;
  return r;
end
$$;

-- A new Variation of a Recipe I can see (RCP-009, ADR-0051): mine, in my
-- Personal Space, a copy of one of its Variations (its lines, steps, notes,
-- times, servings and sources) as a Draft, or empty as an Idea. Security
-- definer, because the link reaches a Recipe I may not edit.
create function food.add_variation(p_id uuid, p_recipe uuid, p_name text, p_from uuid default null)
returns core.items
language plpgsql security definer set search_path = '' as $$
declare
  r core.items;
  me uuid := (select auth.uid());
  space uuid := food_private.personal_space();
begin
  if exists (select 1 from core.items where id = p_id) then
    select * into r from core.items where id = p_id and core_private.can_read(id);
    return r;
  end if;
  if me is null or space is null
    or (select type from core.items where id = p_recipe) is distinct from 'recipe'
    or not core_private.can_read(p_recipe)
  then
    raise exception 'No Recipe % to add a Variation to', p_recipe using errcode = 'P0002';
  end if;
  if p_from is not null and (food_private.recipe_of(p_from) is distinct from p_recipe or not core_private.can_read(p_from)) then
    raise exception 'A Variation is copied from one of the same Recipe' using errcode = '23514';
  end if;
  if btrim(coalesce(p_name, '')) = '' then
    raise exception 'A Variation needs a name' using errcode = '23514';
  end if;

  insert into core.items (id, type, title, space_id, owner_id, status)
  values (p_id, 'variation', btrim(p_name), space, me, case when p_from is null then 'idea' else 'active' end);
  if p_from is not null then
    update food.variation t set servings = f.servings, prep_min = f.prep_min, cook_min = f.cook_min,
      sources = f.sources, notes = f.notes
    from food.variation f where f.item_id = p_from and t.item_id = p_id;
    insert into food.variation_lines (variation_id, position, heading, pantry_id, text, qty, qty_max, approx, unit)
    select p_id, position, heading, pantry_id, text, qty, qty_max, approx, unit
    from food.variation_lines where variation_id = p_from;
    insert into food.variation_steps (variation_id, position, text)
    select p_id, position, text from food.variation_steps where variation_id = p_from;
  end if;
  insert into core.links (from_item, to_item, link_type, origin, created_by)
  values (p_id, p_recipe, 'variation_of', 'action', me);
  select * into r from core.items where id = p_id;
  return r;
end
$$;

-- A Variation's fields: servings, prep and cook minutes, sources, notes.
-- Its name and state are the Item's (core.update_item).
create function food.update_variation(p_id uuid, p_patch jsonb)
returns food.variation
language plpgsql set search_path = '' as $$
declare
  r food.variation;
begin
  perform food_private.check_keys(p_patch, array['servings', 'prep_min', 'cook_min', 'sources', 'notes']);
  update food.variation f set
    servings = case when p_patch ? 'servings' then (p_patch ->> 'servings')::integer else f.servings end,
    prep_min = case when p_patch ? 'prep_min' then (p_patch ->> 'prep_min')::integer else f.prep_min end,
    cook_min = case when p_patch ? 'cook_min' then (p_patch ->> 'cook_min')::integer else f.cook_min end,
    sources = case when p_patch ? 'sources' then food_private.text_array(p_patch -> 'sources') else f.sources end,
    notes = case when p_patch ? 'notes' then nullif(btrim(p_patch ->> 'notes'), '') else f.notes end
  where f.item_id = p_id
  returning * into r;
  if r.item_id is null then
    raise exception 'No Variation % to update', p_id using errcode = 'P0002';
  end if;
  return r;
end
$$;

-- Ingredient lines (RCP-007). Fields: position, heading, pantry_id, text,
-- qty, qty_max, approx, unit.
create function food.add_line(p_id uuid, p_variation uuid, p_fields jsonb)
returns food.variation_lines
language plpgsql set search_path = '' as $$
declare
  r food.variation_lines;
begin
  perform food_private.check_keys(p_fields, array['position', 'heading', 'pantry_id', 'text', 'qty', 'qty_max', 'approx', 'unit']);
  insert into food.variation_lines (id, variation_id, position, heading, pantry_id, text, qty, qty_max, approx, unit)
  values (
    p_id, p_variation, p_fields ->> 'position',
    nullif(btrim(p_fields ->> 'heading'), ''),
    (p_fields ->> 'pantry_id')::uuid,
    nullif(btrim(p_fields ->> 'text'), ''),
    (p_fields ->> 'qty')::numeric,
    (p_fields ->> 'qty_max')::numeric,
    coalesce((p_fields ->> 'approx')::boolean, false),
    p_fields ->> 'unit'
  )
  on conflict (id) do nothing;
  select * into r from food.variation_lines where id = p_id;
  return r;
end
$$;

create function food.update_line(p_id uuid, p_patch jsonb)
returns food.variation_lines
language plpgsql set search_path = '' as $$
declare
  r food.variation_lines;
begin
  perform food_private.check_keys(p_patch, array['position', 'heading', 'pantry_id', 'text', 'qty', 'qty_max', 'approx', 'unit']);
  update food.variation_lines l set
    position = case when p_patch ? 'position' then p_patch ->> 'position' else l.position end,
    heading = case when p_patch ? 'heading' then nullif(btrim(p_patch ->> 'heading'), '') else l.heading end,
    pantry_id = case when p_patch ? 'pantry_id' then (p_patch ->> 'pantry_id')::uuid else l.pantry_id end,
    text = case when p_patch ? 'text' then nullif(btrim(p_patch ->> 'text'), '') else l.text end,
    qty = case when p_patch ? 'qty' then (p_patch ->> 'qty')::numeric else l.qty end,
    qty_max = case when p_patch ? 'qty_max' then (p_patch ->> 'qty_max')::numeric else l.qty_max end,
    approx = case when p_patch ? 'approx' then coalesce((p_patch ->> 'approx')::boolean, false) else l.approx end,
    unit = case when p_patch ? 'unit' then p_patch ->> 'unit' else l.unit end
  where l.id = p_id
  returning * into r;
  if r.id is null then
    raise exception 'No line % to update', p_id using errcode = 'P0002';
  end if;
  return r;
end
$$;

create function food.remove_line(p_id uuid)
returns void
language sql set search_path = '' as $$
  delete from food.variation_lines where id = p_id
$$;

-- Method steps (RCP-008).
create function food.add_step(p_id uuid, p_variation uuid, p_text text, p_position text)
returns food.variation_steps
language plpgsql set search_path = '' as $$
declare
  r food.variation_steps;
begin
  insert into food.variation_steps (id, variation_id, text, position)
  values (p_id, p_variation, coalesce(p_text, ''), p_position)
  on conflict (id) do nothing;
  select * into r from food.variation_steps where id = p_id;
  return r;
end
$$;

create function food.update_step(p_id uuid, p_patch jsonb)
returns food.variation_steps
language plpgsql set search_path = '' as $$
declare
  r food.variation_steps;
begin
  perform food_private.check_keys(p_patch, array['text', 'position']);
  update food.variation_steps s set
    text = case when p_patch ? 'text' then coalesce(p_patch ->> 'text', '') else s.text end,
    position = case when p_patch ? 'position' then p_patch ->> 'position' else s.position end
  where s.id = p_id
  returning * into r;
  if r.id is null then
    raise exception 'No step % to update', p_id using errcode = 'P0002';
  end if;
  return r;
end
$$;

create function food.remove_step(p_id uuid)
returns void
language sql set search_path = '' as $$
  delete from food.variation_steps where id = p_id
$$;

-- A Variation as it is now, for a cook's snapshot (RCP-012 2).
create function food_private.snapshot(p_variation uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'name', i.title,
    'servings', v.servings,
    'prep_min', v.prep_min,
    'cook_min', v.cook_min,
    'notes', v.notes,
    'lines', coalesce((
      select jsonb_agg(jsonb_build_object(
        'heading', l.heading, 'pantry_id', l.pantry_id,
        'name', coalesce(p.name, l.text), 'qty', l.qty, 'qty_max', l.qty_max,
        'approx', l.approx, 'unit', l.unit) order by l.position)
      from food.variation_lines l left join food.pantry p on p.id = l.pantry_id
      where l.variation_id = p_variation), '[]'),
    'steps', coalesce((
      select jsonb_agg(s.text order by s.position)
      from food.variation_steps s where s.variation_id = p_variation), '[]')
  )
  from core.items i join food.variation v on v.item_id = i.id
  where i.id = p_variation
$$;

-- A cook (RCP-012): fields cooked_at, verdict, notes, servings, meal_id. The
-- snapshot is taken here. Ticking a Meal eaten logs nothing.
create function food.log_cook(p_id uuid, p_variation uuid, p_fields jsonb default '{}')
returns food.cooks
language plpgsql set search_path = '' as $$
declare
  r food.cooks;
begin
  perform food_private.check_keys(p_fields, array['cooked_at', 'verdict', 'notes', 'servings', 'meal_id']);
  insert into food.cooks (id, variation_id, cooked_at, verdict, notes, servings, meal_id, snapshot)
  values (
    p_id, p_variation,
    coalesce((p_fields ->> 'cooked_at')::timestamptz, now()),
    (p_fields ->> 'verdict')::smallint,
    nullif(btrim(p_fields ->> 'notes'), ''),
    (p_fields ->> 'servings')::integer,
    (p_fields ->> 'meal_id')::uuid,
    coalesce(food_private.snapshot(p_variation), '{}')
  )
  on conflict (id) do nothing;
  select * into r from food.cooks where id = p_id;
  return r;
end
$$;

create function food.update_cook(p_id uuid, p_patch jsonb)
returns food.cooks
language plpgsql set search_path = '' as $$
declare
  r food.cooks;
begin
  perform food_private.check_keys(p_patch, array['cooked_at', 'verdict', 'notes', 'servings']);
  update food.cooks c set
    cooked_at = case when p_patch ? 'cooked_at' then (p_patch ->> 'cooked_at')::timestamptz else c.cooked_at end,
    verdict = case when p_patch ? 'verdict' then (p_patch ->> 'verdict')::smallint else c.verdict end,
    notes = case when p_patch ? 'notes' then nullif(btrim(p_patch ->> 'notes'), '') else c.notes end,
    servings = case when p_patch ? 'servings' then (p_patch ->> 'servings')::integer else c.servings end
  where c.id = p_id
  returning * into r;
  if r.id is null then
    raise exception 'No cook % to update', p_id using errcode = 'P0002';
  end if;
  return r;
end
$$;

create function food.remove_cook(p_id uuid)
returns void
language sql set search_path = '' as $$
  delete from food.cooks where id = p_id
$$;

-- ---------------------------------------------------------------------------

grant execute on all functions in schema food to authenticated;
grant execute on function food_private.deriving() to authenticated;
grant execute on function food_private.name_key(text) to authenticated;
grant execute on function food_private.check_keys(jsonb, text[]) to authenticated;
grant execute on function food_private.text_array(jsonb) to authenticated;
grant execute on function food_private.personal_space() to authenticated;
grant execute on function food_private.recipe_of(uuid) to authenticated;
grant execute on function food_private.snapshot(uuid) to authenticated;
