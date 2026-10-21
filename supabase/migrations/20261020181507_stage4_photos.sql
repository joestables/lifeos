-- Stage 4 (plan step 5): photos (ADR-0052). A Recipe's photo, made WebP of
-- about 250 KB on the device, is kept in Supabase Storage's private `photos`
-- bucket at `{item id}/{attachment id}.webp`, and `core.attachments` says
-- which Item it belongs to. Whoever can read the Item can read its photo,
-- a Household member's Recipe too; whoever can write the Item can add or
-- remove it. One photo per Item.

create table core.attachments (
  id uuid primary key default core_private.uuidv7(),
  item_id uuid not null references core.items (id) on delete cascade,
  kind text not null default 'photo' check (kind in ('photo')),
  -- In the `photos` bucket; made here from the ids, never sent.
  path text not null unique,
  width integer check (width between 1 and 10000),
  height integer check (height between 1 and 10000),
  bytes integer check (bytes between 1 and 2097152),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
create unique index attachments_one_photo on core.attachments (item_id) where kind = 'photo';

alter table core.attachments enable row level security;
grant select, insert, delete on core.attachments to authenticated;
create policy "I read the attachments of what I can see" on core.attachments
  for select to authenticated using (core_private.can_read(item_id));
create policy "I attach to what I can write" on core.attachments
  for insert to authenticated with check (core_private.can_write(item_id));
create policy "I remove attachments from what I can write" on core.attachments
  for delete to authenticated using (core_private.can_write(item_id));

-- An Item's photo, in place of any it had (RCP-006 3). Idempotent: sent
-- again, the same photo stays. Returns the photo.
create function core.set_photo(
  p_id uuid, p_item uuid, p_width integer, p_height integer, p_bytes integer
) returns core.attachments
language plpgsql set search_path = '' as $$
declare
  r core.attachments;
begin
  if exists (select 1 from core.attachments where id = p_id) then
    select * into r from core.attachments where id = p_id;
    return r;
  end if;
  delete from core.attachments where item_id = p_item and kind = 'photo';
  insert into core.attachments (id, item_id, kind, path, width, height, bytes)
  values (p_id, p_item, 'photo', p_item || '/' || p_id || '.webp', p_width, p_height, p_bytes)
  returning * into r;
  return r;
end
$$;

-- An Item without its photo.
create function core.remove_photo(p_item uuid) returns void
language sql set search_path = '' as $$
  delete from core.attachments where item_id = p_item and kind = 'photo'
$$;

grant execute on function core.set_photo(uuid, uuid, integer, integer, integer) to authenticated;
grant execute on function core.remove_photo(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: the private `photos` bucket, WebP only, at most 2 MB a file.

-- The Item a stored file belongs to: its first folder, when that is an id.
create function core_private.item_of_path(p_name text) returns uuid
language sql immutable set search_path = '' as $$
  select case
    when split_part(p_name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then split_part(p_name, '/', 1)::uuid
  end
$$;
grant execute on function core_private.item_of_path(text) to authenticated;
grant execute on function core_private.can_read(uuid) to authenticated;
grant execute on function core_private.can_write(uuid) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 2097152, array['image/webp'])
on conflict (id) do nothing;

create policy "I read the photos of what I can see" on storage.objects
  for select to authenticated
  using (bucket_id = 'photos' and core_private.can_read(core_private.item_of_path(name)));
create policy "I add photos to what I can write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and core_private.can_write(core_private.item_of_path(name)));
create policy "I remove photos from what I can write" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and core_private.can_write(core_private.item_of_path(name)));
