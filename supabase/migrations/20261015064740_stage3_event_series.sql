-- Stage 3 (plan step 4): repeating Events make their occurrences (EVT-004).

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
