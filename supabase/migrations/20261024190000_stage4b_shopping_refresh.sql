-- Stage 4b (plan step 4), after stage4b_shopping_schema: a food shop's
-- Meals' lines written by the database as the Meals change (ADR-0057;
-- SHP-002 2, 5), taking a Meal off a shop, deleting a line, and Pantry
-- merges moving shopping lines and keeping staples' kind. Run by Joe in the
-- SQL editor: its delete statements wait on a confirmation the Supabase
-- tool can't show (migrations.md).

-- A Meal's lines on its open food shop, worked out afresh: its unticked
-- lines on any open shop go, then, if it is on one and is live and not
-- leftovers, its Variation's lines scaled by its servings over the
-- Variation's, and its own lines. A line already ticked stays as it is and
-- isn't added again; nothing is added for a ticked line's difference.
create function shopping_private.refresh_meal(p_meal uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_list uuid;
  v_variation uuid;
  v_factor numeric := 1;
  m core.items;
  fm food.meal;
begin
  if not exists (select 1 from shopping.list_meals where meal_id = p_meal)
    and not exists (select 1 from shopping.lines where meal_id = p_meal and not checked)
  then
    return;
  end if;
  perform set_config('shopping.refreshing', 'on', true);

  delete from shopping.lines l
  using core.items li
  where l.meal_id = p_meal and not l.checked
    and li.id = l.list_id and li.status = 'active' and li.archived_at is null;

  select lm.list_id into v_list
  from shopping.list_meals lm join core.items li on li.id = lm.list_id
  where lm.meal_id = p_meal and li.status = 'active' and li.archived_at is null
  limit 1;
  select * into m from core.items where id = p_meal;
  select * into fm from food.meal where item_id = p_meal;

  if v_list is not null and m.id is not null and m.archived_at is null
    and m.status <> 'cancelled' and fm.leftovers_of is null
  then
    select lk.to_item into v_variation
    from core.links lk where lk.from_item = p_meal and lk.link_type = 'uses' limit 1;
    if v_variation is not null then
      select case when fm.servings is not null and v.servings > 0
        then fm.servings::numeric / v.servings else 1 end
      into v_factor
      from food.variation v where v.item_id = v_variation;
      insert into shopping.lines (list_id, position, pantry_id, text, qty, qty_max, approx, unit, meal_id, source_id)
      select v_list, vl.position, vl.pantry_id, vl.text,
        vl.qty * coalesce(v_factor, 1), vl.qty_max * coalesce(v_factor, 1), vl.approx, vl.unit, p_meal, vl.id
      from food.variation_lines vl
      where vl.variation_id = v_variation and vl.heading is null
        and (vl.pantry_id is not null or nullif(btrim(vl.text), '') is not null)
        and not exists (
          select 1 from shopping.lines t
          where t.list_id = v_list and t.meal_id = p_meal and t.source_id = vl.id and t.checked
        );
    end if;
    insert into shopping.lines (list_id, position, pantry_id, text, qty, qty_max, approx, unit, meal_id, source_id)
    select v_list, ml.position, ml.pantry_id, ml.text, ml.qty, ml.qty_max, ml.approx, ml.unit, p_meal, ml.id
    from food.meal_lines ml
    where ml.meal_id = p_meal
      and not exists (
        select 1 from shopping.lines t
        where t.list_id = v_list and t.meal_id = p_meal and t.source_id = ml.id and t.checked
      );
  end if;

  perform set_config('shopping.refreshing', 'off', true);
end
$$;

-- Every Meal on an open shop using a Variation.
create function shopping_private.refresh_variation(p_variation uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  meal uuid;
begin
  for meal in
    select distinct lm.meal_id
    from shopping.list_meals lm
    join core.links lk on lk.from_item = lm.meal_id and lk.link_type = 'uses' and lk.to_item = p_variation
  loop
    perform shopping_private.refresh_meal(meal);
  end loop;
end
$$;

-- What changes a Meal's lines (ADR-0057).
create function shopping_private.on_meal_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  meal uuid;
begin
  if tg_table_name = 'meal' then
    perform shopping_private.refresh_meal(new.item_id);
  elsif tg_table_name = 'items' then
    if new.type = 'meal' then
      perform shopping_private.refresh_meal(new.id);
    elsif new.type = 'shopping_list' then
      for meal in select lm.meal_id from shopping.list_meals lm where lm.list_id = new.id loop
        perform shopping_private.refresh_meal(meal);
      end loop;
    end if;
  elsif tg_table_name = 'links' then
    perform shopping_private.refresh_meal(coalesce(new.from_item, old.from_item));
  elsif tg_table_name in ('meal_lines', 'list_meals') then
    perform shopping_private.refresh_meal(coalesce(new.meal_id, old.meal_id));
    if tg_op = 'UPDATE' and new.meal_id is distinct from old.meal_id then
      perform shopping_private.refresh_meal(old.meal_id);
    end if;
  elsif tg_table_name = 'variation_lines' then
    perform shopping_private.refresh_variation(coalesce(new.variation_id, old.variation_id));
  elsif tg_table_name = 'variation' then
    perform shopping_private.refresh_variation(new.item_id);
  end if;
  return null;
end
$$;

create trigger meal_shopping after update of servings, leftovers_of on food.meal
for each row execute function shopping_private.on_meal_change();
create trigger items_shopping after update of status, archived_at on core.items
for each row when (new.type in ('meal', 'shopping_list'))
execute function shopping_private.on_meal_change();
create trigger links_shopping_added after insert on core.links
for each row when (new.link_type = 'uses')
execute function shopping_private.on_meal_change();
create trigger links_shopping_removed after delete on core.links
for each row when (old.link_type = 'uses')
execute function shopping_private.on_meal_change();
create trigger meal_lines_shopping after insert or update or delete on food.meal_lines
for each row execute function shopping_private.on_meal_change();
create trigger list_meals_shopping after insert or delete on shopping.list_meals
for each row execute function shopping_private.on_meal_change();
create trigger variation_lines_shopping after insert or update or delete on food.variation_lines
for each row execute function shopping_private.on_meal_change();
create trigger variation_shopping after update of servings on food.variation
for each row execute function shopping_private.on_meal_change();

-- A Meal taken off a shop (SHP-002 4); its unticked lines go with it.
create function shopping.remove_meal(p_list uuid, p_meal uuid)
returns void
language sql set search_path = '' as $$
  delete from shopping.list_meals where list_id = p_list and meal_id = p_meal
$$;

-- A line added by hand, or a subheading, deleted; a Meal's line refuses.
create function shopping.delete_line(p_id uuid)
returns void
language sql set search_path = '' as $$
  delete from shopping.lines where id = p_id
$$;

-- Merging two Pantry entries (PAN-003) moves shopping lines too, and keeps
-- each Space's staple or Essential as it was.
create or replace function food.merge_pantry(p_keep uuid, p_merge uuid)
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
  update food.meal_lines set pantry_id = p_keep where pantry_id = p_merge;
  perform set_config('shopping.refreshing', 'on', true);
  update shopping.lines set pantry_id = p_keep where pantry_id = p_merge;
  perform set_config('shopping.refreshing', 'off', true);
  insert into food.staples (space_id, pantry_id, kind, out_of_stock)
  select space_id, p_keep, kind, out_of_stock from food.staples where pantry_id = p_merge
  on conflict (space_id, pantry_id) do update
    set out_of_stock = food.staples.out_of_stock or excluded.out_of_stock;
  delete from food.pantry where id = p_merge;
  select * into r from food.pantry where id = p_keep;
  return r;
end
$$;

grant execute on function shopping.remove_meal(uuid, uuid) to authenticated;
grant execute on function shopping.delete_line(uuid) to authenticated;
