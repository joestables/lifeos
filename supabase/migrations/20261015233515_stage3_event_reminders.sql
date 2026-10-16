-- Stage 3 (plan step 5): an Event's Reminders (EVT-003).

-- ---------------------------------------------------------------------------
-- A Reminder on an Event's start is either some minutes before it
-- ("30 minutes before", offset_minutes), or on a day before it at a time
-- ("1 day before at 18:00", offset_days and at_time). An all-day Event has
-- no time to count back from, so its Reminders are always on a day, at my
-- default time unless I give one; its day is the same everywhere (midnight
-- UTC, data-model.md#time-fields-per-schedulable-type).

create or replace function core_private.reminder_fires_at(r core.reminders) returns timestamptz
language plpgsql stable security definer set search_path = '' as $$
declare
  item core.items;
  tz text;
  day date;
begin
  if r.snoozed_until is not null then
    return r.snoozed_until;
  end if;
  if r.anchor is null then
    return r.fixed_at;
  end if;
  select * into item from core.items where id = r.item_id;
  select coalesce(p.timezone, 'Europe/London') into tz from core.people p where p.id = r.person_id;
  tz := coalesce(tz, 'Europe/London');
  if r.anchor = 'starts_at' then
    if item.starts_at is null then
      return null;
    end if;
    if r.at_time is null and item.all_day is not true then
      return item.starts_at + make_interval(mins => r.offset_minutes);
    end if;
    day := case when item.all_day then (item.starts_at at time zone 'UTC')::date
                else (item.starts_at at time zone tz)::date end;
    return ((day + r.offset_days) + coalesce(r.at_time, r.default_time, time '09:00'))
      at time zone tz;
  end if;
  day := case r.anchor when 'do_on' then item.do_on else item.due_on end;
  if day is null then
    return null;
  end if;
  return ((day + r.offset_days)
    + coalesce(r.at_time, case when r.anchor = 'do_on' then item.do_at end, r.default_time, time '09:00'))
    at time zone tz;
end
$$;
