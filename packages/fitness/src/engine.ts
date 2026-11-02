// The recovery engine, exactly as the Gym spec's Annex A sets it out
// (GYM-019; ADR-0059): logged sets in, each muscle group's readiness and
// each workout's stimulus sets out. Pure functions; nothing is stored.

export type RecoveryType = 'fast' | 'normal' | 'slow'

/** The tunable settings (A2), from Settings → Gym → Recovery. */
export interface EngineSettings {
  /** `a`: readiness points lost per fatigue set. */
  pointsPerFatigueSet: number
  /** `T_m`: hours to recover a 50-point deficit, by recovery type. */
  recoveryHours: Readonly<Record<RecoveryType, number>>
}

export const DEFAULT_ENGINE_SETTINGS: EngineSettings = {
  pointsPerFatigueSet: 20,
  recoveryHours: { fast: 30, normal: 42, slow: 60 },
}

// Fixed constants (A2).
export const RIR_DIVISOR = 10
/** A workout trains a muscle when it gives it this many stimulus sets (A3.5). */
export const NOVELTY_THRESHOLD = 0.5
export const READINESS_FLOOR = 5
export const RECOVERY_EXPONENT = 2
/** Workouts replayed (A4). */
export const LOOKBACK_DAYS = 60
/** A quick set, logged without numbers, counts as 10 reps at RIR 2 (A2). */
export const QUICK_SET = { reps: 10, rir: 2 } as const

export const HOUR_MS = 3_600_000
export const DAY_MS = 86_400_000

/** One muscle group an Exercise works: 1.0 for its primary, 0.1–0.9 for a secondary. */
export interface MuscleShare {
  muscleId: string
  contribution: number
}

/** Each Exercise's muscle groups, as they are now (GYM-004 4). */
export type ExerciseMuscles = ReadonlyMap<string, readonly MuscleShare[]>

/** A set as the engine sees it: reps and RIR, or both null for a quick set. */
export interface EngineSet {
  exerciseId: string
  reps: number | null
  rir: number | null
}

/** A finished workout: when it ended (ms since the epoch) and its sets. */
export interface EngineWorkout {
  id: string
  endedAt: number
  sets: readonly EngineSet[]
}

export interface EngineContext {
  muscles: ExerciseMuscles
  /** Each group's recovery type; a group not listed is normal. */
  recoveryTypes: ReadonlyMap<string, RecoveryType>
  settings: EngineSettings
}

// ---------------------------------------------------------------------------
// A3.1–A3.3: one set.

/** A3.1: s = max(0, 1 − RIR / 10) × contribution. */
export function stimulus(rir: number, contribution: number): number {
  return Math.max(0, 1 - rir / RIR_DIVISOR) * contribution
}

/** A3.2: 1 up to 8 reps, 5 % more for each rep above, 1.25 from 13. */
export function repFactor(reps: number): number {
  if (reps <= 8) return 1
  if (reps >= 13) return 1.25
  return 1 + 0.05 * (reps - 8)
}

/** A3.3: f = s × R(reps). */
export function fatigue(reps: number, rir: number, contribution: number): number {
  return stimulus(rir, contribution) * repFactor(reps)
}

/** A set's reps and RIR, a quick set's being 10 at RIR 2. */
export function effort(set: Pick<EngineSet, 'reps' | 'rir'>): { reps: number; rir: number } {
  return set.reps === null || set.rir === null ? QUICK_SET : { reps: set.reps, rir: set.rir }
}

// ---------------------------------------------------------------------------
// A3.4: a workout's totals per muscle.

export interface MuscleTotals {
  /** S_m: the stimulus sets the workout gave the muscle (an output). */
  stimulus: number
  /** F_m: its fatigue sets, before the novelty factor. */
  fatigue: number
}

export function workoutTotals(
  sets: readonly EngineSet[],
  muscles: ExerciseMuscles,
): Map<string, MuscleTotals> {
  const totals = new Map<string, MuscleTotals>()
  for (const set of sets) {
    const { reps, rir } = effort(set)
    for (const { muscleId, contribution } of muscles.get(set.exerciseId) ?? []) {
      const s = stimulus(rir, contribution)
      // A set with no stimulus doesn't work the muscle (RIR 10 or more).
      if (s <= 0) continue
      const t = totals.get(muscleId) ?? { stimulus: 0, fatigue: 0 }
      totals.set(muscleId, { stimulus: t.stimulus + s, fatigue: t.fatigue + s * repFactor(reps) })
    }
  }
  return totals
}

/** The stimulus sets a workout gave each muscle group (A3.4). */
export function stimulusSets(
  sets: readonly EngineSet[],
  muscles: ExerciseMuscles,
): Map<string, number> {
  return new Map([...workoutTotals(sets, muscles)].map(([m, t]) => [m, t.stimulus]))
}

// ---------------------------------------------------------------------------
// A3.5: the novelty factor.

/** N: 1 up to 7 days since the muscle was last stimulated, or never; 1.5 from 21. */
export function noveltyFactor(days: number | null): number {
  if (days === null || days <= 7) return 1
  if (days >= 21) return 1.5
  return 1 + (0.5 * (days - 7)) / 14
}

// ---------------------------------------------------------------------------
// A3.6–A3.9: readiness.

/** A muscle's one recovery curve (A3.9): R0, t0 and T, and when it was last stimulated. */
export interface MuscleState {
  r0: number
  /** t0, ms since the epoch. */
  t0: number
  /** T, hours. */
  hours: number
  lastStimulated: number | null
}

/** Every muscle's state; a muscle with none has never been trained, and is at 100 %. */
export type Recovery = ReadonlyMap<string, MuscleState>

/** A3.8: R(t) = R0 + deficit × ((t − t0) / T)², 100 % from t0 + T. */
export function readinessAt(state: MuscleState | undefined, at: number): number {
  if (!state || state.hours <= 0) return 100
  const elapsed = (at - state.t0) / HOUR_MS
  if (elapsed >= state.hours) return 100
  if (elapsed <= 0) return state.r0
  return state.r0 + (100 - state.r0) * (elapsed / state.hours) ** RECOVERY_EXPONENT
}

/** When a muscle is back at 100 %, or null if it is already. */
export function fullyRecoveredAt(state: MuscleState | undefined, at: number): number | null {
  if (!state || state.hours <= 0) return null
  const end = state.t0 + state.hours * HOUR_MS
  return end > at ? end : null
}

/** A3.9: a workout applied to every muscle it trains, after every workout before it. */
export function applyWorkout(
  recovery: Recovery,
  workout: EngineWorkout,
  context: EngineContext,
): Map<string, MuscleState> {
  const next = new Map(recovery)
  const { pointsPerFatigueSet, recoveryHours } = context.settings
  for (const [muscleId, totals] of workoutTotals(workout.sets, context.muscles)) {
    const previous = recovery.get(muscleId)
    const last = previous?.lastStimulated ?? null
    const days = last === null ? null : (workout.endedAt - last) / DAY_MS
    const drop = pointsPerFatigueSet * noveltyFactor(days) * totals.fatigue
    const r0 = Math.max(READINESS_FLOOR, readinessAt(previous, workout.endedAt) - drop)
    const type = context.recoveryTypes.get(muscleId) ?? 'normal'
    next.set(muscleId, {
      r0,
      t0: workout.endedAt,
      hours: (recoveryHours[type] * (100 - r0)) / 50,
      lastStimulated: totals.stimulus >= NOVELTY_THRESHOLD ? workout.endedAt : last,
    })
  }
  return next
}

/** Workouts in the order they finished, ties by id, so a replay is always the same. */
export function inOrder<W extends EngineWorkout>(workouts: readonly W[]): W[] {
  return [...workouts].sort(
    (a, b) => a.endedAt - b.endedAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  )
}

/**
 * A4: every muscle's state at `now`, replaying the workouts that finished in
 * the last 60 days in order. Used after an edit, a back-dated workout or a
 * changed setting; a workout saved after every other is applied on its own.
 */
export function replay(
  workouts: readonly EngineWorkout[],
  context: EngineContext,
  now: number,
  lookbackDays: number = LOOKBACK_DAYS,
): Map<string, MuscleState> {
  const since = now - lookbackDays * DAY_MS
  let recovery: Map<string, MuscleState> = new Map()
  for (const workout of inOrder(workouts)) {
    if (workout.endedAt > since && workout.endedAt <= now) {
      recovery = applyWorkout(recovery, workout, context)
    }
  }
  return recovery
}

/**
 * Overall readiness (GYM-016 1): the average readiness of the groups given,
 * those with a weekly target above zero; 100 when there are none.
 */
export function overallReadiness(
  recovery: Recovery,
  muscleIds: readonly string[],
  at: number,
): number {
  if (muscleIds.length === 0) return 100
  return muscleIds.reduce((sum, m) => sum + readinessAt(recovery.get(m), at), 0) / muscleIds.length
}
