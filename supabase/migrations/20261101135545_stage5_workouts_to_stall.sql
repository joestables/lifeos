-- Stage 5: Workouts to stall, one Gym setting for every exercise (Joe,
-- 1 November): an exercise is Stalled when none of its last that many
-- workouts beats the oldest's best. gym.md GYM-014 5, GYM-020 3; ADR-0058.

alter table fitness.settings
  add column workouts_to_stall smallint not null default 5
  check (workouts_to_stall between 2 and 20);

create or replace function fitness.update_settings(p_patch jsonb)
returns fitness.settings
language plpgsql set search_path = '' as $$
declare
  r fitness.settings;
begin
  perform fitness_private.check_keys(p_patch,
    array['preferred_rir', 'workouts_to_stall', 'points_per_fatigue_set', 't_fast_h', 't_normal_h', 't_slow_h']);
  insert into fitness.settings (person_id) values ((select auth.uid())) on conflict do nothing;
  update fitness.settings s set
    preferred_rir = coalesce((p_patch ->> 'preferred_rir')::smallint, s.preferred_rir),
    workouts_to_stall = coalesce((p_patch ->> 'workouts_to_stall')::smallint, s.workouts_to_stall),
    points_per_fatigue_set = coalesce((p_patch ->> 'points_per_fatigue_set')::numeric, s.points_per_fatigue_set),
    t_fast_h = coalesce((p_patch ->> 't_fast_h')::numeric, s.t_fast_h),
    t_normal_h = coalesce((p_patch ->> 't_normal_h')::numeric, s.t_normal_h),
    t_slow_h = coalesce((p_patch ->> 't_slow_h')::numeric, s.t_slow_h)
  where s.person_id = (select auth.uid())
  returning * into r;
  return r;
end
$$;
