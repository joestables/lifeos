-- Stage 3 (plan step 4): an Event can be made to repeat (EVT-004).

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
