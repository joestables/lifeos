-- The Stage 3 schema (plan step 4): an Event's place and Labels, all-day
-- Events kept as dates, repeating Events, Task <-> Event conversion that
-- maps its times, Plan's read, the person's Plan settings, and Google
-- Calendar's connections, calendars and references.
-- docs/10-requirements/views/plan.md, cross-cutting/events.md,
-- cross-cutting/integrations.md#google-calendar; ADR-0021, 0022, 0029,
-- 0047, 0048, 0049.

-- ---------------------------------------------------------------------------
-- The ontology's lookup table gains whether a Type has a place (filled by
-- the generated *_ontology.sql migration that follows).

alter table core.item_types add column has_place boolean not null default false;

-- ---------------------------------------------------------------------------
-- An Item's place: where an Event happens (EVT-001).

alter table core.items add column place text check (length(place) <= 500);

-- An all-day Event keeps its days as dates, the same in any timezone
-- (EVT-001 3): starts_at is midnight UTC of its first day and ends_at
-- midnight UTC of the day after its last, as Google keeps them.
alter table core.items add constraint items_all_day_dates check (
  all_day is not true
  or ((starts_at at time zone 'UTC')::time = '00:00'
      and (ends_at is null or (ends_at at time zone 'UTC')::time = '00:00'))
);

create or replace function core_private.check_fields(p_fields jsonb) returns void
language plpgsql immutable set search_path = '' as $$
declare
  unknown text;
begin
  select k into unknown from jsonb_object_keys(p_fields) k
  where k not in ('title', 'body', 'status', 'space_id', 'starts_at', 'ends_at', 'all_day',
                  'due_on', 'do_on', 'do_at', 'slot', 'position', 'place')
  limit 1;
  if unknown is not null then
    raise exception 'Unknown field %', unknown using errcode = '22023';
  end if;
end
$$;

create or replace function core.create_item(p_id uuid, p_type text, p_fields jsonb default '{}')
returns core.items
language plpgsql set search_path = '' as $$
declare
  r core.items;
begin
  perform core_private.check_fields(p_fields);
  insert into core.items (id, type, title, body, status, space_id, starts_at, ends_at, all_day,
                          due_on, do_on, do_at, slot, position, place)
  values (
    p_id,
    p_type,
    coalesce(p_fields ->> 'title', ''),
    p_fields ->> 'body',
    coalesce(p_fields ->> 'status', 'active'),
    coalesce((p_fields ->> 'space_id')::uuid, core_private.default_space(p_type)),
    (p_fields ->> 'starts_at')::timestamptz,
    (p_fields ->> 'ends_at')::timestamptz,
    (p_fields ->> 'all_day')::boolean,
    (p_fields ->> 'due_on')::date,
    (p_fields ->> 'do_on')::date,
    (p_fields ->> 'do_at')::time,
    p_fields ->> 'slot',
    p_fields ->> 'position',
    nullif(btrim(p_fields ->> 'place'), '')
  )
  on conflict (id) do nothing;
  select * into r from core.items where id = p_id;
  return r;
end
$$;

create or replace function core.update_item(p_id uuid, p_patch jsonb)
returns core.items
language plpgsql set search_path = '' as $$
declare
  r core.items;
begin
  perform core_private.check_fields(p_patch);
  update core.items i set
    title = case when p_patch ? 'title' then coalesce(p_patch ->> 'title', '') else i.title end,
    body = case when p_patch ? 'body' then p_patch ->> 'body' else i.body end,
    status = case when p_patch ? 'status' then p_patch ->> 'status' else i.status end,
    space_id = case when p_patch ? 'space_id' then (p_patch ->> 'space_id')::uuid else i.space_id end,
    starts_at = case when p_patch ? 'starts_at' then (p_patch ->> 'starts_at')::timestamptz else i.starts_at end,
    ends_at = case when p_patch ? 'ends_at' then (p_patch ->> 'ends_at')::timestamptz else i.ends_at end,
    all_day = case when p_patch ? 'all_day' then (p_patch ->> 'all_day')::boolean else i.all_day end,
    due_on = case when p_patch ? 'due_on' then (p_patch ->> 'due_on')::date else i.due_on end,
    do_on = case when p_patch ? 'do_on' then (p_patch ->> 'do_on')::date else i.do_on end,
    do_at = case when p_patch ? 'do_at' then (p_patch ->> 'do_at')::time else i.do_at end,
    slot = case when p_patch ? 'slot' then p_patch ->> 'slot' else i.slot end,
    position = case when p_patch ? 'position' then p_patch ->> 'position' else i.position end,
    place = case when p_patch ? 'place' then nullif(btrim(p_patch ->> 'place'), '') else i.place end
  where i.id = p_id
  returning * into r;
  if r.id is null then
    raise exception 'No Item % to update', p_id using errcode = 'P0002';
  end if;
  return r;
end
$$;

-- A place only on the Types that have one, as the time fields are checked.
create function core_private.check_place() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.place is not null
    and not (select t.has_place from core.item_types t where t.key = new.type)
  then
    raise exception 'A % has no place', new.type using errcode = '23514';
  end if;
  return new;
end
$$;
create trigger items_check_place before insert or update of place, type on core.items
for each row execute function core_private.check_place();

-- ---------------------------------------------------------------------------
-- An Event's default Reminder is 30 minutes before it starts, for a timed
-- Event I make; none when it is all day, and none for an Event from Google
-- (EVT-003, GCL-003). The rest is as Stage 2 left it.

create or replace function core_private.sync_reminders() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  t core.item_types;
  anchor_day date;
  importing boolean := coalesce(current_setting('lifeos.importing', true), '') = 'on';
begin
  select * into t from core.item_types where key = new.type;

  if tg_op = 'UPDATE' and (new.type <> old.type) then
    -- Converted: Labels and marks go if the new Type has none (ITM-004).
    if not t.uses_labels then
      delete from core.item_labels where item_id = new.id;
    end if;
    if t.mark is null then
      delete from core.marks where item_id = new.id;
    end if;
  end if;

  anchor_day := case t.default_reminder
    when 'do_on' then new.do_on
    when 'due_on' then new.due_on
    when 'starts_at' then case when new.all_day is not true then new.starts_at::date end
  end;
  if t.default_reminder is null or anchor_day is null then
    delete from core.reminders where item_id = new.id and is_default;
  elsif not importing
    and not exists (select 1 from core.reminders where item_id = new.id and person_id = new.owner_id and is_default)
    and coalesce((select (p.reminder_defaults ->> new.type)::boolean from core.people p where p.id = new.owner_id), true)
    -- Only when it gains the date (or becomes a Type with a default): a
    -- default I removed or changed doesn't come back when the date moves.
    and (tg_op = 'INSERT' or old.type <> new.type or case t.default_reminder
      when 'do_on' then old.do_on
      when 'due_on' then old.due_on
      when 'starts_at' then case when old.all_day is not true then old.starts_at::date end
    end is null)
  then
    insert into core.reminders (item_id, person_id, anchor, offset_minutes, is_default)
    values (new.id, new.owner_id, t.default_reminder,
            case when t.default_reminder = 'starts_at' then -30 else 0 end, true);
  end if;

  if tg_op = 'UPDATE'
    and (old.do_on, old.do_at, old.due_on, old.starts_at) is distinct from (new.do_on, new.do_at, new.due_on, new.starts_at)
  then
    update core.reminders set snoozed_until = null where item_id = new.id;
  end if;
  return null;
end
$$;

-- ---------------------------------------------------------------------------
-- A person's home timezone (ADR-0021), for writes that work in it.

create function core_private.home_timezone(p_person uuid) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce((select p.timezone from core.people p where p.id = p_person), 'Europe/London')
$$;
grant execute on function core_private.home_timezone(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Task <-> Event (EVT-005, ADR-0020): the times are mapped, in the owner's
-- timezone. A Task's do-on date and time become the Event's start, an hour
-- long, or all day with no time; an Event's start becomes the Task's do-on
-- date and time. Reminders keep their moment: the Type's default goes (the
-- new Type makes its own), and the rest become fixed at when they fire.

create or replace function core.convert_item(p_id uuid, p_type text)
returns core.items
language plpgsql set search_path = '' as $$
declare
  r core.items;
  tz text;
begin
  select * into r from core.items where id = p_id;
  if r.id is null then
    raise exception 'No Item % to convert', p_id using errcode = 'P0002';
  end if;
  if r.type = p_type then
    return r;
  end if;
  tz := core_private.home_timezone(r.owner_id);

  if (r.type, p_type) in (('task', 'event'), ('event', 'task')) then
    delete from core.reminders where item_id = p_id and is_default;
    update core.reminders set anchor = null, fixed_at = fires_at, offset_days = 0,
      offset_minutes = 0, at_time = null
    where item_id = p_id and anchor is not null and fires_at is not null;
    delete from core.reminders where item_id = p_id and anchor is not null;
  end if;

  update core.items i set
    type = p_type,
    status = case
      when i.status = any (coalesce((select t.statuses from core.item_types t where t.key = p_type), array[i.status]))
        then i.status
      else 'active'
    end,
    starts_at = case
      when i.type = 'task' and p_type = 'event' and i.do_on is not null then
        case when i.do_at is null then i.do_on::timestamp at time zone 'UTC'
             else (i.do_on + i.do_at) at time zone tz end
      when p_type = 'task' then null
      else i.starts_at
    end,
    ends_at = case
      when i.type = 'task' and p_type = 'event' and i.do_on is not null then
        case when i.do_at is null then (i.do_on + 1)::timestamp at time zone 'UTC'
             else (i.do_on + i.do_at) at time zone tz + interval '1 hour' end
      when p_type = 'task' then null
      else i.ends_at
    end,
    all_day = case
      when i.type = 'task' and p_type = 'event' and i.do_on is not null then i.do_at is null
      when p_type = 'task' then null
      else i.all_day
    end,
    do_on = case
      when i.type = 'event' and p_type = 'task' and i.starts_at is not null then
        case when i.all_day then (i.starts_at at time zone 'UTC')::date
             else (i.starts_at at time zone tz)::date end
      when p_type = 'event' then null
      else i.do_on
    end,
    do_at = case
      when i.type = 'event' and p_type = 'task' and i.starts_at is not null and i.all_day is not true then
        (i.starts_at at time zone tz)::time
      when p_type = 'event' then null
      else i.do_at
    end,
    due_on = case when p_type = 'event' then null else i.due_on end,
    place = case when p_type = 'task' then null else i.place end
  where i.id = p_id;
  select * into r from core.items where id = p_id;
  return r;
end
$$;

-- ---------------------------------------------------------------------------
-- Repeating Events (EVT-004): a series of Events makes each occurrence at
-- the template's start time, in the series' timezone, for its length; an
-- all-day one for its number of days. The template: title, body, place,
-- label_ids, reminders, and for an Event start_time, duration_minutes,
-- all_day and days; for a Task do_at and due_offset_days.

-- A Type repeats when it is dated: a do-on date (a Task) or a start (an
-- Event).
create or replace function core_private.check_series() returns trigger
language plpgsql set search_path = '' as $$
declare
  t core.item_types;
begin
  select * into t from core.item_types where key = new.type;
  if not (t.time_fields && array['do_on', 'starts_at']) then
    raise exception 'A % can''t repeat', t.label using errcode = '23514';
  end if;
  return new;
end
$$;

create or replace function core_private.make_occurrences(p_series core.series, p_occurrences jsonb)
returns void
language plpgsql set search_path = '' as $$
declare
  o jsonb;
  v_id uuid;
  v_on date;
  t jsonb := p_series.template;
  is_event boolean := p_series.type = 'event';
  v_all_day boolean := coalesce((p_series.template ->> 'all_day')::boolean, false);
  v_start timestamptz;
  v_end timestamptz;
begin
  perform set_config('lifeos.series_writing', 'on', true);
  for o in select * from jsonb_array_elements(p_occurrences) loop
    v_on := (o ->> 'on')::date;
    continue when p_series.ended_on is not null and v_on > p_series.ended_on;
    v_id := coalesce((o ->> 'id')::uuid, core_private.uuidv7());
    if is_event then
      if v_all_day then
        v_start := v_on::timestamp at time zone 'UTC';
        v_end := (v_on + coalesce((t ->> 'days')::int, 1))::timestamp at time zone 'UTC';
      else
        v_start := (v_on + coalesce((t ->> 'start_time')::time, time '09:00')) at time zone p_series.timezone;
        v_end := v_start + make_interval(mins => coalesce((t ->> 'duration_minutes')::int, 60));
      end if;
    end if;
    insert into core.items (id, type, title, body, place, space_id, owner_id, status,
                            do_on, do_at, due_on, starts_at, ends_at, all_day,
                            series_id, occurrence_on)
    values (
      v_id,
      p_series.type,
      coalesce(t ->> 'title', ''),
      t ->> 'body',
      case when is_event then nullif(btrim(t ->> 'place'), '') end,
      p_series.space_id,
      p_series.owner_id,
      'active',
      case when not is_event then v_on end,
      case when not is_event then (t ->> 'do_at')::time end,
      case when not is_event then v_on + (t ->> 'due_offset_days')::int end,
      case when is_event then v_start end,
      case when is_event then v_end end,
      case when is_event then v_all_day end,
      p_series.id,
      v_on
    )
    on conflict do nothing;
    if found then
      insert into core.item_labels (item_id, label_id)
      select v_id, l.id from core.labels l
      where l.id in (select value::uuid from jsonb_array_elements_text(coalesce(t -> 'label_ids', '[]')))
      on conflict do nothing;
      insert into core.reminders (item_id, person_id, anchor, offset_days, at_time, offset_minutes)
      select v_id, p_series.owner_id, r ->> 'anchor', coalesce((r ->> 'offset_days')::int, 0),
        (r ->> 'at_time')::time, coalesce((r ->> 'offset_minutes')::int, 0)
      from jsonb_array_elements(coalesce(t -> 'reminders', '[]')) r
      where r ->> 'anchor' in ('do_on', 'due_on', 'starts_at');
    end if;
  end loop;
  perform set_config('lifeos.series_writing', '', true);
end
$$;

-- Makes a Task or an Event repeat (TSK-008, EVT-004), or changes its repeat
-- "for this and all following" (TSK-011): the Item becomes the first
-- occurrence of a new series, made with the window the device worked out.
create or replace function core.set_repeat(
  p_item uuid,
  p_series uuid,
  p_mode text,
  p_rule text,
  p_starts_on date,
  p_timezone text,
  p_template jsonb,
  p_occurrences jsonb,
  p_until date
) returns core.items
language plpgsql set search_path = '' as $$
declare
  it core.items;
  s core.series;
  first_on date := (p_occurrences -> 0 ->> 'on')::date;
  v_all_day boolean := coalesce((p_template ->> 'all_day')::boolean, false);
begin
  select * into it from core.items where id = p_item;
  if it.id is null then
    raise exception 'No Item % to repeat', p_item using errcode = 'P0002';
  end if;
  -- A replay: it was all done in one go.
  if it.series_id = p_series then
    return it;
  end if;
  if first_on is null or (p_occurrences -> 0 ->> 'id')::uuid is distinct from p_item then
    raise exception 'A repeat starts with the Item itself' using errcode = '22023';
  end if;
  if it.type = 'event' and p_mode <> 'schedule' then
    raise exception 'An Event repeats on a schedule' using errcode = '22023';
  end if;

  insert into core.series (id, type, space_id, mode, rule, starts_on, timezone, template, generated_until)
  values (p_series, it.type, it.space_id, p_mode, p_rule, p_starts_on, p_timezone, p_template, p_until)
  returning * into s;

  if it.series_id is not null then
    perform core_private.end_series(it.series_id, it.occurrence_on - 1, p_item);
  end if;

  perform set_config('lifeos.series_writing', 'on', true);
  if it.type = 'event' then
    update core.items set
      series_id = p_series,
      occurrence_on = first_on,
      starts_at = case when v_all_day then first_on::timestamp at time zone 'UTC'
        else (first_on + coalesce((p_template ->> 'start_time')::time, time '09:00')) at time zone p_timezone end,
      ends_at = case when v_all_day then (first_on + coalesce((p_template ->> 'days')::int, 1))::timestamp at time zone 'UTC'
        else (first_on + coalesce((p_template ->> 'start_time')::time, time '09:00')) at time zone p_timezone
          + make_interval(mins => coalesce((p_template ->> 'duration_minutes')::int, 60)) end,
      all_day = v_all_day,
      touched_at = null
    where id = p_item
    returning * into it;
  else
    update core.items set
      series_id = p_series,
      occurrence_on = first_on,
      do_on = first_on,
      do_at = (p_template ->> 'do_at')::time,
      due_on = first_on + (p_template ->> 'due_offset_days')::int,
      status = case when status = 'idea' then 'active' else status end,
      touched_at = null
    where id = p_item
    returning * into it;
  end if;
  perform set_config('lifeos.series_writing', '', true);

  perform core_private.make_occurrences(s, p_occurrences - 0);
  return it;
end
$$;

-- ---------------------------------------------------------------------------
-- My Plan settings (PLN-004): the Types I've hidden, on every device. Hidden
-- rather than shown, so a Type a later stage adds shows until I hide it.

alter table core.people
  add column plan_hidden_types text[] not null default '{}';
grant update (plan_hidden_types) on core.people to authenticated;

create or replace function core.update_settings(p_patch jsonb)
returns core.people
language plpgsql set search_path = '' as $$
declare
  r core.people;
begin
  if exists (select 1 from jsonb_object_keys(p_patch) k
             where k not in ('name', 'timezone', 'default_reminder_time', 'reminder_defaults',
                             'digest_on', 'digest_time', 'plan_hidden_types')) then
    raise exception 'Unknown field in %', p_patch using errcode = '22023';
  end if;
  if p_patch ? 'timezone' and not exists (select 1 from pg_catalog.pg_timezone_names where name = p_patch ->> 'timezone') then
    raise exception 'Unknown timezone %', p_patch ->> 'timezone' using errcode = '22023';
  end if;
  if p_patch ? 'plan_hidden_types' and exists (
    select 1 from jsonb_array_elements_text(p_patch -> 'plan_hidden_types') k
    where not exists (select 1 from core.item_types t where t.key = k and t.schedulable)
  ) then
    raise exception 'Plan shows only Types that can be planned' using errcode = '22023';
  end if;
  update core.people p set
    name = case when p_patch ? 'name' then coalesce(p_patch ->> 'name', '') else p.name end,
    timezone = case when p_patch ? 'timezone' then p_patch ->> 'timezone' else p.timezone end,
    default_reminder_time = case when p_patch ? 'default_reminder_time' then (p_patch ->> 'default_reminder_time')::time else p.default_reminder_time end,
    reminder_defaults = case when p_patch ? 'reminder_defaults' then p.reminder_defaults || (p_patch -> 'reminder_defaults') else p.reminder_defaults end,
    digest_on = case when p_patch ? 'digest_on' then (p_patch ->> 'digest_on')::boolean else p.digest_on end,
    digest_time = case when p_patch ? 'digest_time' then (p_patch ->> 'digest_time')::time else p.digest_time end,
    plan_hidden_types = case when p_patch ? 'plan_hidden_types'
      then array(select distinct jsonb_array_elements_text(p_patch -> 'plan_hidden_types') order by 1)
      else p.plan_hidden_types end
  where p.id = (select auth.uid())
  returning * into r;
  return r;
end
$$;

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
