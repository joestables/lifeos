-- Stage 4b (plan step 5), after stage4b_space_entries: taking a staple or
-- Essential off (SHP-005 1), in place of the Pantry's set_staple, and
-- merges keeping each Space's entry. Run by Joe in the SQL editor: its
-- delete and drop statements wait on a confirmation the Supabase tool can't
-- show (migrations.md).

drop function food.set_staple(uuid, uuid, boolean, boolean);

create function food.remove_entry(p_space uuid, p_pantry uuid)
returns void
language sql set search_path = '' as $$
  delete from food.space_entries where space_id = p_space and pantry_id = p_pantry
$$;

-- Merging two Pantry entries (PAN-003) moves every line and keeps each
-- Space's staple or Essential, needed if either was.
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
  insert into food.space_entries (space_id, pantry_id, kind, needed)
  select space_id, p_keep, kind, needed from food.space_entries where pantry_id = p_merge
  on conflict (space_id, pantry_id) do update
    set needed = food.space_entries.needed or excluded.needed;
  delete from food.pantry where id = p_merge;
  select * into r from food.pantry where id = p_keep;
  return r;
end
$$;

grant execute on function food.remove_entry(uuid, uuid) to authenticated;
