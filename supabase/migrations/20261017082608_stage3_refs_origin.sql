-- Stage 3 (bug hunt, 17 October): an Event I made in LifeOS stays mine
-- (GCL-001 3, GCL-002 3, GCL-004; ADR-0048). Its reference to the Google
-- event calendar-push made for it says so: disconnecting, or turning that
-- calendar off, leaves it on Plan, and it is never locked as Google's. And
-- an Event switched into a Task (whose Google event was deleted) is a Task:
-- what Google says of its old event no longer touches it.

alter table core.external_refs add column made_in_lifeos boolean not null default false;

-- Those calendar-push has made so far: no payload from Google yet, or
-- carrying my Event's id.
update core.external_refs set made_in_lifeos = true
where raw is null or raw -> 'extendedProperties' -> 'private' ? 'lifeosId';

create or replace function core.calendar_disconnected(p_connection uuid)
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
  where r.item_id = i.id and r.connection_id = p_connection and i.archived_at is null
    and not r.made_in_lifeos and i.type = 'event';
  perform set_config('lifeos.importing', '', true);
end
$$;

create or replace function core.set_calendar_level(p_link uuid, p_level text)
returns core.calendar_links
language plpgsql security definer set search_path = '' as $$
declare
  r core.calendar_links;
begin
  update core.calendar_links l set
    level = p_level,
    new_events = l.new_events and p_level = 'two_way'
  where l.id = p_link and l.person_id = (select auth.uid())
  returning * into r;
  if r.id is null then
    raise exception 'No calendar %', p_link using errcode = 'P0002';
  end if;
  if p_level = 'off' then
    perform set_config('lifeos.importing', 'on', true);
    update core.items i set archived_at = now()
    from core.external_refs e
    where e.item_id = i.id and e.calendar_link_id = p_link and i.archived_at is null
      and not e.made_in_lifeos and i.type = 'event';
    update core.calendar_links set sync_token = null, synced_until = null where id = p_link;
    perform set_config('lifeos.importing', '', true);
  end if;
  return r;
end
$$;

-- As stage3_calendar_rules, but only for an Event Google made.
create or replace function core_private.check_external() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  lvl text;
begin
  if coalesce(current_setting('lifeos.importing', true), '') = 'on' or old.type <> 'event' then
    return new;
  end if;
  select coalesce(l.level, 'incoming') into lvl
  from core.external_refs e left join core.calendar_links l on l.id = e.calendar_link_id
  where e.item_id = new.id and not e.made_in_lifeos;
  if not found then
    return new;
  end if;
  if new.space_id <> old.space_id then
    raise exception 'An Event from Google Calendar stays Personal' using errcode = '42501';
  end if;
  if lvl <> 'two_way' and (
    (new.title, new.body, new.place, new.starts_at, new.ends_at, new.all_day, new.type,
     new.status, new.series_id)
      is distinct from
    (old.title, old.body, old.place, old.starts_at, old.ends_at, old.all_day, old.type,
     old.status, old.series_id)
    or (new.archived_at is null) <> (old.archived_at is null)
  ) then
    raise exception 'This Event is changed in Google Calendar' using errcode = '42501';
  end if;
  return new;
end
$$;
