-- Stage 6 step 10 (WRD-026 1, TDY-006): the Today widget shows a day's
-- clothes as Today does, one card for every Outfit worn on it, named as
-- Today names it. The rest of today_cards is as Stage 7b left it.

create or replace function core_private.today_cards(p_me uuid, p_tz text, p_day date)
returns jsonb
language sql stable set search_path = '' as $$
  with mine as (
    select i.*, t.colour as type_colour,
      coalesce(
        nullif(btrim(i.title), ''),
        (select nullif(btrim(l), '') from unnest(string_to_array(coalesce(i.body, ''), E'\n')) l
         where btrim(l) <> '' limit 1),
        'Untitled') as shown_title
    from core.items i
    join core.item_types t on t.key = i.type and t.schedulable
    where i.archived_at is null
      and i.status not in ('cancelled', 'idea')
      and core_private.readable_by(p_me, i.id)
  ),
  -- A repeating Task: an untouched occurrence overtaken by a newer one come
  -- due is skipped, and of the rest only the next shows (src/lib/series.ts).
  series_due as (
    select o.series_id, max(coalesce(o.occurrence_on, o.do_on)) as latest_due
    from core.items o
    where o.type = 'task' and o.series_id is not null and o.archived_at is null and o.do_on <= p_day
    group by o.series_id
  ),
  next_open as (
    select distinct on (o.series_id) o.id
    from core.items o
    left join series_due s on s.series_id = o.series_id
    where o.type = 'task' and o.series_id is not null and o.archived_at is null
      and o.status in ('active', 'idea')
      and not (o.touched_at is null and s.latest_due is not null
               and coalesce(o.occurrence_on, o.do_on) < s.latest_due)
    order by o.series_id, coalesce(o.do_on, o.occurrence_on) nulls first,
      coalesce(o.occurrence_on, o.do_on) nulls first
  ),
  shown as (
    select m.* from mine m
    where m.type <> 'task' or m.series_id is null or m.status not in ('active', 'idea')
      or m.id in (select id from next_open)
  ),
  overdue as (
    select s.* from shown s where s.type = 'task' and s.status = 'active' and s.due_on < p_day
  ),
  -- A Reminder's Alerts that fall on the day.
  reminder_day as (
    select s.id, min(x.at) as first_at, max(x.at) as last_at
    from shown s
    join core.alerts a on a.item_id = s.id and a.person_id = p_me
    cross join lateral (select core_private.alert_at(a, s.do_on, p_tz) as at) x
    where s.type = 'reminder' and x.at is not null and (x.at at time zone p_tz)::date = p_day
    group by s.id
  ),
  placed as (
    -- Everything but Reminders on its days, as Week has it (src/lib/plan.ts placeOf).
    select s.*,
      case
        when s.starts_at is not null and s.all_day then (s.starts_at at time zone 'UTC')::date
        when s.starts_at is not null then (s.starts_at at time zone p_tz)::date
        else coalesce(s.do_on, s.due_on)
      end as first_day,
      case
        when s.starts_at is not null and s.all_day then
          greatest((coalesce(s.ends_at, s.starts_at + interval '1 day') at time zone 'UTC')::date - 1,
                   (s.starts_at at time zone 'UTC')::date)
        when s.starts_at is not null then
          greatest(((coalesce(s.ends_at, s.starts_at) - interval '1 millisecond') at time zone p_tz)::date,
                   (s.starts_at at time zone p_tz)::date)
        else coalesce(s.do_on, s.due_on)
      end as last_day,
      case
        when s.starts_at is not null and s.all_day then
          (coalesce(s.ends_at, s.starts_at + interval '1 day') at time zone 'UTC')::date - 1
        when s.starts_at is not null then (coalesce(s.ends_at, s.starts_at) at time zone p_tz)::date
      end as end_day
    from shown s
    where s.type <> 'reminder' and s.id not in (select id from overdue)
  ),
  on_day as (
    select p.*,
      case
        when p.starts_at is not null and not p.all_day and p.first_day = p_day
          then to_char(p.starts_at at time zone p_tz, 'HH24:MI')
        when p.starts_at is null and p.do_on is not null and p.do_at is not null
          then to_char(p.do_at, 'HH24:MI')
        else ''
      end as at,
      case
        when p.starts_at is not null then
          case
            when p.all_day or (p.first_day < p_day and (p.last_day > p_day or p.end_day > p_day)) then 'All day'
            when p.first_day < p_day then 'Until ' || to_char(p.ends_at at time zone p_tz, 'HH24:MI')
            else to_char(p.starts_at at time zone p_tz, 'HH24:MI')
          end
        when p.slot is not null then initcap(p.slot)
        when p.do_on is not null and p.do_at is not null then to_char(p.do_at, 'HH24:MI')
      end as time_text,
      case
        when p.starts_at is not null then p.ends_at
        when p.slot = 'breakfast' then (p_day + time '12:00') at time zone p_tz
        when p.slot = 'lunch' then (p_day + time '17:00') at time zone p_tz
      end as fades_at
    from placed p
    where (p.first_day <= p_day and p.last_day >= p_day)
      -- A Task left from an earlier day: still to do, or ticked on the day.
      or (p.type = 'task' and p.do_on < p_day
          and (p.status = 'active'
               or (p.status = 'done' and (p.updated_at at time zone p_tz)::date = p_day)))
  ),
  -- The day's clothes, every Outfit worn on it, as one card (WRD-026 1),
  -- called what Today calls it (src/app/day-actions.ts clothesTitle): an
  -- outfit's name, else "Outfit · 4 garments"; "2 outfits"; "3 garments".
  worn as (
    select d.id, d.created_at, d.position, d.type_colour,
      (select l.to_item from core.links l
       join core.items o on o.id = l.to_item and o.archived_at is null
       where l.from_item = d.id and l.link_type = 'wears' limit 1) as outfit,
      (select count(*) from wardrobe.worn_garments w
       join core.items g on g.id = w.garment_id and g.archived_at is null
       where w.worn_id = d.id) as garments
    from on_day d
    where d.type = 'outfit_worn'
  ),
  clothes as (
    select (array_agg(w.id order by coalesce(w.position, ''), w.created_at, w.id))[1] as id,
      min(coalesce(w.position, '')) as position, min(w.created_at) as created_at,
      max(w.type_colour) as colour, count(w.outfit) as outfits,
      (array_agg(w.outfit) filter (where w.outfit is not null))[1] as outfit,
      sum(w.garments) filter (where w.outfit is null) as singles
    from worn w
    having count(*) > 0
  ),
  clothes_card as (
    select c.*,
      case
        when c.outfits > 1 then c.outfits || ' outfits'
        when c.outfits = 1 then coalesce(
          (select nullif(btrim(o.title), '') from core.items o where o.id = c.outfit),
          'Outfit · ' || n.n || case when n.n = 1 then ' garment' else ' garments' end)
        else coalesce(c.singles, 0) || case when c.singles = 1 then ' garment' else ' garments' end
      end as title
    from clothes c
    cross join lateral (
      select count(*) as n from core.links l
      join core.items g on g.id = l.to_item and g.archived_at is null
      where l.from_item = c.outfit and l.link_type = 'includes'
    ) n
  ),
  cards as (
    select 0 as grp, 0 as part, o.due_on::text as k1, coalesce(to_char(o.do_at, 'HH24:MI'), '~') as k2,
      0 as slot_rank, '' as pos, o.created_at, o.id,
      jsonb_build_object('id', o.id, 'type', o.type, 'colour', o.type_colour, 'title', o.shown_title,
        'time', 'Overdue', 'done', false, 'ends', null) as card
    from overdue o
    union all
    select 1,
      case
        when d.slot = 'breakfast' then 1 when d.slot = 'lunch' then 2 when d.slot = 'dinner' then 3
        when d.at = '' then 0 when d.at < '12:00' then 1 when d.at < '17:00' then 2 else 3
      end,
      d.at, '', case d.slot when 'breakfast' then 1 when 'lunch' then 2 when 'dinner' then 3 else 0 end,
      coalesce(d.position, ''), d.created_at, d.id,
      jsonb_build_object('id', d.id, 'type', d.type, 'colour', d.type_colour, 'title', d.shown_title,
        'time', d.time_text, 'done', d.status = 'done', 'ends', d.fades_at)
    from on_day d
    where d.type <> 'outfit_worn'
    union all
    select 1, 0, '', '', 0, c.position, c.created_at, c.id,
      jsonb_build_object('id', c.id, 'type', 'outfit_worn', 'colour', c.colour, 'title', c.title,
        'time', null, 'done', false, 'ends', null)
    from clothes_card c
    union all
    select 1,
      case when to_char(r.first_at at time zone p_tz, 'HH24:MI') < '12:00' then 1
           when to_char(r.first_at at time zone p_tz, 'HH24:MI') < '17:00' then 2 else 3 end,
      to_char(r.first_at at time zone p_tz, 'HH24:MI'), '', 0, coalesce(s.position, ''), s.created_at, s.id,
      jsonb_build_object('id', s.id, 'type', s.type, 'colour', s.type_colour, 'title', s.shown_title,
        'time', to_char(r.first_at at time zone p_tz, 'HH24:MI'), 'done', false, 'ends', r.last_at)
    from reminder_day r join shown s on s.id = r.id
  )
  select coalesce(
    jsonb_agg(card order by grp, part, k1 collate "C", k2 collate "C", slot_rank, pos collate "C",
      created_at, id),
    '[]'::jsonb)
  from cards
$$;
revoke execute on function core_private.today_cards(uuid, text, date) from public, anon, authenticated;
