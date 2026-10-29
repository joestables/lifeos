# ADR-0059: The recovery engine and progression on the device

**Status:** Proposed · 2026-10-29

## Context

The [Gym spec](../../10-requirements/modules/gym.md) asks for readiness,
stimulus sets, template coverage, weekly targets, what to do next, Epley
strength, PRs and progression, offline too (GYM-016 4, GYM-021 1), and
for readiness to follow at once when a workout or an Exercise's groups
change (GYM-004 4). Its recovery engine
([Annex A](../../10-requirements/modules/gym.md#annex-a--the-recovery-engine))
says nothing time-dependent needs storing: readiness is evaluated when
needed, by replaying workouts.

## Decision

- **One package, `packages/fitness`, works it all out on the device**, as
  pure functions of the sets, Exercises and settings the data layer holds:
  Epley strength and PRs, the recovery engine exactly as Annex A, stimulus
  sets per workout, template coverage, weekly targets, stalled exercises,
  ranking templates, and progression.
- **Nothing it works out is stored.** Readiness is replayed from the last
  60 days of workouts each time it is needed (Annex A4); a few hundred sets
  replay in well under a frame.
- **The device keeps a year of workouts** with their sets, the longest
  progression period (GYM-014), so every tab works with no signal.
- **Annex A's worked examples are its unit tests**, with the rep-factor,
  novelty and recovery tables checked value by value.

## Consequences

- No server job and no stored readiness to fall out of step; an edit,
  a back-dated workout or a changed setting is simply a new replay.
- A Goal measure that needs Epley strength in SQL, such as
  `fitness.e1rm` (Goals, later in Stage 5), repeats the formula in a SQL
  function, tested against the same examples.
- If a year of sets ever grows too large for the device, progression reads
  a summary per workout from the server instead; readiness still needs
  only 60 days.
