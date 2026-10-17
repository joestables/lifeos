-- Stage 3 (bug hunt, 17 October): saving Google's events, as
-- stage3_sync_matches, and: a change of mine waiting to go out wins over
-- Google's older cancellation too; a repeat I made, deleted in Google, ends
-- in LifeOS; a cancellation only ever archives Events (an Event switched
-- into a Task stays a Task); my id is matched only to my own Event. ADR-0048.

-- Whether a change of mine to an Item (or its series) waits to go out, made
-- after Google's last change.
create function core_private.calendar_waiting(p_item uuid, p_updated timestamptz)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from core_private.calendar_outbox o
    left join core.items x on x.id = p_item
    where o.sent_at is null and (o.item_id = p_item or o.series_id = x.series_id)
      and o.queued_at > coalesce(p_updated, '-infinity')
  )
$$;
revoke execute on function core_private.calendar_waiting(uuid, timestamptz) from public;

create or replace function core.calendar_save_events(p_link uuid, p_events jsonb)
returns int
language plpgsql security definer set search_path = '' as $$
declare
  l core.calendar_links;
  space uuid;
  e jsonb;
  item uuid;
  sr core_private.series_refs;
  tz text;
  saved int := 0;
begin
  select * into l from core.calendar_links where id = p_link;
  if l.id is null then
    raise exception 'No calendar %', p_link using errcode = 'P0002';
  end if;
  select s.id into space from core.spaces s where s.created_by = l.person_id and s.kind = 'personal';
  select coalesce(p.timezone, 'Europe/London') into tz from core.people p where p.id = l.person_id;
  perform set_config('lifeos.importing', 'on', true);

  for e in select * from jsonb_array_elements(p_events) loop
    select r.item_id into item from core.external_refs r
    where r.calendar_link_id = p_link and r.external_id = e ->> 'external_id';

    if coalesce((e ->> 'cancelled')::boolean, false) then
      -- My change since, still waiting to go out, wins (ADR-0048).
      if item is not null and core_private.calendar_waiting(item, (e ->> 'updated')::timestamptz) then
        continue;
      end if;
      -- A repeat I made, deleted in Google: it ends here too.
      select * into sr from core_private.series_refs
      where calendar_link_id = p_link and external_id = e ->> 'external_id';
      if sr.series_id is not null then
        update core.items set archived_at = now() where series_id = sr.series_id and archived_at is null;
        update core.series set ended_on = starts_on - 1 where id = sr.series_id;
        continue;
      end if;
      update core.items i set archived_at = now()
      from core.external_refs r
      where r.item_id = i.id and r.calendar_link_id = p_link and i.archived_at is null
        and i.type = 'event'
        and (r.external_id = e ->> 'external_id' or r.raw ->> 'recurringEventId' = e ->> 'external_id');
      continue;
    end if;

    -- One I sent: an Event I made (it carries my id), or an occurrence of a
    -- repeat I made, matched by its day. Occurrences LifeOS hasn't made yet
    -- are left to LifeOS's own engine.
    if item is null then
      select i.id into item from core.items i
      where i.id::text = e -> 'raw' -> 'extendedProperties' -> 'private' ->> 'lifeosId'
        and i.owner_id = l.person_id and i.type = 'event';
      if item is null and e -> 'raw' ->> 'recurringEventId' is not null then
        select * into sr from core_private.series_refs
        where calendar_link_id = p_link and external_id = e -> 'raw' ->> 'recurringEventId';
        if sr.series_id is not null then
          select i.id into item from core.items i
          where i.series_id = sr.series_id and i.occurrence_on = coalesce(
            (e -> 'raw' -> 'originalStartTime' ->> 'date')::date,
            ((e -> 'raw' -> 'originalStartTime' ->> 'dateTime')::timestamptz at time zone tz)::date);
          if item is null then
            continue;
          end if;
        end if;
      end if;
      if item is not null then
        insert into core.external_refs (item_id, connection_id, calendar_link_id, external_id, etag,
                                        external_updated, raw, made_in_lifeos)
        values (item, l.connection_id, p_link, e ->> 'external_id', e ->> 'etag',
                (e ->> 'updated')::timestamptz, e -> 'raw', true)
        on conflict (item_id) do update set connection_id = excluded.connection_id,
          calendar_link_id = excluded.calendar_link_id, external_id = excluded.external_id,
          made_in_lifeos = true;
      end if;
    end if;

    -- A change of mine still waiting to go out is later than Google's: keep it (ADR-0048).
    if item is not null and core_private.calendar_waiting(item, (e ->> 'updated')::timestamptz) then
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
      where id = item and type = 'event';
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

