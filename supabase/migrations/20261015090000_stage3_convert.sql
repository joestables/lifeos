-- Stage 3 (plan step 4): Task <-> Event maps its times (EVT-005).

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

  if (r.type = 'task' and p_type = 'event') or (r.type = 'event' and p_type = 'task') then
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
