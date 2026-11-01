import { describe, expect, it } from 'vitest'
import type { MuscleView } from '@/data'
import {
  copyName,
  filterWorkouts,
  NO_WORKOUT_FILTER,
  sortWorkouts,
  workoutAverages,
  type WorkoutListRow,
  counted,
  duration,
  nextSet,
  parseWeight,
  pillState,
  setsOf,
  shownSet,
  since,
  templateRows,
  sortTemplates,
  type TemplateSort,
  currentText,
  libraryRows,
  muscleSummary,
  parseIncrement,
  sameName,
  withShare,
  type LibraryFilter,
  type LibraryRow,
} from './gym'

const muscle = (patch: Partial<MuscleView>): MuscleView => ({
  id: 'm',
  person_id: null,
  name: 'Lats',
  category: 'pull',
  body_part: 'lats',
  default_recovery: 'normal',
  position: 5,
  builtIn: true,
  recoveryType: 'normal',
  frequencyTarget: 2,
  stimulusTarget: 4,
  ...patch,
})

describe('Settings → Gym (GYM-001, GYM-002, GYM-017)', () => {
  it('reads an increment exactly, in grams, more than 0 and up to 100 kg (GYM-001 1, 2)', () => {
    expect(parseIncrement('0.625')).toBe(625)
    expect(parseIncrement('2,5')).toBe(2500)
    expect(parseIncrement(' 1.25 ')).toBe(1250)
    expect(parseIncrement('0')).toBeNull()
    expect(parseIncrement('101')).toBeNull()
    expect(parseIncrement('1.2345')).toBeNull()
    expect(parseIncrement('kg')).toBeNull()
  })

  it('sums up a group: mine say so, then recovery and the two weekly targets', () => {
    expect(muscleSummary(muscle({}))).toBe('Normal · 2 a week · 4 sets')
    expect(
      muscleSummary(
        muscle({ builtIn: false, recoveryType: 'fast', frequencyTarget: 1, stimulusTarget: 1 }),
      ),
    ).toBe('Yours · Fast · 1 a week · 1 set')
  })

  it('a name is the same whatever its case and spaces (GYM-004 5)', () => {
    expect(sameName(' bench   PRESS ', 'Bench press')).toBe(true)
    expect(sameName('Bench', 'Bench press')).toBe(false)
  })

  it('writes a Current set and a secondary’s share', () => {
    expect(currentText(62500, 8)).toBe('62.5 kg × 8')
    expect(withShare('Triceps', 0.4)).toBe('Triceps (0.4)')
  })
})

describe('the exercise library (GYM-003)', () => {
  const row = (
    name: string,
    primary: [string, string, number],
    patch: Partial<LibraryRow> = {},
  ): LibraryRow => ({
    id: name,
    name,
    primary: { name: primary[0], category: primary[1], position: primary[2] },
    secondaries: [],
    equipment: 'Barbell',
    lastDone: null,
    ...patch,
  })
  const rows = [
    row('Squat', ['Quads', 'legs', 15], { lastDone: 3 }),
    row('Bench press', ['Chest', 'push', 1], { secondaries: ['Triceps'], lastDone: 5 }),
    row('Lat pulldown', ['Lats', 'pull', 5], { equipment: 'Cable' }),
    row('Pushdown', ['Triceps', 'push', 4], { equipment: 'Cable', lastDone: 1 }),
  ]
  const all: LibraryFilter = {
    search: '',
    muscles: [],
    categories: [],
    equipment: [],
    sort: 'az',
    direction: 'asc',
  }
  const names = (f: Partial<LibraryFilter>) =>
    libraryRows(rows, { ...all, ...f }).map((r) => r.name)

  it('sorts A–Z, either way round', () => {
    expect(names({})).toEqual(['Bench press', 'Lat pulldown', 'Pushdown', 'Squat'])
    expect(names({ direction: 'desc' })).toEqual([
      'Squat',
      'Pushdown',
      'Lat pulldown',
      'Bench press',
    ])
  })

  it('finds by name (GYM-003 2)', () => {
    expect(names({ search: 'PUSH' })).toEqual(['Pushdown'])
    expect(names({ search: 'lat pull' })).toEqual(['Lat pulldown'])
  })

  it('filters by a muscle, primary or secondary, a category or equipment (GYM-003 3)', () => {
    expect(names({ muscles: ['Triceps'] })).toEqual(['Bench press', 'Pushdown'])
    expect(names({ categories: ['push'] })).toEqual(['Bench press', 'Pushdown'])
    expect(names({ equipment: ['Cable'] })).toEqual(['Lat pulldown', 'Pushdown'])
    expect(names({ categories: ['push'], equipment: ['Cable'] })).toEqual(['Pushdown'])
  })

  it('sorts by last done, never done last either way, or by primary muscle in the body’s order', () => {
    expect(names({ sort: 'last', direction: 'desc' })).toEqual([
      'Bench press',
      'Squat',
      'Pushdown',
      'Lat pulldown',
    ])
    expect(names({ sort: 'last', direction: 'asc' })).toEqual([
      'Pushdown',
      'Squat',
      'Bench press',
      'Lat pulldown',
    ])
    expect(names({ sort: 'muscle' })).toEqual(['Bench press', 'Pushdown', 'Lat pulldown', 'Squat'])
  })
})

describe('templates (GYM-006, GYM-022)', () => {
  const t = (
    name: string,
    exerciseCount: number,
    setCount: number,
    lastUsed: number | null,
    usesThisMonth = 0,
  ) => ({
    name,
    exerciseCount,
    setCount,
    lastUsed,
    usesThisMonth,
  })
  const rows = [
    t('Push A', 5, 15, 30, 4),
    t('Legs', 6, 18, null),
    t('Pull A', 4, 12, 50, 2),
    t('Arms', 4, 10, null),
  ]
  const names = (sort: TemplateSort, dir: 'asc' | 'desc') =>
    sortTemplates(rows, sort, dir).map((r) => r.name)

  it('most recently used first, never used last either way (GYM-022 2)', () => {
    expect(names('recent', 'desc')).toEqual(['Pull A', 'Push A', 'Arms', 'Legs'])
    expect(names('recent', 'asc')).toEqual(['Push A', 'Pull A', 'Arms', 'Legs'])
  })

  it('by uses this month, exercises, sets, or A–Z, either way round', () => {
    expect(names('popular', 'desc')).toEqual(['Push A', 'Pull A', 'Arms', 'Legs'])
    expect(names('exercises', 'desc')).toEqual(['Legs', 'Push A', 'Arms', 'Pull A'])
    expect(names('sets', 'asc')).toEqual(['Arms', 'Pull A', 'Push A', 'Legs'])
    expect(names('az', 'asc')).toEqual(['Arms', 'Legs', 'Pull A', 'Push A'])
  })

  it('a copy takes a name not yet used (GYM-006 5)', () => {
    expect(copyName('Push A', ['Push A'])).toBe('Push A (copy)')
    expect(copyName('Push A', ['Push A', 'push a (copy)'])).toBe('Push A (copy 2)')
  })

  it('counts with their words', () => {
    expect(counted(1, 'set')).toBe('1 set')
    expect(counted(15, 'set')).toBe('15 sets')
  })
})

describe('workouts (GYM-007–GYM-012)', () => {
  it('GYM-022 2: a template’s uses over the last month', () => {
    const day = 24 * 60 * 60 * 1000
    const now = Date.parse('2026-11-01T12:00:00Z')
    const [row] = templateRows(
      [{ item: { title: 'Push A' }, uses: [now - day, now - 29 * day, now - 31 * day] }],
      now,
    )
    expect(row).toMatchObject({ name: 'Push A', usesThisMonth: 2 })
  })

  it('GYM-007 4, 5: a planned workout whose day has passed is Skipped', () => {
    expect(pillState('planned', '2026-10-31', '2026-11-01')).toBe('skipped')
    expect(pillState('planned', '2026-11-01', '2026-11-01')).toBe('planned')
    expect(pillState('in_progress', '2026-10-31', '2026-11-01')).toBe('in-progress')
    expect(pillState('complete', '2026-10-31', '2026-11-01')).toBe('complete')
  })

  it('GYM-008 4: sets logged of the planned number', () => {
    expect(setsOf(2, 3)).toBe('2 of 3 sets')
    expect(setsOf(0, 1)).toBe('0 of 1 set')
  })

  it('GYM-010 1: the next set starts at the last one logged, else at Current', () => {
    const current = { weightGrams: 60_000, reps: 8 }
    expect(nextSet([], current, 2)).toEqual({ weightGrams: 60_000, reps: 8, rir: 2 })
    expect(
      nextSet(
        [
          { weightGrams: 62_500, reps: 9, rir: 1 },
          { weightGrams: null, reps: null, rir: null },
        ],
        current,
        2,
      ),
    ).toEqual({ weightGrams: 62_500, reps: 9, rir: 1 })
  })

  it('GYM-010 2: a typed weight, with a point or a comma, never below 0', () => {
    expect(parseWeight('62.5')).toBe(62_500)
    expect(parseWeight('62,5')).toBe(62_500)
    expect(parseWeight('0')).toBe(0)
    expect(parseWeight('-5')).toBeNull()
    expect(parseWeight('abc')).toBeNull()
    expect(parseWeight('1001')).toBeNull()
  })

  it('GYM-010 3, 4: a quick set shows dashes; a tracked one its strength', () => {
    expect(shownSet({ weightGrams: null, reps: null, rir: null })).toEqual({ pr: false })
    expect(shownSet({ weightGrams: 62_500, reps: 9, rir: 2, pr: true, strength: 81.234 })).toEqual({
      weight: '62.5',
      reps: 9,
      rir: 2,
      pr: true,
      strength: '81.2',
    })
  })

  it('GYM-003 1, GYM-006 6: when, after a word', () => {
    const now = new Date(2026, 10, 1, 12)
    expect(since('Used', new Date(2026, 9, 31, 18).getTime(), now)).toBe('Used yesterday')
    expect(since('Done', new Date(2026, 9, 28, 18).getTime(), now)).toBe('Done Wed 28 Oct')
  })

  it('GYM-012 1: its duration', () => {
    expect(duration('2026-11-01T18:00:00Z', '2026-11-01T18:58:00Z')).toBe('58 min')
    expect(duration('2026-11-01T18:00:00Z', '2026-11-01T19:04:00Z')).toBe('1 h 04')
  })
})

describe('All workouts (GYM-013 2–5)', () => {
  const w = (id: string, patch: Partial<WorkoutListRow>): WorkoutListRow => ({
    id,
    name: id,
    day: '2026-10-28',
    state: 'complete',
    templateId: 't-push',
    exerciseIds: ['x-bench'],
    muscleIds: ['mg-chest'],
    sets: 12,
    stimulus: 10,
    exercisesDone: 4,
    minutes: 60,
    howItWent: 4,
    motivation: 2,
    startedAt: Date.parse('2026-10-28T18:00:00Z'),
    ...patch,
  })
  const rows = [
    w('a', { day: '2026-10-29', sets: 18, minutes: 70, howItWent: 5, motivation: 3 }),
    w('b', { day: '2026-10-27', templateId: null, muscleIds: ['mg-lats'], exerciseIds: ['x-row'] }),
    w('c', {
      day: '2026-11-02',
      state: 'planned',
      sets: 0,
      stimulus: 0,
      exercisesDone: 0,
      minutes: null,
      howItWent: null,
      motivation: null,
      startedAt: null,
    }),
  ]

  it('3: any of a group, every group together; a range leaves out what has no value', () => {
    const ids = (f: Partial<typeof NO_WORKOUT_FILTER>) =>
      filterWorkouts(rows, { ...NO_WORKOUT_FILTER, ...f }).map((r) => r.id)
    expect(ids({})).toEqual(['a', 'b', 'c'])
    expect(ids({ states: ['planned', 'skipped'] })).toEqual(['c'])
    expect(ids({ templates: ['none'] })).toEqual(['b'])
    expect(ids({ muscles: ['mg-lats', 'mg-quads'] })).toEqual(['b'])
    expect(ids({ exercises: ['x-bench'], from: '2026-10-28' })).toEqual(['a', 'c'])
    expect(ids({ sets: [15, 30] })).toEqual(['a'])
    expect(ids({ duration: [0, 120] })).toEqual(['a', 'b'])
    expect(ids({ motivation: [3] })).toEqual(['a'])
  })

  it('4: sorted either way round, those without the value last', () => {
    const ids = (s: Parameters<typeof sortWorkouts>[1], d: 'asc' | 'desc') =>
      sortWorkouts(rows, s, d).map((r) => r.id)
    expect(ids('date', 'desc')).toEqual(['c', 'a', 'b'])
    expect(ids('date', 'asc')).toEqual(['b', 'a', 'c'])
    expect(ids('duration', 'desc')).toEqual(['a', 'b', 'c'])
    expect(ids('duration', 'asc')).toEqual(['b', 'a', 'c'])
  })

  it('5: average sets and duration, and weekly sessions, from the complete ones', () => {
    expect(workoutAverages(rows, '2026-11-01')).toEqual({
      sets: '15.0',
      duration: '1 h 05',
      weekly: '×2.0',
    })
    expect(workoutAverages(rows, '2026-11-09')).toMatchObject({ weekly: '×1.0' })
    expect(workoutAverages([rows[2]!], '2026-11-01')).toEqual({
      sets: '–',
      duration: '–',
      weekly: '–',
    })
  })
})
