-- Stage 3 (plan step 4): Plan's hidden Types in my settings (PLN-004).

-- ---------------------------------------------------------------------------
-- My Plan settings (PLN-004): the Types I've hidden, kept with my settings
-- (the column is added in stage3_columns).

create or replace function core.update_settings(p_patch jsonb)
returns core.people
language plpgsql set search_path = '' as $$
declare
  r core.people;
begin
  if exists (select 1 from jsonb_object_keys(p_patch) k
             where k not in ('name', 'timezone', 'default_reminder_time', 'reminder_defaults',
                             'digest_on', 'digest_time', 'plan_hidden_types')) then
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
  update core.people p set
    name = case when p_patch ? 'name' then coalesce(p_patch ->> 'name', '') else p.name end,
    timezone = case when p_patch ? 'timezone' then p_patch ->> 'timezone' else p.timezone end,
    default_reminder_time = case when p_patch ? 'default_reminder_time' then (p_patch ->> 'default_reminder_time')::time else p.default_reminder_time end,
    reminder_defaults = case when p_patch ? 'reminder_defaults' then p.reminder_defaults || (p_patch -> 'reminder_defaults') else p.reminder_defaults end,
    digest_on = case when p_patch ? 'digest_on' then (p_patch ->> 'digest_on')::boolean else p.digest_on end,
    digest_time = case when p_patch ? 'digest_time' then (p_patch ->> 'digest_time')::time else p.digest_time end,
    plan_hidden_types = case when p_patch ? 'plan_hidden_types'
      then array(select distinct jsonb_array_elements_text(p_patch -> 'plan_hidden_types') order by 1)
      else p.plan_hidden_types end
  where p.id = (select auth.uid())
  returning * into r;
  return r;
end
$$;
