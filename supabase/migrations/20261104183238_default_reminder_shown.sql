-- New task and New event show the default Reminder before Save (REM-002 1,
-- EVT-003 1): left as it is, the server makes it as before; changed or
-- removed there, the app sends this straight after the Item, so the
-- default the server just made goes (Joe, 4 November). As the person, so
-- only their own default goes.

create function core.remove_default_reminder(p_item uuid)
returns void
language sql set search_path = '' as $$
  delete from core.reminders
  where item_id = p_item and is_default and person_id = (select auth.uid())
$$;

revoke execute on function core.remove_default_reminder(uuid) from public, anon;
grant execute on function core.remove_default_reminder(uuid) to authenticated;
