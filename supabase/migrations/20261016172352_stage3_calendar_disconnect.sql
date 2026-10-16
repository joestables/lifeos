-- Stage 3 (plan step 9): disconnecting, and the five-minute sync (GCL-001 3,
-- GCL-003 2, ADR-0047).

-- ---------------------------------------------------------------------------
-- Disconnected (GCL-001 3): the token is emptied in Vault (the Edge
-- Function has revoked it at Google), every calendar is off, and the Events
-- it brought in leave Plan for Recently deleted. Events I made in LifeOS
-- stay. The connection is kept, so reconnecting finds Google's ids again.
create function core.calendar_disconnected(p_connection uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  c core.connections;
begin
  update core.connections set disconnected_at = now(), state = 'connected', broken_since = null
  where id = p_connection
  returning * into c;
  if c.token_secret is not null then
    perform vault.update_secret(c.token_secret, '');
  end if;
  update core.calendar_links set level = 'off', new_events = false, sync_token = null, synced_until = null
  where connection_id = p_connection;
  perform set_config('lifeos.importing', 'on', true);
  update core.items i set archived_at = now()
  from core.external_refs r
  where r.item_id = i.id and r.connection_id = p_connection and i.archived_at is null;
  perform set_config('lifeos.importing', '', true);
end
$$;

-- Whether a call carries the sync's secret, kept only in Vault
-- (environments.md), as the series run's is.
create function core.calendar_secret_ok(p_secret text)
returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select decrypted_secret = p_secret from vault.decrypted_secrets where name = 'calendar_secret'),
    false
  )
$$;

-- Every five minutes, while any calendar is on, wake calendar-sync.
create function core_private.calendar_tick()
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from core.calendars_to_sync()) then
    perform net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
        || '/functions/v1/calendar-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-calendar-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'calendar_secret')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 120000
    );
  end if;
end
$$;

revoke execute on function core.calendar_disconnected(uuid) from public;
revoke execute on function core.calendar_secret_ok(text) from public;
revoke execute on function core_private.calendar_tick() from public;
grant execute on function core.calendar_disconnected(uuid) to service_role;
grant execute on function core.calendar_secret_ok(text) to service_role;

select cron.schedule('calendar-sync', '*/5 * * * *', 'select core_private.calendar_tick()');
