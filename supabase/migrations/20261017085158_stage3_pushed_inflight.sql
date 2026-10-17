-- Stage 3 (bug hunt, 17 October): sent, as stage3_push_done, now
-- core.calendar_sent, and: a change
-- made while its job was with Google stays waiting, to go next (it was
-- queued after the job was claimed); the references it makes are of Events
-- made in LifeOS (stage3_refs_origin). ADR-0048.

-- As core.calendar_pushed, which now hands on to it, with the time the job
-- was queued when claimed.
create function core.calendar_sent(p_outbox bigint, p_refs jsonb, p_series_ref jsonb,
                                   p_queued_at timestamptz)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  x jsonb;
  l core.calendar_links;
  copy uuid;
begin
  update core_private.calendar_outbox set
    sent_at = case when p_queued_at is null or queued_at <= p_queued_at then now() end,
    next_try_at = now(),
    error = null
  where id = p_outbox;
  perform set_config('lifeos.importing', 'on', true);
  for x in select * from jsonb_array_elements(coalesce(p_refs, '[]')) loop
    select * into l from core.calendar_links where id = (x ->> 'link')::uuid;
    select r.item_id into copy from core.external_refs r
    where r.calendar_link_id = l.id and r.external_id = x ->> 'external_id'
      and r.item_id <> (x ->> 'item_id')::uuid;
    if copy is not null then
      update core.external_refs set external_id = external_id || '#copy' where item_id = copy;
      update core.items set archived_at = coalesce(archived_at, now()) where id = copy;
    end if;
    insert into core.external_refs (item_id, connection_id, calendar_link_id, external_id, etag,
                                    external_updated, made_in_lifeos)
    values ((x ->> 'item_id')::uuid, l.connection_id, l.id, x ->> 'external_id', x ->> 'etag',
            (x ->> 'updated')::timestamptz, true)
    on conflict (item_id) do update set
      connection_id = excluded.connection_id,
      calendar_link_id = excluded.calendar_link_id,
      external_id = excluded.external_id,
      etag = excluded.etag,
      external_updated = excluded.external_updated;
  end loop;
  if p_series_ref is not null then
    insert into core_private.series_refs (series_id, calendar_link_id, external_id, etag)
    values ((p_series_ref ->> 'series_id')::uuid, (p_series_ref ->> 'link')::uuid,
            p_series_ref ->> 'external_id', p_series_ref ->> 'etag')
    on conflict (series_id) do update set calendar_link_id = excluded.calendar_link_id,
      external_id = excluded.external_id, etag = excluded.etag;
  end if;
  perform set_config('lifeos.importing', '', true);
end
$$;

create or replace function core.calendar_pushed(p_outbox bigint, p_refs jsonb,
                                                p_series_ref jsonb default null)
returns void
language sql security definer set search_path = '' as $$
  select core.calendar_sent(p_outbox, p_refs, p_series_ref, null)
$$;

revoke execute on function core.calendar_sent(bigint, jsonb, jsonb, timestamptz) from public;
grant execute on function core.calendar_sent(bigint, jsonb, jsonb, timestamptz) to service_role;
