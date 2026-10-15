-- Stage 3 (plan step 4): Google Calendar's connections, calendars and
-- references (ADR-0047).

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
