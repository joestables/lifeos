# ADR-0058: Fitness in the database

**Status:** Provisionally agreed · 2026-10-29 (Joe)
**Amended:** 2026-10-31 by Joe's comments on the first design pass (no goal on an Exercise; a template's exercises carry a number of sets, not sets with RIR; a set may be logged without numbers; Complete for done); 2026-11-01 (the working set called the current set; a quick set; motivation as three levels).

## Context

The [Gym spec](../../10-requirements/modules/gym.md) (GYM-001–021, agreed
29 October) leaves to Stage 5's step 2
([plan](../../50-progress/plans/stage-5.md)) how the schema holds
exercises, templates and workouts, and how the database keeps the spec's
rules: exact increments, one primary muscle group, one workout in
progress, a planned day with no time, and a workout's copy of what it
started from ([ADR-0013](0013-occurrences-snapshot-their-definition.md)).

## Decision

- **Exercise, Workout template and Workout are Items** (`core.items`),
  declared in `packages/ontology` under the `fitness` Module, always
  Personal and written only by their owner. Each name is the Item's
  title. An archived Exercise has status *cancelled* "Archived"; deleting
  goes to Recently deleted, as everywhere
  ([ADR-0032](0032-delete-means-archive.md)).
- **A Workout is planned for a day:** `core.items.do_on`, as a Meal is,
  never `starts_at`. Its stage is in `fitness.workout` (planned ·
  in_progress · complete), its status *active* until complete, then
  *done*. **Skipped is worked
  out, not stored:** a planned Workout whose day has passed. **One in
  progress per person**, by a unique index.
- **Detail tables:** `fitness.exercise(equipment_id, current_weight,
  current_reps, notes?)` — no goal: goals are the Goals app's;
  `fitness.workout(stage, started_at?, ended_at?, how_it_went? (1–5),
  motivation? (1–3: low, okay, high), notes?)`.
- **Child rows:** `exercise_muscles(exercise_id, muscle_id,
  contribution)` — exactly one row of 1.0 (the primary), the rest 0.1–0.9
  in steps of 0.1, checked by the function that writes them;
  `template_exercises(template_id, exercise_id, position, sets)`;
  `workout_entries(workout_id, exercise_id, place: backlog · session,
  planned_sets, begun_at?, done_at?, snapshot)`, the session's order
  being `begun_at`'s;
  `workout_sets(entry_id, position, weight?, reps?, rir?, logged_at)`,
  each logged when it is written; weight, reps and RIR are all there or
  all missing, a **quick set** having none (the engine
  counts it as 10 reps at RIR 2).
- **The snapshot** an entry takes at Start, or when added, is its
  Exercise's name, equipment, increment and current set. **Muscle groups
  are not copied:** readiness and stimulus sets always use an Exercise's
  current groups (GYM-004 4).
- **Reference data, each person's:** `fitness.equipment(name,
  increment)`, none to begin with; `fitness.muscle_groups(name, category:
  push · pull · core · legs, built_in, body_part?)`, the twenty built-in
  rows shared by everyone and read-only, a person's own beside them;
  `fitness.muscle_settings(person, muscle_id, recovery_type,
  frequency_target, stimulus_target)`, the defaults when there is no row;
  `fitness.settings(person, preferred_rir, points_per_fatigue_set,
  t_fast_h, t_normal_h, t_slow_h)`.
- **Weights are exact:** `numeric(7,3)` kg in the database, and whole
  grams (integers) on the device, so 0.625 × 3 is 1.875 with no rounding;
  shown without trailing zeros.
- **Every write is a database function**
  ([ADR-0009](0009-cross-table-writes-are-database-functions.md),
  [ADR-0042](0042-data-layer.md)): making and editing an Exercise with its
  groups, a template with its numbers of sets, planning, `start_workout` (copying the
  template, its numbers of sets and each current set), beginning an entry, logging,
  changing and removing a set, marking an entry done and undoing it,
  ending, and setting a current set from the review.
- **The activity log grows to fitness**, by triggers on the detail tables
  and child rows ([ADR-0030](0030-activity-log-by-triggers.md)).

## Consequences

- Workouts join Plan through `do_on`, with no Plan work
  ([ADR-0029](0029-plan-reads-core-items.md)); the data model's time-field
  table changes Workout from `starts_at` to `do_on`.
- Readiness, stimulus sets, strength and progression are not stored:
  [ADR-0059](0059-recovery-on-the-device.md).
- Database tests cover each rule: one primary, contributions in range, one
  workout in progress, the snapshot at Start, owner-only writes, equipment
  and groups not deleted while in use.
