-- Stage 4 (plan step 8a): leaving a Household, being removed, and deleting
-- it (HSH-004; ADR-0016, ADR-0051). The shared Items I created become
-- Personal, and a Variation whose author no longer shares a Household with
-- its Recipe's author moves to a copy of the Recipe's heading of their own.

-- A Recipe's name check stands aside while the database itself makes a
-- copy (`lifeos.food_deriving`), as the other food rules do.
create or replace function food_private.check_recipe_name() returns trigger
language plpgsql set search_path = '' as $$
begin
  if food_private.deriving() then
    return new;
  end if;
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

-- Each Variation whose author no longer shares a Household with its
-- Recipe's author goes, with the author's others of that Recipe, to a copy
-- of the Recipe's heading in the author's own Recipes; never merged back
-- (ADR-0051, HSH-004 1, 4). The copy has no photo.
create function food_private.split_variations() returns void
language plpgsql security definer set search_path = '' as $$
declare
  g record;
  copy_id uuid;
begin
  for g in
    select v.owner_id as author, r.id as recipe, r.title, r.status, array_agg(v.id order by v.created_at) as vs
    from core.items v
    join core.links l on l.from_item = v.id and l.link_type = 'variation_of'
    join core.items r on r.id = l.to_item
    where v.type = 'variation' and v.owner_id <> r.owner_id
      and not core_private.peers(v.owner_id, r.owner_id)
    group by v.owner_id, r.id, r.title, r.status
  loop
    copy_id := core_private.uuidv7();
    perform set_config('lifeos.food_deriving', 'on', true);
    insert into core.items (id, type, title, space_id, owner_id, status)
    values (
      copy_id, 'recipe', g.title,
      (select s.id from core.spaces s where s.created_by = g.author and s.kind = 'personal'),
      g.author, g.status
    );
    update food.recipe c set
      category = o.category, cuisine = o.cuisine, tags = o.tags, protein = o.protein,
      carbs = o.carbs, default_variation = g.vs[1]
    from food.recipe o where o.item_id = g.recipe and c.item_id = copy_id;
    -- Relinked, so each Recipe's state is worked out again and logged.
    delete from core.links where link_type = 'variation_of' and from_item = any (g.vs);
    insert into core.links (from_item, to_item, link_type, origin, created_by)
    select v, copy_id, 'variation_of', 'action', g.author from unnest(g.vs) v;
    -- The Recipe left behind opens on one of its own.
    update food.recipe set default_variation = (
      select l.from_item from core.links l join core.items v on v.id = l.from_item
      where l.to_item = g.recipe and l.link_type = 'variation_of'
      order by v.created_at limit 1
    ) where item_id = g.recipe and default_variation = any (g.vs);
  end loop;
  perform set_config('lifeos.food_deriving', '', true);
end
$$;

-- Someone parts from a Household: the shared Items they created become
-- Personal to them, they stop seeing the rest, and Variations split.
create function core_private.part(p_space uuid, p_person uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update core.items set space_id = (
    select s.id from core.spaces s where s.created_by = p_person and s.kind = 'personal'
  )
  where space_id = p_space and owner_id = p_person;
  delete from core.space_members where space_id = p_space and person_id = p_person;
  perform food_private.split_variations();
end
$$;

create function core.leave_household(p_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from core.space_members m join core.spaces s on s.id = m.space_id and s.kind = 'household'
    where m.space_id = p_id and m.person_id = (select auth.uid())
  ) then
    raise exception 'No Household % of yours', p_id using errcode = 'P0002';
  end if;
  if core_private.owns(p_id) then
    raise exception 'An owner can''t leave a Household, only delete it' using errcode = '23514';
  end if;
  perform core_private.part(p_id, (select auth.uid()));
end
$$;

create function core.remove_member(p_space uuid, p_person uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not core_private.owns(p_space) then
    raise exception 'Only a Household''s owner removes people' using errcode = '42501';
  end if;
  if p_person = (select auth.uid()) then
    raise exception 'An owner can''t leave a Household, only delete it' using errcode = '23514';
  end if;
  perform core_private.part(p_space, p_person);
end
$$;

-- Deleted for everyone, as if all had left; then it goes (HSH-004 3).
create function core.delete_household(p_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  who uuid;
begin
  if not core_private.owns(p_id) then
    raise exception 'Only a Household''s owner deletes it' using errcode = '42501';
  end if;
  for who in select person_id from core.space_members where space_id = p_id loop
    perform core_private.part(p_id, who);
  end loop;
  delete from core.spaces where id = p_id;
end
$$;

revoke execute on function core.leave_household(uuid), core.remove_member(uuid, uuid),
  core.delete_household(uuid) from public, anon;
grant execute on function core.leave_household(uuid), core.remove_member(uuid, uuid),
  core.delete_household(uuid) to authenticated;
