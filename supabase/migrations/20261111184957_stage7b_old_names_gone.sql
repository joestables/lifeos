-- Stage 7b, step 10b: the names from before Alerts go (ADR-0065 4). Step 4
-- kept them for a write queued before the rename and an app left open in a
-- browser; the last request by them was on 10 November at 19:36 UTC, and
-- Joe's phone has used only the new ones since. The Android app as
-- installed never called them: it speaks to the Edge Functions, whose
-- fields (`reminder`) and notifications' `kind` and `key` stay until its
-- next release.

drop view core.reminders;
alter table core.people drop column default_reminder_time, drop column reminder_defaults;

drop function core.add_reminder(uuid, uuid, jsonb);
drop function core.update_reminder(uuid, jsonb);
drop function core.remove_reminder(uuid);
drop function core.remove_default_reminder(uuid);
drop function core.snooze_reminder(uuid, timestamptz);
drop function core.device_reminders(uuid, text);
drop function core.reminder_for_action(uuid, text, uuid);
drop function core.act_on_reminder(uuid, text, uuid, text, uuid, date);

-- My settings take only their own names.
create or replace function core.update_settings(p_patch jsonb)
returns core.people
language plpgsql set search_path = '' as $$
declare
  r core.people;
begin
  if exists (select 1 from jsonb_object_keys(p_patch) k
             where k not in ('name', 'timezone', 'default_alert_time', 'alert_defaults',
                             'digest_on', 'digest_time', 'plan_hidden_types', 'meal_space_id')) then
    raise exception 'Unknown field in %', p_patch using errcode = '22023';
  end if;
  if p_patch ? 'timezone' and not exists (select 1 from pg_catalog.pg_timezone_names where name = p_patch ->> 'timezone') then
    raise exception 'Unknown timezone %', p_patch ->> 'timezone' using errcode = '22023';
  end if;
  if p_patch ? 'plan_hidden_types' and exists (
    select 1 from jsonb_array_elements_text(p_patch -> 'plan_hidden_types') k
    where not exists (select 1 from core.item_types t where t.key = k and t.schedulable)
  ) then
    raise exception 'Plan shows only Types that can be planned' using errcode = '22023';
  end if;
  if p_patch ->> 'meal_space_id' is not null and (p_patch ->> 'meal_space_id')::uuid not in (
    select core_private.my_space_ids()
  ) then
    raise exception 'New meals go to Personal or one of my Households' using errcode = '42501';
  end if;
  update core.people p set
    name = case when p_patch ? 'name' then coalesce(p_patch ->> 'name', '') else p.name end,
    timezone = case when p_patch ? 'timezone' then p_patch ->> 'timezone' else p.timezone end,
    default_alert_time = case when p_patch ? 'default_alert_time' then (p_patch ->> 'default_alert_time')::time else p.default_alert_time end,
    alert_defaults = case when p_patch ? 'alert_defaults' then p.alert_defaults || (p_patch -> 'alert_defaults') else p.alert_defaults end,
    digest_on = case when p_patch ? 'digest_on' then (p_patch ->> 'digest_on')::boolean else p.digest_on end,
    digest_time = case when p_patch ? 'digest_time' then (p_patch ->> 'digest_time')::time else p.digest_time end,
    plan_hidden_types = case when p_patch ? 'plan_hidden_types'
      then array(select distinct jsonb_array_elements_text(p_patch -> 'plan_hidden_types') order by 1)
      else p.plan_hidden_types end,
    meal_space_id = case when p_patch ? 'meal_space_id' then (p_patch ->> 'meal_space_id')::uuid else p.meal_space_id end
  where p.id = (select auth.uid())
  returning * into r;
  return r;
end
$$;
