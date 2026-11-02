// Progression (GYM-014, GYM-015): an exercise's best strength in each
// workout, its trend, its last workouts and whether it has stalled; a
// muscle group's lines.

import { bestSet, type LoggedSet } from './strength.ts'

/** An exercise's sets in one finished workout. */
export interface ExerciseWorkout<T extends LoggedSet = LoggedSet> {
  workoutId: string
  endedAt: number
  sets: readonly T[]
}

/** A point on an exercise's chart: its best set in a workout. */
export interface BestPoint<T extends LoggedSet = LoggedSet> {
  workoutId: string
  endedAt: number
  set: T
  strength: number
}

/** The best set of each workout, oldest first; workouts with no strength (quick sets only) left out. */
export function bestByWorkout<T extends LoggedSet>(
  history: readonly ExerciseWorkout<T>[],
): BestPoint<T>[] {
  const points: BestPoint<T>[] = []
  for (const w of history) {
    const best = bestSet(w.sets)
    if (best) points.push({ workoutId: w.workoutId, endedAt: w.endedAt, ...best })
  }
  return points.sort((a, b) => a.endedAt - b.endedAt)
}

/** Points from `from` on. */
export function inPeriod<P extends { endedAt: number }>(points: readonly P[], from: number): P[] {
  return points.filter((p) => p.endedAt >= from)
}

/** A change within 1 % either way is flat (GYM-014 3). */
export const FLAT_WITHIN = 0.01

export type Trend = 'rising' | 'flat' | 'falling'

/** The change in best strength over a period's points, first to last, and which way it went. */
export function trend(
  points: readonly { strength: number }[],
): { change: number; trend: Trend } | null {
  const first = points[0]
  const last = points[points.length - 1]
  if (!first || !last || points.length < 2) return null
  const change = last.strength - first.strength
  const ratio = first.strength > 0 ? change / first.strength : 0
  return {
    change,
    trend: ratio > FLAT_WITHIN ? 'rising' : ratio < -FLAT_WITHIN ? 'falling' : 'flat',
  }
}

/** The best set of each of the last ten workouts, newest first (GYM-014 4). */
export function lastWorkouts<T extends LoggedSet>(
  points: readonly BestPoint<T>[],
  count = 10,
): BestPoint<T>[] {
  return [...points].sort((a, b) => b.endedAt - a.endedAt).slice(0, count)
}

/** A muscle group's line for an exercise: its best strength's change, in %, from its first point in the period. */
export function relativeChange(
  points: readonly { endedAt: number; strength: number }[],
): { endedAt: number; change: number }[] {
  const first = points[0]
  if (!first || first.strength <= 0) return []
  return points.map((p) => ({
    endedAt: p.endedAt,
    change: (p.strength / first.strength - 1) * 100,
  }))
}

/** Workouts to stall, a Gym setting (GYM-020 3; Joe, 1 November). */
export const DEFAULT_WORKOUTS_TO_STALL = 5

/**
 * Stalled (GYM-014 5): among an exercise's last `workoutsToStall` workouts
 * with a strength, none after the oldest beats its best (matching it isn't
 * beating it). Fewer workouts than that is never stalled; there is no time
 * limit.
 */
export function stalled(
  points: readonly BestPoint[],
  workoutsToStall: number = DEFAULT_WORKOUTS_TO_STALL,
): boolean {
  if (workoutsToStall < 2 || points.length < workoutsToStall) return false
  const last = [...points].sort((a, b) => a.endedAt - b.endedAt).slice(-workoutsToStall)
  const [first, ...later] = last
  return first !== undefined && later.every((p) => p.strength <= first.strength)
}

/** At most three primary and three secondary lines at once (GYM-015 4). */
export const MAX_LINES = 3

/** An exercise a muscle group's chart could show. */
export interface LineCandidate {
  exerciseId: string
  primary: boolean
  /** Its sets in the period. */
  sets: number
  name: string
}

/** The lines a muscle group's chart starts with: its three primary exercises with the most sets in the period (GYM-015 5). */
export function defaultLines(candidates: readonly LineCandidate[]): string[] {
  return candidates
    .filter((c) => c.primary && c.sets > 0)
    .sort((a, b) => b.sets - a.sets || a.name.localeCompare(b.name))
    .slice(0, MAX_LINES)
    .map((c) => c.exerciseId)
}

/**
 * A line turned on or off (GYM-015 4): on in the order turned on, which sets
 * its dash; a fourth of a kind can't be turned on until one is off.
 */
export function toggleLine(
  on: readonly string[],
  exerciseId: string,
  ofSameKind: readonly string[],
): string[] {
  if (on.includes(exerciseId)) return on.filter((id) => id !== exerciseId)
  const kind = new Set(ofSameKind)
  if (on.filter((id) => kind.has(id)).length >= MAX_LINES) return [...on]
  return [...on, exerciseId]
}
