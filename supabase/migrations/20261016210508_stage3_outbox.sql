-- Stage 3 (plan step 10): what goes out to Google, queued on the server
-- (GCL-005, ADR-0048).

-- ---------------------------------------------------------------------------
-- The outbox: one waiting row per Event, or per repeating series, changed
-- in a field Google has; calendar-push sends them. Writes made by the sync
-- itself (lifeos.importing) aren't queued, so nothing echoes back. Whether
-- a row is sent anywhere is decided when it is sent: to the two-way
-- calendar an Event came from, or for one of mine with none, to the
-- calendar where new Events go.

create table core_private.calendar_outbox (
  id bigint generated always as identity primary key,
  person_id uuid not null references core.people (id) on delete cascade,
  item_id uuid references core.items (id) on delete cascade,
  series_id uuid references core.series (id) on delete cascade,
  queued_at timestamptz not null default now(),
  attempts int not null default 0,
  next_try_at timestamptz not null default now(),
  sent_at timestamptz,
  error text,
  check ((item_id is null) <> (series_id is null))
);
create unique index calendar_outbox_waiting_item on core_private.calendar_outbox (item_id) where sent_at is null;
create unique index calendar_outbox_waiting_series on core_private.calendar_outbox (series_id) where sent_at is null;
create index calendar_outbox_due on core_private.calendar_outbox (next_try_at) where sent_at is null;
alter table core_private.calendar_outbox enable row level security;

-- A repeating Event made in LifeOS is one repeating event in Google
-- (GCL-005 3): which, and in which calendar.
create table core_private.series_refs (
  series_id uuid primary key references core.series (id) on delete cascade,
  calendar_link_id uuid not null references core.calendar_links (id) on delete cascade,
  external_id text not null,
  etag text,
  unique (calendar_link_id, external_id)
);
alter table core_private.series_refs enable row level security;

-- Queues an Event or a series, once while it waits.
create function core_private.calendar_queue(p_person uuid, p_item uuid, p_series uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  -- Only for someone with a calendar that goes both ways.
  if not exists (
    select 1 from core.calendar_links l join core.connections c on c.id = l.connection_id
    where l.person_id = p_person and l.level = 'two_way' and c.disconnected_at is null
  ) then
    return;
  end if;
  if p_series is not null then
    insert into core_private.calendar_outbox (person_id, series_id) values (p_person, p_series)
    on conflict (series_id) where sent_at is null do update set queued_at = now(), next_try_at = now();
  else
    insert into core_private.calendar_outbox (person_id, item_id) values (p_person, p_item)
    on conflict (item_id) where sent_at is null do update set queued_at = now(), next_try_at = now();
  end if;
end
$$;

-- An Event changed in what Google has (GCL-005 2, 5): an untouched
-- occurrence of a repeat goes as its series; anything else as itself. An
-- Event switched into a Task goes too, to be taken out of Google.
create function core_private.items_to_calendar() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(current_setting('lifeos.importing', true), '') = 'on' then
    return null;
  end if;
  if new.type <> 'event' and (tg_op = 'INSERT' or old.type <> 'event') then
    return null;
  end if;
  if tg_op = 'UPDATE' and (new.title, new.body, new.place, new.starts_at, new.ends_at, new.all_day,
      new.archived_at, new.type, new.series_id, new.touched_at)
    is not distinct from (old.title, old.body, old.place, old.starts_at, old.ends_at, old.all_day,
      old.archived_at, old.type, old.series_id, old.touched_at) then
    return null;
  end if;
  if new.series_id is not null and new.touched_at is null and new.type = 'event' then
    perform core_private.calendar_queue(new.owner_id, null, new.series_id);
  else
    perform core_private.calendar_queue(new.owner_id, new.id, null);
  end if;
  return null;
end
$$;
create trigger items_to_calendar after insert or update on core.items
for each row execute function core_private.items_to_calendar();

-- A repeat stopped, or changed from an occurrence on, ends Google's rule
-- (ADR-0048).
create function core_private.series_to_calendar() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.type = 'event' and new.ended_on is distinct from old.ended_on then
    perform core_private.calendar_queue(new.owner_id, null, new.id);
  end if;
  return null;
end
$$;
create trigger series_to_calendar after update of ended_on on core.series
for each row execute function core_private.series_to_calendar();

revoke execute on function core_private.calendar_queue(uuid, uuid, uuid) from public;
revoke execute on function core_private.items_to_calendar() from public;
revoke execute on function core_private.series_to_calendar() from public;
