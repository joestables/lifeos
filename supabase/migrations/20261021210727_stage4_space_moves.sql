-- Stage 4 (bug hunt after step 8b): only an Item's maker moves it to another
-- Space (HSH-003 2). Without this, a member could make someone else's
-- Household Meal Personal to themselves, and its maker would lose it. The
-- one exception is back to its maker's own Personal Space, which is what
-- leaving, being removed and deleting a Household do (HSH-004).

create function core_private.check_space_move() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (select auth.uid()) is null or new.owner_id = (select auth.uid()) then
    return new;
  end if;
  if exists (
    select 1 from core.spaces s
    where s.id = new.space_id and s.kind = 'personal' and s.created_by = new.owner_id
  ) then
    return new;
  end if;
  raise exception 'Only its maker moves a % to another Space', new.type using errcode = '42501';
end
$$;

create trigger items_space_move before update of space_id on core.items
for each row when (old.space_id is distinct from new.space_id)
execute function core_private.check_space_move();
