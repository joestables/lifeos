-- Stage 4 (plan step 4): food's write functions for Meals (ADR-0042; after
-- stage4_food_writes). MPL-002, MPL-003.

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

grant execute on all functions in schema food to authenticated;
