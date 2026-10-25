-- Stage 4b (step 10, Joe's first round): an open food shop shows its
-- Space's out-of-stock staples and Required Essentials as lines (SHP-003 3),
-- so a change to them made on another device arrives live too (SHP-004 2;
-- ADR-0057). Realtime checks each change against food.space_entries' RLS
-- for every subscriber.

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'food' and tablename = 'space_entries'
    )
  then
    alter publication supabase_realtime add table food.space_entries;
  end if;
end
$$;
