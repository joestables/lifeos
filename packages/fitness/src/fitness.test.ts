import { describe, expect, it } from 'vitest'
import {
  averageFrequency,
  beatsCurrent,
  bestByWorkout,
  bestSet,
  coverage,
  currentStrength,
  DAY_MS,
  defaultLines,
  due,
  formatKg,
  lastTrained,
  lastWorkouts,
  motivationOf,
  motivationValue,
  personalRecord,
  rankTemplates,
  relativeChange,
  setStrength,
  stalled,
  stepWeight,
  stimulusByWorkout,
  strength,
  toggleLine,
  toGrams,
  toKg,
  trend,
  weekOf,
  weeklyStimulus,
  workoutState,
  type BestPoint,
  type LoggedSet,
  type MuscleNow,
} from './index.ts'

const now = Date.UTC(2026, 10, 2, 19, 0)
const daysAgo = (d: number) => now - d * DAY_MS
const set = (kg: number | null, reps: number | null, rir: number | null): LoggedSet => ({
  weightGrams: kg === null ? null : toGrams(kg),
  reps,
  rir,
})

describe('weights are exact (ADR-0058)', () => {
  it('reads the database’s kg as whole grams, and writes them back', () => {
    expect(toGrams('62.500')).toBe(62500)
    expect(toGrams(0.625)).toBe(625)
    expect(toKg(1875)).toBe(1.875)
  })

  it('0.625 × 3 is 1.875, with no trailing zeros', () => {
    expect(formatKg(stepWeight(0, 625, 3))).toBe('1.875')
    expect(formatKg(62500)).toBe('62.5')
    expect(formatKg(60000)).toBe('60')
  })

  it('steps by the increment, never below nothing (GYM-010 2)', () => {
    expect(stepWeight(60000, 2500, 1)).toBe(62500)
    expect(stepWeight(1000, 2500, -1)).toBe(0)
  })
})

describe('strength and PRs (gym.md, Exercises; GYM-012)', () => {
  it('is weight × (1 + (reps + RIR) ÷ 30)', () => {
    expect(strength(60000, 8, 2)).toBeCloseTo(80, 10)
    expect(strength(100000, 1, 0)).toBeCloseTo(103.333, 3)
  })

  it('only sets of 1–12 reps have one; a quick set has none', () => {
    expect(strength(40000, 13, 0)).toBeNull()
    expect(strength(40000, 12, 0)).toBeCloseTo(56, 10)
    expect(setStrength(set(null, null, null))).toBeNull()
  })

  it('a Current set is taken at my preferred RIR, so matching it equals it', () => {
    const current = { weightGrams: 60000, reps: 8 }
    expect(currentStrength(current, 1)).toBeCloseTo(78, 10)
    expect(beatsCurrent([set(60, 8, 1)], current, 1)).toBe(false)
    expect(beatsCurrent([set(60, 8, 2)], current, 1)).toBe(true)
    expect(beatsCurrent([set(62.5, 7, 1)], current, 1)).toBe(true)
    expect(beatsCurrent([set(null, null, null)], current, 1)).toBe(false)
  })

  it('the best set is the strongest, the first of equals', () => {
    const sets = [set(60, 8, 2), set(62.5, 6, 1), set(60, 9, 1), set(null, null, null)]
    expect(bestSet(sets)?.set).toBe(sets[0])
    expect(bestSet([set(null, null, null)])).toBeNull()
  })

  it('the PR is worked out: the best set, the first to reach it', () => {
    const sets = [
      { ...set(60, 8, 2), at: daysAgo(1) },
      { ...set(60, 8, 2), at: daysAgo(9) },
      { ...set(57.5, 8, 2), at: daysAgo(20) },
    ]
    expect(personalRecord(sets)?.set.at).toBe(daysAgo(9))
  })
})

const muscles = new Map([
  [
    'bench',
    [
      { muscleId: 'chest', contribution: 1 },
      { muscleId: 'triceps', contribution: 0.4 },
    ],
  ],
  ['fly', [{ muscleId: 'chest', contribution: 1 }]],
  ['squat', [{ muscleId: 'quads', contribution: 1 }]],
])

describe('a template’s coverage (GYM-006 4)', () => {
  it('gives each group its stimulus sets, each set at my preferred RIR', () => {
    const c = coverage(
      [
        { exerciseId: 'bench', sets: 3 },
        { exerciseId: 'fly', sets: 2 },
      ],
      muscles,
      1,
    )
    expect(c.get('chest')).toBeCloseTo(5 * 0.9, 10)
    expect(c.get('triceps')).toBeCloseTo(3 * 0.9 * 0.4, 10)
    expect(c.has('quads')).toBe(false)
  })
})

describe('weekly targets and frequency (GYM-016 3, GYM-017 2)', () => {
  const workouts = stimulusByWorkout(
    [
      { id: 'a', endedAt: daysAgo(1), sets: [{ exerciseId: 'bench', reps: 8, rir: 2 }] },
      { id: 'b', endedAt: daysAgo(3), sets: [{ exerciseId: 'bench', reps: 8, rir: 1 }] },
      { id: 'c', endedAt: daysAgo(10), sets: [{ exerciseId: 'fly', reps: 12, rir: 2 }] },
      { id: 'd', endedAt: daysAgo(30), sets: [{ exerciseId: 'fly', reps: 12, rir: 2 }] },
    ],
    muscles,
  )

  it('a workout counts towards frequency at 0.5 stimulus sets or more; all of them towards the stimulus target', () => {
    const chest = weekOf(workouts, 'chest', now)
    expect(chest.stimulus).toBeCloseTo(0.8 + 0.9, 10)
    expect(chest.frequency).toBe(2)
    const triceps = weekOf(workouts, 'triceps', now)
    expect(triceps.stimulus).toBeCloseTo(0.32 + 0.36, 10)
    expect(triceps.frequency).toBe(0)
  })

  it('average frequency is workouts a week over the last 28 days', () => {
    expect(averageFrequency(workouts, 'chest', now)).toBeCloseTo(3 / 4, 10)
  })

  it('last trained is the latest workout that trained it', () => {
    expect(lastTrained(workouts, 'chest')).toBe(daysAgo(1))
    expect(lastTrained(workouts, 'triceps')).toBeNull()
  })

  it('a period’s weekly bars, oldest first, the last ending now (GYM-014 2)', () => {
    const bars = weeklyStimulus(workouts, 'chest', daysAgo(28), now)
    expect(bars).toHaveLength(4)
    expect(bars.map((b) => Number(b.stimulus.toFixed(2)))).toEqual([0, 0, 0.8, 1.7])
    expect(bars[0]?.start).toBe(daysAgo(28))
  })
})

describe('progression (GYM-014, GYM-015)', () => {
  const history = [
    { workoutId: 'w3', endedAt: daysAgo(2), sets: [set(62.5, 8, 1), set(62.5, 7, 0)] },
    { workoutId: 'w1', endedAt: daysAgo(16), sets: [set(60, 8, 2)] },
    { workoutId: 'w2', endedAt: daysAgo(9), sets: [set(null, null, null)] },
    { workoutId: 'w0', endedAt: daysAgo(23), sets: [set(57.5, 8, 2)] },
  ]
  const points = bestByWorkout(history)

  it('the best strength in each workout, oldest first, quick-set-only workouts left out', () => {
    expect(points.map((p) => p.workoutId)).toEqual(['w0', 'w1', 'w3'])
    expect(points[2]?.strength).toBeCloseTo(62.5 * (1 + 9 / 30), 10)
  })

  it('the change over the period, rising, flat (within 1 %) or falling', () => {
    expect(trend(points)?.trend).toBe('rising')
    expect(trend([{ strength: 100 }, { strength: 100.5 }])?.trend).toBe('flat')
    expect(trend([{ strength: 100 }, { strength: 95 }])).toEqual({ change: -5, trend: 'falling' })
    expect(trend(points.slice(0, 1))).toBeNull()
  })

  it('the best set of each of the last ten workouts, newest first', () => {
    expect(lastWorkouts(points, 2).map((p) => p.workoutId)).toEqual(['w3', 'w1'])
  })

  it('a muscle group’s line is each exercise’s change from the start of the period', () => {
    const line = relativeChange([
      { endedAt: 1, strength: 80 },
      { endedAt: 2, strength: 88 },
    ])
    expect(line[0]?.change).toBe(0)
    expect(line[1]?.change).toBeCloseTo(10, 10)
  })

  const point = (d: number, s: number): BestPoint => ({
    workoutId: String(d),
    endedAt: daysAgo(d),
    set: set(60, 8, 2),
    strength: s,
  })

  it('stalled: three workouts over four weeks with no rise on the first (GYM-014 5)', () => {
    expect(stalled([point(25, 80), point(14, 80), point(3, 79)], now)).toBe(true)
    expect(stalled([point(25, 80), point(14, 80), point(3, 81)], now)).toBe(false)
    expect(stalled([point(25, 80), point(3, 79)], now)).toBe(false)
    expect(stalled([point(18, 80), point(10, 79), point(3, 79)], now)).toBe(false)
  })

  it('a group’s chart starts with its three primary exercises with the most sets', () => {
    expect(
      defaultLines([
        { exerciseId: 'a', primary: true, sets: 4, name: 'A' },
        { exerciseId: 'b', primary: true, sets: 9, name: 'B' },
        { exerciseId: 'c', primary: false, sets: 20, name: 'C' },
        { exerciseId: 'd', primary: true, sets: 4, name: 'D' },
        { exerciseId: 'e', primary: true, sets: 1, name: 'E' },
        { exerciseId: 'f', primary: true, sets: 0, name: 'F' },
      ]),
    ).toEqual(['b', 'a', 'd'])
  })

  it('at most three lines of a kind; a fourth waits until one is off (GYM-015 4)', () => {
    const primary = ['a', 'b', 'c', 'd']
    expect(toggleLine(['a', 'b', 'c'], 'd', primary)).toEqual(['a', 'b', 'c'])
    expect(toggleLine(['a', 'b', 'c', 'x'], 'b', primary)).toEqual(['a', 'c', 'x'])
    expect(toggleLine(['a', 'c', 'x'], 'd', primary)).toEqual(['a', 'c', 'x', 'd'])
  })
})

describe('what to do next (GYM-018 2)', () => {
  const muscleNow =
    (table: Record<string, Partial<MuscleNow>>) =>
    (id: string): MuscleNow => ({
      readiness: 100,
      lastTrained: null,
      frequencyTarget: 2,
      ...table[id],
    })
  const push = {
    id: 'push',
    name: 'Push',
    coverage: new Map([
      ['chest', 4.5],
      ['triceps', 1.1],
    ]),
  }
  const legs = { id: 'legs', name: 'Legs', coverage: new Map([['quads', 3.6]]) }

  it('the readier and more due template comes first', () => {
    const ranked = rankTemplates(
      [push, legs],
      muscleNow({
        chest: { readiness: 70, lastTrained: daysAgo(1) },
        triceps: { readiness: 90, lastTrained: daysAgo(1) },
        quads: { readiness: 100, lastTrained: daysAgo(5) },
      }),
      now,
    )
    expect(ranked.map((r) => r.id)).toEqual(['legs', 'push'])
    expect(ranked[1]?.readiness).toBeCloseTo(80, 10)
  })

  it('a group under 50 % given 2 stimulus sets or more keeps a template out', () => {
    const ranked = rankTemplates([push, legs], muscleNow({ quads: { readiness: 40 } }), now)
    expect(ranked.map((r) => r.id)).toEqual(['push'])
  })

  it('a template that trains nothing is never suggested; ties go to the name', () => {
    const empty = { id: 'empty', name: 'Empty', coverage: new Map([['chest', 0.2]]) }
    const twin = { ...legs, id: 'twin', name: 'Arms' }
    expect(rankTemplates([empty, legs, twin], muscleNow({}), now).map((r) => r.id)).toEqual([
      'twin',
      'legs',
    ])
  })

  it('a group is fully due once the days between its desired workouts have passed', () => {
    expect(due({ readiness: 100, lastTrained: daysAgo(3.5), frequencyTarget: 2 }, now)).toBeCloseTo(
      1,
      10,
    )
    expect(
      due({ readiness: 100, lastTrained: daysAgo(1.75), frequencyTarget: 2 }, now),
    ).toBeCloseTo(0.75, 10)
    expect(due({ readiness: 100, lastTrained: null, frequencyTarget: 0 }, now)).toBe(0.5)
  })
})

describe('a workout’s state (GYM-007 2) and motivation (GYM-012 1)', () => {
  it('a planned workout whose day has passed is Skipped', () => {
    expect(workoutState('planned', '2026-11-01', '2026-11-02')).toBe('skipped')
    expect(workoutState('planned', '2026-11-02', '2026-11-02')).toBe('planned')
    expect(workoutState('complete', '2026-10-01', '2026-11-02')).toBe('complete')
  })

  it('motivation is kept as 1–3: low, okay, high', () => {
    expect(motivationOf(1)).toBe('low')
    expect(motivationOf(3)).toBe('high')
    expect(motivationOf(null)).toBeNull()
    expect(motivationValue('okay')).toBe(2)
  })
})
