-- The Stage 2 write functions (ADR-0042), and search. Each is replayed by
-- the write queue, so a repeat does nothing new (OFF-002). Security invoker
-- unless marked: row-level security is the one check.

-- ---------------------------------------------------------------------------
-- Items gain a hand-made order (TSK-012).

create or replace function core_private.check_fields(p_fields jsonb) returns void
language plpgsql immutable set search_path = '' as $$
declare
  unknown text;
begin
  select k into unknown from jsonb_object_keys(p_fields) k
  where k not in ('title', 'body', 'status', 'space_id', 'starts_at', 'ends_at', 'all_day',
                  'due_on', 'do_on', 'do_at', 'slot', 'position')
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
                          due_on, do_on, do_at, slot, position)
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
    p_fields ->> 'position'
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
    position = case when p_patch ? 'position' then p_patch ->> 'position' else i.position end
  where i.id = p_id
  returning * into r;
  if r.id is null then
    raise exception 'No Item % to update', p_id using errcode = 'P0002';
  end if;
  return r;
end
$$;

-- ---------------------------------------------------------------------------
-- Labels (ITM-005, NTE-002, TSK-004).

-- Makes a Label, or returns the one with that name already ("home" is
-- "Home"). The Space defaults to the person's Personal Space.
create function core.create_label(p_id uuid, p_name text, p_space_id uuid default null)
returns core.labels
language plpgsql set search_path = '' as $$
declare
  space uuid := coalesce(p_space_id, core_private.default_space('note'));
  r core.labels;
begin
  insert into core.labels (id, space_id, name)
  values (p_id, space, btrim(p_name))
  on conflict do nothing;
  select * into r from core.labels
  where id = p_id or (space_id = space and lower(btrim(name)) = lower(btrim(p_name)))
  order by id = p_id desc
  limit 1;
  return r;
end
$$;

create function core.rename_label(p_id uuid, p_name text)
returns core.labels
language plpgsql set search_path = '' as $$
declare
  r core.labels;
begin
  update core.labels set name = btrim(p_name) where id = p_id returning * into r;
  if r.id is null then
    raise exception 'No Label % to rename', p_id using errcode = 'P0002';
  end if;
  return r;
end
$$;

-- The Label goes from every Note and Task; they are kept (ITM-005).
create function core.delete_label(p_id uuid)
returns void
language sql set search_path = '' as $$
  delete from core.labels where id = p_id
$$;

create function core.add_label(p_item uuid, p_label uuid)
returns void
language sql set search_path = '' as $$
  insert into core.item_labels (item_id, label_id) values (p_item, p_label)
  on conflict do nothing
$$;

create function core.remove_label(p_item uuid, p_label uuid)
returns void
language sql set search_path = '' as $$
  delete from core.item_labels where item_id = p_item and label_id = p_label
$$;

-- ---------------------------------------------------------------------------
-- Marks: pin a Note, star a Task (NTE-003, TSK-005). Mine alone.

create function core.set_mark(p_item uuid, p_on boolean)
returns void
language plpgsql set search_path = '' as $$
begin
  if p_on then
    insert into core.marks (item_id) values (p_item) on conflict do nothing;
  else
    delete from core.marks where item_id = p_item and person_id = (select auth.uid());
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Sub-tasks (TSK-006).

create function core.add_subtask(p_id uuid, p_item uuid, p_title text, p_position text)
returns core.subtasks
language plpgsql set search_path = '' as $$
declare
  r core.subtasks;
begin
  insert into core.subtasks (id, item_id, title, position)
  values (p_id, p_item, coalesce(p_title, ''), p_position)
  on conflict (id) do nothing;
  select * into r from core.subtasks where id = p_id;
  return r;
end
$$;

-- Sets only the fields in the patch: title, done, position.
create function core.update_subtask(p_id uuid, p_patch jsonb)
returns core.subtasks
language plpgsql set search_path = '' as $$
declare
  r core.subtasks;
begin
  if exists (select 1 from jsonb_object_keys(p_patch) k where k not in ('title', 'done', 'position')) then
    raise exception 'Unknown field in %', p_patch using errcode = '22023';
  end if;
  update core.subtasks s set
    title = case when p_patch ? 'title' then coalesce(p_patch ->> 'title', '') else s.title end,
    done = case when p_patch ? 'done' then (p_patch ->> 'done')::boolean else s.done end,
    position = case when p_patch ? 'position' then p_patch ->> 'position' else s.position end
  where s.id = p_id
  returning * into r;
  if r.id is null then
    raise exception 'No sub-task % to update', p_id using errcode = 'P0002';
  end if;
  return r;
end
$$;

create function core.remove_subtask(p_id uuid)
returns void
language sql set search_path = '' as $$
  delete from core.subtasks where id = p_id
$$;

-- ---------------------------------------------------------------------------
-- Reminders (REM-003). Fields: anchor, offset_days, at_time, offset_minutes,
-- fixed_at.

create function core_private.check_reminder_fields(p_fields jsonb) returns void
language plpgsql immutable set search_path = '' as $$
begin
  if exists (select 1 from jsonb_object_keys(p_fields) k
             where k not in ('anchor', 'offset_days', 'at_time', 'offset_minutes', 'fixed_at')) then
    raise exception 'Unknown field in %', p_fields using errcode = '22023';
  end if;
end
$$;

create function core.add_reminder(p_id uuid, p_item uuid, p_fields jsonb)
returns core.reminders
language plpgsql set search_path = '' as $$
declare
  r core.reminders;
begin
  perform core_private.check_reminder_fields(p_fields);
  insert into core.reminders (id, item_id, anchor, offset_days, at_time, offset_minutes, fixed_at)
  values (
    p_id,
    p_item,
    p_fields ->> 'anchor',
    coalesce((p_fields ->> 'offset_days')::int, 0),
    (p_fields ->> 'at_time')::time,
    coalesce((p_fields ->> 'offset_minutes')::int, 0),
    (p_fields ->> 'fixed_at')::timestamptz
  )
  on conflict (id) do nothing;
  select * into r from core.reminders where id = p_id;
  return r;
end
$$;

-- Changing a Reminder makes it the person's own: it no longer follows the
-- Type's default, and a snooze ends.
create function core.update_reminder(p_id uuid, p_patch jsonb)
returns core.reminders
language plpgsql set search_path = '' as $$
declare
  r core.reminders;
begin
  perform core_private.check_reminder_fields(p_patch);
  update core.reminders x set
    anchor = case when p_patch ? 'anchor' then p_patch ->> 'anchor' else x.anchor end,
    offset_days = case when p_patch ? 'offset_days' then coalesce((p_patch ->> 'offset_days')::int, 0) else x.offset_days end,
    at_time = case when p_patch ? 'at_time' then (p_patch ->> 'at_time')::time else x.at_time end,
    offset_minutes = case when p_patch ? 'offset_minutes' then coalesce((p_patch ->> 'offset_minutes')::int, 0) else x.offset_minutes end,
    fixed_at = case when p_patch ? 'fixed_at' then (p_patch ->> 'fixed_at')::timestamptz else x.fixed_at end,
    is_default = false,
    snoozed_until = null
  where x.id = p_id
  returning * into r;
  if r.id is null then
    raise exception 'No Reminder % to update', p_id using errcode = 'P0002';
  end if;
  return r;
end
$$;

create function core.remove_reminder(p_id uuid)
returns void
language sql set search_path = '' as $$
  delete from core.reminders where id = p_id
$$;

-- Snooze moves only my Reminder (REM-005).
create function core.snooze_reminder(p_id uuid, p_until timestamptz)
returns core.reminders
language plpgsql set search_path = '' as $$
declare
  r core.reminders;
begin
  update core.reminders set snoozed_until = p_until where id = p_id returning * into r;
  if r.id is null then
    raise exception 'No Reminder % to snooze', p_id using errcode = 'P0002';
  end if;
  return r;
end
$$;

-- ---------------------------------------------------------------------------
-- My settings (REM-007, REM-008): timezone, default_reminder_time,
-- reminder_defaults, digest_on, digest_time.

create function core.update_settings(p_patch jsonb)
returns core.people
language plpgsql set search_path = '' as $$
declare
  r core.people;
begin
  if exists (select 1 from jsonb_object_keys(p_patch) k
             where k not in ('name', 'timezone', 'default_reminder_time', 'reminder_defaults',
                             'digest_on', 'digest_time')) then
    raise exception 'Unknown field in %', p_patch using errcode = '22023';
  end if;
  if p_patch ? 'timezone' and not exists (select 1 from pg_catalog.pg_timezone_names where name = p_patch ->> 'timezone') then
    raise exception 'Unknown timezone %', p_patch ->> 'timezone' using errcode = '22023';
  end if;
  update core.people p set
    name = case when p_patch ? 'name' then coalesce(p_patch ->> 'name', '') else p.name end,
    timezone = case when p_patch ? 'timezone' then p_patch ->> 'timezone' else p.timezone end,
    default_reminder_time = case when p_patch ? 'default_reminder_time' then (p_patch ->> 'default_reminder_time')::time else p.default_reminder_time end,
    reminder_defaults = case when p_patch ? 'reminder_defaults' then p.reminder_defaults || (p_patch -> 'reminder_defaults') else p.reminder_defaults end,
    digest_on = case when p_patch ? 'digest_on' then (p_patch ->> 'digest_on')::boolean else p.digest_on end,
    digest_time = case when p_patch ? 'digest_time' then (p_patch ->> 'digest_time')::time else p.digest_time end
  where p.id = (select auth.uid())
  returning * into r;
  return r;
end
$$;

-- ---------------------------------------------------------------------------
-- Push devices (REM-001).

-- Registers this device's push subscription for me. The endpoint is the
-- browser's own secret, so whoever presents it owns it: a browser that
-- someone else signed in on before becomes mine. Security definer for that
-- one case.
create function core.register_device(p_id uuid, p_endpoint text, p_p256dh text, p_auth text, p_label text)
returns core.push_devices
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  r core.push_devices;
begin
  if me is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  insert into core.push_devices (id, person_id, endpoint, p256dh, auth, label)
  values (p_id, me, p_endpoint, p_p256dh, p_auth, left(coalesce(p_label, ''), 100))
  on conflict (endpoint) do update set
    person_id = me,
    p256dh = excluded.p256dh,
    auth = excluded.auth,
    label = excluded.label,
    enabled = true,
    gone_at = null
  returning * into r;
  return r;
end
$$;

create function core.set_device(p_id uuid, p_enabled boolean)
returns core.push_devices
language plpgsql set search_path = '' as $$
declare
  r core.push_devices;
begin
  update core.push_devices set enabled = p_enabled where id = p_id returning * into r;
  if r.id is null then
    raise exception 'No device % to change', p_id using errcode = 'P0002';
  end if;
  return r;
end
$$;

create function core.remove_device(p_id uuid)
returns void
language sql set search_path = '' as $$
  delete from core.push_devices where id = p_id
$$;

-- ---------------------------------------------------------------------------
-- Search (SRC-001): every word typed is the start of a word in the title,
-- Labels or body; the title counts most. Deleted Items aren't found; row-
-- level security keeps it to what I can read.

create function core.search_items(p_query text, p_limit int default 30)
returns setof core.items
language plpgsql stable set search_path = '' as $$
declare
  q tsquery;
begin
  select to_tsquery('simple', string_agg(w || ':*', ' & '))
  into q
  from regexp_split_to_table(lower(coalesce(p_query, '')), '[^[:alnum:]]+') w
  where w <> '';
  if q is null then
    return;
  end if;
  return query
    select i.* from core.items i
    where i.archived_at is null and i.search @@ q
    order by ts_rank(i.search, q) desc, i.updated_at desc
    limit least(greatest(p_limit, 1), 100);
end
$$;

grant execute on function core_private.check_reminder_fields(jsonb) to authenticated;
grant execute on function core.create_label(uuid, text, uuid) to authenticated;
grant execute on function core.rename_label(uuid, text) to authenticated;
grant execute on function core.delete_label(uuid) to authenticated;
grant execute on function core.add_label(uuid, uuid) to authenticated;
grant execute on function core.remove_label(uuid, uuid) to authenticated;
grant execute on function core.set_mark(uuid, boolean) to authenticated;
grant execute on function core.add_subtask(uuid, uuid, text, text) to authenticated;
grant execute on function core.update_subtask(uuid, jsonb) to authenticated;
grant execute on function core.remove_subtask(uuid) to authenticated;
grant execute on function core.add_reminder(uuid, uuid, jsonb) to authenticated;
grant execute on function core.update_reminder(uuid, jsonb) to authenticated;
grant execute on function core.remove_reminder(uuid) to authenticated;
grant execute on function core.snooze_reminder(uuid, timestamptz) to authenticated;
grant execute on function core.update_settings(jsonb) to authenticated;
grant execute on function core.register_device(uuid, text, text, text, text) to authenticated;
grant execute on function core.set_device(uuid, boolean) to authenticated;
grant execute on function core.remove_device(uuid) to authenticated;
grant execute on function core.search_items(text, int) to authenticated;
