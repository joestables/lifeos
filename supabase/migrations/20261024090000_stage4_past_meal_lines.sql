-- Stage 4 (Joe, 24 October): a Pantry entry used only by past Meals can be
-- deleted; their lines keep its name, as typed (PAN-001 4). Meals today or
-- later still keep it from being deleted, as Recipes do.

-- Before an entry goes: the lines of Meals before today, or deleted or
-- cancelled, become typed with its name. Security definer: the Meals may
-- be anyone's in my Households.
create function food_private.untie_past_meal_lines() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update food.meal_lines ml set pantry_id = null, text = old.name
  from core.items i
  where i.id = ml.meal_id and ml.pantry_id = old.id
    and (i.do_on < current_date or i.archived_at is not null or i.status = 'cancelled');
  return old;
end
$$;
create trigger pantry_untie_past_meal_lines before delete on food.pantry
for each row execute function food_private.untie_past_meal_lines();
