-- Stage 6 (plan step 4): the Wardrobe's write functions (ADR-0042: every
-- write is a database function, replayed by the write queue, so each is
-- idempotent on its id). Removals, which need a delete, are in
-- stage6_wardrobe_removing (migrations.md). wardrobe.md WRD-001–WRD-028;
-- ADR-0066, ADR-0068.
--
-- Security invoker throughout: row-level security decides, and each
-- function checks what it must say plainly.

create function wardrobe_private.check_keys(p_patch jsonb, p_allowed text[]) returns void
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

create function wardrobe_private.personal_space() returns uuid
language sql stable security definer set search_path = '' as $$
  select s.id from core.spaces s where s.kind = 'personal' and s.created_by = (select auth.uid())
$$;

-- A list's table, and whether it is in my order. Anything else is refused.
create function wardrobe_private.list_table(p_list text) returns text
language plpgsql immutable set search_path = '' as $$
begin
  return case p_list
    when 'category' then 'categories'
    when 'size' then 'sizes'
    when 'brand' then 'brands'
    when 'fit' then 'fits'
    when 'tag' then 'tags'
    when 'colour' then 'colours'
    when 'collection' then 'collections'
    else null end;
end
$$;

create function wardrobe_private.list_ordered(p_list text) returns boolean
language sql immutable set search_path = '' as $$
  select p_list in ('category', 'size', 'collection')
$$;

-- What a list entry is called, for messages.
create function wardrobe_private.list_word(p_list text) returns text
language sql immutable set search_path = '' as $$
  select case p_list when 'category' then 'category' when 'size' then 'size'
    when 'brand' then 'brand' when 'fit' then 'fit' when 'tag' then 'tag'
    when 'colour' then 'colour' else 'collection' end
$$;

-- An outfit's garments, in id order: those still there (not deleted).
create function wardrobe_private.outfit_garments(p_outfit uuid) returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(l.to_item order by l.to_item), '{}')
  from core.links l
  join core.items g on g.id = l.to_item and g.archived_at is null
  where l.from_item = p_outfit and l.link_type = 'includes'
$$;

-- Another of my outfits that is exactly these garments (WRD-014 5), if any.
create function wardrobe_private.same_outfit(p_owner uuid, p_garments uuid[], p_except uuid)
returns uuid
language sql stable security definer set search_path = '' as $$
  select o.id from core.items o
  where o.type = 'outfit' and o.owner_id = p_owner and o.archived_at is null and o.id <> p_except
    and wardrobe_private.outfit_garments(o.id) =
      (select coalesce(array_agg(distinct g order by g), '{}') from unnest(p_garments) g)
  limit 1
$$;

create function wardrobe_private.refuse_same_outfit(p_owner uuid, p_garments uuid[], p_except uuid)
returns void
language plpgsql stable set search_path = '' as $$
declare
  existing uuid := wardrobe_private.same_outfit(p_owner, p_garments, p_except);
begin
  if existing is not null then
    raise exception 'Those garments are already an outfit'
      using errcode = '23505', detail = existing::text;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Lists (WRD-008, WRD-028). A new entry in an ordered list goes last unless
-- a place is given; renaming keeps its place.

create function wardrobe.save_entry(p_list text, p_id uuid, p_name text,
  p_hex text default null, p_position text default null)
returns jsonb
language plpgsql set search_path = '' as $$
declare
  tbl text := wardrobe_private.list_table(p_list);
  pos text := p_position;
  taken boolean;
  r jsonb;
begin
  if tbl is null then
    raise exception 'No list called %', p_list using errcode = '22023';
  end if;
  if p_list = 'colour' and p_hex is null
     and not exists (select 1 from wardrobe.colours where id = p_id) then
    raise exception 'A colour needs its swatch' using errcode = '23502';
  end if;
  execute format(
    'select exists (select 1 from wardrobe.%I where person_id = (select auth.uid()) and id <> $1
       and wardrobe_private.name_key(name) = wardrobe_private.name_key($2))', tbl)
  using p_id, p_name into taken;
  if taken then
    raise exception 'There''s already a % called "%"', wardrobe_private.list_word(p_list), btrim(p_name)
      using errcode = '23505';
  end if;
  if wardrobe_private.list_ordered(p_list) then
    if pos is null then
      execute format('select coalesce(max(position) || ''V'', ''V'') from wardrobe.%I
        where person_id = (select auth.uid())', tbl) into pos;
    end if;
    execute format(
      'insert into wardrobe.%I (id, name, position) values ($1, btrim($2), $3)
       on conflict (id) do update set name = excluded.name,
         position = case when $4 then excluded.position else wardrobe.%I.position end
       returning to_jsonb(wardrobe.%I.*)', tbl, tbl, tbl)
    using p_id, p_name, pos, p_position is not null into r;
  elsif p_list = 'colour' and exists (select 1 from wardrobe.colours where id = p_id) then
    update wardrobe.colours set name = btrim(p_name), hex = coalesce(lower(p_hex), hex)
    where id = p_id
    returning to_jsonb(wardrobe.colours.*) into r;
  elsif p_list = 'colour' then
    insert into wardrobe.colours (id, name, hex) values (p_id, btrim(p_name), lower(p_hex))
    returning to_jsonb(wardrobe.colours.*) into r;
  else
    execute format(
      'insert into wardrobe.%I (id, name) values ($1, btrim($2))
       on conflict (id) do update set name = excluded.name
       returning to_jsonb(wardrobe.%I.*)', tbl, tbl)
    using p_id, p_name into r;
  end if;
  return r;
end
$$;

-- Its place, dragged (WRD-028 2): categories, sizes and collections.
create function wardrobe.set_entry_position(p_list text, p_id uuid, p_position text)
returns void
language plpgsql set search_path = '' as $$
begin
  if not wardrobe_private.list_ordered(p_list) then
    raise exception 'The % list is A–Z', wardrobe_private.list_word(p_list) using errcode = '22023';
  end if;
  execute format('update wardrobe.%I set position = $2 where id = $1', wardrobe_private.list_table(p_list))
  using p_id, p_position;
end
$$;

-- The weather's place (ADR-0068 4), or none.
create function wardrobe.set_weather_place(p_name text, p_latitude numeric, p_longitude numeric)
returns wardrobe.settings
language plpgsql set search_path = '' as $$
declare
  r wardrobe.settings;
begin
  insert into wardrobe.settings (place_name, latitude, longitude)
  values (nullif(btrim(p_name), ''), p_latitude, p_longitude)
  on conflict (person_id) do update set place_name = excluded.place_name,
    latitude = excluded.latitude, longitude = excluded.longitude
  returning * into r;
  return r;
end
$$;

-- ---------------------------------------------------------------------------
-- Garments (WRD-005–WRD-013).

-- A new garment: its four required fields, an optional fit, tags and name.
create function wardrobe.create_garment(p_id uuid, p_category uuid, p_size uuid, p_brand uuid,
  p_colour uuid, p_fit uuid default null, p_tags uuid[] default '{}', p_own_name text default null)
returns core.items
language plpgsql set search_path = '' as $$
declare
  r core.items;
begin
  if not exists (select 1 from core.items where id = p_id) then
    if p_category is null or p_size is null or p_brand is null or p_colour is null then
      raise exception 'A garment needs a category, size, brand and colour' using errcode = '23502';
    end if;
    insert into core.items (id, type, title, space_id, status)
    values (p_id, 'garment', '', wardrobe_private.personal_space(), 'active');
    insert into wardrobe.garment (item_id, category_id, size_id, brand_id, colour_id, fit_id, own_name)
    values (p_id, p_category, p_size, p_brand, p_colour, p_fit, nullif(btrim(p_own_name), ''));
    insert into wardrobe.garment_tags (garment_id, tag_id)
    select p_id, t from unnest(coalesce(p_tags, '{}')) t
    on conflict do nothing;
  end if;
  select * into r from core.items where id = p_id;
  return r;
end
$$;

-- Its fields (WRD-010 2): the four required ones can't be cleared; a fit
-- and its own name can.
create function wardrobe.update_garment(p_id uuid, p_patch jsonb)
returns wardrobe.garment
language plpgsql set search_path = '' as $$
declare
  r wardrobe.garment;
begin
  perform wardrobe_private.check_keys(p_patch,
    array['category_id', 'size_id', 'brand_id', 'colour_id', 'fit_id', 'own_name']);
  if (p_patch ? 'category_id' and p_patch ->> 'category_id' is null)
     or (p_patch ? 'size_id' and p_patch ->> 'size_id' is null)
     or (p_patch ? 'brand_id' and p_patch ->> 'brand_id' is null)
     or (p_patch ? 'colour_id' and p_patch ->> 'colour_id' is null) then
    raise exception 'A garment needs a category, size, brand and colour' using errcode = '23502';
  end if;
  update wardrobe.garment g set
    category_id = coalesce((p_patch ->> 'category_id')::uuid, g.category_id),
    size_id = coalesce((p_patch ->> 'size_id')::uuid, g.size_id),
    brand_id = coalesce((p_patch ->> 'brand_id')::uuid, g.brand_id),
    colour_id = coalesce((p_patch ->> 'colour_id')::uuid, g.colour_id),
    fit_id = case when p_patch ? 'fit_id' then (p_patch ->> 'fit_id')::uuid else g.fit_id end,
    own_name = case when p_patch ? 'own_name' then nullif(btrim(p_patch ->> 'own_name'), '') else g.own_name end
  where g.item_id = p_id
  returning * into r;
  if r.item_id is null then
    raise exception 'No garment % to update', p_id using errcode = 'P0002';
  end if;
  return r;
end
$$;

-- Tags added to several garments at once (WRD-012 2).
create function wardrobe.add_garment_tags(p_garments uuid[], p_tags uuid[])
returns void
language sql set search_path = '' as $$
  insert into wardrobe.garment_tags (garment_id, tag_id)
  select g, t from unnest(p_garments) g cross join unnest(p_tags) t
  on conflict do nothing
$$;

-- Retired, or brought back (WRD-013).
create function wardrobe.retire_garment(p_id uuid, p_retired boolean default true)
returns core.items
language plpgsql set search_path = '' as $$
declare
  r core.items;
begin
  update core.items set status = case when p_retired then 'cancelled' else 'active' end
  where id = p_id and type = 'garment'
  returning * into r;
  if r.id is null then
    raise exception 'No garment % to retire', p_id using errcode = 'P0002';
  end if;
  return r;
end
$$;

-- ---------------------------------------------------------------------------
-- Outfits (WRD-014–WRD-019).

-- A new outfit: its garments (one at least), an optional name, and my
-- collections. The same garments as another outfit of mine are refused,
-- saying which (its id in the error's detail; WRD-014 5).
create function wardrobe.create_outfit(p_id uuid, p_garments uuid[], p_name text default null,
  p_collections uuid[] default '{}')
returns core.items
language plpgsql set search_path = '' as $$
declare
  r core.items;
begin
  if not exists (select 1 from core.items where id = p_id) then
    if coalesce(cardinality(p_garments), 0) = 0 then
      raise exception 'An outfit needs a garment' using errcode = '23502';
    end if;
    perform wardrobe_private.refuse_same_outfit((select auth.uid()), p_garments, p_id);
    insert into core.items (id, type, title, space_id, status)
    values (p_id, 'outfit', coalesce(btrim(p_name), ''), wardrobe_private.personal_space(), 'active');
    insert into core.links (from_item, to_item, link_type, origin)
    select distinct p_id, g, 'includes', 'action' from unnest(p_garments) g;
    insert into wardrobe.outfit_collections (outfit_id, collection_id)
    select p_id, c from unnest(coalesce(p_collections, '{}')) c
    on conflict do nothing;
  end if;
  select * into r from core.items where id = p_id;
  return r;
end
$$;

create function wardrobe.rename_outfit(p_id uuid, p_name text)
returns core.items
language plpgsql set search_path = '' as $$
declare
  r core.items;
begin
  update core.items set title = coalesce(btrim(p_name), '')
  where id = p_id and type = 'outfit'
  returning * into r;
  if r.id is null then
    raise exception 'No outfit % to rename', p_id using errcode = 'P0002';
  end if;
  return r;
end
$$;

-- A garment added to an outfit (WRD-017 2); it joins the days to come that
-- wear it (stage6_wardrobe_rules).
create function wardrobe.add_outfit_garment(p_outfit uuid, p_garment uuid)
returns void
language plpgsql set search_path = '' as $$
begin
  if p_garment = any (wardrobe_private.outfit_garments(p_outfit)) then
    return;
  end if;
  perform wardrobe_private.refuse_same_outfit(wardrobe_private.owner_of(p_outfit),
    wardrobe_private.outfit_garments(p_outfit) || p_garment, p_outfit);
  insert into core.links (from_item, to_item, link_type, origin)
  values (p_outfit, p_garment, 'includes', 'action')
  on conflict do nothing;
end
$$;

-- Outfits added to collections, several at once (WRD-018, WRD-019 2).
create function wardrobe.add_to_collections(p_outfits uuid[], p_collections uuid[])
returns void
language sql set search_path = '' as $$
  insert into wardrobe.outfit_collections (outfit_id, collection_id)
  select o, c from unnest(p_outfits) o cross join unnest(p_collections) c
  on conflict do nothing
$$;

-- ---------------------------------------------------------------------------
-- Planned outfits (WRD-019 4, WRD-021): added to the pane, newest last;
-- taken out by being marked, so adding one again brings it back.

create function wardrobe.add_planned(p_outfits uuid[])
returns void
language sql set search_path = '' as $$
  insert into wardrobe.planned_outfits (outfit_id, position)
  select o, to_char(clock_timestamp(), 'YYYYMMDDHH24MISSUS') || lpad(n::text, 4, '0')
  from unnest(p_outfits) with ordinality as x(o, n)
  on conflict (person_id, outfit_id) do update set removed_at = null, position = excluded.position
$$;

create function wardrobe.remove_planned(p_outfits uuid[])
returns void
language sql set search_path = '' as $$
  update wardrobe.planned_outfits set removed_at = now()
  where person_id = (select auth.uid()) and outfit_id = any (p_outfits) and removed_at is null
$$;

create function wardrobe.clear_planned()
returns void
language sql set search_path = '' as $$
  update wardrobe.planned_outfits set removed_at = now()
  where person_id = (select auth.uid()) and removed_at is null
$$;

-- ---------------------------------------------------------------------------
-- Days (WRD-020–WRD-024). An Outfit worn is a day's outfit, wearing it,
-- or a single garment, wearing nothing; its garments are its own.

-- An outfit planned for a day, out of the Planned Outfits pane (ADR-0066 11).
create function wardrobe.plan_outfit(p_id uuid, p_outfit uuid, p_day date)
returns core.items
language plpgsql set search_path = '' as $$
declare
  r core.items;
begin
  if not exists (select 1 from core.items where id = p_id) then
    insert into core.items (id, type, title, space_id, status, do_on)
    values (p_id, 'outfit_worn',
            coalesce((select nullif(btrim(title), '') from core.items where id = p_outfit and type = 'outfit'), 'Outfit'),
            wardrobe_private.personal_space(), 'active', p_day);
    insert into core.links (from_item, to_item, link_type, origin)
    values (p_id, p_outfit, 'wears', 'action');
    insert into wardrobe.worn_garments (worn_id, garment_id)
    select p_id, g from unnest(wardrobe_private.outfit_garments(p_outfit)) g;
    update wardrobe.planned_outfits set removed_at = now()
    where person_id = (select auth.uid()) and outfit_id = p_outfit and removed_at is null;
  end if;
  select * into r from core.items where id = p_id;
  return r;
end
$$;

-- A single garment on a day (WRD-021 3, WRD-022 1).
create function wardrobe.plan_garment(p_id uuid, p_garment uuid, p_day date)
returns core.items
language plpgsql set search_path = '' as $$
declare
  r core.items;
begin
  if not exists (select 1 from core.items where id = p_id) then
    insert into core.items (id, type, title, space_id, status, do_on)
    values (p_id, 'outfit_worn',
            coalesce((select title from core.items where id = p_garment and type = 'garment'), ''),
            wardrobe_private.personal_space(), 'active', p_day);
    insert into wardrobe.worn_garments (worn_id, garment_id) values (p_id, p_garment);
  end if;
  select * into r from core.items where id = p_id;
  return r;
end
$$;

-- Moved to another day (WRD-022 2). Taken off a day is core.archive_item.
create function wardrobe.move_worn(p_id uuid, p_day date)
returns core.items
language plpgsql set search_path = '' as $$
declare
  r core.items;
begin
  update core.items set do_on = p_day where id = p_id and type = 'outfit_worn'
  returning * into r;
  if r.id is null then
    raise exception 'Nothing planned % to move', p_id using errcode = 'P0002';
  end if;
  return r;
end
$$;

-- A day's single garments made an outfit (WRD-023; ADR-0066 10): the
-- outfit, in My Outfits, and one Outfit worn wearing it in their place.
create function wardrobe.create_outfit_from_day(p_outfit uuid, p_worn uuid, p_singles uuid[],
  p_name text default null)
returns core.items
language plpgsql set search_path = '' as $$
declare
  day date;
  garments uuid[];
  r core.items;
begin
  if not exists (select 1 from core.items where id = p_worn) then
    if (select count(distinct i.do_on) from core.items i
        where i.id = any (p_singles) and i.type = 'outfit_worn' and i.archived_at is null) <> 1
       or cardinality(p_singles) < 2
       or exists (select 1 from core.links l where l.from_item = any (p_singles) and l.link_type = 'wears') then
      raise exception 'An outfit is made of two or more single garments on one day' using errcode = '23514';
    end if;
    select min(do_on) into day from core.items where id = any (p_singles);
    select array_agg(distinct w.garment_id) into garments
    from wardrobe.worn_garments w where w.worn_id = any (p_singles);
    perform wardrobe.create_outfit(p_outfit, garments, p_name);
    insert into core.items (id, type, title, space_id, status, do_on)
    values (p_worn, 'outfit_worn', coalesce(nullif(btrim(p_name), ''), 'Outfit'),
            wardrobe_private.personal_space(), 'active', day);
    insert into core.links (from_item, to_item, link_type, origin)
    values (p_worn, p_outfit, 'wears', 'action');
    insert into wardrobe.worn_garments (worn_id, garment_id)
    select p_worn, g from unnest(garments) g;
    update core.items set archived_at = now() where id = any (p_singles) and archived_at is null;
  end if;
  select * into r from core.items where id = p_worn;
  return r;
end
$$;

-- ---------------------------------------------------------------------------
-- Who may call them.

grant execute on function
  wardrobe.save_entry(text, uuid, text, text, text),
  wardrobe.set_entry_position(text, uuid, text),
  wardrobe.set_weather_place(text, numeric, numeric),
  wardrobe.create_garment(uuid, uuid, uuid, uuid, uuid, uuid, uuid[], text),
  wardrobe.update_garment(uuid, jsonb),
  wardrobe.add_garment_tags(uuid[], uuid[]),
  wardrobe.retire_garment(uuid, boolean),
  wardrobe.create_outfit(uuid, uuid[], text, uuid[]),
  wardrobe.rename_outfit(uuid, text),
  wardrobe.add_outfit_garment(uuid, uuid),
  wardrobe.add_to_collections(uuid[], uuid[]),
  wardrobe.add_planned(uuid[]),
  wardrobe.remove_planned(uuid[]),
  wardrobe.clear_planned(),
  wardrobe.plan_outfit(uuid, uuid, date),
  wardrobe.plan_garment(uuid, uuid, date),
  wardrobe.move_worn(uuid, date),
  wardrobe.create_outfit_from_day(uuid, uuid, uuid[], text)
to authenticated;

grant execute on function
  wardrobe_private.check_keys(jsonb, text[]),
  wardrobe_private.personal_space(),
  wardrobe_private.list_table(text),
  wardrobe_private.list_ordered(text),
  wardrobe_private.list_word(text),
  wardrobe_private.outfit_garments(uuid),
  wardrobe_private.same_outfit(uuid, uuid[], uuid),
  wardrobe_private.refuse_same_outfit(uuid, uuid[], uuid)
to authenticated;
