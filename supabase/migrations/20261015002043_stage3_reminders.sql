-- Stage 3 (plan step 4): an Event's default Reminder (EVT-003).

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
