-- Sharing Tasks and Events with a Household (HSH-005; Joe, 4 November):
-- every member's own default Reminder, a shared Task in every member's
-- digest and overdue nudges, Reminders given on joining and taken on
-- leaving, and links across the Household removed on leaving (ADR-0016).

-- ---------------------------------------------------------------------------
-- Each member's default Reminder (HSH-005 4), as their own Settings give it.
-- Given when the Item gains its date (or becomes a Type with a default), to
-- everyone in its Space; when it moves to another Space, to those who
-- weren't in the old one, and taken from those not in the new one.

create function core_private.give_defaults(p_item core.items, p_people uuid[])
returns void
language plpgsql security definer set search_path = '' as $$
declare
  t core.item_types;
  anchor_day date;
begin
  select * into t from core.item_types where key = p_item.type;
  -- Only on a date the default hangs on (an all-day Event has none).
  anchor_day := case t.default_reminder
    when 'do_on' then p_item.do_on
    when 'due_on' then p_item.due_on
    when 'starts_at' then case when p_item.all_day is not true then p_item.starts_at::date end
  end;
  if anchor_day is null then
    return;
  end if;
  insert into core.reminders (item_id, person_id, anchor, offset_minutes, is_default)
  select p_item.id, who, t.default_reminder,
    case when t.default_reminder = 'starts_at' then -30 else 0 end, true
  from unnest(p_people) who
  where not exists (
      select 1 from core.reminders r where r.item_id = p_item.id and r.person_id = who and r.is_default)
    and coalesce((select (p.reminder_defaults ->> p_item.type)::boolean from core.people p where p.id = who), true);
end
$$;

revoke execute on function core_private.give_defaults(core.items, uuid[]) from public, anon, authenticated;

create or replace function core_private.sync_reminders()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  t core.item_types;
  anchor_day date;
  importing boolean := coalesce(current_setting('lifeos.importing', true), '') = 'on';
  gained boolean;
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

  -- Moved out of a Space: who is no longer in it loses their Reminders on
  -- it, and Labels of the old Space come off (a Label is its Item's Space's).
  if tg_op = 'UPDATE' and new.space_id is distinct from old.space_id then
    delete from core.reminders r
    where r.item_id = new.id
      and r.person_id not in (select m.person_id from core.space_members m where m.space_id = new.space_id);
    delete from core.item_labels il using core.labels lb
    where il.item_id = new.id and lb.id = il.label_id and lb.space_id <> new.space_id;
  end if;

  anchor_day := case t.default_reminder
    when 'do_on' then new.do_on
    when 'due_on' then new.due_on
    when 'starts_at' then case when new.all_day is not true then new.starts_at::date end
  end;
  if t.default_reminder is null or anchor_day is null then
    delete from core.reminders where item_id = new.id and is_default;
  elsif not importing then
    -- Only when it gains the date (or becomes a Type with a default): a
    -- default I removed or changed doesn't come back when the date moves.
    gained := tg_op = 'INSERT' or old.type <> new.type or case t.default_reminder
      when 'do_on' then old.do_on
      when 'due_on' then old.due_on
      when 'starts_at' then case when old.all_day is not true then old.starts_at::date end
    end is null;
    if gained then
      perform core_private.give_defaults(new,
        array(select m.person_id from core.space_members m where m.space_id = new.space_id));
    elsif new.space_id is distinct from old.space_id then
      perform core_private.give_defaults(new,
        array(select m.person_id from core.space_members m where m.space_id = new.space_id
              except select m.person_id from core.space_members m where m.space_id = old.space_id));
    end if;
  end if;

  if tg_op = 'UPDATE'
    and (old.do_on, old.do_at, old.due_on, old.starts_at) is distinct from (new.do_on, new.do_at, new.due_on, new.starts_at)
  then
    update core.reminders set snoozed_until = null where item_id = new.id;
  end if;
  return null;
end
$$;

drop trigger items_reminders on core.items;
create trigger items_reminders after insert or update of type, do_on, do_at, due_on, starts_at, space_id
  on core.items for each row execute function core_private.sync_reminders();

-- ---------------------------------------------------------------------------
-- A shared Task is everyone's (HSH-005 3): counted in each member's digest,
-- and nudged to each member when overdue, once each (REM-008, REM-009).

create or replace function core_private.day_counts(p_person uuid, p_today date)
returns table(overdue integer, today integer, to_sort integer)
language sql stable set search_path = '' as $$
  select
    count(*) filter (where i.type = 'task' and i.due_on < p_today)::int,
    count(*) filter (where i.type = 'task' and not coalesce(i.due_on < p_today, false)
                     and (i.do_on <= p_today or i.due_on = p_today))::int,
    count(*) filter (where i.type = 'thought')::int
  from core.items i
  where i.space_id in (select m.space_id from core.space_members m where m.person_id = p_person)
    and i.archived_at is null and i.status = 'active'
$$;

create or replace function core_private.queue_notifications(p_now timestamptz default now())
returns int
language plpgsql security definer set search_path = '' as $$
declare
  waiting int;
begin
  -- Reminders that have come due in the last 12 hours (REM-004 1, 3).
  insert into core.reminder_deliveries (kind, key, person_id, device_id, reminder_id, item_id, fire_at)
  select distinct on (r.item_id, d.id, r.fires_at)
    'reminder', 'reminder:' || r.id, r.person_id, d.id, r.id, r.item_id, r.fires_at
  from core.reminders r
  join core.push_devices d on d.person_id = r.person_id and d.enabled and d.gone_at is null
  where r.fires_at <= p_now and r.fires_at > p_now - interval '12 hours'
    -- Not one already past when it was set (a Task captured at 15:00 for
    -- today has its 09:00 default behind it).
    and r.fires_at >= r.updated_at - interval '1 minute'
    and core_private.item_open(r.item_id)
    and not exists (
      select 1 from core.reminder_deliveries x
      where x.kind = 'reminder' and x.item_id = r.item_id and x.device_id = d.id
        and x.fire_at = r.fires_at and x.key <> 'reminder:' || r.id
    )
  order by r.item_id, d.id, r.fires_at, r.id
  on conflict (key, fire_at, device_id) do nothing;

  -- Ones that couldn't be sent within 12 hours are recorded as missed, not
  -- sent (REM-004 3).
  insert into core.reminder_deliveries (kind, key, person_id, device_id, reminder_id, item_id, fire_at, status)
  select distinct on (r.item_id, d.id, r.fires_at)
    'reminder', 'reminder:' || r.id, r.person_id, d.id, r.id, r.item_id, r.fires_at, 'missed'
  from core.reminders r
  join core.push_devices d on d.person_id = r.person_id and d.enabled and d.gone_at is null
  where r.fires_at <= p_now - interval '12 hours' and r.fires_at > p_now - interval '36 hours'
    and r.fires_at >= r.updated_at - interval '1 minute'
    and core_private.item_open(r.item_id)
    and not exists (
      select 1 from core.reminder_deliveries x
      where x.kind = 'reminder' and x.item_id = r.item_id and x.device_id = d.id
        and x.fire_at = r.fires_at and x.key <> 'reminder:' || r.id
    )
  order by r.item_id, d.id, r.fires_at, r.id
  on conflict (key, fire_at, device_id) do nothing;

  -- The morning digest at each person's digest time, in their timezone
  -- (REM-008). With nothing to say it is recorded as skipped, so it doesn't
  -- arrive later in the day.
  insert into core.reminder_deliveries (kind, key, person_id, device_id, fire_at, status)
  select 'digest', 'digest:' || p.id || ':' || local.day, p.id, d.id, local.at,
    case when c.overdue + c.today + c.to_sort = 0 then 'skipped' else 'waiting' end
  from core.people p
  cross join lateral (
    select (p_now at time zone p.timezone)::date as day,
      ((p_now at time zone p.timezone)::date + p.digest_time) at time zone p.timezone as at
  ) local
  cross join lateral core_private.day_counts(p.id, local.day) c
  join core.push_devices d on d.person_id = p.id and d.enabled and d.gone_at is null
  where p.digest_on and local.at <= p_now and local.at > p_now - interval '12 hours'
  on conflict (key, fire_at, device_id) do nothing;

  -- Without a digest, each overdue Task in my Spaces is nudged once to me,
  -- at my default time (REM-009; a shared Task to each member, HSH-005 3).
  insert into core.reminder_deliveries (kind, key, person_id, device_id, item_id, fire_at)
  select 'overdue', 'overdue:' || i.id || ':' || i.due_on, p.id, d.id, i.id, local.at
  from core.people p
  cross join lateral (
    select (p_now at time zone p.timezone)::date as day,
      ((p_now at time zone p.timezone)::date + p.default_reminder_time) at time zone p.timezone as at
  ) local
  join core.space_members m on m.person_id = p.id
  join core.items i on i.space_id = m.space_id and i.type = 'task' and i.status = 'active'
    and i.archived_at is null and i.due_on < local.day
  join core.push_devices d on d.person_id = p.id and d.enabled and d.gone_at is null
  where not p.digest_on and local.at <= p_now and local.at > p_now - interval '12 hours'
    and not exists (
      select 1 from core.reminder_deliveries x
      where x.key = 'overdue:' || i.id || ':' || i.due_on and x.person_id = p.id
    )
  on conflict (key, fire_at, device_id) do nothing;

  -- A sender that stopped mid-way leaves rows claimed: they count too.
  select count(*)::int into waiting from core.reminder_deliveries
  where (status in ('waiting', 'failed')
      or (status = 'sending' and claimed_at < p_now - interval '5 minutes'))
    and fire_at <= p_now;
  return waiting;
end
$$;

-- ---------------------------------------------------------------------------
-- A repeating Item's Space is its repeat's: moving one occurrence moves the
-- series and every occurrence, so the next ones the series makes are shared
-- (or not) too.

create function core_private.move_series()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if pg_trigger_depth() > 1 then
    return null;
  end if;
  update core.series set space_id = new.space_id where id = new.series_id and space_id <> new.space_id;
  update core.items set space_id = new.space_id
  where series_id = new.series_id and id <> new.id and space_id <> new.space_id;
  return null;
end
$$;

create trigger items_move_series after update of space_id on core.items
  for each row when (new.series_id is not null and old.space_id is distinct from new.space_id)
  execute function core_private.move_series();

-- ---------------------------------------------------------------------------
-- A shared Event in every member's Google calendar (GCL-007, ADR-0048). The
-- maker's copy stays as before (core.external_refs, core_private.series_refs);
-- each other member's is a copy of their own, in their default calendar,
-- sent through their own connection. A copy deleted in Google is dropped:
-- not sent again, and the Event stays.

create table core_private.event_copies (
  item_id uuid not null references core.items (id) on delete cascade,
  person_id uuid not null references core.people (id) on delete cascade,
  calendar_link_id uuid not null references core.calendar_links (id) on delete cascade,
  external_id text check (length(external_id) <= 1024),
  etag text,
  external_updated timestamptz,
  dropped boolean not null default false,
  primary key (item_id, person_id),
  unique (calendar_link_id, external_id)
);
alter table core_private.event_copies enable row level security;

create table core_private.series_copies (
  series_id uuid not null references core.series (id) on delete cascade,
  person_id uuid not null references core.people (id) on delete cascade,
  calendar_link_id uuid not null references core.calendar_links (id) on delete cascade,
  external_id text check (length(external_id) <= 1024),
  etag text,
  dropped boolean not null default false,
  primary key (series_id, person_id),
  unique (calendar_link_id, external_id)
);
alter table core_private.series_copies enable row level security;
create index event_copies_person on core_private.event_copies (person_id);
create index series_copies_person on core_private.series_copies (person_id);

-- One waiting job per Item (or series) and person: the maker's and each copy's.
alter table core_private.calendar_outbox add column copy boolean not null default false;
drop index core_private.calendar_outbox_waiting_item;
drop index core_private.calendar_outbox_waiting_series;
create unique index calendar_outbox_waiting_item on core_private.calendar_outbox (item_id, person_id)
  where sent_at is null;
create unique index calendar_outbox_waiting_series on core_private.calendar_outbox (series_id, person_id)
  where sent_at is null;

create or replace function core_private.calendar_queue(p_person uuid, p_item uuid, p_series uuid, p_copy boolean default false)
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
    insert into core_private.calendar_outbox (person_id, series_id, copy) values (p_person, p_series, p_copy)
    on conflict (series_id, person_id) where sent_at is null do update set queued_at = now(), next_try_at = now();
  else
    insert into core_private.calendar_outbox (person_id, item_id, copy) values (p_person, p_item, p_copy)
    on conflict (item_id, person_id) where sent_at is null do update set queued_at = now(), next_try_at = now();
  end if;
end
$$;
drop function core_private.calendar_queue(uuid, uuid, uuid);

-- Every member of the Spaces given, and anyone with a copy already, but those
-- excepted (the maker, whose own job goes as before).
create function core_private.queue_copies(p_item uuid, p_series uuid, p_spaces uuid[], p_except uuid[])
returns void
language plpgsql security definer set search_path = '' as $$
declare
  who uuid;
begin
  for who in
    select m.person_id from core.space_members m
    join core.spaces s on s.id = m.space_id and s.kind = 'household'
    where m.space_id = any (p_spaces)
    union select c.person_id from core_private.event_copies c where p_item is not null and c.item_id = p_item
    union select c.person_id from core_private.series_copies c where p_series is not null and c.series_id = p_series
  loop
    if not who = any (p_except) then
      perform core_private.calendar_queue(who, p_item, p_series, true);
    end if;
  end loop;
end
$$;

revoke execute on function core_private.calendar_queue(uuid, uuid, uuid, boolean) from public, anon, authenticated;
revoke execute on function core_private.queue_copies(uuid, uuid, uuid[], uuid[]) from public, anon, authenticated;

create or replace function core_private.items_to_calendar()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  spaces uuid[] := array[new.space_id, case when tg_op = 'UPDATE' then old.space_id end];
begin
  if coalesce(current_setting('lifeos.importing', true), '') = 'on' then
    return null;
  end if;
  if new.type <> 'event' and (tg_op = 'INSERT' or old.type <> 'event') then
    return null;
  end if;
  if tg_op = 'UPDATE' and (new.title, new.body, new.place, new.starts_at, new.ends_at, new.all_day,
      new.archived_at, new.type, new.series_id, new.touched_at, new.space_id)
    is not distinct from (old.title, old.body, old.place, old.starts_at, old.ends_at, old.all_day,
      old.archived_at, old.type, old.series_id, old.touched_at, old.space_id) then
    return null;
  end if;
  if new.series_id is not null and new.touched_at is null and new.type = 'event' then
    perform core_private.calendar_queue(new.owner_id, null, new.series_id);
    perform core_private.queue_copies(null, new.series_id, spaces, array[new.owner_id]);
  else
    perform core_private.calendar_queue(new.owner_id, new.id, null);
    perform core_private.queue_copies(new.id, null, spaces, array[new.owner_id]);
  end if;
  return null;
end
$$;

create or replace function core_private.series_to_calendar()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.type = 'event' and new.ended_on is distinct from old.ended_on then
    perform core_private.calendar_queue(new.owner_id, null, new.id);
    perform core_private.queue_copies(null, new.id, array[new.space_id], array[new.owner_id]);
  end if;
  return null;
end
$$;

-- An Event from Google may be shared (HSH-005 8), unless its calendar is
-- incoming only: then it is Google's, and stays as Google has it (GCL-004).
create or replace function core_private.check_external()
returns trigger
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
  if lvl <> 'two_way' and (
    (new.title, new.body, new.place, new.starts_at, new.ends_at, new.all_day, new.type,
     new.status, new.series_id, new.space_id)
      is distinct from
    (old.title, old.body, old.place, old.starts_at, old.ends_at, old.all_day, old.type,
     old.status, old.series_id, old.space_id)
    or (new.archived_at is null) <> (old.archived_at is null)
  ) then
    raise exception 'This Event is changed in Google Calendar' using errcode = '42501';
  end if;
  return new;
end
$$;

-- Whether a person still sees an Item as a member of its Household.
create function core_private.shared_with(p_person uuid, p_space uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from core.space_members m join core.spaces s on s.id = m.space_id and s.kind = 'household'
    where m.space_id = p_space and m.person_id = p_person
  )
$$;
revoke execute on function core_private.shared_with(uuid, uuid) from public, anon, authenticated;

create or replace function core.calendar_outbox_claim(p_limit integer default 50)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  o core_private.calendar_outbox;
  i core.items;
  s core.series;
  r core.external_refs;
  sr core_private.series_refs;
  cp core_private.event_copies;
  sc core_private.series_copies;
  l core.calendar_links;
  c core.connections;
  jobs jsonb := '[]';
  tz text;
  gone boolean;
  ext text;
  etg text;
begin
  for o in
    select * from core_private.calendar_outbox
    where sent_at is null and next_try_at <= now()
    order by queued_at limit p_limit
    for update skip locked
  loop
    l := null; r := null; sr := null; cp := null; sc := null; gone := false; ext := null; etg := null;
    select coalesce(p.timezone, 'Europe/London') into tz from core.people p where p.id = o.person_id;
    if o.item_id is not null then
      select * into i from core.items where id = o.item_id;
      if o.copy then
        -- A member's copy (GCL-007): gone once the Event is, or they no longer share it.
        select * into cp from core_private.event_copies where item_id = o.item_id and person_id = o.person_id;
        gone := i.archived_at is not null or i.type <> 'event' or not core_private.shared_with(o.person_id, i.space_id);
        if cp.dropped or (cp.item_id is null and (gone or i.series_id is not null)) then
          update core_private.calendar_outbox set sent_at = now(),
            error = case when cp.dropped then 'dropped in Google' else 'nothing to send' end
          where id = o.id;
          continue;
        end if;
        if cp.item_id is not null then
          select * into l from core.calendar_links where id = cp.calendar_link_id;
        else
          select * into l from core.calendar_links where person_id = o.person_id and new_events;
        end if;
        ext := cp.external_id;
        etg := cp.etag;
      else
        select * into r from core.external_refs where item_id = o.item_id;
        if r.item_id is not null then
          select * into l from core.calendar_links where id = r.calendar_link_id;
        elsif i.archived_at is null and i.type = 'event' and i.series_id is null then
          select * into l from core.calendar_links
          where id = core_private.new_event_calendar(o.person_id, array[o.item_id]);
        end if;
        ext := r.external_id;
        etg := r.etag;
      end if;
    else
      select * into s from core.series where id = o.series_id;
      if o.copy then
        select * into sc from core_private.series_copies where series_id = o.series_id and person_id = o.person_id;
        gone := not core_private.shared_with(o.person_id, s.space_id);
        if sc.dropped or (sc.series_id is null and gone) then
          update core_private.calendar_outbox set sent_at = now(),
            error = case when sc.dropped then 'dropped in Google' else 'nothing to send' end
          where id = o.id;
          continue;
        end if;
        if sc.series_id is not null then
          select * into l from core.calendar_links where id = sc.calendar_link_id;
        else
          select * into l from core.calendar_links where person_id = o.person_id and new_events;
        end if;
        ext := sc.external_id;
        etg := sc.etag;
      else
        select * into sr from core_private.series_refs where series_id = o.series_id;
        if sr.series_id is not null then
          select * into l from core.calendar_links where id = sr.calendar_link_id;
        else
          select * into l from core.calendar_links
          where id = coalesce(
            (select r2.calendar_link_id from core.external_refs r2
             join core.items x on x.id = r2.item_id
             where x.series_id = o.series_id and r2.calendar_link_id is not null
             order by x.occurrence_on limit 1),
            core_private.new_event_calendar(o.person_id,
              array(select x.id from core.items x where x.series_id = o.series_id)));
        end if;
        ext := sr.external_id;
        etg := sr.etag;
      end if;
    end if;

    if l.id is null or l.level <> 'two_way' then
      update core_private.calendar_outbox set sent_at = now(), error = 'nowhere to go' where id = o.id;
      continue;
    end if;
    select * into c from core.connections where id = l.connection_id;
    if c.state <> 'connected' or c.disconnected_at is not null then
      update core_private.calendar_outbox set next_try_at = now() + interval '15 minutes'
      where id = o.id;
      continue;
    end if;

    update core_private.calendar_outbox
    set attempts = attempts + 1,
        next_try_at = now() + least(interval '6 hours', interval '5 minutes' * power(2, attempts))
    where id = o.id;

    jobs := jobs || jsonb_build_object(
      'outbox', o.id,
      'queued_at', o.queued_at,
      'connection', c.id,
      'link', l.id,
      'calendar_id', l.calendar_id,
      'timezone', tz,
      'item', case when o.item_id is not null then jsonb_build_object(
        'id', i.id, 'type', i.type, 'title', i.title, 'body', i.body, 'place', i.place,
        'starts_at', i.starts_at, 'ends_at', i.ends_at, 'all_day', i.all_day,
        'archived', i.archived_at is not null or gone,
        'external_id', ext, 'etag', etg) end,
      'series', case when o.series_id is not null then jsonb_build_object(
        'id', s.id, 'rule', s.rule, 'ended_on', s.ended_on, 'template', s.template,
        'external_id', ext, 'etag', etg,
        'occurrences', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'id', x.id, 'on', x.occurrence_on, 'starts_at', x.starts_at, 'ends_at', x.ends_at,
            'all_day', x.all_day, 'archived', x.archived_at is not null or gone, 'touched', x.touched_at is not null,
            'external_id', case when o.copy then xc.external_id else xr.external_id end
          ) order by x.occurrence_on), '[]')
          from core.items x
          left join core.external_refs xr on xr.item_id = x.id
          left join core_private.event_copies xc on xc.item_id = x.id and xc.person_id = o.person_id
          where x.series_id = s.id)) end
    );
  end loop;
  return jobs;
end
$$;

create or replace function core.calendar_sent(p_outbox bigint, p_refs jsonb, p_series_ref jsonb, p_queued_at timestamptz)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  o core_private.calendar_outbox;
  x jsonb;
  l core.calendar_links;
  copy uuid;
begin
  select * into o from core_private.calendar_outbox where id = p_outbox;
  update core_private.calendar_outbox set
    sent_at = case when p_queued_at is null or queued_at <= p_queued_at then now() end,
    next_try_at = now(),
    error = null
  where id = p_outbox;
  perform set_config('lifeos.importing', 'on', true);

  if o.copy then
    -- A member's copy (GCL-007): kept apart from the maker's.
    for x in select * from jsonb_array_elements(coalesce(p_refs, '[]')) loop
      delete from core_private.event_copies
      where calendar_link_id = (x ->> 'link')::uuid and external_id = x ->> 'external_id'
        and not (item_id = (x ->> 'item_id')::uuid and person_id = o.person_id);
      insert into core_private.event_copies (item_id, person_id, calendar_link_id, external_id, etag, external_updated)
      values ((x ->> 'item_id')::uuid, o.person_id, (x ->> 'link')::uuid, x ->> 'external_id', x ->> 'etag',
              (x ->> 'updated')::timestamptz)
      on conflict (item_id, person_id) do update set
        calendar_link_id = excluded.calendar_link_id, external_id = excluded.external_id,
        etag = excluded.etag, external_updated = excluded.external_updated, dropped = false;
    end loop;
    if o.item_id is not null and jsonb_array_length(coalesce(p_refs, '[]')) = 0 then
      delete from core_private.event_copies where item_id = o.item_id and person_id = o.person_id;
    end if;
    if o.series_id is not null then
      if p_series_ref is not null then
        insert into core_private.series_copies (series_id, person_id, calendar_link_id, external_id, etag)
        values (o.series_id, o.person_id, (p_series_ref ->> 'link')::uuid,
                p_series_ref ->> 'external_id', p_series_ref ->> 'etag')
        on conflict (series_id, person_id) do update set calendar_link_id = excluded.calendar_link_id,
          external_id = excluded.external_id, etag = excluded.etag, dropped = false;
      else
        delete from core_private.series_copies where series_id = o.series_id and person_id = o.person_id;
        delete from core_private.event_copies c using core.items x
        where c.item_id = x.id and x.series_id = o.series_id and c.person_id = o.person_id;
      end if;
    end if;
    perform set_config('lifeos.importing', '', true);
    return;
  end if;

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

-- Events read from a calendar (GCL-003), now knowing a member's copy of a
-- shared Event (GCL-007): an edit to it changes the Event for everyone, and
-- deleting it drops only that copy. A change the maker's own Google event
-- brings goes on to the members' copies.
create or replace function core.calendar_save_events(p_link uuid, p_events jsonb)
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  l core.calendar_links;
  space uuid;
  e jsonb;
  item uuid;
  sr core_private.series_refs;
  cp core_private.event_copies;
  sc core_private.series_copies;
  shared core.items;
  before core.items;
  after core.items;
  gone record;
  tz text;
  saved int := 0;
  cancelled boolean;
begin
  select * into l from core.calendar_links where id = p_link;
  if l.id is null then
    raise exception 'No calendar %', p_link using errcode = 'P0002';
  end if;
  select s.id into space from core.spaces s where s.created_by = l.person_id and s.kind = 'personal';
  select coalesce(p.timezone, 'Europe/London') into tz from core.people p where p.id = l.person_id;
  perform set_config('lifeos.importing', 'on', true);

  for e in select * from jsonb_array_elements(p_events) loop
    cancelled := coalesce((e ->> 'cancelled')::boolean, false);

    -- A copy of someone else's shared Event in my calendar (GCL-007).
    select * into cp from core_private.event_copies
    where calendar_link_id = p_link and external_id = e ->> 'external_id';
    if cp.item_id is null and not cancelled then
      -- Not recorded yet (read before its send was): by the id it carries.
      select i.* into shared from core.items i
      where i.id::text = e -> 'raw' -> 'extendedProperties' -> 'private' ->> 'lifeosId'
        and i.type = 'event' and i.owner_id <> l.person_id
        and core_private.shared_with(l.person_id, i.space_id);
      if shared.id is not null then
        insert into core_private.event_copies (item_id, person_id, calendar_link_id, external_id, etag, external_updated)
        values (shared.id, l.person_id, p_link, e ->> 'external_id', e ->> 'etag', (e ->> 'updated')::timestamptz)
        on conflict (item_id, person_id) do update set calendar_link_id = excluded.calendar_link_id,
          external_id = excluded.external_id, dropped = false
        returning * into cp;
      end if;
    end if;
    if cp.item_id is null then
      -- An occurrence (or the whole) of a copy of a shared repeat: not read
      -- back; deleted whole in Google, that copy is dropped.
      select * into sc from core_private.series_copies
      where calendar_link_id = p_link
        and external_id = coalesce(e -> 'raw' ->> 'recurringEventId', e ->> 'external_id');
      if sc.series_id is not null then
        if cancelled and sc.external_id = e ->> 'external_id' then
          update core_private.series_copies set dropped = true
          where series_id = sc.series_id and person_id = sc.person_id;
        end if;
        continue;
      end if;
      if exists (
        select 1 from core.series s
        where s.id::text = e -> 'raw' -> 'extendedProperties' -> 'private' ->> 'lifeosSeries'
          and s.owner_id <> l.person_id and core_private.shared_with(l.person_id, s.space_id)
      ) then
        continue;
      end if;
    end if;
    if cp.item_id is not null then
      if cancelled then
        update core_private.event_copies set dropped = true
        where item_id = cp.item_id and person_id = cp.person_id;
        continue;
      end if;
      if core_private.calendar_waiting(cp.item_id, (e ->> 'updated')::timestamptz) then
        continue;
      end if;
      update core.items set
        title = left(coalesce(e ->> 'title', ''), 500),
        body = e ->> 'body',
        place = nullif(btrim(left(e ->> 'place', 500)), ''),
        starts_at = (e ->> 'starts_at')::timestamptz,
        ends_at = (e ->> 'ends_at')::timestamptz,
        all_day = coalesce((e ->> 'all_day')::boolean, false)
      where id = cp.item_id and type = 'event' and archived_at is null
        and (title, body, place, starts_at, ends_at, all_day) is distinct from
            (left(coalesce(e ->> 'title', ''), 500), e ->> 'body', nullif(btrim(left(e ->> 'place', 500)), ''),
             (e ->> 'starts_at')::timestamptz, (e ->> 'ends_at')::timestamptz, coalesce((e ->> 'all_day')::boolean, false))
      returning * into after;
      update core_private.event_copies set etag = e ->> 'etag', external_updated = (e ->> 'updated')::timestamptz
      where item_id = cp.item_id and person_id = cp.person_id;
      if after.id is not null then
        -- Changed: the maker's calendar and the other members' follow.
        perform core_private.calendar_queue(after.owner_id, after.id, null);
        perform core_private.queue_copies(after.id, null, array[after.space_id], array[after.owner_id, l.person_id]);
        saved := saved + 1;
      end if;
      continue;
    end if;

    select r.item_id into item from core.external_refs r
    where r.calendar_link_id = p_link and r.external_id = e ->> 'external_id';

    if cancelled then
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
        perform core_private.queue_copies(null, sr.series_id, array[]::uuid[], array[l.person_id]);
        continue;
      end if;
      for gone in
        with archived as (
          update core.items i set archived_at = now()
          from core.external_refs r
          where r.item_id = i.id and r.calendar_link_id = p_link and i.archived_at is null
            and i.type = 'event'
            and (r.external_id = e ->> 'external_id' or r.raw ->> 'recurringEventId' = e ->> 'external_id')
          returning i.id
        ) select id from archived
      loop
        perform core_private.queue_copies(gone.id, null, array[]::uuid[], array[l.person_id]);
      end loop;
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
      select * into before from core.items where id = item;
      update core.items set
        title = left(coalesce(e ->> 'title', ''), 500),
        body = e ->> 'body',
        place = nullif(btrim(left(e ->> 'place', 500)), ''),
        starts_at = (e ->> 'starts_at')::timestamptz,
        ends_at = (e ->> 'ends_at')::timestamptz,
        all_day = coalesce((e ->> 'all_day')::boolean, false),
        archived_at = null
      where id = item and type = 'event'
      returning * into after;
      update core.external_refs set etag = e ->> 'etag',
        external_updated = (e ->> 'updated')::timestamptz, raw = e -> 'raw'
      where item_id = item;
      -- Changed in my own Google event: the members' copies follow (GCL-007 2).
      if after.id is not null and (before.title, before.body, before.place, before.starts_at, before.ends_at,
          before.all_day, before.archived_at is null)
        is distinct from (after.title, after.body, after.place, after.starts_at, after.ends_at,
          after.all_day, true) then
        if after.series_id is not null and after.touched_at is null then
          perform core_private.queue_copies(null, after.series_id, array[after.space_id], array[l.person_id]);
        else
          perform core_private.queue_copies(after.id, null, array[after.space_id], array[l.person_id]);
        end if;
      end if;
    end if;
    saved := saved + 1;
  end loop;

  perform set_config('lifeos.importing', '', true);
  return saved;
end
$$;

-- ---------------------------------------------------------------------------
-- Joining and leaving the calendars too (HSH-005 6): the Household's Events
-- still to come go to a new member's calendar; a leaver's copies go.

create or replace function core.join_household(p_invite uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  inv core.space_invites;
  me uuid := (select auth.uid());
  i core.items;
  s uuid;
begin
  select * into inv from core.space_invites
  where id = p_invite and email = core_private.my_email() and core_private.my_email() <> '';
  if inv.id is null then
    raise exception 'No invitation % for you', p_invite using errcode = 'P0002';
  end if;
  insert into core.space_members (space_id, person_id, role)
  values (inv.space_id, me, 'member')
  on conflict do nothing;
  delete from core.space_invites where id = inv.id;

  for i in
    select x.* from core.items x
    where x.space_id = inv.space_id and x.archived_at is null and x.status in ('active', 'idea')
      and coalesce(x.do_on, x.due_on, x.starts_at::date) >= current_date
  loop
    perform core_private.give_defaults(i, array[me]);
    if i.type = 'event' and (i.series_id is null or i.touched_at is not null) then
      perform core_private.calendar_queue(me, i.id, null, true);
    end if;
  end loop;
  for s in
    select distinct x.series_id from core.items x
    where x.space_id = inv.space_id and x.type = 'event' and x.series_id is not null and x.archived_at is null
      and x.starts_at >= now()
  loop
    perform core_private.calendar_queue(me, null, s, true);
  end loop;
end
$$;

create or replace function core_private.part(p_space uuid, p_person uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  x uuid;
begin
  update core.items set space_id = (
    select s.id from core.spaces s where s.created_by = p_person and s.kind = 'personal'
  )
  where space_id = p_space and owner_id = p_person;
  delete from core.space_members where space_id = p_space and person_id = p_person;

  delete from core.reminders r
  using core.items i
  where r.item_id = i.id and r.person_id = p_person and i.space_id = p_space;

  delete from core.links l
  where l.link_type not in ('uses', 'variation_of')
    and (
      (l.from_item in (select id from core.items where owner_id = p_person)
       and l.to_item in (select id from core.items where space_id = p_space))
      or (l.to_item in (select id from core.items where owner_id = p_person)
       and l.from_item in (select id from core.items where space_id = p_space))
    );

  -- My copies of the Household's Events leave my calendar.
  for x in select c.item_id from core_private.event_copies c join core.items i on i.id = c.item_id
           where c.person_id = p_person and i.space_id = p_space loop
    perform core_private.calendar_queue(p_person, x, null, true);
  end loop;
  for x in select c.series_id from core_private.series_copies c join core.series s on s.id = c.series_id
           where c.person_id = p_person and s.space_id = p_space loop
    perform core_private.calendar_queue(p_person, null, x, true);
  end loop;

  perform food_private.split_variations();
end
$$;
