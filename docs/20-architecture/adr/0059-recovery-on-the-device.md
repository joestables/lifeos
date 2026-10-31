# ADR-0059: One recovery engine, on the device and the server

**Status:** Provisionally agreed · 2026-10-29 (Joe)

## Context

The [Gym spec](../../10-requirements/modules/gym.md) asks for readiness,
stimulus sets, template coverage, weekly targets, what to do next,
strength (Epley's formula), PRs and progression, offline too (GYM-016 4, GYM-021 1), and
for readiness to follow at once when a workout or an Exercise's groups
change (GYM-004 4). Its recovery engine
([Annex A](../../10-requirements/modules/gym.md#annex-a--the-recovery-engine))
says nothing time-dependent needs storing: readiness is evaluated when
needed, by replaying workouts. Some later readers are on the server: a
Goal measuring strength, a nudge sent while LifeOS is closed, the AI.

## Decision

- **One package, `packages/fitness`, holds every calculation** as pure
  TypeScript functions of sets, Exercises and settings: strength and
  PRs, the recovery engine exactly as Annex A, stimulus sets per workout,
  template coverage, weekly targets, stalled exercises, ranking templates,
  and progression.
- **The screens run it on the device**, from what the data layer holds,
  so a set logged with no signal shows its PR at once, and readiness and
  the review follow the workout just ended.
- **The server runs the same package** in an Edge Function whenever
  something there needs a figure (Deno runs TypeScript). There is never a
  second copy of a formula, in SQL or anywhere else.
- **Nothing it works out is stored.** Readiness is replayed from the last
  60 days of workouts each time it is needed (Annex A4).
- **The device keeps a year of workouts** with their sets, the longest
  progression period (GYM-014), so every tab works with no signal.
- **Annex A's worked examples are its unit tests**, with the rep-factor,
  novelty and recovery tables checked value by value.

## Consequences

- No server job and no stored readiness to fall out of step; an edit, a
  back-dated workout or a changed setting is simply a new replay.
- Stage 5 builds no server use: the first (a Goal measure such as
  `fitness.e1rm`, with Goals later in Stage 5) adds the Edge Function and
  imports the package, as `ai` already imports `packages/food`
  ([ADR-0054](0054-the-ai-service-and-import.md)), bundled by
  `scripts/bundle-function.mjs`.
- A new device downloads a year of sets before Progression fills; if that
  ever grows too large, progression reads a summary per workout from the
  server, worked out by the same package.
