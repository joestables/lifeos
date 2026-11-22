-- A finished workout's end time corrected (GYM-012 6; Joe, 22 November): a
-- workout ended late, when it was forgotten, is given its real end, so its
-- duration, the averages and recovery follow. Only the end: its day and its
-- start stay. The end is after the start, within a day of it, and not yet
-- to come.
create or replace function fitness.update_workout(p_id uuid, p_patch jsonb)
returns fitness.workout
language plpgsql set search_path = '' as $$
declare
  r fitness.workout;
  v_end timestamptz;
begin
  perform fitness_private.check_keys(p_patch, array['name', 'day', 'how_it_went', 'motivation', 'notes', 'ended_at']);
  if p_patch ? 'day' and (select stage from fitness.workout where item_id = p_id) <> 'planned' then
    raise exception 'Only a planned workout moves to another day' using errcode = '23514';
  end if;
  if p_patch ? 'ended_at' then
    v_end := (p_patch ->> 'ended_at')::timestamptz;
    select * into r from fitness.workout where item_id = p_id;
    if r.stage is distinct from 'complete' or r.discarded then
      raise exception 'Only a finished workout''s end changes' using errcode = '23514';
    end if;
    if v_end is null or v_end <= r.started_at or v_end > r.started_at + interval '24 hours'
      or v_end > now() + interval '1 minute' then
      raise exception 'A workout ends after it starts, within a day, and not later than now'
        using errcode = '23514';
    end if;
  end if;
  update core.items i set
    title = coalesce(nullif(btrim(p_patch ->> 'name'), ''), i.title),
    do_on = coalesce((p_patch ->> 'day')::date, i.do_on)
  where i.id = p_id and i.type = 'workout' and (p_patch ? 'name' or p_patch ? 'day');
  update fitness.workout w set
    how_it_went = case when p_patch ? 'how_it_went' then (p_patch ->> 'how_it_went')::smallint else w.how_it_went end,
    motivation = case when p_patch ? 'motivation' then (p_patch ->> 'motivation')::smallint else w.motivation end,
    notes = case when p_patch ? 'notes' then nullif(btrim(p_patch ->> 'notes'), '') else w.notes end,
    ended_at = case when p_patch ? 'ended_at' then v_end else w.ended_at end
  where w.item_id = p_id
  returning * into r;
  if r.item_id is null then
    raise exception 'No workout % to update', p_id using errcode = 'P0002';
  end if;
  return r;
end
$$;
