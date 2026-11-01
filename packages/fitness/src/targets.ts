// What the recovery engine's stimulus sets add up to: a template's coverage
// (GYM-006 4), each group's week against its targets (GYM-017), its average
// frequency and when it was last trained (GYM-016 3).

import {
  DAY_MS,
  NOVELTY_THRESHOLD,
  stimulus,
  stimulusSets,
  type EngineWorkout,
  type ExerciseMuscles,
} from './engine.ts'

/** The week is the last seven days (gym.md, Recovery). */
export const WEEK_DAYS = 7
/** Average frequency is over the last 28 days. */
export const FREQUENCY_DAYS = 28

/** A workout trains a muscle group when it gives it 0.5 stimulus sets or more. */
export function trains(stimulusSets: number): boolean {
  return stimulusSets >= NOVELTY_THRESHOLD
}

/** A finished workout's stimulus sets for each group. */
export interface WorkoutStimulus {
  workoutId: string
  endedAt: number
  stimulus: ReadonlyMap<string, number>
}

export function stimulusByWorkout(
  workouts: readonly EngineWorkout[],
  muscles: ExerciseMuscles,
): WorkoutStimulus[] {
  return workouts.map((w) => ({
    workoutId: w.id,
    endedAt: w.endedAt,
    stimulus: stimulusSets(w.sets, muscles),
  }))
}

/**
 * A template's coverage: the stimulus sets its exercises give each group,
 * each set taken at my preferred RIR.
 */
export function coverage(
  lines: readonly { exerciseId: string; sets: number }[],
  muscles: ExerciseMuscles,
  preferredRir: number,
): Map<string, number> {
  const out = new Map<string, number>()
  for (const { exerciseId, sets } of lines) {
    for (const { muscleId, contribution } of muscles.get(exerciseId) ?? []) {
      out.set(muscleId, (out.get(muscleId) ?? 0) + sets * stimulus(preferredRir, contribution))
    }
  }
  return out
}

function within(w: WorkoutStimulus, now: number, days: number): boolean {
  return w.endedAt > now - days * DAY_MS && w.endedAt <= now
}

/** A group's last seven days: its stimulus sets, and the workouts that trained it. */
export function weekOf(
  workouts: readonly WorkoutStimulus[],
  muscleId: string,
  now: number,
): { stimulus: number; frequency: number } {
  let total = 0
  let frequency = 0
  for (const w of workouts) {
    if (!within(w, now, WEEK_DAYS)) continue
    const s = w.stimulus.get(muscleId) ?? 0
    total += s
    if (trains(s)) frequency += 1
  }
  return { stimulus: total, frequency }
}

/** Average frequency: workouts a week that trained the group, over the last 28 days ("×2.1"). */
export function averageFrequency(
  workouts: readonly WorkoutStimulus[],
  muscleId: string,
  now: number,
): number {
  const trained = workouts.filter(
    (w) => within(w, now, FREQUENCY_DAYS) && trains(w.stimulus.get(muscleId) ?? 0),
  ).length
  return trained / (FREQUENCY_DAYS / WEEK_DAYS)
}

/** When a group was last trained, or null if never. */
export function lastTrained(
  workouts: readonly WorkoutStimulus[],
  muscleId: string,
  now: number = Infinity,
): number | null {
  let last: number | null = null
  for (const w of workouts) {
    if (
      w.endedAt <= now &&
      trains(w.stimulus.get(muscleId) ?? 0) &&
      (last === null || w.endedAt > last)
    ) {
      last = w.endedAt
    }
  }
  return last
}

/**
 * A group's stimulus sets in each week of a period, oldest first, the last
 * week ending at `to` (GYM-014 2, GYM-015 2: the bars under a chart).
 */
export function weeklyStimulus(
  workouts: readonly WorkoutStimulus[],
  muscleId: string,
  from: number,
  to: number,
): { start: number; stimulus: number }[] {
  const weeks = Math.max(1, Math.ceil((to - from) / (WEEK_DAYS * DAY_MS)))
  const bars = Array.from({ length: weeks }, (_, i) => ({
    start: to - (weeks - i) * WEEK_DAYS * DAY_MS,
    stimulus: 0,
  }))
  for (const w of workouts) {
    if (w.endedAt <= to - weeks * WEEK_DAYS * DAY_MS || w.endedAt > to) continue
    const i = weeks - 1 - Math.floor((to - w.endedAt) / (WEEK_DAYS * DAY_MS))
    const bar = bars[Math.min(weeks - 1, Math.max(0, i))]
    if (bar) bar.stimulus += w.stimulus.get(muscleId) ?? 0
  }
  return bars
}
