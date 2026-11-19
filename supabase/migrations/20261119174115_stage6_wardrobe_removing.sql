-- Stage 6 (plan step 4), after stage6_wardrobe_writes: the Wardrobe's
-- removals, the functions and triggers that need a delete. The Supabase
-- tool may wait on a confirmation it can't show for these; if it does, Joe
-- runs this file in the SQL editor (migrations.md). wardrobe.md WRD-012,
-- WRD-017, WRD-018, WRD-019, WRD-022, WRD-028; ADR-0066.

grant delete on wardrobe.categories, wardrobe.sizes, wardrobe.brands, wardrobe.fits,
  wardrobe.tags, wardrobe.colours, wardrobe.collections, wardrobe.garment_tags,
  wardrobe.outfit_collections, wardrobe.worn_garments to authenticated;

create policy "I remove my categories" on wardrobe.categories
  for delete to authenticated using (person_id = (select auth.uid()));
create policy "I remove my sizes" on wardrobe.sizes
  for delete to authenticated using (person_id = (select auth.uid()));
create policy "I remove my brands" on wardrobe.brands
  for delete to authenticated using (person_id = (select auth.uid()));
create policy "I remove my fits" on wardrobe.fits
  for delete to authenticated using (person_id = (select auth.uid()));
create policy "I remove my tags" on wardrobe.tags
  for delete to authenticated using (person_id = (select auth.uid()));
create policy "I remove my colours" on wardrobe.colours
  for delete to authenticated using (person_id = (select auth.uid()));
create policy "I remove my collections" on wardrobe.collections
  for delete to authenticated using (person_id = (select auth.uid()));
create policy "I untag the garments I can edit" on wardrobe.garment_tags
  for delete to authenticated using (core_private.can_write(garment_id));
create policy "I take the outfits I can edit out of collections" on wardrobe.outfit_collections
  for delete to authenticated using (core_private.can_write(outfit_id));
create policy "I take garments off days I can edit" on wardrobe.worn_garments
  for delete to authenticated using (core_private.can_write(worn_id));

-- ---------------------------------------------------------------------------
-- Lists (WRD-028 3–5). An entry in use can't be deleted, only merged into
-- another; a collection can always be deleted, its outfits staying in My
-- Outfits and any others.

create function wardrobe_private.entry_in_use(p_list text, p_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select case p_list
    when 'category' then exists (select 1 from wardrobe.garment where category_id = p_id)
    when 'size' then exists (select 1 from wardrobe.garment where size_id = p_id)
    when 'brand' then exists (select 1 from wardrobe.garment where brand_id = p_id)
    when 'colour' then exists (select 1 from wardrobe.garment where colour_id = p_id)
    when 'fit' then exists (select 1 from wardrobe.garment where fit_id = p_id)
    when 'tag' then exists (select 1 from wardrobe.garment_tags where tag_id = p_id)
    else false end
$$;

create function wardrobe.remove_entry(p_list text, p_id uuid)
returns void
language plpgsql set search_path = '' as $$
declare
  tbl text := wardrobe_private.list_table(p_list);
begin
  if tbl is null then
    raise exception 'No list called %', p_list using errcode = '22023';
  end if;
  if wardrobe_private.entry_in_use(p_list, p_id) then
    raise exception 'A garment uses this %: merge it into another', wardrobe_private.list_word(p_list)
      using errcode = '23503';
  end if;
  execute format('delete from wardrobe.%I where id = $1', tbl) using p_id;
end
$$;

-- One entry merged into another: whatever used the first uses the second,
-- then the first goes.
create function wardrobe.merge_entry(p_list text, p_from uuid, p_into uuid)
returns void
language plpgsql set search_path = '' as $$
declare
  tbl text := wardrobe_private.list_table(p_list);
  found_both boolean;
begin
  if tbl is null then
    raise exception 'No list called %', p_list using errcode = '22023';
  end if;
  if p_from = p_into then
    return;
  end if;
  execute format('select count(*) = 2 from wardrobe.%I where id in ($1, $2)', tbl)
  using p_from, p_into into found_both;
  if not found_both then
    raise exception 'Both % must be yours', wardrobe_private.list_table(p_list) using errcode = 'P0002';
  end if;
  case p_list
    when 'category' then update wardrobe.garment set category_id = p_into where category_id = p_from;
    when 'size' then update wardrobe.garment set size_id = p_into where size_id = p_from;
    when 'brand' then update wardrobe.garment set brand_id = p_into where brand_id = p_from;
    when 'colour' then update wardrobe.garment set colour_id = p_into where colour_id = p_from;
    when 'fit' then update wardrobe.garment set fit_id = p_into where fit_id = p_from;
    when 'tag' then
      insert into wardrobe.garment_tags (garment_id, tag_id)
      select garment_id, p_into from wardrobe.garment_tags where tag_id = p_from
      on conflict do nothing;
      delete from wardrobe.garment_tags where tag_id = p_from;
    when 'collection' then
      insert into wardrobe.outfit_collections (outfit_id, collection_id)
      select outfit_id, p_into from wardrobe.outfit_collections where collection_id = p_from
      on conflict do nothing;
      delete from wardrobe.outfit_collections where collection_id = p_from;
  end case;
  execute format('delete from wardrobe.%I where id = $1', tbl) using p_from;
end
$$;

-- ---------------------------------------------------------------------------
-- Garments and outfits.

-- Tags taken off several garments at once (WRD-012 2).
create function wardrobe.remove_garment_tags(p_garments uuid[], p_tags uuid[])
returns void
language sql set search_path = '' as $$
  delete from wardrobe.garment_tags where garment_id = any (p_garments) and tag_id = any (p_tags)
$$;

-- Outfits taken out of one of my collections (WRD-019 3); never out of My
-- Outfits, which isn't stored.
create function wardrobe.remove_from_collection(p_outfits uuid[], p_collection uuid)
returns void
language sql set search_path = '' as $$
  delete from wardrobe.outfit_collections where outfit_id = any (p_outfits) and collection_id = p_collection
$$;

-- A garment taken out of an outfit (WRD-017 2): one at least stays, and the
-- rest mustn't be exactly another outfit. It leaves the days to come that
-- wear the outfit, by the trigger below.
create function wardrobe.remove_outfit_garment(p_outfit uuid, p_garment uuid)
returns void
language plpgsql set search_path = '' as $$
declare
  rest uuid[] := array_remove(wardrobe_private.outfit_garments(p_outfit), p_garment);
begin
  if cardinality(rest) = 0 then
    raise exception 'An outfit keeps one garment at least' using errcode = '23514';
  end if;
  perform wardrobe_private.refuse_same_outfit(wardrobe_private.owner_of(p_outfit), rest, p_outfit);
  perform core.unlink_items(p_outfit, p_garment, 'includes');
end
$$;

create function wardrobe_private.garment_taken_out() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from wardrobe.worn_garments wg
  using core.links l, core.items w
  where l.link_type = 'wears' and l.to_item = old.from_item
    and w.id = l.from_item and wg.worn_id = w.id and wg.garment_id = old.to_item
    and w.archived_at is null
    and w.do_on >= wardrobe_private.today(w.owner_id);
  return null;
end
$$;
create trigger links_outfit_garment_taken_out after delete on core.links
for each row when (old.link_type = 'includes')
execute function wardrobe_private.garment_taken_out();

-- A garment taken off one day's outfit, that day only (WRD-022 4; ADR-0013):
-- the last one taken off takes the day's entry with it, to Recently deleted.
create function wardrobe.remove_day_garment(p_worn uuid, p_garment uuid)
returns void
language plpgsql set search_path = '' as $$
begin
  delete from wardrobe.worn_garments where worn_id = p_worn and garment_id = p_garment;
  if not exists (select 1 from wardrobe.worn_garments where worn_id = p_worn) then
    update core.items set archived_at = now() where id = p_worn and archived_at is null;
  end if;
end
$$;

grant execute on function
  wardrobe.remove_entry(text, uuid),
  wardrobe.merge_entry(text, uuid, uuid),
  wardrobe.remove_garment_tags(uuid[], uuid[]),
  wardrobe.remove_from_collection(uuid[], uuid),
  wardrobe.remove_outfit_garment(uuid, uuid),
  wardrobe.remove_day_garment(uuid, uuid)
to authenticated;

grant execute on function wardrobe_private.entry_in_use(text, uuid) to authenticated;
