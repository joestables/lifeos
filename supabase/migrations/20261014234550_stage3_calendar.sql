-- Google Calendar's connections, calendars and references, and Plan's read
-- (Stage 3, plan step 4; ADR-0047, ADR-0049). Follows stage3_schema.

-- ---------------------------------------------------------------------------
-- Google Calendar (ADR-0047). A connection is one person's, with its token
-- in Vault; each of its calendars has a sync level; each Event it brought in
-- has an external reference. The Edge Functions write these as the service
-- role; the app reads them and changes a calendar's level.

create table core.connections (
  id uuid primary key default core_private.uuidv7(),
  person_id uuid not null default auth.uid() references core.people (id) on delete cascade,
  provider text not null check (provider in ('google_calendar')),
  -- The Google account, as Google names it.
  account text not null default '' check (length(account) <= 320),
  state text not null default 'connected' check (state in ('connected', 'broken')),
  broken_since timestamptz,
  -- The refresh token's id in vault.secrets; never readable by the app.
  token_secret uuid,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (person_id, provider),
  check ((state = 'broken') = (broken_since is not null))
);

create table core.calendar_links (
  id uuid primary key default core_private.uuidv7(),
  connection_id uuid not null references core.connections (id) on delete cascade,
  person_id uuid not null references core.people (id) on delete cascade,
  -- Google's calendar id and name.
  calendar_id text not null check (length(calendar_id) <= 500),
  name text not null default '' check (length(name) <= 500),
  can_edit boolean not null default false,
  is_primary boolean not null default false,
  level text not null default 'off' check (level in ('off', 'incoming', 'two_way')),
  -- Where Events I make go (GCL-002); one at most, and only a two-way one.
  new_events boolean not null default false,
  -- Google's incremental sync token, and how far ahead instances are kept.
  sync_token text,
  synced_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (connection_id, calendar_id),
  check (level <> 'two_way' or can_edit),
  check (not new_events or level = 'two_way')
);
create index calendar_links_person on core.calendar_links (person_id);
create unique index calendar_links_one_for_new on core.calendar_links (person_id) where new_events;

-- What an Integration brought in (contracts.md#integrationadapter): the
-- outside id, its version, and the raw payload with the mapping that read it.
create table core.external_refs (
  item_id uuid primary key references core.items (id) on delete cascade,
  connection_id uuid not null references core.connections (id) on delete cascade,
  calendar_link_id uuid references core.calendar_links (id) on delete cascade,
  external_id text not null check (length(external_id) <= 1024),
  etag text,
  external_updated timestamptz,
  raw jsonb,
  mapping_version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (calendar_link_id, external_id)
);
create index external_refs_connection on core.external_refs (connection_id);

create trigger connections_updated_at before update on core.connections
for each row execute function core_private.touch_updated_at();
create trigger calendar_links_updated_at before update on core.calendar_links
for each row execute function core_private.touch_updated_at();
create trigger external_refs_updated_at before update on core.external_refs
for each row execute function core_private.touch_updated_at();

alter table core.connections enable row level security;
alter table core.calendar_links enable row level security;
alter table core.external_refs enable row level security;

create policy connections_read on core.connections for select to authenticated
  using (person_id = (select auth.uid()));
create policy calendar_links_read on core.calendar_links for select to authenticated
  using (person_id = (select auth.uid()));
create policy external_refs_read on core.external_refs for select to authenticated
  using (exists (select 1 from core.connections c
                 where c.id = connection_id and c.person_id = (select auth.uid())));

-- The app reads what it shows, never a token or a sync token.
revoke all on core.connections, core.calendar_links, core.external_refs from anon, authenticated;
grant select (id, person_id, provider, account, state, broken_since, last_synced_at, created_at)
  on core.connections to authenticated;
grant select (id, connection_id, person_id, calendar_id, name, can_edit, is_primary, level, new_events)
  on core.calendar_links to authenticated;
grant select (item_id, connection_id, calendar_link_id, external_id)
  on core.external_refs to authenticated;
grant all on core.connections, core.calendar_links, core.external_refs to service_role;

-- A calendar's sync level and where new Events go (GCL-002). Turning a
-- calendar off takes its Events off Plan (archived as the sync left them);
-- turning it on again brings them back with the next sync.
create function core.set_calendar_level(p_link uuid, p_level text)
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
    where e.item_id = i.id and e.calendar_link_id = p_link and i.archived_at is null;
    update core.calendar_links set sync_token = null, synced_until = null where id = p_link;
    perform set_config('lifeos.importing', '', true);
  end if;
  return r;
end
$$;

create function core.set_new_events_calendar(p_link uuid)
returns core.calendar_links
language plpgsql security definer set search_path = '' as $$
declare
  r core.calendar_links;
begin
  update core.calendar_links set new_events = false
  where person_id = (select auth.uid()) and new_events and id is distinct from p_link;
  if p_link is null then
    return null;
  end if;
  update core.calendar_links set new_events = true
  where id = p_link and person_id = (select auth.uid())
  returning * into r;
  if r.id is null then
    raise exception 'No calendar %', p_link using errcode = 'P0002';
  end if;
  return r;
end
$$;

-- An Event from Google stays Personal (GCL-003 5), and on a calendar that
-- isn't two-way, what Google holds is Google's (GCL-004): its title, times,
-- place, notes, repeat and whether it exists. Labels, Reminders and links
-- are LifeOS's own and live in other tables. The sync itself writes with
-- lifeos.importing on.
create function core_private.check_external() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  lvl text;
begin
  if coalesce(current_setting('lifeos.importing', true), '') = 'on' then
    return new;
  end if;
  select coalesce(l.level, 'incoming') into lvl
  from core.external_refs e left join core.calendar_links l on l.id = e.calendar_link_id
  where e.item_id = new.id;
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
create trigger items_check_external before update on core.items
for each row execute function core_private.check_external();

-- ---------------------------------------------------------------------------
-- Plan's read (ADR-0049, PLN-001): the Schedulable Items on any day in the
-- range, in my home timezone, as the caller sees them. Each comes with the
-- first and last day it is on Plan, whether it repeats, and for an Event
-- from Google its calendar and whether it can be changed here.

create function core.plan_items(p_from date, p_to date)
returns table (
  item core.items,
  plan_from date,
  plan_to date,
  repeats boolean,
  calendar_name text,
  calendar_level text
)
language sql stable set search_path = '' as $$
  with me as (
    select coalesce((select p.timezone from core.people p where p.id = (select auth.uid())),
                    'Europe/London') as tz
  ),
  candidates as (
    select i as it from core.items i
    join core.item_types t on t.key = i.type and t.schedulable
    where i.archived_at is null
      and i.status <> 'cancelled'
      and (
        i.do_on between p_from and p_to
        or i.due_on between p_from and p_to
        or (i.starts_at < (p_to + 2)::timestamp at time zone 'UTC'
            and coalesce(i.ends_at, i.starts_at) >= (p_from - 1)::timestamp at time zone 'UTC')
      )
  ),
  placed as (
    select c.it,
      case
        when (c.it).starts_at is not null and (c.it).all_day then ((c.it).starts_at at time zone 'UTC')::date
        when (c.it).starts_at is not null then ((c.it).starts_at at time zone me.tz)::date
        else coalesce((c.it).do_on, (c.it).due_on)
      end as first_day,
      case
        when (c.it).starts_at is not null and (c.it).all_day then
          greatest((coalesce((c.it).ends_at, (c.it).starts_at + interval '1 day') at time zone 'UTC')::date - 1,
                   ((c.it).starts_at at time zone 'UTC')::date)
        when (c.it).starts_at is not null then
          greatest(((coalesce((c.it).ends_at, (c.it).starts_at) - interval '1 microsecond') at time zone me.tz)::date,
                   ((c.it).starts_at at time zone me.tz)::date)
        else coalesce((c.it).do_on, (c.it).due_on)
      end as last_day
    from candidates c, me
  )
  select p.it, p.first_day, p.last_day, (p.it).series_id is not null,
    l.name, case when e.item_id is null then null else coalesce(l.level, 'incoming') end
  from placed p
  left join core.external_refs e on e.item_id = (p.it).id
  left join core.calendar_links l on l.id = e.calendar_link_id
  where p.first_day <= p_to and p.last_day >= p_from
  order by p.first_day, (p.it).all_day is not true, (p.it).starts_at nulls first,
    (p.it).do_at nulls first, (p.it).position, (p.it).id
$$;

-- ---------------------------------------------------------------------------
-- Who may call what (ADR-0042; nothing is open to PUBLIC).

revoke execute on function core_private.check_place() from public;
revoke execute on function core_private.check_external() from public;
revoke execute on function core.set_calendar_level(uuid, text) from public;
revoke execute on function core.set_new_events_calendar(uuid) from public;
revoke execute on function core.plan_items(date, date) from public;
grant execute on function core.set_calendar_level(uuid, text) to authenticated;
grant execute on function core.set_new_events_calendar(uuid) to authenticated;
grant execute on function core.plan_items(date, date) to authenticated;
