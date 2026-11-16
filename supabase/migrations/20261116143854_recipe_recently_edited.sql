-- Recently edited (RCP-001 6; Joe, 16 November): a Variation's updated_at
-- moves whenever one of its ingredient lines or method steps is added,
-- changed or removed, as it already does for its own fields, so a Recipe
-- can be sorted by its newest edit to any of its Variations. The touch
-- changes nothing the activity log records (log_food ignores updated_at).

create function food_private.touch_variation() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  r record := case when tg_op = 'DELETE' then old else new end;
begin
  update food.variation set updated_at = now()
  where item_id = r.variation_id and updated_at <> now();
  return null;
end
$$;

create trigger variation_lines_touch after insert or update or delete on food.variation_lines
for each row execute function food_private.touch_variation();
create trigger variation_steps_touch after insert or update or delete on food.variation_steps
for each row execute function food_private.touch_variation();
