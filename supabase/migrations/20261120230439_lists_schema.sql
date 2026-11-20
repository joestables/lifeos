-- Lists (ADR-0069; notes.md NTE-006–008): a List is an Item (core.items,
-- type 'list') with a name and lines, under my own subheadings, ticked as I
-- go. It has no date, and is done once I complete it. Its lines are here, in
-- the core, as a Note's text is; a List in a Household is read and written
-- by its members, as every Item is. Removing a line is in lists_removing
-- (the Supabase tool may wait on a delete; migrations.md).

create table core.list_lines (
  id uuid primary key default core_private.uuidv7(),
  list_id uuid not null references core.items (id) on delete cascade,
  position text collate "C" not null default '',
  -- A row with a heading is a subheading and nothing else.
  heading text check (length(heading) <= 200),
  text text check (length(text) <= 500),
  checked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (heading is not null and text is null and not checked)
    or (heading is null and nullif(btrim(text), '') is not null)
  )
);
create index list_lines_list on core.list_lines (list_id, position);

create trigger list_lines_updated_at before update on core.list_lines
for each row execute function core_private.touch_updated_at();

-- Lines belong to a List, and stay on it.
create function core_private.check_list_line() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.list_id <> old.list_id then
    raise exception 'A line stays on its List' using errcode = '23514';
  end if;
  if (select i.type from core.items i where i.id = new.list_id) is distinct from 'list' then
    raise exception 'Lines belong to a List' using errcode = '23514';
  end if;
  return new;
end
$$;
create trigger list_lines_check before insert or update on core.list_lines
for each row execute function core_private.check_list_line();

-- ---------------------------------------------------------------------------
-- Row-level security: through the List's own Space, as every Item is.

alter table core.list_lines enable row level security;

grant select, insert, update on core.list_lines to authenticated;
create policy "I read the lines of the Lists I can see" on core.list_lines
  for select to authenticated using (list_id in (select core_private.readable_item_ids()));
create policy "I add lines to the Lists I can edit" on core.list_lines
  for insert to authenticated with check (core_private.can_write(list_id));
create policy "I change lines of the Lists I can edit" on core.list_lines
  for update to authenticated
  using (core_private.can_write(list_id)) with check (core_private.can_write(list_id));

grant all on core.list_lines to service_role;

-- ---------------------------------------------------------------------------
-- Writes (ADR-0042), each safe to send twice. A List itself is made with
-- core.create_item, changed with core.update_item and completed with its
-- status, as any Item is.

-- A line, or a subheading (NTE-006 3). Fields: position, heading, text.
create function core.add_list_line(p_id uuid, p_list uuid, p_fields jsonb)
returns core.list_lines
language plpgsql set search_path = '' as $$
declare
  r core.list_lines;
  unknown text;
begin
  select k into unknown from jsonb_object_keys(p_fields) k
  where k <> all (array['position', 'heading', 'text']) limit 1;
  if unknown is not null then
    raise exception 'Unknown field %', unknown using errcode = '22023';
  end if;
  insert into core.list_lines (id, list_id, position, heading, text)
  values (
    p_id, p_list, coalesce(p_fields ->> 'position', ''),
    nullif(btrim(p_fields ->> 'heading'), ''),
    nullif(btrim(p_fields ->> 'text'), '')
  )
  on conflict (id) do nothing;
  select * into r from core.list_lines where id = p_id;
  return r;
end
$$;

-- A line or subheading renamed, or moved (its position).
create function core.update_list_line(p_id uuid, p_patch jsonb)
returns core.list_lines
language plpgsql set search_path = '' as $$
declare
  r core.list_lines;
  unknown text;
begin
  select k into unknown from jsonb_object_keys(p_patch) k
  where k <> all (array['position', 'heading', 'text']) limit 1;
  if unknown is not null then
    raise exception 'Unknown field %', unknown using errcode = '22023';
  end if;
  update core.list_lines l set
    position = case when p_patch ? 'position' then p_patch ->> 'position' else l.position end,
    heading = case when p_patch ? 'heading' and l.heading is not null
      then nullif(btrim(p_patch ->> 'heading'), '') else l.heading end,
    text = case when p_patch ? 'text' and l.heading is null
      then nullif(btrim(p_patch ->> 'text'), '') else l.text end
  where l.id = p_id
  returning * into r;
  if r.id is null then
    raise exception 'No line % to update', p_id using errcode = 'P0002';
  end if;
  return r;
end
$$;

-- Ticking (NTE-006 4): lines ticked or unticked; a subheading never is.
create function core.tick_list_lines(p_ids uuid[], p_checked boolean)
returns void
language sql set search_path = '' as $$
  update core.list_lines set checked = p_checked
  where id = any (p_ids) and heading is null and checked is distinct from p_checked
$$;

grant execute on function core.add_list_line(uuid, uuid, jsonb) to authenticated;
grant execute on function core.update_list_line(uuid, jsonb) to authenticated;
grant execute on function core.tick_list_lines(uuid[], boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Live (NTE-008 2): a shared List's lines reach its other members through
-- Realtime's Postgres Changes, checked against RLS for each subscriber.

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table core.list_lines;
  end if;
end
$$;
