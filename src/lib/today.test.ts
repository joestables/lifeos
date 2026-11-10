import { describe, expect, it } from 'vitest'
import type { Item } from '@/data'
import type { AlertTime } from './plan'
import { partOf, todayList } from './today'

const TZ = 'Europe/London'
const TODAY = '2026-11-09'
// Monday 9 November, 14:20 in London.
const NOW = new Date('2026-11-09T14:20:00Z')
const item = (id: string, fields: Partial<Item>): Item => ({
  id,
  type: 'task',
  title: id,
  body: null,
  place: null,
  space_id: 's',
  owner_id: 'a',
  status: 'active',
  starts_at: null,
  ends_at: null,
  all_day: null,
  due_on: null,
  do_on: null,
  do_at: null,
  slot: null,
  series_id: null,
  occurrence_on: null,
  position: null,
  touched_at: null,
  created_at: '2026-10-01T09:00:00Z',
  updated_at: '2026-10-01T09:00:00Z',
  archived_at: null,
  ...fields,
})
const at = (day: string, time: string, alarm = false): AlertTime => ({
  day,
  time,
  alarm,
  at: Date.parse(`${day}T${time}:00Z`),
})

const ITEMS = [
  item('passport', { due_on: '2026-11-06', do_on: '2026-11-05' }),
  item('cleaning', { do_on: TODAY }),
  item('insurance', { do_on: TODAY, status: 'done', updated_at: '2026-11-09T10:00:00Z' }),
  item('carried', { do_on: '2026-11-07' }),
  item('carried-done', { do_on: '2026-11-07', status: 'done', updated_at: '2026-11-08T10:00:00Z' }),
  item('call', { do_on: TODAY, do_at: '18:00:00' }),
  item('oats', { type: 'meal', do_on: TODAY, slot: 'breakfast' }),
  item('curry', { type: 'meal', do_on: TODAY, slot: 'dinner' }),
  item('standup', {
    type: 'event',
    starts_at: '2026-11-09T09:30:00Z',
    ends_at: '2026-11-09T09:45:00Z',
    all_day: false,
  }),
  item('trip', {
    type: 'event',
    starts_at: '2026-11-08T10:00:00Z',
    ends_at: '2026-11-10T10:00:00Z',
    all_day: false,
  }),
  item('car', { type: 'reminder', do_on: TODAY }),
  item('idea', { type: 'thought' }),
]
const alertsOf = (i: Item) => (i.id === 'car' ? [at(TODAY, '15:00'), at(TODAY, '15:40', true)] : [])

describe('Today', () => {
  const list = todayList(ITEMS, TODAY, TZ, alertsOf, NOW)
  const parts = Object.fromEntries(
    list.parts.map((g) => [g.key, g.items.map((x) => x.placed.item.id)]),
  )

  it('TDY-001 2: overdue Tasks first, by due date', () => {
    expect(list.overdue.map((t) => t.id)).toEqual(['passport'])
  })

  it('TDY-002: the day in four parts, Meals by slot, a Reminder at its first Alert', () => {
    expect(parts).toEqual({
      anytime: ['carried', 'cleaning', 'insurance', 'trip'],
      morning: ['oats', 'standup'],
      afternoon: ['car'],
      evening: ['curry', 'call'],
    })
  })

  it('TDY-003: done and past stay, faded; a Meal once its part has gone', () => {
    const past = list.parts.flatMap((g) =>
      g.items.filter((x) => x.past).map((x) => x.placed.item.id),
    )
    expect(past).toEqual(['insurance', 'oats', 'standup'])
  })

  it('TDY-005: counts everything on it, never a Thought', () => {
    expect(list.count).toBe(10)
  })

  it('TDY-001 5: nothing today, nothing shown', () => {
    expect(todayList([item('idea', { type: 'thought' })], TODAY, TZ, alertsOf, NOW)).toEqual({
      overdue: [],
      parts: [],
      count: 0,
    })
  })

  it('splits the day at 12:00 and 17:00', () => {
    expect(['', '00:00', '11:59', '12:00', '16:59', '17:00', '23:59'].map(partOf)).toEqual([
      'anytime',
      'morning',
      'morning',
      'afternoon',
      'afternoon',
      'evening',
      'evening',
    ])
  })
})
