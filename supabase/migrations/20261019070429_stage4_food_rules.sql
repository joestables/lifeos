-- Stage 4 (plan step 4): the rules the database keeps for food (its write
-- functions follow in stage4_food_writes). ADR-0011, 0030, 0051, 0052;
-- RCP-002, RCP-009, RCP-010, RCP-013; MPL-002.

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

