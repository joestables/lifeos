-- The Stage 2 schema (plan step 4): Labels, marks, sub-tasks, series,
-- Reminders and their deliveries, push devices, each person's settings, the
-- search index, and the rules that keep them consistent.
-- docs/20-architecture/data-model.md; ADR-0014, 0021, 0022, 0023, 0043,
-- 0044, 0045.

-- ---------------------------------------------------------------------------
-- The ontology's lookup table gains what each Type has (filled by the
-- generated *_ontology.sql migration that follows).

alter table core.item_types
  add column colour text not null default 'yellow'
    check (colour in ('blue', 'yellow', 'coral', 'green', 'orange', 'purple')),
  add column uses_labels boolean not null default false,
  add column mark text check (mark in ('pinned', 'starred', 'favourited')),
  add column has_subtasks boolean not null default false,
  add column default_reminder text check (default_reminder in ('do_on', 'due_on', 'starts_at'));

-- ---------------------------------------------------------------------------
-- Each person's settings (REM-007, REM-008).

alter table core.people
  add column default_reminder_time time not null default '09:00',
  -- Per Type, whether its default Reminder is on: {"task": false}. Missing means on.
  add column reminder_defaults jsonb not null default '{}'
    check (jsonb_typeof(reminder_defaults) = 'object'),
  add column digest_on boolean not null default true,
  add column digest_time time not null default '07:00';

-- ---------------------------------------------------------------------------
-- Items: a hand-made order (TSK-012), the occurrence a series made (ADR-0045)
-- and the search index (SRC-001).

alter table core.items
  add column position text collate "C",
  add column occurrence_on date,
  add column search tsvector not null default ''::tsvector;
create index items_search on core.items using gin (search);

-- ---------------------------------------------------------------------------
-- Series: the repeat rule that makes occurrences (ADR-0021, ADR-0022). Each
-- occurrence is an ordinary Item carrying series_id and the date the series
-- made it for, which stays put when the occurrence is moved.

create table core.series (
  id uuid primary key default core_private.uuidv7(),
  type text not null references core.item_types (key),
  space_id uuid not null references core.spaces (id) on delete cascade,
  owner_id uuid not null default auth.uid() references core.people (id) on delete cascade,
  mode text not null check (mode in ('schedule', 'after_completion')),
  -- An RFC 5545 RRULE without DTSTART ("FREQ=WEEKLY;BYDAY=MO"), expanded by
  -- packages/recurrence, never in SQL (ADR-0045).
  rule text not null check (rule ~ '^FREQ=[A-Z]+(;[A-Z]+=[A-Z0-9,+-]+)*$'),
  starts_on date not null,
  timezone text not null,
  -- What each occurrence is made with: title, body, do_at, due_offset_days,
  -- label_ids, reminders.
  template jsonb not null default '{}' check (jsonb_typeof(template) = 'object'),
  generated_until date,
  -- The last day it makes occurrences: stopped, or split for "this and all
  -- following".
  ended_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ended_on is null or ended_on >= starts_on - 1)
);
create index series_space on core.series (space_id);

alter table core.items
  add constraint items_series_id_fkey foreign key (series_id) references core.series (id),
  add constraint items_occurrence check ((occurrence_on is null) = (series_id is null));
create unique index items_one_occurrence on core.items (series_id, occurrence_on) where series_id is not null;

-- ---------------------------------------------------------------------------
-- Labels (ADR-0014, ITM-005): one set per Space, on the Types that use them.

create table core.labels (
  id uuid primary key default core_private.uuidv7(),
  space_id uuid not null references core.spaces (id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 60),
  created_by uuid not null default auth.uid() references core.people (id) on delete cascade,
  created_at timestamptz not null default now()
);
-- "home" is the same Label as "Home" (ITM-005).
create unique index labels_one_name on core.labels (space_id, lower(btrim(name)));

create table core.item_labels (
  item_id uuid not null references core.items (id) on delete cascade,
  label_id uuid not null references core.labels (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (item_id, label_id)
);
create index item_labels_label on core.item_labels (label_id);

-- ---------------------------------------------------------------------------
-- Marks: a per-person flag under the Type's own name — a pinned Note, a
-- starred Task (glossary: Mark).

create table core.marks (
  person_id uuid not null default auth.uid() references core.people (id) on delete cascade,
  item_id uuid not null references core.items (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (person_id, item_id)
);
create index marks_item on core.marks (item_id);

-- ---------------------------------------------------------------------------
-- Sub-tasks: lines you tick inside a Task (TSK-006). Child rows, not Items.

create table core.subtasks (
  id uuid primary key default core_private.uuidv7(),
  item_id uuid not null references core.items (id) on delete cascade,
  title text not null default '' check (length(title) <= 500),
  done boolean not null default false,
  position text collate "C" not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index subtasks_item on core.subtasks (item_id, position);

-- ---------------------------------------------------------------------------
-- Reminders (ADR-0023): per person, relative to one of the Item's times or
-- at a fixed moment. fires_at is calculated here and read by the delivery
-- job (ADR-0044).

create table core.reminders (
  id uuid primary key default core_private.uuidv7(),
  item_id uuid not null references core.items (id) on delete cascade,
  person_id uuid not null default auth.uid() references core.people (id) on delete cascade,
  -- Relative: the time field it hangs on. Null for a fixed Reminder.
  anchor text check (anchor in ('do_on', 'due_on', 'starts_at')),
  -- Days from a date anchor ("1 day before": -1), and the time on that day;
  -- with no time, the Item's do-on time, else default_time.
  offset_days int not null default 0 check (offset_days between -366 and 366),
  at_time time,
  -- Minutes from starts_at ("1 h before": -60).
  offset_minutes int not null default 0 check (offset_minutes between -527040 and 527040),
  -- The person's default time when the Reminder was made: changing the
  -- default later moves only new Reminders (REM-007).
  default_time time,
  fixed_at timestamptz,
  -- Made by the Type's default (REM-002): it follows the Item's date and goes
  -- when the date is cleared. One per Item and person.
  is_default boolean not null default false,
  snoozed_until timestamptz,
  fires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((anchor is null) = (fixed_at is not null)),
  check (not is_default or anchor is not null)
);
create index reminders_item on core.reminders (item_id);
create index reminders_person on core.reminders (person_id);
create index reminders_fires_at on core.reminders (fires_at) where fires_at is not null;
create unique index reminders_one_default on core.reminders (item_id, person_id) where is_default;

-- Push devices (REM-001): every Reminder goes to each one that is on.
create table core.push_devices (
  id uuid primary key default core_private.uuidv7(),
  person_id uuid not null default auth.uid() references core.people (id) on delete cascade,
  kind text not null default 'web_push' check (kind in ('web_push', 'fcm')),
  endpoint text not null unique check (length(endpoint) <= 2000),
  p256dh text check (length(p256dh) <= 200),
  auth text check (length(auth) <= 200),
  label text not null default '' check (length(label) <= 100),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  last_sent_at timestamptz,
  -- The push service said the device is gone; it is no longer sent to.
  gone_at timestamptz
);
create index push_devices_person on core.push_devices (person_id);

-- One row per notification and device (ADR-0044). The unique key means a
-- notification is never queued twice for a device.
create table core.reminder_deliveries (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('reminder', 'digest', 'overdue')),
  -- What it is for: "reminder:<id>", "digest:<person>", "overdue:<item>:<due>".
  key text not null check (length(key) <= 200),
  person_id uuid not null references core.people (id) on delete cascade,
  device_id uuid not null references core.push_devices (id) on delete cascade,
  reminder_id uuid references core.reminders (id) on delete set null,
  item_id uuid references core.items (id) on delete set null,
  fire_at timestamptz not null,
  status text not null default 'waiting'
    check (status in ('waiting', 'sending', 'sent', 'failed', 'gone', 'missed')),
  attempts int not null default 0,
  claimed_at timestamptz,
  sent_at timestamptz,
  error text check (length(error) <= 500),
  created_at timestamptz not null default now(),
  unique (key, fire_at, device_id)
);
create index reminder_deliveries_waiting on core.reminder_deliveries (fire_at)
  where status in ('waiting', 'failed');
create index reminder_deliveries_person on core.reminder_deliveries (person_id);
create index reminder_deliveries_device on core.reminder_deliveries (device_id);
create index reminder_deliveries_reminder on core.reminder_deliveries (reminder_id);
create index reminder_deliveries_item on core.reminder_deliveries (item_id);

-- ---------------------------------------------------------------------------
-- Rules from the ontology for the new tables. Security definer so they see
-- the Item whoever writes; row-level security still decides who may.

create function core_private.check_item_label() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  item core.items;
  t core.item_types;
begin
  select * into item from core.items where id = new.item_id;
  select * into t from core.item_types where key = item.type;
  if not t.uses_labels then
    raise exception 'A % has no Labels', t.label using errcode = '23514';
  end if;
  if not exists (select 1 from core.labels l where l.id = new.label_id and l.space_id = item.space_id) then
    raise exception 'A Label belongs to the Item''s Space' using errcode = '23514';
  end if;
  return new;
end
$$;
create trigger item_labels_check before insert on core.item_labels
for each row execute function core_private.check_item_label();

create function core_private.check_mark() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  t core.item_types;
begin
  select t2.* into t from core.items i join core.item_types t2 on t2.key = i.type where i.id = new.item_id;
  if t.mark is null then
    raise exception 'A % can''t be marked', t.label using errcode = '23514';
  end if;
  return new;
end
$$;
create trigger marks_check before insert on core.marks
for each row execute function core_private.check_mark();

create function core_private.check_subtask() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  t core.item_types;
begin
  select t2.* into t from core.items i join core.item_types t2 on t2.key = i.type where i.id = new.item_id;
  if not t.has_subtasks then
    raise exception 'A % has no sub-tasks', t.label using errcode = '23514';
  end if;
  return new;
end
$$;
create trigger subtasks_check before insert on core.subtasks
for each row execute function core_private.check_subtask();

create function core_private.check_series() returns trigger
language plpgsql set search_path = '' as $$
declare
  t core.item_types;
begin
  select * into t from core.item_types where key = new.type;
  if not ('do_on' = any (t.time_fields)) then
    raise exception 'A % can''t repeat', t.label using errcode = '23514';
  end if;
  return new;
end
$$;
create trigger series_check before insert or update on core.series
for each row execute function core_private.check_series();

create function core_private.check_reminder() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  t core.item_types;
begin
  select t2.* into t from core.items i join core.item_types t2 on t2.key = i.type where i.id = new.item_id;
  if new.anchor is not null and not new.anchor = any (t.time_fields) then
    raise exception 'A % has no %', t.label, new.anchor using errcode = '23514';
  end if;
  return new;
end
$$;
create trigger reminders_check before insert or update of anchor, item_id on core.reminders
for each row execute function core_private.check_reminder();

create trigger series_updated_at before update on core.series
for each row execute function core_private.touch_updated_at();
create trigger subtasks_updated_at before update on core.subtasks
for each row execute function core_private.touch_updated_at();
create trigger reminders_updated_at before update on core.reminders
for each row execute function core_private.touch_updated_at();

-- An Item's updated_at moves only when something people see changes, not
-- when its search index or touched_at is refreshed (NTE-001: a changed Note
-- moves to the top).
create or replace function core_private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_table_name = 'items'
    and to_jsonb(new) - array['updated_at', 'search', 'touched_at'] = to_jsonb(old) - array['updated_at', 'search', 'touched_at']
  then
    new.updated_at := old.updated_at;
  else
    new.updated_at := now();
  end if;
  return new;
end
$$;

-- The activity log ignores the search index and touched_at.
create or replace function core_private.log_item() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  changes jsonb := '{}';
  verb text;
  key text;
  old_row jsonb;
  new_row jsonb := to_jsonb(new) - array['updated_at', 'search', 'touched_at'];
begin
  if tg_op = 'INSERT' then
    insert into core.activity (item_id, verb, changed)
    values (new.id, 'created', jsonb_build_object('type', new.type));
    return null;
  end if;

  old_row := to_jsonb(old) - array['updated_at', 'search', 'touched_at'];
  for key in select jsonb_object_keys(new_row) loop
    if new_row -> key is distinct from old_row -> key then
      changes := changes || jsonb_build_object(key, jsonb_build_object('from', old_row -> key, 'to', new_row -> key));
    end if;
  end loop;
  if changes = '{}' then
    return null;
  end if;

  verb := case
    when old.archived_at is null and new.archived_at is not null then 'archived'
    when old.archived_at is not null and new.archived_at is null then 'restored'
    when old.type <> new.type then 'converted'
    else 'updated'
  end;
  insert into core.activity (item_id, verb, changed) values (new.id, verb, changes);
  return null;
end
$$;

-- ---------------------------------------------------------------------------
-- touched_at (ADR-0022): set the first time a person edits, ticks, labels or
-- links an occurrence, so the series leaves it alone. The series' own writes
-- set lifeos.series_writing and touch nothing.

create function core_private.series_writing() returns boolean
language sql stable set search_path = '' as $$
  select coalesce(current_setting('lifeos.series_writing', true), '') = 'on'
$$;

create function core_private.touch_occurrence() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.series_id is not null and new.touched_at is null and not core_private.series_writing()
    and (new.title, new.body, new.status, new.do_on, new.do_at, new.due_on, new.starts_at, new.ends_at, new.archived_at)
      is distinct from
        (old.title, old.body, old.status, old.do_on, old.do_at, old.due_on, old.starts_at, old.ends_at, old.archived_at)
  then
    new.touched_at := now();
  end if;
  return new;
end
$$;
create trigger items_touch before update on core.items
for each row execute function core_private.touch_occurrence();

-- For changes made beside the Item: its Labels, sub-tasks and links.
create function core_private.touch_item(p_item uuid) returns void
language sql security definer set search_path = '' as $$
  update core.items set touched_at = now()
  where id = p_item and series_id is not null and touched_at is null
    and not core_private.series_writing()
$$;

create function core_private.touch_from_child() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  r record := case when tg_op = 'DELETE' then old else new end;
begin
  if tg_table_name = 'links' then
    perform core_private.touch_item(r.from_item);
    perform core_private.touch_item(r.to_item);
  else
    perform core_private.touch_item(r.item_id);
  end if;
  return null;
end
$$;
create trigger item_labels_touch after insert or delete on core.item_labels
for each row execute function core_private.touch_from_child();
create trigger subtasks_touch after insert or update or delete on core.subtasks
for each row execute function core_private.touch_from_child();
create trigger links_touch after insert or delete on core.links
for each row execute function core_private.touch_from_child();

-- ---------------------------------------------------------------------------
-- Search (SRC-001): titles, bodies and Labels, as words, so "insur" finds
-- "insurance". 'simple' keeps words as typed, for prefix matching.

create function core_private.item_search(p_id uuid, p_title text, p_body text) returns tsvector
language sql stable security definer set search_path = '' as $$
  select setweight(to_tsvector('simple', coalesce(p_title, '')), 'A')
    || setweight(to_tsvector('simple', coalesce((
         select string_agg(l.name, ' ') from core.item_labels il join core.labels l on l.id = il.label_id
         where il.item_id = p_id), '')), 'B')
    || setweight(to_tsvector('simple', coalesce(p_body, '')), 'C')
$$;

create function core_private.index_item() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.search := core_private.item_search(new.id, new.title, new.body);
  return new;
end
$$;
create trigger items_index before insert or update of title, body on core.items
for each row execute function core_private.index_item();

create function core_private.reindex_item(p_item uuid) returns void
language sql security definer set search_path = '' as $$
  update core.items set search = core_private.item_search(id, title, body) where id = p_item
$$;

create function core_private.reindex_from_labels() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  item uuid;
begin
  if tg_table_name = 'item_labels' then
    perform core_private.reindex_item(case when tg_op = 'DELETE' then old.item_id else new.item_id end);
  else
    for item in select item_id from core.item_labels where label_id = new.id loop
      perform core_private.reindex_item(item);
    end loop;
  end if;
  return null;
end
$$;
create trigger item_labels_index after insert or delete on core.item_labels
for each row execute function core_private.reindex_from_labels();
create trigger labels_index after update of name on core.labels
for each row execute function core_private.reindex_from_labels();

-- ---------------------------------------------------------------------------
-- Reminders follow their Item (REM-002, REM-003).

-- When a Reminder fires, in the person's home timezone (ADR-0021). Null when
-- the time it hangs on is empty. A snooze replaces it.
create function core_private.reminder_fires_at(r core.reminders) returns timestamptz
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
  if r.anchor = 'starts_at' then
    return item.starts_at + make_interval(mins => r.offset_minutes);
  end if;
  day := case r.anchor when 'do_on' then item.do_on else item.due_on end;
  if day is null then
    return null;
  end if;
  select timezone into tz from core.people where id = r.person_id;
  return ((day + r.offset_days)
    + coalesce(r.at_time, case when r.anchor = 'do_on' then item.do_at end, r.default_time, time '09:00'))
    at time zone coalesce(tz, 'Europe/London');
end
$$;

create function core_private.calculate_reminder() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' and new.default_time is null then
    select default_reminder_time into new.default_time from core.people where id = new.person_id;
  end if;
  new.fires_at := core_private.reminder_fires_at(new);
  return new;
end
$$;
create trigger reminders_calculate before insert or update on core.reminders
for each row execute function core_private.calculate_reminder();

-- After an Item changes: its default Reminder is made or removed, and every
-- Reminder on it is worked out again (a snooze ends when its date moves).
create function core_private.sync_reminders() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  t core.item_types;
  anchor_day date;
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
    when 'starts_at' then new.starts_at::date
  end;
  if t.default_reminder is null or anchor_day is null then
    delete from core.reminders where item_id = new.id and is_default;
  elsif not exists (select 1 from core.reminders where item_id = new.id and person_id = new.owner_id and is_default)
    and coalesce((select (p.reminder_defaults ->> new.type)::boolean from core.people p where p.id = new.owner_id), true)
    and (tg_op = 'INSERT' or (old.do_on, old.due_on, old.starts_at, old.type) is distinct from (new.do_on, new.due_on, new.starts_at, new.type))
  then
    insert into core.reminders (item_id, person_id, anchor, is_default)
    values (new.id, new.owner_id, t.default_reminder, true);
  end if;

  if tg_op = 'UPDATE'
    and (old.do_on, old.do_at, old.due_on, old.starts_at) is distinct from (new.do_on, new.do_at, new.due_on, new.starts_at)
  then
    update core.reminders set snoozed_until = null where item_id = new.id;
  end if;
  return null;
end
$$;
create trigger items_reminders after insert or update of type, do_on, do_at, due_on, starts_at on core.items
for each row execute function core_private.sync_reminders();

-- A new home timezone moves that person's Reminders with it.
create function core_private.people_reminders() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update core.reminders set updated_at = now() where person_id = new.id;
  return null;
end
$$;
create trigger people_reminders after update of timezone on core.people
for each row when (old.timezone is distinct from new.timezone)
execute function core_private.people_reminders();

grant execute on function core_private.series_writing() to authenticated, service_role;
grant execute on function core_private.touch_item(uuid) to authenticated, service_role;
grant execute on function core_private.item_search(uuid, text, text) to authenticated, service_role;
grant execute on function core_private.reindex_item(uuid) to authenticated, service_role;
grant execute on function core_private.reminder_fires_at(core.reminders) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Row-level security.

alter table core.series enable row level security;
alter table core.labels enable row level security;
alter table core.item_labels enable row level security;
alter table core.marks enable row level security;
alter table core.subtasks enable row level security;
alter table core.reminders enable row level security;
alter table core.push_devices enable row level security;
alter table core.reminder_deliveries enable row level security;

grant select, update (name, timezone, default_reminder_time, reminder_defaults, digest_on, digest_time)
  on core.people to authenticated;

grant select, insert, update on core.series to authenticated;
create policy "I read series in my Spaces" on core.series
  for select to authenticated using (space_id in (select core_private.my_space_ids()));
create policy "I make series I own in my Spaces" on core.series
  for insert to authenticated
  with check (owner_id = (select auth.uid()) and space_id in (select core_private.my_space_ids()));
create policy "I change series in my Spaces" on core.series
  for update to authenticated
  using (space_id in (select core_private.my_space_ids()))
  with check (space_id in (select core_private.my_space_ids()));

grant select, insert, update, delete on core.labels to authenticated;
create policy "I read my Spaces' Labels" on core.labels
  for select to authenticated using (space_id in (select core_private.my_space_ids()));
create policy "I make Labels in my Spaces" on core.labels
  for insert to authenticated
  with check (created_by = (select auth.uid()) and space_id in (select core_private.my_space_ids()));
create policy "I rename my Spaces' Labels" on core.labels
  for update to authenticated
  using (space_id in (select core_private.my_space_ids()))
  with check (space_id in (select core_private.my_space_ids()));
create policy "I remove my Spaces' Labels" on core.labels
  for delete to authenticated using (space_id in (select core_private.my_space_ids()));

grant select, insert, delete on core.item_labels to authenticated;
create policy "I read the Labels of what I can see" on core.item_labels
  for select to authenticated using (item_id in (select core_private.readable_item_ids()));
create policy "I label Items I can edit" on core.item_labels
  for insert to authenticated with check (core_private.can_write(item_id));
create policy "I unlabel Items I can edit" on core.item_labels
  for delete to authenticated using (core_private.can_write(item_id));

grant select, insert, delete on core.marks to authenticated;
create policy "I read my marks" on core.marks
  for select to authenticated using (person_id = (select auth.uid()));
create policy "I mark what I can see" on core.marks
  for insert to authenticated
  with check (person_id = (select auth.uid()) and item_id in (select core_private.readable_item_ids()));
create policy "I unmark my marks" on core.marks
  for delete to authenticated using (person_id = (select auth.uid()));

grant select, insert, update, delete on core.subtasks to authenticated;
create policy "I read the sub-tasks of what I can see" on core.subtasks
  for select to authenticated using (item_id in (select core_private.readable_item_ids()));
create policy "I add sub-tasks to Items I can edit" on core.subtasks
  for insert to authenticated with check (core_private.can_write(item_id));
create policy "I change sub-tasks of Items I can edit" on core.subtasks
  for update to authenticated using (core_private.can_write(item_id)) with check (core_private.can_write(item_id));
create policy "I remove sub-tasks of Items I can edit" on core.subtasks
  for delete to authenticated using (core_private.can_write(item_id));

-- Reminders are each person's own (ADR-0023).
grant select, insert, update, delete on core.reminders to authenticated;
create policy "I read my Reminders" on core.reminders
  for select to authenticated using (person_id = (select auth.uid()));
create policy "I set Reminders on what I can see" on core.reminders
  for insert to authenticated
  with check (person_id = (select auth.uid()) and item_id in (select core_private.readable_item_ids()));
create policy "I change my Reminders" on core.reminders
  for update to authenticated
  using (person_id = (select auth.uid())) with check (person_id = (select auth.uid()));
create policy "I remove my Reminders" on core.reminders
  for delete to authenticated using (person_id = (select auth.uid()));

grant select, insert, update, delete on core.push_devices to authenticated;
create policy "I read my devices" on core.push_devices
  for select to authenticated using (person_id = (select auth.uid()));
create policy "I add my devices" on core.push_devices
  for insert to authenticated with check (person_id = (select auth.uid()));
create policy "I change my devices" on core.push_devices
  for update to authenticated
  using (person_id = (select auth.uid())) with check (person_id = (select auth.uid()));
create policy "I remove my devices" on core.push_devices
  for delete to authenticated using (person_id = (select auth.uid()));

-- Deliveries are the delivery job's alone (ADR-0044): no access from the app.

grant all on core.series, core.labels, core.item_labels, core.marks, core.subtasks, core.reminders,
  core.push_devices, core.reminder_deliveries to service_role;
