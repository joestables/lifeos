-- Stage 7b, step 5: the Reminder Type (ADR-0065 1-3, 5; RMD-001-004, 006).
-- Which Types take Alerts is the ontology's (`takes_alerts`, filled by the
-- ontology migration after this); an Alert on any other is refused. A
-- Reminder converts to and from a Task and an Event, and a Thought or Note
-- into one; it repeats on a schedule only.

alter table core.item_types add column takes_alerts boolean not null default false;

-- An Alert only on a Type that takes them (ADR-0065 5), and only on a time
-- field its Type has.
create or replace function core_private.check_alert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  t core.item_types;
begin
  select t2.* into t from core.items i join core.item_types t2 on t2.key = i.type where i.id = new.item_id;
  if tg_op = 'INSERT' and not t.takes_alerts then
    raise exception 'A % takes no Alerts', t.label using errcode = '23514';
  end if;
  if new.anchor is not null and not new.anchor = any (t.time_fields) then
    raise exception 'A % has no %', t.label, new.anchor using errcode = '23514';
  end if;
  return new;
end
$$;

create or replace function core.convert_item(p_id uuid, p_type text)
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
    if not exists (select 1 from core.alerts where item_id = p_id) then
      first_at := case
        when r.do_on is not null then (r.do_on + coalesce(r.do_at,
          (select p.default_alert_time from core.people p where p.id = r.owner_id), time '09:00')) at time zone tz
        when r.starts_at is not null and r.all_day is not true then r.starts_at
      end;
      if first_at is null or first_at <= now() then
        first_at := date_trunc('minute', now()) + interval '1 hour';
      end if;
      insert into core.alerts (item_id, person_id, fixed_at) values (p_id, r.owner_id, first_at);
    end if;
    select min(a.fires_at) into first_at from core.alerts a where a.item_id = p_id;
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


-- Makes an Item repeat (TSK-008, EVT-004, RMD-004): a Reminder only on a schedule.
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
  -- A Reminder is never done, so it repeats on a schedule too (RMD-004 1).
  if it.type = 'reminder' and p_mode <> 'schedule' then
    raise exception 'A Reminder repeats on a schedule' using errcode = '22023';
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
