// Strength and PRs (gym.md, Exercises; GYM-010, GYM-012, GYM-014).
// Strength = weight × (1 + (reps + RIR) ÷ 30), counting RIR as reps I could
// still have done; only sets of 1–12 reps have one. The app calls it
// Strength and never names the formula.

export const STRENGTH_MAX_REPS = 12

/** A logged set, weight in whole grams; a quick set has none of the three. */
export interface LoggedSet {
  weightGrams: number | null
  reps: number | null
  rir: number | null
}

/** An Exercise's Current set: a weight and reps, with no RIR of its own. */
export interface CurrentSet {
  weightGrams: number
  reps: number
}

/** Strength in kg, or null outside 1–12 reps. */
export function strength(weightGrams: number, reps: number, rir: number): number | null {
  if (reps < 1 || reps > STRENGTH_MAX_REPS) return null
  return (weightGrams / 1000) * (1 + (reps + rir) / 30)
}

/** A set's strength; a quick set has none. */
export function setStrength(set: LoggedSet): number | null {
  if (set.weightGrams === null || set.reps === null || set.rir === null) return null
  return strength(set.weightGrams, set.reps, set.rir)
}

/**
 * A Current set's strength, taken at my preferred RIR, so a set matching it
 * at that RIR equals it rather than beating it.
 */
export function currentStrength(current: CurrentSet, preferredRir: number): number | null {
  return strength(current.weightGrams, current.reps, preferredRir)
}

export interface BestSet<T> {
  set: T
  strength: number
}

/** The set with the best strength, the first of equals; null if none has one. */
export function bestSet<T extends LoggedSet>(sets: readonly T[]): BestSet<T> | null {
  let best: BestSet<T> | null = null
  for (const set of sets) {
    const s = setStrength(set)
    if (s !== null && (best === null || s > best.strength)) best = { set, strength: s }
  }
  return best
}

/** "Beat current" (GYM-012 5): a workout's best set is stronger than the Current set. */
export function beatsCurrent(
  sets: readonly LoggedSet[],
  current: CurrentSet,
  preferredRir: number,
): boolean {
  const best = bestSet(sets)
  const target = currentStrength(current, preferredRir)
  return best !== null && target !== null && best.strength > target
}

/** A set with when it was logged (ms since the epoch). */
export interface DatedSet extends LoggedSet {
  at: number
}

/**
 * The PR: worked out, never typed — the set with the best strength, the
 * first to reach it if equalled.
 */
export function personalRecord<T extends DatedSet>(sets: readonly T[]): BestSet<T> | null {
  return bestSet([...sets].sort((a, b) => a.at - b.at))
}
