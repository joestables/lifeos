-- Stage 4 (plan step 4): food's write functions for the Pantry, staples
-- and lists (ADR-0042; after stage4_food_meals). PAN-001–003; RCP-018.

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
