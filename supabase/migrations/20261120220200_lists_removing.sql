-- Lists (ADR-0069), after lists_schema: removing a line or subheading
-- (NTE-006 3), which needs a delete. The Supabase tool may wait on a
-- confirmation it can't show for this; if it does, Joe runs this file in
-- the SQL editor (migrations.md).

grant delete on core.list_lines to authenticated;
create policy "I remove lines of the Lists I can edit" on core.list_lines
  for delete to authenticated using (core_private.can_write(list_id));

create function core.remove_list_line(p_id uuid)
returns void
language sql set search_path = '' as $$
  delete from core.list_lines where id = p_id
$$;

grant execute on function core.remove_list_line(uuid) to authenticated;
