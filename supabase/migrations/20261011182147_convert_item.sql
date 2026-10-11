-- Converting an Item in place (ITM-004, ADR-0018): one write the queue can
-- replay. The database refuses a conversion the ontology doesn't allow, and
-- its triggers keep or drop Labels and marks for the new Type.

create function core.convert_item(p_id uuid, p_type text)
returns core.items
language plpgsql set search_path = '' as $$
declare
  r core.items;
begin
  update core.items set type = p_type where id = p_id and type <> p_type;
  select * into r from core.items where id = p_id;
  if r.id is null then
    raise exception 'No Item % to convert', p_id using errcode = 'P0002';
  end if;
  return r;
end
$$;

grant execute on function core.convert_item(uuid, text) to authenticated;
