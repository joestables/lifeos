-- Stage 4 (plan step 9d): a Meal's own ingredients and a typed Meal's link
-- (MPL-006; ADR-0052, ADR-0012, amended 23 October).

-- A typed Meal's recipe link, to open while cooking; its ingredients are
-- read from it by the AI (`meal.ingredients`).
alter table food.meal add column source text
  check (source is null or (source ~ '^https?://' and length(source) <= 2000));

-- A Meal's own lines, shaped as a Variation's but with no subheadings: an
-- amount, a unit and a Pantry entry or the ingredient as typed. Seen by
-- whoever sees the Meal, changed by whoever may edit it.
create table food.meal_lines (
  id uuid primary key default core_private.uuidv7(),
  meal_id uuid not null references core.items (id) on delete cascade,
  position text collate "C" not null,
  pantry_id uuid references food.pantry (id) on delete restrict,
  text text check (length(text) <= 500),
  qty numeric check (qty >= 0),
  qty_max numeric,
  approx boolean not null default false,
  unit food.unit,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (qty_max is null or (qty is not null and qty_max > qty)),
  check (pantry_id is not null or nullif(btrim(text), '') is not null)
);
create index meal_lines_meal on food.meal_lines (meal_id, position);
create index meal_lines_pantry on food.meal_lines (pantry_id);
create trigger meal_lines_updated_at before update on food.meal_lines
for each row execute function core_private.touch_updated_at();

-- A Meal's lines are a Meal's, and never leftovers' (they add nothing).
create function food_private.check_meal_line() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (select i.type from core.items i where i.id = new.meal_id) is distinct from 'meal'
    or (select m.leftovers_of from food.meal m where m.item_id = new.meal_id) is not null
  then
    raise exception 'Lines belong to a Meal that isn''t leftovers' using errcode = '23514';
  end if;
  return new;
end
$$;
create trigger meal_lines_check before insert or update of meal_id on food.meal_lines
for each row execute function food_private.check_meal_line();

alter table food.meal_lines enable row level security;
grant select, insert, update, delete on food.meal_lines to authenticated;
create policy "I read the lines of the Meals I can see" on food.meal_lines
  for select to authenticated using (meal_id in (select core_private.readable_item_ids()));
create policy "I add lines to the Meals I can edit" on food.meal_lines
  for insert to authenticated with check (core_private.can_write(meal_id));
create policy "I change lines of the Meals I can edit" on food.meal_lines
  for update to authenticated
  using (core_private.can_write(meal_id)) with check (core_private.can_write(meal_id));
create policy "I remove lines of the Meals I can edit" on food.meal_lines
  for delete to authenticated using (core_private.can_write(meal_id));

-- ---------------------------------------------------------------------------
-- Writes (ADR-0042), each safe to send twice. Fields: position, pantry_id,
-- text, qty, qty_max, approx, unit.

create function food.add_meal_line(p_id uuid, p_meal uuid, p_fields jsonb)
returns food.meal_lines
language plpgsql set search_path = '' as $$
declare
  r food.meal_lines;
begin
  perform food_private.check_keys(p_fields, array['position', 'pantry_id', 'text', 'qty', 'qty_max', 'approx', 'unit']);
  insert into food.meal_lines (id, meal_id, position, pantry_id, text, qty, qty_max, approx, unit)
  values (
    p_id, p_meal, p_fields ->> 'position',
    (p_fields ->> 'pantry_id')::uuid,
    nullif(btrim(p_fields ->> 'text'), ''),
    (p_fields ->> 'qty')::numeric,
    (p_fields ->> 'qty_max')::numeric,
    coalesce((p_fields ->> 'approx')::boolean, false),
    p_fields ->> 'unit'
  )
  on conflict (id) do nothing;
  select * into r from food.meal_lines where id = p_id;
  return r;
end
$$;

create function food.update_meal_line(p_id uuid, p_patch jsonb)
returns food.meal_lines
language plpgsql set search_path = '' as $$
declare
  r food.meal_lines;
begin
  perform food_private.check_keys(p_patch, array['position', 'pantry_id', 'text', 'qty', 'qty_max', 'approx', 'unit']);
  update food.meal_lines l set
    position = case when p_patch ? 'position' then p_patch ->> 'position' else l.position end,
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

create function food.remove_meal_line(p_id uuid)
returns void
language sql set search_path = '' as $$
  delete from food.meal_lines where id = p_id
$$;

-- A Meal's servings, leftovers and link.
create or replace function food.update_meal(p_id uuid, p_patch jsonb)
returns food.meal
language plpgsql set search_path = '' as $$
declare
  r food.meal;
begin
  perform food_private.check_keys(p_patch, array['servings', 'leftovers_of', 'source']);
  update food.meal m set
    servings = case when p_patch ? 'servings' then (p_patch ->> 'servings')::integer else m.servings end,
    leftovers_of = case when p_patch ? 'leftovers_of' then (p_patch ->> 'leftovers_of')::uuid else m.leftovers_of end,
    source = case when p_patch ? 'source' then nullif(btrim(p_patch ->> 'source'), '') else m.source end
  where m.item_id = p_id
  returning * into r;
  if r.item_id is null then
    raise exception 'No Meal % to update', p_id using errcode = 'P0002';
  end if;
  return r;
end
$$;

-- A new Meal may come with its link (Copy week, MPL-006 5).
create or replace function food.plan_meal(p_id uuid, p_fields jsonb)
returns core.items
language plpgsql set search_path = '' as $$
declare
  r core.items;
  item_fields jsonb := p_fields - array['servings', 'variation', 'leftovers_of', 'source'];
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
    leftovers_of = (p_fields ->> 'leftovers_of')::uuid,
    source = nullif(btrim(p_fields ->> 'source'), '')
  where item_id = p_id;
  if variation is not null then
    perform food.set_meal_variation(p_id, variation);
  end if;
  select * into r from core.items where id = p_id;
  return r;
end
$$;

-- Merging two Pantry entries (PAN-003) moves Meals' lines too.
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
  insert into food.staples (space_id, pantry_id, out_of_stock)
  select space_id, p_keep, out_of_stock from food.staples where pantry_id = p_merge
  on conflict (space_id, pantry_id) do update
    set out_of_stock = food.staples.out_of_stock or excluded.out_of_stock;
  delete from food.pantry where id = p_merge;
  select * into r from food.pantry where id = p_keep;
  return r;
end
$$;

revoke all on function food.add_meal_line(uuid, uuid, jsonb) from public;
revoke all on function food.update_meal_line(uuid, jsonb) from public;
revoke all on function food.remove_meal_line(uuid) from public;
grant execute on function food.add_meal_line(uuid, uuid, jsonb) to authenticated;
grant execute on function food.update_meal_line(uuid, jsonb) to authenticated;
grant execute on function food.remove_meal_line(uuid) to authenticated;
