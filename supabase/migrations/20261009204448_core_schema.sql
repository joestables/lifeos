-- The core schema for Stage 1: people, Spaces, Items, links and the activity
-- log, with row-level security. docs/20-architecture/data-model.md;
-- ADR-0007, 0009, 0016, 0017, 0030, 0032, 0039, 0042.
--
-- core          the API: tables read under RLS, and the write functions
--               (security invoker, so RLS is the one check).
-- core_private  helpers the API can't reach: visibility, triggers, uuidv7.

create schema core;
create schema core_private;

grant usage on schema core to authenticated, service_role;
grant usage on schema core_private to authenticated, service_role;

-- Functions are not executable by everyone unless granted.
alter default privileges in schema core revoke execute on functions from public;
alter default privileges in schema core_private revoke execute on functions from public;

-- Supabase's helper on new hosted projects, flagged by the security advisor:
-- nobody calls it. (Local and CI databases don't have it.)
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- IDs: UUIDv7, made on the device; this is for inserts made on the server.

create function core_private.uuidv7() returns uuid
language sql volatile set search_path = '' as $$
  select encode(
    set_bit(set_bit(
      overlay(uuid_send(gen_random_uuid())
        placing substring(int8send(floor(extract(epoch from clock_timestamp()) * 1000)::bigint) from 3)
        from 1 for 6),
      52, 1), 53, 1),
    'hex')::uuid
$$;
grant execute on function core_private.uuidv7() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- The ontology's lookup tables, filled by the generated *_ontology.sql
-- migration (ADR-0008). Read-only to everyone signed in.

create table core.item_types (
  key text primary key,
  module text not null,
  label text not null,
  schedulable boolean not null,
  completable boolean not null,
  shareable boolean not null,
  capturable boolean not null,
  statuses text[] not null,
  default_space text not null check (default_space in ('personal', 'household')),
  time_fields text[] not null,
  converts_to text[] not null
);

create table core.link_types (
  key text primary key,
  label text not null,
  inverse_label text not null,
  from_types text[], -- null: any Type
  to_types text[],
  is_symmetric boolean not null
);

-- ---------------------------------------------------------------------------
-- People and Spaces (ADR-0039). Contacts and Households arrive in Stage 4.

create table core.people (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  timezone text not null default 'Europe/London',
  created_at timestamptz not null default now()
);

create table core.spaces (
  id uuid primary key default core_private.uuidv7(),
  kind text not null check (kind in ('personal', 'household')),
  name text not null default '',
  created_by uuid not null references core.people (id) on delete cascade,
  created_at timestamptz not null default now()
);
create unique index spaces_one_personal_each on core.spaces (created_by) where kind = 'personal';

create table core.space_members (
  space_id uuid not null references core.spaces (id) on delete cascade,
  person_id uuid not null references core.people (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (space_id, person_id)
);
create index space_members_person on core.space_members (person_id);

-- ---------------------------------------------------------------------------
-- Items and links (ADR-0007, data-model.md#storage-shape).

create table core.items (
  id uuid primary key default core_private.uuidv7(),
  type text not null references core.item_types (key),
  title text not null default '',
  body text,
  space_id uuid not null references core.spaces (id) on delete cascade,
  owner_id uuid not null default auth.uid() references core.people (id) on delete cascade,
  status text not null default 'active' check (status in ('idea', 'active', 'done', 'cancelled')),
  starts_at timestamptz,
  ends_at timestamptz,
  all_day boolean,
  due_on date,
  do_on date,
  do_at time,
  slot text check (slot in ('breakfast', 'lunch', 'dinner', 'snack')),
  series_id uuid, -- references core.series, added with repeating Items (Stage 2)
  touched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  check (ends_at is null or starts_at is not null and ends_at >= starts_at),
  check (do_at is null or do_on is not null)
);
create index items_space on core.items (space_id) where archived_at is null;
create index items_owner on core.items (owner_id);
create index items_do_on on core.items (do_on) where archived_at is null;
create index items_due_on on core.items (due_on) where archived_at is null;
create index items_starts_at on core.items (starts_at) where archived_at is null;

create table core.links (
  id uuid primary key default core_private.uuidv7(),
  from_item uuid not null references core.items (id) on delete cascade,
  to_item uuid not null references core.items (id) on delete cascade,
  link_type text not null references core.link_types (key),
  origin text not null default 'manual' check (origin in ('manual', 'action', 'integration')),
  created_by uuid not null default auth.uid() references core.people (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (from_item <> to_item),
  unique (from_item, to_item, link_type)
);
create index links_to_item on core.links (to_item);

-- The activity log (ADR-0030): written only by triggers.
create table core.activity (
  id bigint generated always as identity primary key,
  item_id uuid not null references core.items (id) on delete cascade,
  verb text not null check (verb in ('created', 'updated', 'converted', 'archived', 'restored', 'linked', 'unlinked')),
  changed jsonb not null default '{}',
  at timestamptz not null default now(),
  actor uuid default auth.uid()
);
create index activity_item on core.activity (item_id, at);

-- ---------------------------------------------------------------------------
-- Visibility (ADR-0016, ADR-0017). One rule, in one place.

create function core_private.my_space_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select space_id from core.space_members where person_id = (select auth.uid())
$$;

-- One hop: the Item is linked to a live Item in one of my Spaces. Read-only;
-- archived Items' links don't count.
create function core_private.can_read_via_link(p_item uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from core.links l
    join core.items i on i.id = p_item and i.archived_at is null
    join core.items o on o.id = case when l.from_item = p_item then l.to_item else l.from_item end
    where (l.from_item = p_item or l.to_item = p_item)
      and o.archived_at is null
      and o.space_id in (select core_private.my_space_ids())
  )
$$;

-- Readable: the Item is in one of my Spaces, or visible one hop through a link.
-- Every Module's policies call this (ADR-0017). core.items' own policy spells
-- out the first half on the row itself, so a new row can be returned.
create function core_private.can_read(p_item uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from core.items i
    where i.id = p_item and i.space_id in (select core_private.my_space_ids())
  ) or core_private.can_read_via_link(p_item)
$$;

-- Writable: in one of my Spaces. Visibility through a link never grants editing.
create function core_private.can_write(p_item uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from core.items i
    where i.id = p_item and i.space_id in (select core_private.my_space_ids())
  )
$$;

-- Linking: I can write both ends, and when they are in different Spaces I own
-- each end, because the link exposes it (ADR-0017).
create function core_private.can_link(p_from uuid, p_to uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select core_private.can_write(p_from) and core_private.can_write(p_to) and (
    select f.space_id = t.space_id
      or (f.owner_id = (select auth.uid()) and t.owner_id = (select auth.uid()))
    from core.items f, core.items t
    where f.id = p_from and t.id = p_to
  )
$$;

grant execute on function core_private.my_space_ids() to authenticated;
grant execute on function core_private.can_read_via_link(uuid) to authenticated;
grant execute on function core_private.can_read(uuid) to authenticated;
grant execute on function core_private.can_write(uuid) to authenticated;
grant execute on function core_private.can_link(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Rules the database enforces from the ontology.

create function core_private.check_item() returns trigger
language plpgsql set search_path = '' as $$
declare
  t core.item_types;
  space_kind text;
  field text;
begin
  select * into t from core.item_types where key = new.type;
  if tg_op = 'UPDATE' and new.type <> old.type and not exists (
    select 1 from core.item_types o where o.key = old.type and new.type = any (o.converts_to)
  ) then
    raise exception 'A % can''t be converted into a %', old.type, t.label using errcode = '23514';
  end if;
  if not new.status = any (t.statuses) then
    raise exception 'A % can''t have the status %', t.label, new.status using errcode = '23514';
  end if;
  foreach field in array array['starts_at', 'ends_at', 'all_day', 'due_on', 'do_on', 'do_at', 'slot'] loop
    if not field = any (t.time_fields) and to_jsonb(new) -> field <> 'null'::jsonb then
      raise exception 'A % has no %', t.label, field using errcode = '23514';
    end if;
  end loop;
  select kind into space_kind from core.spaces where id = new.space_id;
  if space_kind = 'household' and not t.shareable then
    raise exception 'A % is always Personal', t.label using errcode = '23514';
  end if;
  return new;
end
$$;

create trigger items_check before insert or update on core.items
for each row execute function core_private.check_item();

create function core_private.check_link() returns trigger
language plpgsql set search_path = '' as $$
declare
  lt core.link_types;
  from_type text;
  to_type text;
begin
  select * into lt from core.link_types where key = new.link_type;
  select type into from_type from core.items where id = new.from_item;
  select type into to_type from core.items where id = new.to_item;
  if lt.is_symmetric and new.from_item > new.to_item then
    -- One row per pair for a symmetric link: the lower id comes first.
    select new.to_item, new.from_item into new.from_item, new.to_item;
  end if;
  if (lt.from_types is not null and not from_type = any (lt.from_types))
    or (lt.to_types is not null and not to_type = any (lt.to_types)) then
    raise exception 'A % can''t be "%" a %', from_type, lt.label, to_type using errcode = '23514';
  end if;
  return new;
end
$$;

create trigger links_check before insert on core.links
for each row execute function core_private.check_link();

create function core_private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end
$$;

create trigger items_updated_at before update on core.items
for each row execute function core_private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- The activity log's triggers (ADR-0030).

create function core_private.log_item() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  changes jsonb := '{}';
  verb text;
  key text;
  old_row jsonb;
  new_row jsonb := to_jsonb(new) - 'updated_at';
begin
  if tg_op = 'INSERT' then
    insert into core.activity (item_id, verb, changed)
    values (new.id, 'created', jsonb_build_object('type', new.type));
    return null;
  end if;

  old_row := to_jsonb(old) - 'updated_at';
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

create trigger items_log after insert or update on core.items
for each row execute function core_private.log_item();

-- A link is logged on both of its Items.
create function core_private.log_link() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  l core.links := case when tg_op = 'INSERT' then new else old end;
  verb text := case when tg_op = 'INSERT' then 'linked' else 'unlinked' end;
begin
  -- When an Item itself is deleted, its links go with it, unlogged.
  insert into core.activity (item_id, verb, changed)
  select e.item_id, verb, e.changed
  from (values
    (l.from_item, jsonb_build_object('link_type', l.link_type, 'to_item', l.to_item)),
    (l.to_item, jsonb_build_object('link_type', l.link_type, 'from_item', l.from_item))
  ) as e (item_id, changed)
  where exists (select 1 from core.items where id = e.item_id);
  return null;
end
$$;

create trigger links_log after insert or delete on core.links
for each row execute function core_private.log_link();

-- ---------------------------------------------------------------------------
-- Sign-up: every account starts with its own Personal Space (ACC-001).

create function core_private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  space uuid;
begin
  insert into core.people (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''));
  insert into core.spaces (kind, name, created_by) values ('personal', 'Personal', new.id)
  returning id into space;
  insert into core.space_members (space_id, person_id) values (space, new.id);
  return new;
end
$$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function core_private.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row-level security. Signed-in people only; anon has no access to core.

alter table core.item_types enable row level security;
alter table core.link_types enable row level security;
alter table core.people enable row level security;
alter table core.spaces enable row level security;
alter table core.space_members enable row level security;
alter table core.items enable row level security;
alter table core.links enable row level security;
alter table core.activity enable row level security;

grant select on core.item_types, core.link_types to authenticated;
create policy "Everyone signed in reads the ontology" on core.item_types
  for select to authenticated using (true);
create policy "Everyone signed in reads the ontology" on core.link_types
  for select to authenticated using (true);

grant select, update (name, timezone) on core.people to authenticated;
create policy "I read myself" on core.people
  for select to authenticated using (id = (select auth.uid()));
create policy "I update myself" on core.people
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

grant select on core.spaces, core.space_members to authenticated;
create policy "I read my Spaces" on core.spaces
  for select to authenticated using (id in (select core_private.my_space_ids()));
create policy "I read my Spaces' members" on core.space_members
  for select to authenticated using (space_id in (select core_private.my_space_ids()));

-- Items are never deleted by people: delete means archive (ADR-0032).
grant select, insert, update on core.items to authenticated;
create policy "I read what I can see" on core.items
  for select to authenticated
  using (space_id in (select core_private.my_space_ids()) or core_private.can_read_via_link(id));
create policy "I create Items I own in my Spaces" on core.items
  for insert to authenticated
  with check (owner_id = (select auth.uid()) and space_id in (select core_private.my_space_ids()));
create policy "I edit Items in my Spaces" on core.items
  for update to authenticated
  using (space_id in (select core_private.my_space_ids()))
  with check (space_id in (select core_private.my_space_ids()));

grant select, insert, delete on core.links to authenticated;
create policy "I read links between Items I can see" on core.links
  for select to authenticated
  using (core_private.can_read(from_item) and core_private.can_read(to_item));
create policy "I link Items I may link" on core.links
  for insert to authenticated
  with check (created_by = (select auth.uid()) and core_private.can_link(from_item, to_item));
create policy "I unlink Items I may link" on core.links
  for delete to authenticated using (core_private.can_link(from_item, to_item));

grant select on core.activity to authenticated;
create policy "I read the history of what I can see" on core.activity
  for select to authenticated using (core_private.can_read(item_id));

grant all on all tables in schema core to service_role;
