-- Stage 3 (plan step 10): what calendar-push sent, and the minute job that
-- wakes it (GCL-005, ADR-0048).

-- ---------------------------------------------------------------------------
-- Sent: the job is done, and each Event (or occurrence of a repeat) now
-- knows its Google event, so the sync matches it when it comes back. An
-- Event the sync had already brought in as a copy of mine is archived.
create function core.calendar_pushed(p_outbox bigint, p_refs jsonb, p_series_ref jsonb default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  x jsonb;
  l core.calendar_links;
  copy uuid;
begin
  update core_private.calendar_outbox set sent_at = now(), error = null where id = p_outbox;
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
    insert into core.external_refs (item_id, connection_id, calendar_link_id, external_id, etag, external_updated)
    values ((x ->> 'item_id')::uuid, l.connection_id, l.id, x ->> 'external_id', x ->> 'etag',
            (x ->> 'updated')::timestamptz)
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

-- Not sent this time: why, for the next try (its wait was set when claimed).
create function core.calendar_unpushed(p_outbox bigint, p_error text)
returns void
language sql security definer set search_path = '' as $$
  update core_private.calendar_outbox set error = left(p_error, 500) where id = p_outbox
$$;

-- Each minute, while something is waiting to go to Google, wake calendar-push.
create function core_private.calendar_push_tick()
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from core_private.calendar_outbox where sent_at is null and next_try_at <= now()) then
    perform net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
        || '/functions/v1/calendar-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-calendar-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'calendar_secret')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 60000
    );
  end if;
end
$$;

revoke execute on function core.calendar_pushed(bigint, jsonb, jsonb) from public;
revoke execute on function core.calendar_unpushed(bigint, text) from public;
revoke execute on function core_private.calendar_push_tick() from public;
grant execute on function core.calendar_pushed(bigint, jsonb, jsonb) to service_role;
grant execute on function core.calendar_unpushed(bigint, text) to service_role;

select cron.schedule('calendar-push', '* * * * *', 'select core_private.calendar_push_tick()');
