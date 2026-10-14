import { describe, expect, it } from 'vitest'
import type { Item } from '@/data'
import { currentOccurrences, stillRepeats } from './series'

const occ = (id: string, on: string, fields: Partial<Item> = {}): Item => ({
  id,
  type: 'task',
  title: 'Vitamins',
  body: null,
  place: null,
  space_id: 's',
  owner_id: 'a',
  status: 'active',
  starts_at: null,
  ends_at: null,
  all_day: null,
  due_on: null,
  do_on: on,
  do_at: null,
  slot: null,
  series_id: 'daily',
  occurrence_on: on,
  position: null,
  touched_at: null,
  created_at: '2026-10-01T09:00:00Z',
  updated_at: '2026-10-01T09:00:00Z',
  archived_at: null,
  ...fields,
})
const ids = (items: Item[]) => items.map((i) => i.id)
const TUE = '2026-10-13'

describe('a repeating Task shows its next open occurrence only', () => {
  const week = [
    occ('mon', '2026-10-12'),
    occ('tue', '2026-10-13'),
    occ('wed', '2026-10-14'),
    occ('thu', '2026-10-15'),
  ]

  it('TSK-010 1: Monday’s, not done, is skipped once Tuesday’s comes due', () => {
    expect(ids(currentOccurrences(week, TUE))).toEqual(['tue'])
  })

  it('TSK-008 2: ticking today’s shows the one after', () => {
    const ticked = week.map((o) => (o.id === 'tue' ? { ...o, status: 'done' } : o))
    expect(ids(currentOccurrences(ticked, TUE))).toEqual(['tue', 'wed'])
  })

  it('TSK-010 2: one I had changed stays open', () => {
    const changed = week.map((o) =>
      o.id === 'mon' ? { ...o, touched_at: '2026-10-12T20:00:00Z' } : o,
    )
    expect(ids(currentOccurrences(changed, TUE))).toEqual(['mon'])
  })

  it('a moved occurrence shows on its new day', () => {
    const moved = [occ('mon', '2026-10-19'), occ('next', '2026-10-26')].map((o) =>
      o.id === 'mon' ? { ...o, do_on: '2026-10-20', touched_at: '2026-10-12T20:00:00Z' } : o,
    )
    expect(ids(currentOccurrences(moved, TUE))).toEqual(['mon'])
  })

  it('leaves other Tasks, and other series, alone', () => {
    const other = occ('weekly', '2026-10-19', { series_id: 'weekly' })
    const plain = occ('plain', TUE, { series_id: null, occurrence_on: null })
    expect(ids(currentOccurrences([...week, other, plain], TUE))).toEqual([
      'tue',
      'weekly',
      'plain',
    ])
  })
})

describe('whether a Task still repeats', () => {
  it('TSK-011 3: the Task a repeat was stopped from is its last', () => {
    const item = { series_id: 'bins', occurrence_on: '2026-10-12' }
    expect(stillRepeats(item, { id: 'bins', ended_on: null })).toBe(true)
    expect(stillRepeats(item, { id: 'bins', ended_on: '2026-10-12' })).toBe(false)
    expect(stillRepeats(item, undefined)).toBe(false)
  })
})
