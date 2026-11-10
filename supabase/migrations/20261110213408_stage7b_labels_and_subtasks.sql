-- Stage 7b, step 9: Labels off Tasks and Events, sub-tasks gone (PLA-007,
-- ADR-0065 8). Labels are for Notes and Thoughts: a Task's or an Event's
-- (and those a repeat gives each occurrence) are deleted, and the database
-- refuses new ones (uses_labels false, also in the *_ontology.sql beside
-- this). Sub-tasks go: core.subtasks, its functions and has_subtasks.
-- The Labels themselves stay.

-- Labels on Tasks and Events, and on what a repeat makes (PLA-007 2).
update core.item_types set uses_labels = false where key in ('task', 'event');

delete from core.item_labels il
using core.items i
where i.id = il.item_id and i.type in ('task', 'event');

update core.series set template = template - 'label_ids' where template ? 'label_ids';

-- An occurrence takes its title, times and Alerts; no Labels.
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
      insert into core.alerts (item_id, person_id, anchor, offset_days, at_time, offset_minutes, alarm)
      select v_id, p_series.owner_id, r ->> 'anchor', coalesce((r ->> 'offset_days')::int, 0),
        (r ->> 'at_time')::time, coalesce((r ->> 'offset_minutes')::int, 0),
        coalesce((r ->> 'alarm')::boolean, false)
      from jsonb_array_elements(coalesce(t -> 'alerts', t -> 'reminders', '[]')) r
      where r ->> 'anchor' in ('do_on', 'due_on', 'starts_at');
    end if;
  end loop;
  perform set_config('lifeos.series_writing', '', true);
end
$$;

-- Sub-tasks (PLA-007 2): the table, with its triggers and policies, its
-- functions and the ontology's column.
drop function core.add_subtask(uuid, uuid, text, text);
drop function core.update_subtask(uuid, jsonb);
drop function core.remove_subtask(uuid);
drop table core.subtasks;
drop function core_private.check_subtask();
alter table core.item_types drop column has_subtasks;
