-- Stage 4, after Joe's first use (23 October): an entry's default unit is
-- learnt from the first line that gives it one (PAN-004 3), and a Recipe's
-- Meal serves what its Variation does until it is given its own (MPL-002 2).

-- A line, a Variation's or a Meal's, with a unit and a Pantry entry that
-- has no default: the entry takes the line's unit. Security definer: the
-- entry may be someone else's in my Household, and only an empty default
-- is ever filled.
create function food_private.learn_default_unit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.pantry_id is not null and new.unit is not null then
    update food.pantry set default_unit = new.unit
    where id = new.pantry_id and default_unit is null and kind = 'ingredient';
  end if;
  return null;
end
$$;
create trigger variation_lines_default_unit after insert or update of unit, pantry_id
on food.variation_lines for each row execute function food_private.learn_default_unit();
create trigger meal_lines_default_unit after insert or update of unit, pantry_id
on food.meal_lines for each row execute function food_private.learn_default_unit();

-- Meals planned with their Variation's servings copied: those still the
-- same follow the Variation from now on.
update food.meal m set servings = null
from core.links l, food.variation v
where l.from_item = m.item_id and l.link_type = 'uses' and v.item_id = l.to_item
  and m.servings = v.servings;
