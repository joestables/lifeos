-- Settings → Food keeps my lists (RCP-018 1, Joe, 26 October): renaming a
-- category, cuisine, tag, protein or carb renames it on my Recipes too;
-- merging moves my Recipes to the other name before the old one goes; and
-- a deleted Recipe brought back puts its names back on its author's lists.

-- My Recipes, archived and deleted ones too, from one name to another, in a
-- list of one kind. Not logged on each Recipe: it is my list that changed.
create function food.move_value_uses(p_kind text, p_from text, p_to text)
returns void
language plpgsql set search_path = '' as $$
declare
  k text := lower(btrim(p_from));
  t text := btrim(p_to);
begin
  if p_kind not in ('category', 'cuisine', 'tag', 'protein', 'carb') then
    raise exception 'No list %', p_kind using errcode = '22023';
  end if;
  if t = '' then
    raise exception 'A name is needed' using errcode = '23514';
  end if;
  perform set_config('food.quiet', 'on', true);
  if p_kind = 'category' then
    update food.recipe f set category = t
    from core.items i
    where i.id = f.item_id and i.owner_id = (select auth.uid()) and lower(btrim(f.category)) = k;
  elsif p_kind = 'cuisine' then
    update food.recipe f set cuisine = t
    from core.items i
    where i.id = f.item_id and i.owner_id = (select auth.uid()) and lower(btrim(f.cuisine)) = k;
  else
    update food.recipe f set
      tags = case when p_kind = 'tag' then food_private.moved(f.tags, k, t) else f.tags end,
      protein = case when p_kind = 'protein' then food_private.moved(f.protein, k, t) else f.protein end,
      carbs = case when p_kind = 'carb' then food_private.moved(f.carbs, k, t) else f.carbs end
    from core.items i
    where i.id = f.item_id and i.owner_id = (select auth.uid())
      and exists (
        select 1 from unnest(case p_kind when 'tag' then f.tags when 'protein' then f.protein else f.carbs end) e
        where lower(btrim(e)) = k
      );
  end if;
  perform set_config('food.quiet', 'off', true);
end
$$;

-- A list of names with one name swapped for another, in its place, once:
-- names the same but for case count once, spelt as the new name.
create function food_private.moved(p_names text[], p_key text, p_to text)
returns text[]
language sql immutable set search_path = '' as $$
  select coalesce(array_agg(v order by o), '{}')
  from (
    select distinct on (lower(btrim(v))) v, min(o) over (partition by lower(btrim(v))) o
    from unnest(p_names) with ordinality n(e, o),
      lateral (select case when lower(btrim(e)) = p_key then p_to else e end v) s
    order by lower(btrim(v)), v = p_to desc, o
  ) m
$$;

-- Renaming a value renames it on my Recipes.
create or replace function food.rename_value(p_id uuid, p_name text)
returns food.values
language plpgsql set search_path = '' as $$
declare
  was food.values;
  r food.values;
begin
  select * into was from food.values where id = p_id and person_id = (select auth.uid());
  update food.values set name = btrim(p_name) where id = p_id returning * into r;
  if r.id is null then
    raise exception 'No value % to rename', p_id using errcode = 'P0002';
  end if;
  perform food.move_value_uses(was.kind, was.name, r.name);
  return r;
end
$$;

-- A list rename isn't an edit of each Recipe: the log leaves it out.
create or replace function food_private.log_food() returns trigger
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
  if current_setting('food.quiet', true) = 'on' then
    return null;
  end if;
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

-- A Recipe brought back from Recently deleted puts any of its names I have
-- since taken off my lists back on them. Security definer: whoever brings
-- it back, the names are its author's.
create function food_private.restore_values() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into food.values (person_id, kind, name)
  select new.owner_id, v.kind, btrim(v.name)
  from food.recipe f,
    lateral (
      select 'category' kind, f.category name
      union all select 'cuisine', f.cuisine
      union all select 'tag', unnest(f.tags)
      union all select 'protein', unnest(f.protein)
      union all select 'carb', unnest(f.carbs)
    ) v
  where f.item_id = new.id and v.name is not null and btrim(v.name) <> ''
  on conflict do nothing;
  return null;
end
$$;
create trigger recipe_restore_values after update of archived_at on core.items
for each row when (old.archived_at is not null and new.archived_at is null and new.type = 'recipe')
execute function food_private.restore_values();

grant execute on function food_private.moved(text[], text, text) to authenticated;
grant execute on function food.move_value_uses(text, text, text) to authenticated;
