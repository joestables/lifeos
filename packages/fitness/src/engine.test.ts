import { describe, expect, it } from 'vitest'
import {
  applyWorkout,
  DAY_MS,
  DEFAULT_ENGINE_SETTINGS,
  fatigue,
  fullyRecoveredAt,
  HOUR_MS,
  noveltyFactor,
  overallReadiness,
  readinessAt,
  repFactor,
  replay,
  stimulus,
  stimulusSets,
  workoutTotals,
  type EngineContext,
  type EngineSet,
  type EngineWorkout,
  type MuscleState,
} from './index.ts'

// Bench press: Chest primary, Triceps 0.4, Front delts 0.3 (gym.md, Exercises).
const muscles = new Map([
  [
    'bench',
    [
      { muscleId: 'chest', contribution: 1 },
      { muscleId: 'triceps', contribution: 0.4 },
      { muscleId: 'front_delts', contribution: 0.3 },
    ],
  ],
  ['squat', [{ muscleId: 'quads', contribution: 1 }]],
  ['pushdown', [{ muscleId: 'triceps', contribution: 1 }]],
])
const context: EngineContext = {
  muscles,
  recoveryTypes: new Map([
    ['chest', 'normal'],
    ['front_delts', 'normal'],
    ['triceps', 'fast'],
    ['quads', 'slow'],
  ]),
  settings: DEFAULT_ENGINE_SETTINGS,
}
const t0 = Date.UTC(2026, 10, 2, 19, 0)
const sets = (
  exerciseId: string,
  n: number,
  reps: number | null,
  rir: number | null,
): EngineSet[] => Array.from({ length: n }, () => ({ exerciseId, reps, rir }))
const workout = (id: string, endedAt: number, ...groups: EngineSet[][]): EngineWorkout => ({
  id,
  endedAt,
  sets: groups.flat(),
})

describe('Annex A3.1–A3.3: a set’s scores (GYM-019 1)', () => {
  it('a set to failure scores 1.0, each rep in reserve 0.1 less', () => {
    expect(stimulus(0, 1)).toBe(1)
    expect(stimulus(2, 1)).toBeCloseTo(0.8, 10)
    expect(stimulus(5, 1)).toBeCloseTo(0.5, 10)
    expect(stimulus(10, 1)).toBe(0)
    expect(stimulus(12, 1)).toBe(0)
  })

  it('stimulus is split by contribution', () => {
    expect(stimulus(2, 0.4)).toBeCloseTo(0.32, 10)
    expect(stimulus(2, 0.3)).toBeCloseTo(0.24, 10)
  })

  it.each([
    [1, 1],
    [5, 1],
    [8, 1],
    [9, 1.05],
    [10, 1.1],
    [11, 1.15],
    [12, 1.2],
    [13, 1.25],
    [20, 1.25],
  ])('A3.2: the rep factor of %i reps is %f', (reps, r) => {
    expect(repFactor(reps)).toBeCloseTo(r, 10)
  })

  it('A3.3: the rep factor offsets at most about 2 RIR', () => {
    expect(fatigue(13, 2, 1)).toBeCloseTo(1, 10)
    expect(fatigue(8, 0, 1)).toBeCloseTo(1, 10)
  })

  it('A3.3: a set far from failure never costs more than a short set close to it', () => {
    expect(fatigue(12, 5, 1)).toBeCloseTo(0.6, 10)
    expect(fatigue(5, 1, 1)).toBeCloseTo(0.9, 10)
  })
})

describe('Annex A3.4: a workout’s totals per muscle', () => {
  it('adds up each muscle’s scores across every set, primary and secondary', () => {
    const totals = workoutTotals(sets('bench', 3, 8, 2), muscles)
    expect(totals.get('chest')?.stimulus).toBeCloseTo(2.4, 10)
    expect(totals.get('chest')?.fatigue).toBeCloseTo(2.4, 10)
    expect(totals.get('triceps')?.stimulus).toBeCloseTo(0.96, 10)
    expect(totals.get('front_delts')?.stimulus).toBeCloseTo(0.72, 10)
  })

  it('long sets cost more fatigue, not more stimulus', () => {
    const totals = workoutTotals(sets('bench', 2, 12, 1), muscles)
    expect(totals.get('chest')?.stimulus).toBeCloseTo(1.8, 10)
    expect(totals.get('chest')?.fatigue).toBeCloseTo(2.16, 10)
  })

  it('a quick set counts as 10 reps at RIR 2', () => {
    const totals = workoutTotals(sets('squat', 1, null, null), muscles)
    expect(totals.get('quads')?.stimulus).toBeCloseTo(0.8, 10)
    expect(totals.get('quads')?.fatigue).toBeCloseTo(0.88, 10)
  })

  it('primary and secondary work on one muscle add up', () => {
    const s = stimulusSets([...sets('bench', 2, 8, 0), ...sets('pushdown', 2, 10, 2)], muscles)
    expect(s.get('triceps')).toBeCloseTo(0.8 + 1.6, 10)
  })
})

describe('Annex A3.5: the novelty factor', () => {
  it.each([
    [0, 1],
    [7, 1],
    [10, 1.107],
    [14, 1.25],
    [17, 1.357],
    [21, 1.5],
    [40, 1.5],
  ])('%i days since last stimulated gives %f', (days, n) => {
    expect(noveltyFactor(days)).toBeCloseTo(n, 3)
  })

  it('is 1 with no previous stimulated workout', () => {
    expect(noveltyFactor(null)).toBe(1)
  })
})

describe('Annex A3.6–A3.8: readiness after one workout', () => {
  const after = applyWorkout(new Map(), workout('w1', t0, sets('bench', 3, 8, 2)), context)
  const chest = after.get('chest') as MuscleState

  it('drops a points per fatigue set from 100', () => {
    expect(chest.r0).toBeCloseTo(100 - 20 * 2.4, 10)
    expect(after.get('triceps')?.r0).toBeCloseTo(100 - 20 * 0.96, 10)
  })

  it('A3.7: recovers in T_m × deficit / 50 hours, by recovery type', () => {
    expect(chest.hours).toBeCloseTo((42 * 48) / 50, 10)
    expect(after.get('triceps')?.hours).toBeCloseTo((30 * 19.2) / 50, 10)
  })

  it.each([
    [0.25, 0.0625],
    [0.5, 0.25],
    [0.75, 0.5625],
    [1, 1],
  ])('A3.8: %f of the window recovers %f of the deficit', (elapsed, recovered) => {
    const at = t0 + elapsed * chest.hours * HOUR_MS
    expect(readinessAt(chest, at)).toBeCloseTo(52 + 48 * recovered, 10)
  })

  it('is 100 % from t0 + T, and for a muscle never trained', () => {
    expect(readinessAt(chest, t0 + chest.hours * HOUR_MS + 1)).toBe(100)
    expect(readinessAt(undefined, t0)).toBe(100)
    expect(fullyRecoveredAt(chest, t0)).toBeCloseTo(t0 + chest.hours * HOUR_MS, 0)
    expect(fullyRecoveredAt(chest, t0 + 100 * HOUR_MS)).toBeNull()
  })

  it('never drops below 5 %, and the longest recovery is 1.9 × T_m (114 h when slow)', () => {
    const state = applyWorkout(new Map(), workout('w', t0, sets('squat', 8, 8, 0)), context).get(
      'quads',
    )
    expect(state?.r0).toBe(5)
    expect(state?.hours).toBeCloseTo(114, 10)
  })

  it('takes its settings: points per fatigue set and the recovery times', () => {
    const tuned = {
      ...context,
      settings: { pointsPerFatigueSet: 10, recoveryHours: { fast: 20, normal: 50, slow: 80 } },
    }
    const state = applyWorkout(new Map(), workout('w', t0, sets('bench', 3, 8, 2)), tuned).get(
      'chest',
    )
    expect(state?.r0).toBeCloseTo(76, 10)
    expect(state?.hours).toBeCloseTo((50 * 24) / 50, 10)
  })
})

describe('Annex A3.9: training a muscle before it has recovered', () => {
  it('leftover fatigue makes the next drop deeper and the recovery longer', () => {
    const first = applyWorkout(new Map(), workout('w1', t0, sets('bench', 3, 8, 2)), context)
    const at = t0 + 24 * HOUR_MS
    const rNow = 52 + 48 * (24 / ((42 * 48) / 50)) ** 2
    const second = applyWorkout(first, workout('w2', at, sets('bench', 3, 8, 2)), context).get(
      'chest',
    )
    expect(second?.r0).toBeCloseTo(rNow - 48, 10)
    expect(second?.t0).toBe(at)
    expect(second?.hours).toBeCloseTo((42 * (100 - (rNow - 48))) / 50, 10)
  })

  it('a muscle rested two weeks takes 25 % more of a hit', () => {
    const first = applyWorkout(new Map(), workout('w1', t0, sets('bench', 3, 8, 2)), context)
    const second = applyWorkout(
      first,
      workout('w2', t0 + 14 * DAY_MS, sets('bench', 3, 8, 2)),
      context,
    )
    expect(second.get('chest')?.r0).toBeCloseTo(100 - 20 * 1.25 * 2.4, 10)
  })

  it('a token set applies its fatigue but doesn’t reset the muscle’s clock', () => {
    const first = applyWorkout(new Map(), workout('w1', t0, sets('bench', 3, 8, 2)), context)
    const later = t0 + 14 * DAY_MS
    // One set at RIR 5 gives Front delts 0.15 stimulus sets.
    const token = applyWorkout(first, workout('w2', later, sets('bench', 1, 8, 5)), context)
    expect(token.get('front_delts')?.lastStimulated).toBe(t0)
    expect(token.get('front_delts')?.r0).toBeCloseTo(100 - 20 * 1.25 * 0.15, 10)
    expect(token.get('chest')?.lastStimulated).toBe(later)
  })
})

describe('Annex A4: when to recompute', () => {
  const w1 = workout('w1', t0, sets('bench', 3, 8, 2))
  const w2 = workout('w2', t0 + 30 * HOUR_MS, sets('bench', 4, 10, 1), sets('pushdown', 3, 12, 2))
  const w3 = workout('w3', t0 + 3 * DAY_MS, sets('squat', 5, 5, 1), sets('bench', 2, 8, 0))
  const now = t0 + 4 * DAY_MS

  it('a workout saved after every other, applied on its own, gives what a replay does', () => {
    let state = new Map<string, MuscleState>()
    for (const w of [w1, w2, w3]) state = applyWorkout(state, w, context)
    expect(replay([w1, w2, w3], context, now)).toEqual(state)
  })

  it('a back-dated workout is replayed in order', () => {
    expect(replay([w3, w1, w2], context, now)).toEqual(replay([w1, w2, w3], context, now))
  })

  it('replays the last 60 days, and nothing after now', () => {
    const old = workout('w0', t0 - 61 * DAY_MS, sets('bench', 3, 8, 2))
    expect(replay([old, w1, w2, w3], context, now)).toEqual(replay([w1, w2, w3], context, now))
    expect(replay([w1, w2, w3], context, t0 + 31 * HOUR_MS)).toEqual(replay([w1, w2], context, now))
  })

  it('an Exercise’s groups changed changes readiness at once (GYM-004 4)', () => {
    const changed = {
      ...context,
      muscles: new Map([...muscles, ['bench', [{ muscleId: 'chest', contribution: 1 }]]]),
    }
    const before = replay([w1], context, now)
    const after = replay([w1], changed, now)
    expect(before.has('front_delts')).toBe(true)
    expect(after.has('front_delts')).toBe(false)
  })

  it('overall readiness is the average of the groups given', () => {
    const state = replay([w1], context, t0)
    expect(overallReadiness(state, ['chest', 'quads'], t0)).toBeCloseTo((52 + 100) / 2, 10)
    expect(overallReadiness(state, [], t0)).toBe(100)
  })
})
