-- Stage 6 (plan step 6): merging a list entry, sent again, is applied once
-- (ADR-0042): a merge whose first entry has already gone into the second
-- does nothing, as every write is idempotent. Into an entry that isn't
-- mine is still refused. WRD-028 3–5; ADR-0066 5.

create or replace function wardrobe.merge_entry(p_list text, p_from uuid, p_into uuid)
returns void
language plpgsql set search_path = '' as $$
declare
  tbl text := wardrobe_private.list_table(p_list);
  has_from boolean;
  has_into boolean;
begin
  if tbl is null then
    raise exception 'No list called %', p_list using errcode = '22023';
  end if;
  if p_from = p_into then
    return;
  end if;
  execute format('select exists (select 1 from wardrobe.%I where id = $1),
    exists (select 1 from wardrobe.%I where id = $2)', tbl, tbl)
  using p_from, p_into into has_from, has_into;
  if not has_into then
    raise exception 'No % to merge into', wardrobe_private.list_word(p_list) using errcode = 'P0002';
  end if;
  -- Merged already: this is the same write, sent again.
  if not has_from then
    return;
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
