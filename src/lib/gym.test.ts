import { describe, expect, it } from 'vitest'
import type { MuscleView } from '@/data'
import {
  copyName,
  counted,
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
