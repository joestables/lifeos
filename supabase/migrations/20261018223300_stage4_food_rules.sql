-- Stage 4 (plan step 4): the rules the database keeps for food, and its
-- write functions (ADR-0042: every write is a database function, replayed
-- by the write queue, so each is idempotent on its id). ADR-0011, 0051,
-- 0052; RCP-002, RCP-009, RCP-010, RCP-012; MPL-002; PAN-001–003.

-- ---------------------------------------------------------------------------
-- Detail rows: made when a food Item is made or converted into one.

create function food_private.make_detail() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.type = 'recipe' then
    insert into food.recipe (item_id) values (new.id) on conflict do nothing;
  elsif new.type = 'variation' then
    insert into food.variation (item_id) values (new.id) on conflict do nothing;
  elsif new.type = 'meal' then
    insert into food.meal (item_id) values (new.id) on conflict do nothing;
  end if;
  return null;
end
$$;
create trigger items_food_detail after insert or update of type on core.items
for each row when (new.type in ('recipe', 'variation', 'meal'))
execute function food_private.make_detail();

-- Recipes and Variations stay in their author's Personal Space (ADR-0052):
-- a Household sees them through its members, never through its Space.
create function food_private.check_food_item() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (select s.kind from core.spaces s where s.id = new.space_id) = 'household' then
    raise exception 'A % stays in its author''s Personal Space', new.type using errcode = '23514';
  end if;
  return new;
end
$$;
create trigger items_food_check before insert or update of space_id, type on core.items
for each row when (new.type in ('recipe', 'variation'))
execute function food_private.check_food_item();

-- Child rows belong to the right Type.
create function food_private.check_child() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (select i.type from core.items i where i.id = new.variation_id) is distinct from 'variation' then
    raise exception 'Lines, steps and cooks belong to a Variation' using errcode = '23514';
  end if;
  if tg_table_name = 'cooks' then
    if to_jsonb(new) ->> 'meal_id' is not null and (
      select i.type from core.items i where i.id = (to_jsonb(new) ->> 'meal_id')::uuid
    ) is distinct from 'meal' then
      raise exception 'A cook is for a Meal' using errcode = '23514';
    end if;
  end if;
  return new;
end
$$;
create trigger variation_lines_check before insert or update of variation_id on food.variation_lines
for each row execute function food_private.check_child();
create trigger variation_steps_check before insert or update of variation_id on food.variation_steps
for each row execute function food_private.check_child();
create trigger cooks_check before insert or update of variation_id, meal_id on food.cooks
for each row execute function food_private.check_child();

-- Leftovers are of a Meal I can see.
create function food_private.check_meal() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.leftovers_of is not null and (
    (select i.type from core.items i where i.id = new.leftovers_of) is distinct from 'meal'
    or not core_private.can_read(new.leftovers_of)
  ) then
    raise exception 'Leftovers are of a Meal you can see' using errcode = '23514';
  end if;
  return new;
end
$$;
create trigger meal_check before insert or update of leftovers_of on food.meal
for each row execute function food_private.check_meal();

-- ---------------------------------------------------------------------------
-- A Recipe's name is unique among the Recipes I can see, ignoring case and
-- spaces (RCP: Who sees and edits). Checked when a Recipe is made, renamed or
-- converted into; names that clash only because people joined a Household
-- are left alone until one is renamed.

create function food_private.name_key(p_name text) returns text
language sql immutable set search_path = '' as $$
  select lower(regexp_replace(btrim(p_name), '\s+', ' ', 'g'))
$$;

create function food_private.check_recipe_name() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and old.type = 'recipe' and old.title = new.title then
    return new;
  end if;
  if btrim(new.title) = '' then
    raise exception 'A Recipe needs a name' using errcode = '23514';
  end if;
  if (select auth.uid()) is not null and exists (
    select 1 from core.items i
    where i.type = 'recipe' and i.id <> new.id and i.archived_at is null
      and food_private.name_key(i.title) = food_private.name_key(new.title)
      and i.id in (select core_private.readable_item_ids())
  ) then
    raise exception 'There''s already a Recipe called "%"', btrim(new.title) using errcode = '23505';
  end if;
  return new;
end
$$;
create trigger items_recipe_name before insert or update of title, type on core.items
for each row when (new.type = 'recipe')
execute function food_private.check_recipe_name();

-- ---------------------------------------------------------------------------
-- States (ADR-0011, RCP-010). A Variation's state is set by hand; once it
-- has ingredients or a method it can't go back to Idea. A Recipe's state is
-- worked out: the highest of its live Variations' (Complete over Draft over
-- Idea), Archived only when all are. Archiving a Recipe archives every
-- Variation, remembering each one's state; bringing it back restores them.
-- The Recipe's own status is set only by archiving or bringing it back.

create function food_private.deriving() returns boolean
language sql stable set search_path = '' as $$
  select coalesce(current_setting('lifeos.food_deriving', true), '') = 'on'
$$;

create function food_private.recipe_of(p_variation uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select l.to_item from core.links l where l.from_item = p_variation and l.link_type = 'variation_of'
$$;

create function food_private.derive_recipe(p_recipe uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  derived text;
begin
  select case
    when count(*) = 0 then null
    when bool_or(v.status = 'done') then 'done'
    when bool_or(v.status = 'active') then 'active'
    when bool_or(v.status = 'idea') then 'idea'
    else 'cancelled'
  end into derived
  from core.links l
  join core.items v on v.id = l.from_item and v.archived_at is null
  where l.to_item = p_recipe and l.link_type = 'variation_of';
  if derived is null then
    return;
  end if;
  perform set_config('lifeos.food_deriving', 'on', true);
  update core.items set status = derived where id = p_recipe and status <> derived;
  perform set_config('lifeos.food_deriving', '', true);
end
$$;

create function food_private.check_status() returns trigger
language plpgsql set search_path = '' as $$
begin
  if food_private.deriving() or old.type <> new.type or old.status = new.status then
    return new;
  end if;
  if new.type = 'recipe' and new.status <> 'cancelled' and old.status <> 'cancelled' then
    raise exception 'A Recipe''s state comes from its Variations' using errcode = '23514';
  end if;
  if new.type = 'variation' and new.status = 'idea' and (
    exists (select 1 from food.variation_lines where variation_id = new.id and heading is null)
    or exists (select 1 from food.variation_steps where variation_id = new.id and btrim(text) <> '')
  ) then
    raise exception 'A Variation with ingredients or a method can''t go back to Idea' using errcode = '23514';
  end if;
  return new;
end
$$;
create trigger items_food_status before update of status on core.items
for each row when (new.type in ('recipe', 'variation'))
execute function food_private.check_status();

create function food_private.after_status() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if food_private.deriving() then
    return null;
  end if;
  if new.type = 'variation' then
    perform food_private.derive_recipe(food_private.recipe_of(new.id));
  elsif new.type = 'recipe' and old.type = 'recipe' and new.status = 'cancelled' and old.status <> 'cancelled' then
    perform set_config('lifeos.food_deriving', 'on', true);
    update food.variation fv set archived_from = v.status
    from core.links l join core.items v on v.id = l.from_item
    where l.to_item = new.id and l.link_type = 'variation_of'
      and fv.item_id = v.id and v.status <> 'cancelled';
    update core.items v set status = 'cancelled'
    from core.links l
    where l.to_item = new.id and l.link_type = 'variation_of' and v.id = l.from_item
      and v.status <> 'cancelled';
    perform set_config('lifeos.food_deriving', '', true);
  elsif new.type = 'recipe' and old.type = 'recipe' and old.status = 'cancelled' and new.status <> 'cancelled' then
    perform set_config('lifeos.food_deriving', 'on', true);
    update core.items v set status = fv.archived_from
    from core.links l, food.variation fv
    where l.to_item = new.id and l.link_type = 'variation_of' and v.id = l.from_item
      and fv.item_id = v.id and fv.archived_from is not null;
    update food.variation fv set archived_from = null
    from core.links l
    where l.to_item = new.id and l.link_type = 'variation_of' and fv.item_id = l.from_item
      and fv.archived_from is not null;
    perform set_config('lifeos.food_deriving', '', true);
    perform food_private.derive_recipe(new.id);
  end if;
  return null;
end
$$;
create trigger items_food_after_status after update of status, archived_at on core.items
for each row when (new.type in ('recipe', 'variation'))
execute function food_private.after_status();

-- A Variation joining or leaving a Recipe changes the Recipe's state.
create function food_private.after_variation_link() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  l core.links := case when tg_op = 'INSERT' then new else old end;
begin
  if l.link_type = 'variation_of' then
    perform food_private.derive_recipe(l.to_item);
  end if;
  return null;
end
$$;
create trigger links_food_variation after insert or delete on core.links
for each row execute function food_private.after_variation_link();

-- A Variation is a Variation of exactly one Recipe (ADR-0011).
create unique index links_one_recipe_each on core.links (from_item) where link_type = 'variation_of';
-- A Meal uses at most one Variation.
create unique index links_one_variation_each on core.links (from_item) where link_type = 'uses';

-- ---------------------------------------------------------------------------
-- A Thought or Note sorted into a Recipe becomes an Idea (RCP-002 4): the
-- Recipe gets its first Variation, an Idea called "Standard", holding the
-- text as its notes and any links in it as its sources.

create function food_private.after_convert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v uuid := core_private.uuidv7();
  found_sources text[];
begin
  insert into food.recipe (item_id) values (new.id) on conflict do nothing;
  if exists (select 1 from core.links where to_item = new.id and link_type = 'variation_of') then
    return null;
  end if;
  select coalesce(array_agg(distinct m[1]), '{}') into found_sources
  from regexp_matches(coalesce(new.title, '') || ' ' || coalesce(new.body, ''), '(https?://[^\s<>"]+)', 'g') m;
  insert into core.items (id, type, title, space_id, owner_id, status)
  values (v, 'variation', 'Standard', new.space_id, new.owner_id, 'idea');
  update food.variation set notes = nullif(btrim(new.body), ''), sources = found_sources where item_id = v;
  insert into core.links (from_item, to_item, link_type, origin, created_by)
  values (v, new.id, 'variation_of', 'action', new.owner_id);
  update food.recipe set default_variation = v where item_id = new.id;
  update core.items set body = null where id = new.id and body is not null;
  return null;
end
$$;
create trigger items_food_convert after update of type on core.items
for each row when (new.type = 'recipe' and old.type <> 'recipe')
execute function food_private.after_convert();

-- ---------------------------------------------------------------------------
-- The activity log grows to food (ADR-0030, ADR-0052): a heading, a
-- Variation's fields, a Meal's, and every line and step changed, so a
-- Recipe's log can say "Salt 1 → 2 tsp". Rows made with their Item (a new
-- Variation's copied lines) aren't logged one by one.

create function food_private.log_food() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  r record := case when tg_op = 'DELETE' then old else new end;
  item uuid;
  kind text;
  old_row jsonb;
  new_row jsonb;
  changes jsonb := '{}';
  key text;
begin
  if tg_table_name in ('recipe', 'variation', 'meal') then
    item := r.item_id;
  else
    item := r.variation_id;
  end if;
  -- Gone with its Item, or made with it in this transaction.
  if not exists (select 1 from core.items i where i.id = item and i.created_at <> now()) then
    return null;
  end if;

  if tg_table_name in ('recipe', 'variation', 'meal') then
    old_row := to_jsonb(old) - array['updated_at', 'item_id', 'archived_from'];
    new_row := to_jsonb(new) - array['updated_at', 'item_id', 'archived_from'];
    for key in select jsonb_object_keys(new_row) loop
      if new_row -> key is distinct from old_row -> key then
        changes := changes || jsonb_build_object(key, jsonb_build_object('from', old_row -> key, 'to', new_row -> key));
      end if;
    end loop;
    if changes = '{}' then
      return null;
    end if;
  else
    kind := case tg_table_name when 'variation_lines' then 'line' else 'step' end;
    old_row := case when tg_op = 'INSERT' then null
      else to_jsonb(old) - array['created_at', 'updated_at', 'variation_id'] end;
    new_row := case when tg_op = 'DELETE' then null
      else to_jsonb(new) - array['created_at', 'updated_at', 'variation_id'] end;
    if old_row is not distinct from new_row then
      return null;
    end if;
    changes := jsonb_build_object(kind, jsonb_build_object('from', old_row, 'to', new_row));
  end if;
  insert into core.activity (item_id, verb, changed) values (item, 'updated', changes);
  return null;
end
$$;
create trigger recipe_log after update on food.recipe
for each row execute function food_private.log_food();
create trigger variation_log after update on food.variation
for each row execute function food_private.log_food();
create trigger meal_log after update on food.meal
for each row execute function food_private.log_food();
create trigger variation_lines_log after insert or update or delete on food.variation_lines
for each row execute function food_private.log_food();
create trigger variation_steps_log after insert or update or delete on food.variation_steps
for each row execute function food_private.log_food();

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
-- Meals (MPL-002, MPL-003).

-- Which Variation a Meal uses: any I can see, a Household member's too.
-- Security definer, because the link reaches a Variation I may not edit;
-- the Meal must be mine to edit. Null makes it a typed Meal.
create function food.set_meal_variation(p_meal uuid, p_variation uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if (select type from core.items where id = p_meal) is distinct from 'meal'
    or not core_private.can_write(p_meal)
  then
    raise exception 'No Meal % to change', p_meal using errcode = 'P0002';
  end if;
  if p_variation is not null and (
    (select type from core.items where id = p_variation) is distinct from 'variation'
    or not core_private.can_read(p_variation)
  ) then
    raise exception 'No Variation % to plan', p_variation using errcode = 'P0002';
  end if;
  delete from core.links where from_item = p_meal and link_type = 'uses'
    and to_item is distinct from p_variation;
  if p_variation is not null then
    insert into core.links (from_item, to_item, link_type, origin, created_by)
    values (p_meal, p_variation, 'uses', 'action', (select auth.uid()))
    on conflict (from_item, to_item, link_type) do nothing;
  end if;
end
$$;

-- A new Meal: fields as core.create_item's (do_on, slot, space_id, title,
-- status), plus servings, variation and leftovers_of. A Meal from a
-- Variation is named after its Recipe unless a title is given.
create function food.plan_meal(p_id uuid, p_fields jsonb)
returns core.items
language plpgsql set search_path = '' as $$
declare
  r core.items;
  item_fields jsonb := p_fields - array['servings', 'variation', 'leftovers_of'];
  variation uuid := (p_fields ->> 'variation')::uuid;
begin
  if exists (select 1 from core.items where id = p_id) then
    select * into r from core.items where id = p_id;
    return r;
  end if;
  if coalesce(btrim(item_fields ->> 'title'), '') = '' and variation is not null then
    item_fields := item_fields || jsonb_build_object('title', (
      select rc.title from core.links l join core.items rc on rc.id = l.to_item
      where l.from_item = variation and l.link_type = 'variation_of'
        and rc.id in (select core_private.readable_item_ids())));
  end if;
  perform core.create_item(p_id, 'meal', item_fields);
  update food.meal set
    servings = (p_fields ->> 'servings')::integer,
    leftovers_of = (p_fields ->> 'leftovers_of')::uuid
  where item_id = p_id;
  if variation is not null then
    perform food.set_meal_variation(p_id, variation);
  end if;
  select * into r from core.items where id = p_id;
  return r;
end
$$;

create function food.update_meal(p_id uuid, p_patch jsonb)
returns food.meal
language plpgsql set search_path = '' as $$
declare
  r food.meal;
begin
  perform food_private.check_keys(p_patch, array['servings', 'leftovers_of']);
  update food.meal m set
    servings = case when p_patch ? 'servings' then (p_patch ->> 'servings')::integer else m.servings end,
    leftovers_of = case when p_patch ? 'leftovers_of' then (p_patch ->> 'leftovers_of')::uuid else m.leftovers_of end
  where m.item_id = p_id
  returning * into r;
  if r.item_id is null then
    raise exception 'No Meal % to update', p_id using errcode = 'P0002';
  end if;
  return r;
end
$$;

-- ---------------------------------------------------------------------------
-- The Pantry (PAN-001–003). Fields: name, kind, aisle, default_unit. An
-- ingredient's aisle starts at Cupboard.

create function food.add_pantry(p_id uuid, p_fields jsonb)
returns food.pantry
language plpgsql set search_path = '' as $$
declare
  r food.pantry;
  kind text := coalesce(p_fields ->> 'kind', 'ingredient');
begin
  perform food_private.check_keys(p_fields, array['name', 'kind', 'aisle', 'default_unit']);
  insert into food.pantry (id, name, kind, aisle, default_unit)
  values (
    p_id, regexp_replace(btrim(p_fields ->> 'name'), '\s+', ' ', 'g'), kind,
    case when kind = 'ingredient' then coalesce(p_fields ->> 'aisle', 'cupboard') end,
    p_fields ->> 'default_unit'
  )
  on conflict (id) do nothing;
  select * into r from food.pantry where id = p_id;
  return r;
end
$$;

create function food.update_pantry(p_id uuid, p_patch jsonb)
returns food.pantry
language plpgsql set search_path = '' as $$
declare
  r food.pantry;
begin
  perform food_private.check_keys(p_patch, array['name', 'kind', 'aisle', 'default_unit']);
  update food.pantry p set
    name = case when p_patch ? 'name' then regexp_replace(btrim(p_patch ->> 'name'), '\s+', ' ', 'g') else p.name end,
    kind = case when p_patch ? 'kind' then p_patch ->> 'kind' else p.kind end,
    aisle = case
      when coalesce(p_patch ->> 'kind', p.kind) = 'household' then null
      when p_patch ? 'aisle' then coalesce(p_patch ->> 'aisle', 'cupboard')
      else coalesce(p.aisle, 'cupboard')
    end,
    default_unit = case when p_patch ? 'default_unit' then p_patch ->> 'default_unit' else p.default_unit end
  where p.id = p_id
  returning * into r;
  if r.id is null then
    raise exception 'No Pantry entry % you added', p_id using errcode = 'P0002';
  end if;
  return r;
end
$$;

-- Refused (23503) while any line uses it.
create function food.remove_pantry(p_id uuid)
returns void
language sql set search_path = '' as $$
  delete from food.pantry where id = p_id
$$;

-- Merging two entries I added (PAN-003): every line that uses the second,
-- anyone's, moves to the first, and so do its staples; then it goes.
-- Security definer, because other people's lines move too.
create function food.merge_pantry(p_keep uuid, p_merge uuid)
returns food.pantry
language plpgsql security definer set search_path = '' as $$
declare
  r food.pantry;
begin
  if p_keep = p_merge or (
    select count(*) from food.pantry where id in (p_keep, p_merge) and added_by = (select auth.uid())
  ) <> 2 then
    raise exception 'Only two entries you added can be merged' using errcode = '42501';
  end if;
  update food.variation_lines set pantry_id = p_keep where pantry_id = p_merge;
  insert into food.staples (space_id, pantry_id, out_of_stock)
  select space_id, p_keep, out_of_stock from food.staples where pantry_id = p_merge
  on conflict (space_id, pantry_id) do update
    set out_of_stock = food.staples.out_of_stock or excluded.out_of_stock;
  delete from food.pantry where id = p_merge;
  select * into r from food.pantry where id = p_keep;
  return r;
end
$$;

-- A staple of one of my Spaces, and whether it has run out (PAN-002); not a
-- staple at all when p_staple is false.
create function food.set_staple(p_space uuid, p_pantry uuid, p_staple boolean, p_out_of_stock boolean default false)
returns void
language plpgsql set search_path = '' as $$
begin
  if p_staple then
    insert into food.staples (space_id, pantry_id, out_of_stock)
    values (p_space, p_pantry, coalesce(p_out_of_stock, false))
    on conflict (space_id, pantry_id) do update set out_of_stock = excluded.out_of_stock;
  else
    delete from food.staples where space_id = p_space and pantry_id = p_pantry;
  end if;
end
$$;

-- My lists of values (RCP-018).
create function food.add_value(p_id uuid, p_kind text, p_name text)
returns food.values
language plpgsql set search_path = '' as $$
declare
  r food.values;
begin
  insert into food.values (id, kind, name) values (p_id, p_kind, btrim(p_name))
  on conflict (id) do nothing;
  select * into r from food.values where id = p_id;
  return r;
end
$$;

create function food.rename_value(p_id uuid, p_name text)
returns food.values
language plpgsql set search_path = '' as $$
declare
  r food.values;
begin
  update food.values set name = btrim(p_name) where id = p_id returning * into r;
  if r.id is null then
    raise exception 'No value % to rename', p_id using errcode = 'P0002';
  end if;
  return r;
end
$$;

create function food.remove_value(p_id uuid)
returns void
language sql set search_path = '' as $$
  delete from food.values where id = p_id
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
