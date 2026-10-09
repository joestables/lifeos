-- Every write is a database function (ADR-0042), called over RPC and replayed
-- by the write queue. Security invoker: row-level security is the one check.

-- The Space a new Item goes in when none is given: its Type's default.
create function core_private.default_space(p_type text) returns uuid
language sql stable set search_path = '' as $$
  select s.id
  from core.spaces s
  join core.space_members m on m.space_id = s.id and m.person_id = (select auth.uid())
  where s.kind = coalesce(
    (select 'household' from core.item_types t where t.key = p_type and t.default_space = 'household'
       and exists (select 1 from core.spaces h join core.space_members hm on hm.space_id = h.id
                   where h.kind = 'household' and hm.person_id = (select auth.uid()))),
    'personal')
  order by s.created_at
  limit 1
$$;
grant execute on function core_private.default_space(text) to authenticated;

-- The fields a write may set; anything else is a bug in the caller.
create function core_private.check_fields(p_fields jsonb) returns void
language plpgsql immutable set search_path = '' as $$
declare
  unknown text;
begin
  select k into unknown from jsonb_object_keys(p_fields) k
  where k not in ('title', 'body', 'status', 'space_id', 'starts_at', 'ends_at', 'all_day',
                  'due_on', 'do_on', 'do_at', 'slot')
  limit 1;
  if unknown is not null then
    raise exception 'Unknown field %', unknown using errcode = '22023';
  end if;
end
$$;
grant execute on function core_private.check_fields(jsonb) to authenticated;

-- Creates an Item with the ID the device made. A repeat is ignored (OFF-002).
create function core.create_item(p_id uuid, p_type text, p_fields jsonb default '{}')
returns core.items
language plpgsql set search_path = '' as $$
declare
  r core.items;
begin
  perform core_private.check_fields(p_fields);
  insert into core.items (id, type, title, body, status, space_id, starts_at, ends_at, all_day,
                          due_on, do_on, do_at, slot)
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
    p_fields ->> 'slot'
  )
  on conflict (id) do nothing;
  select * into r from core.items where id = p_id;
  return r;
end
$$;

-- Sets only the fields in the patch; the server applies it when it arrives,
-- so the last write wins field by field (OFF-003).
create function core.update_item(p_id uuid, p_patch jsonb)
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
    slot = case when p_patch ? 'slot' then p_patch ->> 'slot' else i.slot end
  where i.id = p_id
  returning * into r;
  if r.id is null then
    raise exception 'No Item % to update', p_id using errcode = 'P0002';
  end if;
  return r;
end
$$;

-- Delete means archive (ADR-0032); recoverable from Settings.
create function core.archive_item(p_id uuid)
returns core.items
language plpgsql set search_path = '' as $$
declare
  r core.items;
begin
  update core.items set archived_at = now() where id = p_id and archived_at is null;
  select * into r from core.items where id = p_id;
  if r.id is null then
    raise exception 'No Item % to delete', p_id using errcode = 'P0002';
  end if;
  return r;
end
$$;

create function core.restore_item(p_id uuid)
returns core.items
language plpgsql set search_path = '' as $$
declare
  r core.items;
begin
  update core.items set archived_at = null where id = p_id and archived_at is not null;
  select * into r from core.items where id = p_id;
  if r.id is null then
    raise exception 'No Item % to restore', p_id using errcode = 'P0002';
  end if;
  return r;
end
$$;

-- Links two Items. A repeat is ignored.
create function core.link_items(p_id uuid, p_from uuid, p_to uuid, p_link_type text)
returns void
language sql set search_path = '' as $$
  insert into core.links (id, from_item, to_item, link_type)
  values (p_id, p_from, p_to, p_link_type)
  on conflict do nothing
$$;

create function core.unlink_items(p_from uuid, p_to uuid, p_link_type text)
returns void
language sql set search_path = '' as $$
  delete from core.links l
  using core.link_types t
  where t.key = l.link_type
    and l.link_type = p_link_type
    and ((l.from_item = p_from and l.to_item = p_to)
      or (t.is_symmetric and l.from_item = p_to and l.to_item = p_from))
$$;

grant execute on function core.create_item(uuid, text, jsonb) to authenticated;
grant execute on function core.update_item(uuid, jsonb) to authenticated;
grant execute on function core.archive_item(uuid) to authenticated;
grant execute on function core.restore_item(uuid) to authenticated;
grant execute on function core.link_items(uuid, uuid, uuid, text) to authenticated;
grant execute on function core.unlink_items(uuid, uuid, text) to authenticated;
