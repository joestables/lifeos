-- A Meal's line on a shop has the same id every time it is written
-- (ADR-0057; Joe, 26 October): its shop's, Meal's and source line's ids
-- hashed. So a line ticked with no signal, before its Meal reached the
-- server, is the line the server writes (the app works out the same id),
-- and a tick isn't lost when a change to the Meal writes its lines again.

-- The three ids hashed (MD5 of "list:meal:source", as a uuid): the same
-- three, the same id; any other three, another.
create function shopping_private.line_id(p_list uuid, p_meal uuid, p_source uuid)
returns uuid
language sql immutable set search_path = '' as $$
  select md5(p_list::text || ':' || p_meal::text || ':' || p_source::text)::uuid
$$;

create function shopping_private.meal_line_id() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.id := shopping_private.line_id(new.list_id, new.meal_id, new.source_id);
  return new;
end
$$;

create trigger lines_meal_line_id before insert on shopping.lines
for each row when (new.meal_id is not null and new.source_id is not null)
execute function shopping_private.meal_line_id();

-- A calculation only: anyone writing a line may make it.
grant execute on function shopping_private.line_id(uuid, uuid, uuid) to authenticated;
grant execute on function shopping_private.meal_line_id() to authenticated;
