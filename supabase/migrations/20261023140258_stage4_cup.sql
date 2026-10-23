-- Stage 4 (plan step 9b): a cup, 250 ml, joins the units a line may have
-- (ADR-0053, amended 23 October; RCP-007).
alter domain food.unit drop constraint unit_check;
alter domain food.unit add constraint unit_check
  check (value in ('g', 'kg', 'ml', 'l', 'tsp', 'tbsp', 'cup'));
