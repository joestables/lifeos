-- What Supabase Storage keeps in the database, as far as the migrations use
-- it, for scripts/db-test.sh on the bare Postgres image (the live project and
-- the Supabase CLI have the real schema). Never applied anywhere else.
create schema if not exists storage authorization supabase_admin;
create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text,
  owner uuid default auth.uid()
);
alter table storage.objects enable row level security;
grant usage on schema storage to authenticated;
grant select, insert, delete on storage.objects to authenticated;
-- Migrations run as postgres, which may write the policies, as on the live project.
grant usage on schema storage to postgres;
alter table storage.buckets owner to postgres;
alter table storage.objects owner to postgres;
