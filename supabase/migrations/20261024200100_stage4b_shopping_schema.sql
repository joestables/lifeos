-- Stage 4b (plan step 4): the shopping Module. A Shopping list is an Item
-- (core.items) with a detail row here: a food shop or a list (ADR-0050). A
-- food shop is linked to Meals; their lines are written into it by the
-- database (stage4b_shopping_refresh), and its other lines are added by
-- hand. Staples and Essentials are each Space's, in food.staples. A list is
-- read through its own Space. ADR-0057; SHP-001–005.
--
-- shopping          the API: tables read under RLS, and the write functions.
-- shopping_private  helpers and triggers the API can't reach.

create schema shopping;
create schema shopping_private;

grant usage on schema shopping to authenticated, service_role;
grant usage on schema shopping_private to authenticated, service_role;

alter default privileges in schema shopping revoke execute on functions from public;
alter default privileges in schema shopping_private revoke execute on functions from public;

-- ---------------------------------------------------------------------------
-- A Shopping list's detail: a food shop (Food, by aisle, linked to Meals) or
-- a list (Lists, by my subheadings). Its date is the Item's do_on; it has no
-- time or place (ADR-0050, 24 October).

create table shopping.shopping_list (
  item_id uuid primary key references core.items (id) on delete cascade,
  kind text not null default 'food' check (kind in ('food', 'list')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A food shop's Meals (SHP-002). Its own table, not core.links: whoever can
-- read the shop needn't be able to read the Meal (ADR-0057).
create table shopping.list_meals (
  list_id uuid not null references core.items (id) on delete cascade,
  meal_id uuid not null references core.items (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (list_id, meal_id)
);
create index list_meals_meal on shopping.list_meals (meal_id);

-- A list's lines. A Meal's line has meal_id and source_id (the Variation's
-- or Meal's own line it came from) and is written only by the database; a
-- line added by hand has neither. needed_space_id: the Space whose out of
-- stock or Required it was added from (SHP-003 4). A row with a heading is
-- a list's subheading and nothing else.
create table shopping.lines (
  id uuid primary key default core_private.uuidv7(),
  list_id uuid not null references core.items (id) on delete cascade,
  position text collate "C" not null default '',
  heading text check (length(heading) <= 200),
  pantry_id uuid references food.pantry (id) on delete restrict,
  text text check (length(text) <= 500),
  qty numeric check (qty >= 0),
  qty_max numeric,
  approx boolean not null default false,
  unit food.unit,
  checked boolean not null default false,
  meal_id uuid references core.items (id) on delete set null,
  source_id uuid,
  needed_space_id uuid references core.spaces (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (qty_max is null or (qty is not null and qty_max > qty)),
  check (
    (heading is not null and pantry_id is null and text is null and meal_id is null)
    or (heading is null and (pantry_id is not null or nullif(btrim(text), '') is not null))
  )
);
create index lines_list on shopping.lines (list_id, position);
create index lines_meal on shopping.lines (meal_id);
create index lines_pantry on shopping.lines (pantry_id);
create index lines_needed_space on shopping.lines (needed_space_id);

create trigger shopping_list_updated_at before update on shopping.shopping_list
for each row execute function core_private.touch_updated_at();
create trigger lines_updated_at before update on shopping.lines
for each row execute function core_private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Staples and Essentials (SHP-005): each Space's, in food.staples, which
-- gains its kind. out_of_stock is "needed": out of stock for a staple,
-- Required for an Essential. An entry is one or the other in a Space. The
-- table keeps its name so the Pantry built in Stage 4 works until step 5
-- (expand, then contract; ADR-0057 as built).

alter table food.staples add column kind text not null default 'staple'
  check (kind in ('staple', 'essential'));

-- ---------------------------------------------------------------------------
-- Rules.

-- The detail row is made when a Shopping list is made, or something is
-- converted into one (a Thought, ITM-006 5).
create function shopping_private.make_detail() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into shopping.shopping_list (item_id) values (new.id) on conflict do nothing;
  return null;
end
$$;
create trigger items_shopping_detail after insert or update of type on core.items
for each row when (new.type = 'shopping_list')
execute function shopping_private.make_detail();

-- A food shop's Meals are Meals I can see, on a food shop, and on no other
-- open food shop (SHP-002 4).
create function shopping_private.check_list_meal() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (select i.type from core.items i where i.id = new.list_id) is distinct from 'shopping_list'
    or (select l.kind from shopping.shopping_list l where l.item_id = new.list_id) is distinct from 'food'
  then
    raise exception 'Meals go on a food shop' using errcode = '23514';
  end if;
  if (select i.type from core.items i where i.id = new.meal_id) is distinct from 'meal'
    or not core_private.can_read(new.meal_id)
  then
    raise exception 'A shop''s Meals are Meals you can see' using errcode = '23514';
  end if;
  if exists (
    select 1 from shopping.list_meals lm
    join core.items l on l.id = lm.list_id
    where lm.meal_id = new.meal_id and lm.list_id <> new.list_id
      and l.status = 'active' and l.archived_at is null
  ) then
    raise exception 'That Meal is on another shop' using errcode = '23505';
  end if;
  return new;
end
$$;
create trigger list_meals_check before insert on shopping.list_meals
for each row execute function shopping_private.check_list_meal();

-- Lines belong to a Shopping list; a Meal's line is written only by the
-- database, and changed by people only to tick it (SHP-003 2).
create function shopping_private.check_line() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (select i.type from core.items i where i.id = new.list_id) is distinct from 'shopping_list' then
    raise exception 'Lines belong to a Shopping list' using errcode = '23514';
  end if;
  if current_setting('shopping.refreshing', true) is distinct from 'on' then
    if tg_op = 'INSERT' and (new.meal_id is not null or new.source_id is not null) then
      raise exception 'A Meal''s lines come from the Meal' using errcode = '42501';
    end if;
    -- Its Meal deleted for good, its meal_id goes (the foreign key's set null).
    if tg_op = 'UPDATE' and old.meal_id is not null and (
      (to_jsonb(new) - array['checked', 'updated_at', 'meal_id'])
        is distinct from (to_jsonb(old) - array['checked', 'updated_at', 'meal_id'])
      or (new.meal_id is distinct from old.meal_id
          and (new.meal_id is not null or exists (select 1 from core.items i where i.id = old.meal_id)))
    ) then
      raise exception 'A Meal''s line changes with its Meal; only its tick changes here'
        using errcode = '42501';
    end if;
    if tg_op = 'UPDATE' and old.meal_id is null and new.meal_id is not null then
      raise exception 'A Meal''s lines come from the Meal' using errcode = '42501';
    end if;
  end if;
  return new;
end
$$;
create trigger lines_check before insert or update on shopping.lines
for each row execute function shopping_private.check_line();

-- A Meal's unticked line goes only with its Meal (SHP-003 2), or with its
-- list deleted for good.
create function shopping_private.keep_meal_line() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.meal_id is not null and current_setting('shopping.refreshing', true) is distinct from 'on'
    and exists (select 1 from core.items i where i.id = old.list_id)
    and exists (select 1 from core.items i where i.id = old.meal_id)
  then
    raise exception 'A Meal''s line goes with its Meal' using errcode = '42501';
  end if;
  return old;
end
$$;
create trigger lines_keep_meal_line before delete on shopping.lines
for each row execute function shopping_private.keep_meal_line();

-- A Pantry entry deleted leaves its shopping lines as typed, with its name,
-- as a past Meal's lines are (PAN-001 4).
create function shopping_private.untie_lines() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform set_config('shopping.refreshing', 'on', true);
  update shopping.lines set pantry_id = null, text = old.name where pantry_id = old.id;
  perform set_config('shopping.refreshing', 'off', true);
  return old;
end
$$;
create trigger pantry_untie_shopping_lines before delete on food.pantry
for each row execute function shopping_private.untie_lines();

-- ---------------------------------------------------------------------------
-- Row-level security: a list is read and written through its own Space, as
-- every Item is (ADR-0057).

alter table shopping.shopping_list enable row level security;
alter table shopping.list_meals enable row level security;
alter table shopping.lines enable row level security;

grant select, update on shopping.shopping_list to authenticated;
create policy "I read the lists I can see" on shopping.shopping_list
  for select to authenticated using (item_id in (select core_private.readable_item_ids()));
create policy "I change the lists I can edit" on shopping.shopping_list
  for update to authenticated
  using (core_private.can_write(item_id)) with check (core_private.can_write(item_id));

grant select, insert, delete on shopping.list_meals to authenticated;
create policy "I read the Meals of the shops I can see" on shopping.list_meals
  for select to authenticated using (list_id in (select core_private.readable_item_ids()));
create policy "I add Meals to the shops I can edit" on shopping.list_meals
  for insert to authenticated with check (core_private.can_write(list_id));
create policy "I take Meals off the shops I can edit" on shopping.list_meals
  for delete to authenticated using (core_private.can_write(list_id));

grant select, insert, update, delete on shopping.lines to authenticated;
create policy "I read the lines of the lists I can see" on shopping.lines
  for select to authenticated using (list_id in (select core_private.readable_item_ids()));
create policy "I add lines to the lists I can edit" on shopping.lines
  for insert to authenticated with check (core_private.can_write(list_id));
create policy "I change lines of the lists I can edit" on shopping.lines
  for update to authenticated
  using (core_private.can_write(list_id)) with check (core_private.can_write(list_id));
create policy "I remove lines of the lists I can edit" on shopping.lines
  for delete to authenticated using (core_private.can_write(list_id));

grant all on all tables in schema shopping to service_role;

-- ---------------------------------------------------------------------------
-- Writes (ADR-0042), each safe to send twice.

create function shopping_private.check_keys(p_fields jsonb, p_allowed text[]) returns void
language plpgsql immutable set search_path = '' as $$
declare
  unknown text;
begin
  select k into unknown from jsonb_object_keys(p_fields) k where k <> all (p_allowed) limit 1;
  if unknown is not null then
    raise exception 'Unknown field %', unknown using errcode = '22023';
  end if;
end
$$;

-- A new Shopping list (SHP-001 2): its name, date and Space as an Item's,
-- and its kind. A food shop may come with its Meals (SHP-002 1).
create function shopping.create_list(p_id uuid, p_fields jsonb)
returns core.items
language plpgsql set search_path = '' as $$
declare
  r core.items;
  item_fields jsonb := p_fields - array['kind', 'meals'];
begin
  perform shopping_private.check_keys(p_fields, array['title', 'do_on', 'space_id', 'status', 'kind', 'meals']);
  if exists (select 1 from core.items where id = p_id) then
    select * into r from core.items where id = p_id;
    return r;
  end if;
  perform core.create_item(p_id, 'shopping_list', item_fields);
  update shopping.shopping_list set kind = coalesce(p_fields ->> 'kind', 'food') where item_id = p_id;
  if jsonb_typeof(p_fields -> 'meals') = 'array' then
    perform shopping.add_meals(p_id, array(select jsonb_array_elements_text(p_fields -> 'meals')::uuid));
  end if;
  select * into r from core.items where id = p_id;
  return r;
end
$$;

-- A list's kind (a Thought sorted into a Shopping list, SHP-003 5).
create function shopping.update_list(p_id uuid, p_patch jsonb)
returns shopping.shopping_list
language plpgsql set search_path = '' as $$
declare
  r shopping.shopping_list;
begin
  perform shopping_private.check_keys(p_patch, array['kind']);
  update shopping.shopping_list l set
    kind = case when p_patch ? 'kind' then p_patch ->> 'kind' else l.kind end
  where l.item_id = p_id
  returning * into r;
  if r.item_id is null then
    raise exception 'No Shopping list % to update', p_id using errcode = 'P0002';
  end if;
  return r;
end
$$;

-- Meals onto a food shop (SHP-002 1, 4); their lines follow.
create function shopping.add_meals(p_list uuid, p_meals uuid[])
returns void
language sql set search_path = '' as $$
  insert into shopping.list_meals (list_id, meal_id)
  select p_list, m from unnest(p_meals) m
  on conflict do nothing
$$;

-- A line added by hand (SHP-003 1), or a list's subheading (SHP-001 3).
-- Fields: position, heading, pantry_id, text, qty, qty_max, approx, unit,
-- needed_space_id.
create function shopping.add_line(p_id uuid, p_list uuid, p_fields jsonb)
returns shopping.lines
language plpgsql set search_path = '' as $$
declare
  r shopping.lines;
begin
  perform shopping_private.check_keys(p_fields,
    array['position', 'heading', 'pantry_id', 'text', 'qty', 'qty_max', 'approx', 'unit', 'needed_space_id']);
  insert into shopping.lines (id, list_id, position, heading, pantry_id, text, qty, qty_max, approx, unit, needed_space_id)
  values (
    p_id, p_list, coalesce(p_fields ->> 'position', ''),
    nullif(btrim(p_fields ->> 'heading'), ''),
    (p_fields ->> 'pantry_id')::uuid,
    nullif(btrim(p_fields ->> 'text'), ''),
    (p_fields ->> 'qty')::numeric,
    (p_fields ->> 'qty_max')::numeric,
    coalesce((p_fields ->> 'approx')::boolean, false),
    p_fields ->> 'unit',
    (p_fields ->> 'needed_space_id')::uuid
  )
  on conflict (id) do nothing;
  select * into r from shopping.lines where id = p_id;
  return r;
end
$$;

-- A hand-added line or subheading changed; a Meal's line refuses all but its
-- tick (the trigger above).
create function shopping.update_line(p_id uuid, p_patch jsonb)
returns shopping.lines
language plpgsql set search_path = '' as $$
declare
  r shopping.lines;
begin
  perform shopping_private.check_keys(p_patch,
    array['position', 'heading', 'pantry_id', 'text', 'qty', 'qty_max', 'approx', 'unit']);
  update shopping.lines l set
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

-- Ticking (SHP-001 4): every line under a row of All in one call. Ticked, a
-- line clears its out of stock or Required: in the Space it was added from,
-- else in the shop's own Space (SHP-003 4). Unticking changes nothing else.
create function shopping.tick(p_ids uuid[], p_checked boolean)
returns void
language plpgsql set search_path = '' as $$
begin
  update shopping.lines set checked = p_checked
  where id = any (p_ids) and heading is null and checked is distinct from p_checked;
  if p_checked then
    update food.staples st set out_of_stock = false
    from shopping.lines l join core.items i on i.id = l.list_id
    where l.id = any (p_ids) and l.pantry_id is not null
      and st.pantry_id = l.pantry_id and st.out_of_stock
      and st.space_id = coalesce(l.needed_space_id, i.space_id);
  end if;
end
$$;

-- A food shop's Meals as its readers may see them: name, day, slot,
-- servings and whether Personal (the Meals tab, "Katsu Thu"). Its members
-- see even a Meal they can't read on its own (ADR-0057).
create function shopping.meals_of(p_list uuid)
returns table (meal_id uuid, title text, do_on date, slot text, servings integer, personal boolean, live boolean)
language sql stable security definer set search_path = '' as $$
  select m.id, m.title, m.do_on, m.slot,
    coalesce(fm.servings, (
      select v.servings from core.links lk join food.variation v on v.item_id = lk.to_item
      where lk.from_item = m.id and lk.link_type = 'uses' limit 1)),
    s.kind = 'personal',
    m.archived_at is null and m.status <> 'cancelled'
  from shopping.list_meals lm
  join core.items m on m.id = lm.meal_id
  join core.spaces s on s.id = m.space_id
  left join food.meal fm on fm.item_id = m.id
  where lm.list_id = p_list and core_private.can_read(p_list)
  order by m.do_on, array_position(array['breakfast', 'lunch', 'dinner'], m.slot)
$$;

-- One of a Space's Staples or Essentials (SHP-005 1, 2): kept, made the
-- other kind, or marked needed. Taking one off is food.set_staple(…, false).
create function food.keep_entry(p_space uuid, p_pantry uuid, p_kind text, p_needed boolean default false)
returns food.staples
language plpgsql set search_path = '' as $$
declare
  r food.staples;
begin
  insert into food.staples (space_id, pantry_id, kind, out_of_stock)
  values (p_space, p_pantry, p_kind, coalesce(p_needed, false))
  on conflict (space_id, pantry_id) do update
    set kind = excluded.kind, out_of_stock = excluded.out_of_stock;
  select * into r from food.staples where space_id = p_space and pantry_id = p_pantry;
  return r;
end
$$;

-- My first Household starts with a copy of my staples and Essentials
-- (SHP-005 4).
create or replace function core.create_household(p_id uuid, p_name text)
returns core.spaces
language plpgsql security definer set search_path = '' as $$
declare
  r core.spaces;
  me uuid := (select auth.uid());
  first boolean;
begin
  if me is null then
    raise exception 'Sign in first' using errcode = '42501';
  end if;
  if exists (select 1 from core.spaces where id = p_id) then
    select * into r from core.spaces where id = p_id and id in (select core_private.my_space_ids());
    return r;
  end if;
  if btrim(coalesce(p_name, '')) = '' then
    raise exception 'A Household needs a name' using errcode = '23514';
  end if;
  first := not exists (
    select 1 from core.space_members m join core.spaces s on s.id = m.space_id
    where m.person_id = me and s.kind = 'household'
  );
  insert into core.spaces (id, kind, name, created_by) values (p_id, 'household', btrim(p_name), me)
  returning * into r;
  insert into core.space_members (space_id, person_id, role) values (p_id, me, 'owner');
  if first then
    insert into food.staples (space_id, pantry_id, kind, out_of_stock)
    select p_id, st.pantry_id, st.kind, st.out_of_stock
    from food.staples st join core.spaces s on s.id = st.space_id
    where s.kind = 'personal' and s.created_by = me;
  end if;
  return r;
end
$$;

grant execute on function shopping.create_list(uuid, jsonb) to authenticated;
grant execute on function shopping.update_list(uuid, jsonb) to authenticated;
grant execute on function shopping.add_meals(uuid, uuid[]) to authenticated;
grant execute on function shopping.add_line(uuid, uuid, jsonb) to authenticated;
grant execute on function shopping.update_line(uuid, jsonb) to authenticated;
grant execute on function shopping.tick(uuid[], boolean) to authenticated;
grant execute on function shopping.meals_of(uuid) to authenticated;
grant execute on function food.keep_entry(uuid, uuid, text, boolean) to authenticated;
grant execute on function shopping_private.check_keys(jsonb, text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Live updates (SHP-004 2; ADR-0057): Realtime's Postgres Changes, checked
-- against RLS for each subscriber.

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table shopping.lines, shopping.list_meals, shopping.shopping_list;
  end if;
end
$$;
