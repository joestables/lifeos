import { describe, expect, it } from 'vitest'
import type { Item } from '@/data'
import { widgetChoices, widgetDays } from './today-widget'

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

describe('the Today widget (WID-002)', () => {
  const items = [
    item('Pay rent', { do_on: '2026-11-06', do_at: '09:00:00' }),
    event('Dentist', '2026-11-06T14:00:00Z', '2026-11-06T15:00:00Z'),
    item('Renew insurance', { do_on: '2026-11-06', status: 'done' }),
    item('Dinner', { type: 'meal', do_on: '2026-11-06', slot: 'dinner' }),
    item('Tomorrow', { do_on: '2026-11-07' }),
    item('Thought', { type: 'thought', do_on: '2026-11-06' }),
  ]

  it("1: today's and tomorrow's cards in Plan's order, untimed first, with Plan's times", () => {
    const [today, tomorrow] = widgetDays(items, '2026-11-06', TZ, [])
    expect(today!.day).toBe('2026-11-06')
    expect(today!.cards.map((c) => [c.title, c.time, c.done])).toEqual([
      ['Renew insurance', null, true],
      ['Dinner', 'Dinner', false],
      ['Pay rent', '09:00', false],
      ['Dentist', '14:00', false],
    ])
    expect(today!.cards[3]).toMatchObject({
      type: 'event',
      colour: 'blue',
      ends: '2026-11-06T15:00:00Z',
    })
    expect(tomorrow!.cards.map((c) => c.title)).toEqual(['Tomorrow'])
  })

  it('1: only the Types I show on Plan (PLN-004)', () => {
    const [today] = widgetDays(items, '2026-11-06', TZ, ['meal', 'event'])
    expect(today!.cards.map((c) => c.title)).toEqual(['Renew insurance', 'Pay rent'])
  })
})

describe("the Today widget's Add list (WID-002 8)", () => {
  it('offers what Plan\'s "+" offers, each with its colour', () => {
    const choices = widgetChoices()
    expect(choices.map((c) => c.key)).toEqual(expect.arrayContaining(['task', 'event']))
    expect(choices.find((c) => c.key === 'task')).toMatchObject({ label: 'Task' })
    expect(choices.some((c) => c.key === 'thought' || c.key === 'note')).toBe(false)
  })
})
