-- Stage 7b, step 8: Thoughts lose their Alerts (ALR-001, ADR-0065 5).
-- A Thought takes no Alert (the ontology's takes_alerts, in the
-- *_ontology.sql beside this); the morning digest counts no Thoughts and
-- opens Today; the Thought default leaves my settings; a Thought converted
-- into a Reminder is given the time its text names. Joe's Thoughts with an
-- Alert still to come become Reminders, and every other Alert on a Thought
-- or a Note goes (Joe, 9 November).

-- RMD-006 1: the time a Thought's text names, read on the device, comes
-- with the conversion, as the Thought can no longer hold it as an Alert.
drop function core.convert_item(uuid, text);

create function core.convert_item(p_id uuid, p_type text, p_alert_at timestamptz default null)
returns core.items
language plpgsql set search_path = '' as $$
declare
  r core.items;
  tz text;
  first_at timestamptz;
  day date;
begin
  select * into r from core.items where id = p_id;
  if r.id is null then
    raise exception 'No Item % to convert', p_id using errcode = 'P0002';
  end if;
  if r.type = p_type then
    return r;
  end if;
  tz := core_private.home_timezone(r.owner_id);

  -- Into a Type that takes no Alerts (a Note), its Alerts go; Undo brings
  -- back its Type, not them (ADR-0065 5).
  if not coalesce((select t.takes_alerts from core.item_types t where t.key = p_type), false) then
    delete from core.alerts where item_id = p_id;
  end if;

  -- Into a Reminder (RMD-006): mine alone, on the day of its first Alert,
  -- each Alert that day or after, at its time, so moving or repeating it
  -- moves them (ADR-0065 2). One gone by isn't kept; with none, it gets one
  -- at its do-on time or start, or an hour from now.
  if p_type = 'reminder' then
    delete from core.alerts where item_id = p_id
      and (person_id <> r.owner_id or fires_at is null or fires_at <= now());
    first_at := null;
    if not exists (select 1 from core.alerts where item_id = p_id) then
      first_at := case
        when r.do_on is not null then (r.do_on + coalesce(r.do_at,
          (select p.default_alert_time from core.people p where p.id = r.owner_id), time '09:00')) at time zone tz
        when r.starts_at is not null and r.all_day is not true then r.starts_at
      end;
      -- The time its text names, from a Thought (RMD-006 1, ALR-001 3).
      if p_alert_at > now() then
        first_at := p_alert_at;
      end if;
      if first_at is null or first_at <= now() then
        first_at := date_trunc('minute', now()) + interval '1 hour';
      end if;
    end if;
    -- Its day: of the Alert it will be given (once it is a Reminder, as a
    -- Thought takes none), else of its first.
    if first_at is null then
      select min(a.fires_at) into first_at from core.alerts a where a.item_id = p_id;
    end if;
    day := (first_at at time zone tz)::date;
    -- Each at its time, set, before the Item changes under them; then on
    -- the Reminder's day.
    update core.alerts set anchor = null, fixed_at = fires_at, offset_days = 0,
      offset_minutes = 0, at_time = null, snoozed_until = null, is_default = false
    where item_id = p_id;
    update core.items i set
      type = p_type,
      status = 'active',
      space_id = (select s.id from core.spaces s where s.created_by = r.owner_id and s.kind = 'personal'),
      do_on = day, do_at = null, due_on = null,
      starts_at = null, ends_at = null, all_day = null, place = null
    where i.id = p_id;
    if not exists (select 1 from core.alerts where item_id = p_id) then
      insert into core.alerts (item_id, person_id, fixed_at) values (p_id, r.owner_id, first_at);
    end if;
    update core.alerts a set anchor = 'do_on', offset_days = (a.fixed_at at time zone tz)::date - day,
      at_time = (a.fixed_at at time zone tz)::time, fixed_at = null
    where a.item_id = p_id;
    select * into r from core.items where id = p_id;
    return r;
  end if;

  -- A Reminder into a Task or an Event (RMD-006 2): at its next Alert (its
  -- first, once all have gone off), its Alerts kept; the default its new
  -- Type would give it isn't added beside them.
  if r.type = 'reminder' and p_type in ('task', 'event') then
    select coalesce(min(a.fires_at) filter (where a.fires_at > now()), min(a.fires_at)) into first_at
    from core.alerts a where a.item_id = p_id;
    first_at := coalesce(first_at, (r.do_on + time '09:00') at time zone tz);
    if p_type = 'event' then
      update core.alerts set anchor = null, fixed_at = fires_at, offset_days = 0,
        offset_minutes = 0, at_time = null
      where item_id = p_id and anchor is not null and fires_at is not null;
      delete from core.alerts where item_id = p_id and anchor is not null;
      update core.items i set type = p_type, status = 'active', do_on = null, do_at = null,
        starts_at = first_at, ends_at = first_at + interval '1 hour', all_day = false
      where i.id = p_id;
    else
      update core.items i set type = p_type, status = 'active',
        do_on = (first_at at time zone tz)::date, do_at = (first_at at time zone tz)::time
      where i.id = p_id;
    end if;
    delete from core.alerts where item_id = p_id and is_default;
    select * into r from core.items where id = p_id;
    return r;
  end if;

  if (r.type = 'task' and p_type = 'event') or (r.type = 'event' and p_type = 'task') then
    delete from core.alerts where item_id = p_id and is_default;
    update core.alerts set anchor = null, fixed_at = fires_at, offset_days = 0,
      offset_minutes = 0, at_time = null
    where item_id = p_id and anchor is not null and fires_at is not null;
    delete from core.alerts where item_id = p_id and anchor is not null;
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

grant execute on function core.convert_item(uuid, text, timestamptz) to authenticated;

-- ALR-001 4: the digest counts no Thoughts ("2 overdue · 5 today").
create or replace function core_private.day_counts(p_person uuid, p_today date)
returns table(overdue integer, today integer, to_sort integer)
language sql stable set search_path = '' as $$
  select
    count(*) filter (where i.type = 'task' and i.due_on < p_today)::int,
    count(*) filter (where i.type = 'task' and not coalesce(i.due_on < p_today, false)
                     and (i.do_on <= p_today or i.due_on = p_today))::int,
    0
  from core.items i
  where i.space_id in (select m.space_id from core.space_members m where m.person_id = p_person)
    and i.archived_at is null and i.status = 'active'
$$;

create or replace function core_private.notification_payload(d core.alert_deliveries)
returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  i core.items;
  t core.item_types;
  tz text;
  c record;
  parts text[] := '{}';
  line text;
  buttons jsonb := '[]';
begin
  select timezone into tz from core.people where id = d.person_id;
  tz := coalesce(tz, 'Europe/London');
  if d.kind = 'digest' then
    select * into c from core_private.day_counts(d.person_id, (now() at time zone tz)::date);
    if c.overdue > 0 then parts := parts || (c.overdue || ' overdue'); end if;
    if c.today > 0 then parts := parts || (c.today || ' today'); end if;
    if cardinality(parts) = 0 then
      return null;
    end if;
    return jsonb_build_object('title', array_to_string(parts, ' · '), 'body', '', 'url', '/today',
                              'tag', d.key, 'actions', '[]'::jsonb);
  end if;

  select * into i from core.items where id = d.item_id;
  if i.id is null or i.archived_at is not null or i.status not in ('active', 'idea') then
    return null;
  end if;
  select * into t from core.item_types where key = i.type;
  if i.starts_at is not null then
    line := case when i.all_day then to_char((i.starts_at at time zone 'UTC')::date, 'Dy FMDD Mon')
                 else to_char(i.starts_at at time zone tz, 'Dy FMDD Mon HH24:MI') end;
  end if;
  if i.place is not null and btrim(i.place) <> '' then
    line := concat_ws(' · ', line, btrim(i.place));
  end if;
  if i.do_at is not null and i.do_on is not null then
    line := to_char(i.do_on, 'Dy FMDD Mon') || ' ' || to_char(i.do_at, 'HH24:MI');
  end if;
  if i.due_on is not null then
    line := concat_ws(' · ', line, 'Due ' || to_char(i.due_on, 'Dy FMDD Mon'));
  end if;
  if t.completable then
    buttons := buttons || jsonb_build_object('action', 'done', 'title', 'Done');
  end if;
  buttons := buttons || jsonb_build_object('action', 'snooze', 'title', 'Snooze 1 hour');
  return jsonb_build_object(
    'title', case when d.kind = 'overdue' then 'Overdue: ' else '' end
      || coalesce(nullif(btrim(i.title), ''), t.label),
    'body', coalesce(line, ''),
    'url', '/item/' || i.id,
    'tag', d.key,
    'actions', buttons,
    -- Its Type's colour, which the Android app tints the notification with.
    'colour', t.colour
  );
end
$$;

-- ALR-001 2: no Thought default.
update core.people set alert_defaults = alert_defaults - 'thought' where alert_defaults ? 'thought';

-- ALR-001 2, 3: Thoughts and Notes keep no Alerts. A Thought not ticked
-- off with an Alert still to come becomes a Reminder on its day, keeping
-- the Alerts to come (as RMD-006 1 converts one); every other Alert on a
-- Thought or a Note is removed. Returns how many became Reminders and how
-- many Alerts went.
create function core_private.thoughts_lose_alerts()
returns table(reminders integer, removed integer)
language plpgsql security definer set search_path = '' as $$
declare
  r record;
  tz text;
  day date;
  made int := 0;
  gone int := 0;
  n int;
begin
  for r in
    select i.id, i.owner_id
    from core.items i
    where i.type = 'thought' and i.status = 'active' and i.archived_at is null
      and exists (select 1 from core.alerts a where a.item_id = i.id and a.fires_at > now())
  loop
    tz := core_private.home_timezone(r.owner_id);
    delete from core.alerts where item_id = r.id
      and (person_id <> r.owner_id or fires_at is null or fires_at <= now());
    get diagnostics n = row_count;
    gone := gone + n;
    select (min(a.fires_at) at time zone tz)::date into day from core.alerts a where a.item_id = r.id;
    update core.alerts set anchor = null, fixed_at = fires_at, offset_days = 0,
      offset_minutes = 0, at_time = null, snoozed_until = null, is_default = false
    where item_id = r.id;
    update core.items i set type = 'reminder', status = 'active',
      space_id = (select s.id from core.spaces s where s.created_by = r.owner_id and s.kind = 'personal'),
      do_on = day, do_at = null, due_on = null
    where i.id = r.id;
    update core.alerts a set anchor = 'do_on', offset_days = (a.fixed_at at time zone tz)::date - day,
      at_time = (a.fixed_at at time zone tz)::time, fixed_at = null
    where a.item_id = r.id;
    made := made + 1;
  end loop;
  delete from core.alerts a using core.items i
  where i.id = a.item_id and i.type in ('thought', 'note');
  get diagnostics n = row_count;
  gone := gone + n;
  return query select made, gone;
end
$$;
revoke all on function core_private.thoughts_lose_alerts() from public;

select * from core_private.thoughts_lose_alerts();
