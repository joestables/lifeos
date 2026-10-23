-- Stage 4 (plan step 9d), after stage4_meal_lines: removing a Meal's line,
-- and Pantry merges moving Meals' lines (MPL-006, PAN-003). Run by Joe in
-- the SQL editor: its delete statements wait on a confirmation the Supabase
-- tool can't show (migrations.md).

create function food.remove_meal_line(p_id uuid)
returns void
language sql set search_path = '' as $$
  delete from food.meal_lines where id = p_id
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

revoke all on function food.remove_meal_line(uuid) from public;
grant execute on function food.remove_meal_line(uuid) to authenticated;
