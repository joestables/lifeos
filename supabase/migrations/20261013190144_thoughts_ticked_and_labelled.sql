-- Thoughts ticked off and labelled (Joe, 13 October; plan step 14). The
-- ontology migration after this one gives a Thought Labels and a done status.
--
-- 1. Converting an Item keeps its status where the new Type has it, and
--    makes it active where it doesn't: a done Thought made a Note is an
--    active Note (ITM-004).
-- 2. The morning digest counts only the Thoughts still to deal with, and
--    calls them Thoughts, as Inbox does (REM-008, INB-001).

create or replace function core.convert_item(p_id uuid, p_type text)
returns core.items
language plpgsql set search_path = '' as $$
declare
  r core.items;
begin
  update core.items i set
    type = p_type,
    status = case
      when i.status = any (coalesce((select t.statuses from core.item_types t where t.key = p_type), array[i.status]))
        then i.status
      else 'active'
    end
  where i.id = p_id and i.type <> p_type;
  select * into r from core.items where id = p_id;
  if r.id is null then
    raise exception 'No Item % to convert', p_id using errcode = 'P0002';
  end if;
  return r;
end
$$;

create or replace function core_private.day_counts(p_person uuid, p_today date)
returns table (overdue int, today int, to_sort int)
language sql stable set search_path = '' as $$
  select
    count(*) filter (where i.type = 'task' and i.due_on < p_today)::int,
    count(*) filter (where i.type = 'task' and not coalesce(i.due_on < p_today, false)
                     and (i.do_on <= p_today or i.due_on = p_today))::int,
    count(*) filter (where i.type = 'thought')::int
  from core.items i
  where i.owner_id = p_person and i.archived_at is null and i.status = 'active'
$$;

create or replace function core_private.notification_payload(d core.reminder_deliveries)
returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  i core.items;
  t core.item_types;
  tz text;
  c record;
  parts text[] := '{}';
  line text;
  buttons jsonb := '[]';
begin
  select timezone into tz from core.people where id = d.person_id;
  if d.kind = 'digest' then
    select * into c from core_private.day_counts(d.person_id, (now() at time zone tz)::date);
    if c.overdue > 0 then parts := parts || (c.overdue || ' overdue'); end if;
    if c.today > 0 then parts := parts || (c.today || ' today'); end if;
    if c.to_sort > 0 then
      parts := parts || (c.to_sort || case when c.to_sort = 1 then ' thought' else ' thoughts' end);
    end if;
    if cardinality(parts) = 0 then
      return null;
    end if;
    return jsonb_build_object('title', array_to_string(parts, ' · '), 'body', '', 'url', '/inbox',
                              'tag', d.key, 'actions', '[]'::jsonb);
  end if;

  select * into i from core.items where id = d.item_id;
  if i.id is null or i.archived_at is not null or i.status not in ('active', 'idea') then
    return null;
  end if;
  select * into t from core.item_types where key = i.type;
  if i.do_at is not null and i.do_on is not null then
    line := to_char(i.do_on, 'Dy FMDD Mon') || ' ' || to_char(i.do_at, 'HH24:MI');
  end if;
  if i.due_on is not null then
    line := concat_ws(' · ', line, 'Due ' || to_char(i.due_on, 'Dy FMDD Mon'));
  end if;
  if t.completable then
    buttons := buttons || jsonb_build_object('action', 'done', 'title', 'Done');
  end if;
  buttons := buttons || jsonb_build_object('action', 'snooze', 'title', 'Snooze 1 hour');
  return jsonb_build_object(
    'title', case when d.kind = 'overdue' then 'Overdue: ' else '' end
      || coalesce(nullif(btrim(i.title), ''), t.label),
    'body', coalesce(line, ''),
    'url', '/item/' || i.id,
    'tag', d.key,
    'actions', buttons
  );
end
$$;
