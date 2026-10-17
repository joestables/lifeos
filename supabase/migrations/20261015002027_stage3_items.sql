-- Stage 3 (plan step 4): an Item's place, written by create_item and
-- update_item and allowed only on Types that have one (EVT-001).

create or replace function core_private.check_fields(p_fields jsonb) returns void
language plpgsql immutable set search_path = '' as $$
declare
  unknown text;
begin
  select k into unknown from jsonb_object_keys(p_fields) k
  where k not in ('title', 'body', 'status', 'space_id', 'starts_at', 'ends_at', 'all_day',
                  'due_on', 'do_on', 'do_at', 'slot', 'position', 'place')
  limit 1;
  if unknown is not null then
    raise exception 'Unknown field %', unknown using errcode = '22023';
  end if;
end
$$;

create or replace function core.create_item(p_id uuid, p_type text, p_fields jsonb default '{}')
returns core.items
language plpgsql set search_path = '' as $$
declare
  r core.items;
begin
  perform core_private.check_fields(p_fields);
  insert into core.items (id, type, title, body, status, space_id, starts_at, ends_at, all_day,
                          due_on, do_on, do_at, slot, position, place)
  values (
    p_id,
    p_type,
    coalesce(p_fields ->> 'title', ''),
    p_fields ->> 'body',
    coalesce(p_fields ->> 'status', 'active'),
    coalesce((p_fields ->> 'space_id')::uuid, core_private.default_space(p_type)),
    (p_fields ->> 'starts_at')::timestamptz,
    (p_fields ->> 'ends_at')::timestamptz,
    (p_fields ->> 'all_day')::boolean,
    (p_fields ->> 'due_on')::date,
    (p_fields ->> 'do_on')::date,
    (p_fields ->> 'do_at')::time,
    p_fields ->> 'slot',
    p_fields ->> 'position',
    nullif(btrim(p_fields ->> 'place'), '')
  )
  on conflict (id) do nothing;
  select * into r from core.items where id = p_id;
  return r;
end
$$;

create or replace function core.update_item(p_id uuid, p_patch jsonb)
returns core.items
language plpgsql set search_path = '' as $$
declare
  r core.items;
begin
  perform core_private.check_fields(p_patch);
  update core.items i set
    title = case when p_patch ? 'title' then coalesce(p_patch ->> 'title', '') else i.title end,
    body = case when p_patch ? 'body' then p_patch ->> 'body' else i.body end,
    status = case when p_patch ? 'status' then p_patch ->> 'status' else i.status end,
    space_id = case when p_patch ? 'space_id' then (p_patch ->> 'space_id')::uuid else i.space_id end,
    starts_at = case when p_patch ? 'starts_at' then (p_patch ->> 'starts_at')::timestamptz else i.starts_at end,
    ends_at = case when p_patch ? 'ends_at' then (p_patch ->> 'ends_at')::timestamptz else i.ends_at end,
    all_day = case when p_patch ? 'all_day' then (p_patch ->> 'all_day')::boolean else i.all_day end,
    due_on = case when p_patch ? 'due_on' then (p_patch ->> 'due_on')::date else i.due_on end,
    do_on = case when p_patch ? 'do_on' then (p_patch ->> 'do_on')::date else i.do_on end,
    do_at = case when p_patch ? 'do_at' then (p_patch ->> 'do_at')::time else i.do_at end,
    slot = case when p_patch ? 'slot' then p_patch ->> 'slot' else i.slot end,
    position = case when p_patch ? 'position' then p_patch ->> 'position' else i.position end,
    place = case when p_patch ? 'place' then nullif(btrim(p_patch ->> 'place'), '') else i.place end
  where i.id = p_id
  returning * into r;
  if r.id is null then
    raise exception 'No Item % to update', p_id using errcode = 'P0002';
  end if;
  return r;
end
$$;

-- A place only on the Types that have one, as the time fields are checked.
create function core_private.check_place() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.place is not null
    and not (select t.has_place from core.item_types t where t.key = new.type)
  then
    raise exception 'A % has no place', new.type using errcode = '23514';
  end if;
  return new;
end
$$;
create trigger items_check_place before insert or update of place, type on core.items
for each row execute function core_private.check_place();

revoke execute on function core_private.check_place() from public;
