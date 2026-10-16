-- Stage 3 (plan step 9): a connection's calendars and their sync (GCL-001,
-- GCL-002, GCL-006, ADR-0047).

-- ---------------------------------------------------------------------------
-- My calendars as Google lists them. The first time, my main calendar is
-- incoming and the rest off (GCL-001 2); after that, a calendar keeps the
-- level I chose, and a new one starts off. A calendar I can only read can't
-- be two-way.
create function core.calendar_set_calendars(p_connection uuid, p_calendars jsonb)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  c core.connections;
  first_time boolean;
begin
  select * into c from core.connections where id = p_connection;
  first_time := not exists (select 1 from core.calendar_links where connection_id = p_connection);
  insert into core.calendar_links (connection_id, person_id, calendar_id, name, can_edit, is_primary, level)
  select p_connection, c.person_id, x ->> 'id', left(coalesce(x ->> 'name', ''), 500),
    coalesce((x ->> 'can_edit')::boolean, false), coalesce((x ->> 'primary')::boolean, false),
    case when first_time and coalesce((x ->> 'primary')::boolean, false) then 'incoming' else 'off' end
  from jsonb_array_elements(p_calendars) x
  on conflict (connection_id, calendar_id) do update set
    name = excluded.name,
    can_edit = excluded.can_edit,
    is_primary = excluded.is_primary,
    level = case when core.calendar_links.level = 'two_way' and not excluded.can_edit
      then 'incoming' else core.calendar_links.level end,
    new_events = core.calendar_links.new_events and excluded.can_edit;
end
$$;

-- The calendars to read: on, on a connection that works.
create function core.calendars_to_sync(p_connection uuid default null)
returns table (
  connection_id uuid,
  link_id uuid,
  calendar_id text,
  level text,
  sync_token text,
  synced_until date,
  timezone text
)
language sql stable security definer set search_path = '' as $$
  select c.id, l.id, l.calendar_id, l.level, l.sync_token, l.synced_until,
    coalesce(p.timezone, 'Europe/London')
  from core.connections c
  join core.calendar_links l on l.connection_id = c.id and l.level <> 'off'
  join core.people p on p.id = c.person_id
  where c.state = 'connected' and c.disconnected_at is null
    and (p_connection is null or c.id = p_connection)
  order by c.id, l.is_primary desc, l.name
$$;

-- A calendar read: where to carry on from, and how far ahead its repeats are made.
create function core.calendar_synced(p_link uuid, p_sync_token text, p_synced_until date)
returns void
language sql security definer set search_path = '' as $$
  update core.calendar_links set sync_token = p_sync_token,
    synced_until = coalesce(p_synced_until, synced_until)
  where id = p_link;
  update core.connections set last_synced_at = now()
  where id = (select connection_id from core.calendar_links where id = p_link);
$$;

-- Google refused the token (GCL-006): the connection is broken until I
-- reconnect; it is recorded for the health check. Imported Events stay.
create function core.calendar_broken(p_connection uuid, p_reason text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  update core.connections set state = 'broken', broken_since = coalesce(broken_since, now())
  where id = p_connection and state <> 'broken';
  if found then
    insert into ops.events (source, kind, message, details, person_id)
    select 'integration', 'calendar_broken', 'Google Calendar refused LifeOS''s access',
      jsonb_build_object('reason', left(p_reason, 300)), c.person_id
    from core.connections c where c.id = p_connection;
  end if;
end
$$;

revoke execute on function core.calendar_set_calendars(uuid, jsonb) from public;
revoke execute on function core.calendars_to_sync(uuid) from public;
revoke execute on function core.calendar_synced(uuid, text, date) from public;
revoke execute on function core.calendar_broken(uuid, text) from public;
grant execute on function core.calendar_set_calendars(uuid, jsonb) to service_role;
grant execute on function core.calendars_to_sync(uuid) to service_role;
grant execute on function core.calendar_synced(uuid, text, date) to service_role;
grant execute on function core.calendar_broken(uuid, text) to service_role;
