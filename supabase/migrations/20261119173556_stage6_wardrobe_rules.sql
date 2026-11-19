-- Stage 6 (plan step 4): the rules the database keeps for the Wardrobe (its
-- write functions follow in stage6_wardrobe_writes). wardrobe.md;
-- ADR-0013, ADR-0030, ADR-0066.

-- ---------------------------------------------------------------------------
-- The Wardrobe is always Personal (ADR-0066 1).

create function wardrobe_private.check_wardrobe_item() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (select s.kind from core.spaces s where s.id = new.space_id) = 'household' then
    raise exception 'A % stays Personal', replace(new.type, '_', ' ') using errcode = '23514';
  end if;
  return new;
end
$$;
create trigger items_wardrobe_check before insert or update of space_id, type on core.items
for each row when (new.type in ('garment', 'outfit', 'outfit_worn'))
execute function wardrobe_private.check_wardrobe_item();

-- A Garment has its four required fields (WRD-005 5): its detail row is
-- made with it, in the same transaction.
create function wardrobe_private.check_garment_detail() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from wardrobe.garment where item_id = new.id)
     and exists (select 1 from core.items where id = new.id and type = 'garment') then
    raise exception 'A garment needs a category, size, brand and colour' using errcode = '23502';
  end if;
  return null;
end
$$;
create constraint trigger items_garment_detail after insert or update of type on core.items
deferrable initially deferred
for each row when (new.type = 'garment')
execute function wardrobe_private.check_garment_detail();

-- ---------------------------------------------------------------------------
-- What a Garment is described by is its owner's (ADR-0066 5).

create function wardrobe_private.owner_of(p_item uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select owner_id from core.items where id = p_item
$$;

create function wardrobe_private.is_type(p_item uuid, p_type text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from core.items where id = p_item and type = p_type)
$$;

create function wardrobe_private.check_garment() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  owner uuid := wardrobe_private.owner_of(new.item_id);
begin
  if not wardrobe_private.is_type(new.item_id, 'garment') then
    raise exception 'Only a garment is described here' using errcode = '23514';
  end if;
  if not exists (select 1 from wardrobe.categories where id = new.category_id and person_id = owner)
     or not exists (select 1 from wardrobe.sizes where id = new.size_id and person_id = owner)
     or not exists (select 1 from wardrobe.brands where id = new.brand_id and person_id = owner)
     or not exists (select 1 from wardrobe.colours where id = new.colour_id and person_id = owner)
     or (new.fit_id is not null
         and not exists (select 1 from wardrobe.fits where id = new.fit_id and person_id = owner)) then
    raise exception 'A garment is described from its owner''s own lists' using errcode = '23514';
  end if;
  return new;
end
$$;
create trigger garment_check before insert or update on wardrobe.garment
for each row execute function wardrobe_private.check_garment();

-- Child rows belong to the right Types and their owner's lists.
create function wardrobe_private.check_child() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  r jsonb := to_jsonb(new);
begin
  if tg_table_name = 'garment_tags' then
    if not wardrobe_private.is_type((r ->> 'garment_id')::uuid, 'garment')
       or not exists (select 1 from wardrobe.tags
                      where id = (r ->> 'tag_id')::uuid
                        and person_id = wardrobe_private.owner_of((r ->> 'garment_id')::uuid)) then
      raise exception 'A garment takes its owner''s tags' using errcode = '23514';
    end if;
  elsif tg_table_name = 'outfit_collections' then
    if not wardrobe_private.is_type((r ->> 'outfit_id')::uuid, 'outfit')
       or not exists (select 1 from wardrobe.collections
                      where id = (r ->> 'collection_id')::uuid
                        and person_id = wardrobe_private.owner_of((r ->> 'outfit_id')::uuid)) then
      raise exception 'An outfit goes in its owner''s collections' using errcode = '23514';
    end if;
  elsif tg_table_name = 'worn_garments' then
    if not wardrobe_private.is_type((r ->> 'worn_id')::uuid, 'outfit_worn')
       or not wardrobe_private.is_type((r ->> 'garment_id')::uuid, 'garment')
       or wardrobe_private.owner_of((r ->> 'worn_id')::uuid)
          is distinct from wardrobe_private.owner_of((r ->> 'garment_id')::uuid) then
      raise exception 'A day holds its owner''s garments' using errcode = '23514';
    end if;
  elsif tg_table_name = 'planned_outfits' then
    if not wardrobe_private.is_type((r ->> 'outfit_id')::uuid, 'outfit')
       or wardrobe_private.owner_of((r ->> 'outfit_id')::uuid) <> (r ->> 'person_id')::uuid then
      raise exception 'Planned outfits are my own outfits' using errcode = '23514';
    end if;
  end if;
  return new;
end
$$;
create trigger garment_tags_check before insert or update on wardrobe.garment_tags
for each row execute function wardrobe_private.check_child();
create trigger outfit_collections_check before insert or update on wardrobe.outfit_collections
for each row execute function wardrobe_private.check_child();
create trigger worn_garments_check before insert or update on wardrobe.worn_garments
for each row execute function wardrobe_private.check_child();
create trigger planned_outfits_check before insert or update of outfit_id, person_id
on wardrobe.planned_outfits for each row execute function wardrobe_private.check_child();

-- ---------------------------------------------------------------------------
-- A Garment's title is worked out (ADR-0066 3): its own name, or its
-- colour, brand and category ("Navy Uniqlo T-shirt"), kept up to date as
-- they change or are renamed, so Search and Week, which read the title,
-- have it.

create function wardrobe_private.garment_title(p_item uuid) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce(btrim(g.own_name), concat_ws(' ', c.name, b.name, k.name))
  from wardrobe.garment g
  join wardrobe.colours c on c.id = g.colour_id
  join wardrobe.brands b on b.id = g.brand_id
  join wardrobe.categories k on k.id = g.category_id
  where g.item_id = p_item
$$;

create function wardrobe_private.retitle_garment() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_title text := wardrobe_private.garment_title(new.item_id);
begin
  update core.items set title = v_title where id = new.item_id and title is distinct from v_title;
  return null;
end
$$;
create trigger garment_title after insert or update on wardrobe.garment
for each row execute function wardrobe_private.retitle_garment();

-- A colour, brand or category renamed: the garments described by it.
create function wardrobe_private.retitle_by_entry() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update core.items i set title = wardrobe_private.garment_title(i.id)
  from wardrobe.garment g
  where g.item_id = i.id
    and g.own_name is null
    and new.id = case tg_table_name
      when 'colours' then g.colour_id
      when 'brands' then g.brand_id
      else g.category_id end
    and i.title is distinct from wardrobe_private.garment_title(i.id);
  return null;
end
$$;
create trigger colours_title after update of name on wardrobe.colours
for each row when (old.name is distinct from new.name)
execute function wardrobe_private.retitle_by_entry();
create trigger brands_title after update of name on wardrobe.brands
for each row when (old.name is distinct from new.name)
execute function wardrobe_private.retitle_by_entry();
create trigger categories_title after update of name on wardrobe.categories
for each row when (old.name is distinct from new.name)
execute function wardrobe_private.retitle_by_entry();

-- ---------------------------------------------------------------------------
-- Changing an outfit changes days to come, not days gone (ADR-0066 8): a
-- garment added to it joins each Outfit worn that wears it from its
-- owner's today on. Taking one out is in stage6_wardrobe_removing.

create function wardrobe_private.today(p_person uuid) returns date
language sql stable security definer set search_path = '' as $$
  select (now() at time zone coalesce((select timezone from core.people where id = p_person), 'Europe/London'))::date
$$;

create function wardrobe_private.garment_added() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into wardrobe.worn_garments (worn_id, garment_id)
  select w.id, new.to_item
  from core.links l
  join core.items w on w.id = l.from_item
  where l.link_type = 'wears' and l.to_item = new.from_item
    and w.archived_at is null
    and w.do_on >= wardrobe_private.today(w.owner_id)
  on conflict do nothing;
  return null;
end
$$;
create trigger links_outfit_garment_added after insert on core.links
for each row when (new.link_type = 'includes')
execute function wardrobe_private.garment_added();

-- ---------------------------------------------------------------------------
-- The activity log grows to the Wardrobe (ADR-0030, ADR-0066 15): a
-- garment's fields and tags, an outfit's collections, and a day's
-- garments. Rows made with their Item aren't logged; nor is a title worked
-- out again (core logs the Item's own fields).

create function wardrobe_private.log_wardrobe() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  r jsonb := to_jsonb(case when tg_op = 'DELETE' then old else new end);
  item uuid;
  old_row jsonb;
  new_row jsonb;
  changes jsonb := '{}';
  key text;
  what text;
begin
  item := coalesce(r ->> 'item_id', r ->> 'garment_id', r ->> 'outfit_id', r ->> 'worn_id')::uuid;
  if tg_table_name = 'worn_garments' then
    item := (r ->> 'worn_id')::uuid;
  end if;
  -- Gone with its Item, or made with it in this transaction.
  if not exists (select 1 from core.items i where i.id = item and i.created_at <> now()) then
    return null;
  end if;

  if tg_table_name = 'garment' then
    old_row := to_jsonb(old) - array['updated_at', 'item_id'];
    new_row := to_jsonb(new) - array['updated_at', 'item_id'];
    for key in select jsonb_object_keys(new_row) loop
      if new_row -> key is distinct from old_row -> key then
        changes := changes || jsonb_build_object(key, jsonb_build_object('from', old_row -> key, 'to', new_row -> key));
      end if;
    end loop;
    if changes = '{}' then
      return null;
    end if;
  else
    what := case tg_table_name
      when 'garment_tags' then 'tag_id'
      when 'outfit_collections' then 'collection_id'
      else 'garment_id' end;
    changes := jsonb_build_object(
      case tg_table_name when 'garment_tags' then 'tag'
        when 'outfit_collections' then 'collection' else 'garment' end,
      jsonb_build_object(
        'from', case when tg_op = 'DELETE' then to_jsonb(old) -> what end,
        'to', case when tg_op = 'INSERT' then to_jsonb(new) -> what end));
  end if;
  insert into core.activity (item_id, verb, changed) values (item, 'updated', changes);
  return null;
end
$$;
create trigger garment_log after update on wardrobe.garment
for each row execute function wardrobe_private.log_wardrobe();
create trigger garment_tags_log after insert or delete on wardrobe.garment_tags
for each row execute function wardrobe_private.log_wardrobe();
create trigger outfit_collections_log after insert or delete on wardrobe.outfit_collections
for each row execute function wardrobe_private.log_wardrobe();
create trigger worn_garments_log after insert or delete on wardrobe.worn_garments
for each row execute function wardrobe_private.log_wardrobe();

grant execute on function
  wardrobe_private.owner_of(uuid),
  wardrobe_private.is_type(uuid, text),
  wardrobe_private.garment_title(uuid),
  wardrobe_private.today(uuid)
to authenticated;

-- An outfit renamed: the days to come that wear it say its new name.
create function wardrobe_private.outfit_renamed() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update core.items w set title = coalesce(nullif(btrim(new.title), ''), 'Outfit')
  from core.links l
  where l.link_type = 'wears' and l.to_item = new.id and l.from_item = w.id
    and w.archived_at is null
    and w.do_on >= wardrobe_private.today(w.owner_id)
    and w.title is distinct from coalesce(nullif(btrim(new.title), ''), 'Outfit');
  return null;
end
$$;
create trigger items_outfit_renamed after update of title on core.items
for each row when (new.type = 'outfit' and old.title is distinct from new.title)
execute function wardrobe_private.outfit_renamed();
