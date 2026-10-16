-- Stage 3 (plan step 9): Events from Google kept as Items (GCL-003, ADR-0047).

-- ---------------------------------------------------------------------------
-- A page of Google's events for a calendar, already mapped by the Edge
-- Function: each becomes, or updates, an Event in its owner's Personal
-- Space with an external reference, matched by Google's id, so a sync run
-- twice changes nothing (GCL-003 4). A cancelled one goes to Recently
-- deleted; one that comes back is restored (GCL-003 2). A cancelled
-- repeating event takes its instances with it. Written as the sync, so
-- Google's fields may change and no default Reminder is made (GCL-003 1).
-- Each event: external_id, etag, updated, cancelled, recurring_id, title,
-- body, place, starts_at, ends_at, all_day, raw.
create function core.calendar_save_events(p_link uuid, p_events jsonb)
returns int
language plpgsql security definer set search_path = '' as $$
declare
  l core.calendar_links;
  space uuid;
  e jsonb;
  item uuid;
  saved int := 0;
begin
  select * into l from core.calendar_links where id = p_link;
  if l.id is null then
    raise exception 'No calendar %', p_link using errcode = 'P0002';
  end if;
  select s.id into space from core.spaces s where s.created_by = l.person_id and s.kind = 'personal';
  perform set_config('lifeos.importing', 'on', true);

  for e in select * from jsonb_array_elements(p_events) loop
    select r.item_id into item from core.external_refs r
    where r.calendar_link_id = p_link and r.external_id = e ->> 'external_id';

    if coalesce((e ->> 'cancelled')::boolean, false) then
      update core.items i set archived_at = now()
      from core.external_refs r
      where r.item_id = i.id and r.calendar_link_id = p_link and i.archived_at is null
        and (r.external_id = e ->> 'external_id' or r.raw ->> 'recurringEventId' = e ->> 'external_id');
      continue;
    end if;

    if item is null then
      item := core_private.uuidv7();
      insert into core.items (id, type, title, body, place, space_id, owner_id, status,
                              starts_at, ends_at, all_day)
      values (item, 'event', left(coalesce(e ->> 'title', ''), 500), e ->> 'body',
              nullif(btrim(left(e ->> 'place', 500)), ''), space, l.person_id, 'active',
              (e ->> 'starts_at')::timestamptz, (e ->> 'ends_at')::timestamptz,
              coalesce((e ->> 'all_day')::boolean, false));
      insert into core.external_refs (item_id, connection_id, calendar_link_id, external_id,
                                      etag, external_updated, raw)
      values (item, l.connection_id, p_link, e ->> 'external_id', e ->> 'etag',
              (e ->> 'updated')::timestamptz, e -> 'raw');
    else
      update core.items set
        title = left(coalesce(e ->> 'title', ''), 500),
        body = e ->> 'body',
        place = nullif(btrim(left(e ->> 'place', 500)), ''),
        starts_at = (e ->> 'starts_at')::timestamptz,
        ends_at = (e ->> 'ends_at')::timestamptz,
        all_day = coalesce((e ->> 'all_day')::boolean, false),
        archived_at = null
      where id = item;
      update core.external_refs set etag = e ->> 'etag',
        external_updated = (e ->> 'updated')::timestamptz, raw = e -> 'raw'
      where item_id = item;
    end if;
    saved := saved + 1;
  end loop;

  perform set_config('lifeos.importing', '', true);
  return saved;
end
$$;

revoke execute on function core.calendar_save_events(uuid, jsonb) from public;
grant execute on function core.calendar_save_events(uuid, jsonb) to service_role;
