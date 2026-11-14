import { describe, expect, it } from 'vitest'
import type { Item } from '@/data'
import type { AlertTime } from './plan'
import { widgetDays } from './today-widget'

const TZ = 'Europe/London'
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
const event = (id: string, starts_at: string, ends_at: string, fields: Partial<Item> = {}) =>
  item(id, { type: 'event', starts_at, ends_at, all_day: false, ...fields })

describe('the Today widget (WID-002, TDY-006)', () => {
  const items = [
    item('Pay rent', { do_on: '2026-11-06', do_at: '09:00:00' }),
    event('Dentist', '2026-11-06T14:00:00Z', '2026-11-06T15:00:00Z'),
    item('Renew insurance', {
      do_on: '2026-11-06',
      status: 'done',
      updated_at: '2026-11-06T08:00:00Z',
    }),
    item('Dinner', { type: 'meal', do_on: '2026-11-06', slot: 'dinner' }),
    item('Lunch', { type: 'meal', do_on: '2026-11-06', slot: 'lunch' }),
    item('Tomorrow', { do_on: '2026-11-07' }),
    item('Tax return', { due_on: '2026-11-03' }),
    item('Call mum', { type: 'reminder', do_on: '2026-11-06' }),
    item('Thought', { type: 'thought', do_on: '2026-11-06' }),
  ]
  const alertsOf = (i: Item): AlertTime[] =>
    i.id === 'Call mum'
      ? ['08:00', '20:00'].map((time) => ({
          day: '2026-11-06',
          time,
          alarm: false,
          at: Date.parse(`2026-11-06T${time}:00Z`),
        }))
      : []
  const NOW = new Date('2026-11-06T10:00:00Z')

  it("1: today's cards in Today's order, overdue first, with their times", () => {
    const [today, tomorrow] = widgetDays(items, '2026-11-06', TZ, alertsOf, NOW)
    expect(today!.day).toBe('2026-11-06')
    expect(today!.cards.map((c) => [c.title, c.time, c.done])).toEqual([
      ['Tax return', 'Overdue', false],
      ['Renew insurance', null, true],
      ['Call mum', '08:00', false],
      ['Pay rent', '09:00', false],
      ['Lunch', 'Lunch', false],
      ['Dentist', '14:00', false],
      ['Dinner', 'Dinner', false],
    ])
    expect(today!.cards.find((c) => c.title === 'Dentist')).toMatchObject({
      type: 'event',
      colour: 'blue',
      ends: '2026-11-06T15:00:00Z',
    })
    // Tomorrow's, for midnight: what is left to do from today too.
    expect(tomorrow!.cards.map((c) => c.title)).toEqual(['Tax return', 'Tomorrow', 'Pay rent'])
  })

  it('1: a Reminder fades after its last Alert that day; a Meal never does', () => {
    const [today] = widgetDays(items, '2026-11-06', TZ, alertsOf, NOW)
    const ends = (title: string) => today!.cards.find((c) => c.title === title)!.ends
    expect(ends('Call mum')).toBe('2026-11-06T20:00:00.000Z')
    expect(ends('Lunch')).toBeNull()
    expect(ends('Dinner')).toBeNull()
  })
})
