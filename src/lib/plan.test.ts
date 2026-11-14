import { describe, expect, it } from 'vitest'
import type { Item } from '@/data'
import {
  alertTimes,
  cardLine,
  dayTitle,
  isPast,
  mondayOf,
  moveTo,
  placeOf,
  planDays,
  weekOf,
  weekTitle,
} from './plan'

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
const allDay = (id: string, first: string, after: string) =>
  item(id, {
    type: 'event',
    starts_at: `${first}T00:00:00.000Z`,
    ends_at: `${after}T00:00:00.000Z`,
    all_day: true,
  })

// The week of Monday 12 October 2026.
const WEEK = weekOf('2026-10-15')

describe('Plan places each Item on its days', () => {
  it('PLN-001 1: the week runs Monday to Sunday', () => {
    expect(WEEK).toEqual([
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
      '2026-10-15',
      '2026-10-16',
      '2026-10-17',
      '2026-10-18',
    ])
    expect(mondayOf('2026-10-18')).toBe('2026-10-12')
    expect(mondayOf('2026-10-12')).toBe('2026-10-12')
    expect(weekTitle('2026-10-12')).toBe('12 – 18 October')
    expect(weekTitle('2026-09-28')).toBe('28 September – 4 October')
    // A phone's, across two months (Joe, 26 October).
    expect(weekTitle('2026-09-28', true)).toBe('28 Sept – 4 Oct')
    expect(weekTitle('2026-10-12', true)).toBe('12 – 18 October')
    expect(dayTitle('2026-10-15')).toBe('Thursday 15 October')
    expect(dayTitle('2026-10-15', true)).toBe('Thu 15 October')
  })

  it('PLN-001 2: each on its day; all-day and untimed first, then by time', () => {
    const days = planDays(
      [
        item('tue-18', { do_on: '2026-10-13', do_at: '18:00:00' }),
        item('tue-untimed', { do_on: '2026-10-13' }),
        item('wed-due', { due_on: '2026-10-14' }),
        allDay('thu-leave', '2026-10-15', '2026-10-16'),
        event('fri-1930', '2026-10-16T18:30:00Z', '2026-10-16T20:00:00Z'),
        event('fri-0900', '2026-10-16T08:00:00Z', '2026-10-16T09:00:00Z'),
      ],
      WEEK[0]!,
      WEEK[6]!,
      TZ,
    )
    const ids = (day: string) => days.get(day)!.map((p) => p.item.id)
    expect(ids('2026-10-13')).toEqual(['tue-untimed', 'tue-18'])
    expect(ids('2026-10-14')).toEqual(['wed-due'])
    expect(ids('2026-10-15')).toEqual(['thu-leave'])
    expect(ids('2026-10-16')).toEqual(['fri-0900', 'fri-1930'])
  })

  it('PLN-001 3: an Event from Saturday to Monday is on each of those days', () => {
    const days = planDays(
      [allDay('away', '2026-10-17', '2026-10-20')],
      '2026-10-12',
      '2026-10-25',
      TZ,
    )
    expect([...days].filter(([, l]) => l.length).map(([d]) => d)).toEqual([
      '2026-10-17',
      '2026-10-18',
      '2026-10-19',
    ])
  })

  it('PLN-001 4, 5: no Task without a date, in Someday, or skipped', () => {
    expect(placeOf(item('none', {}), TZ)).toBeNull()
    expect(placeOf(item('someday', { do_on: '2026-10-13', status: 'idea' }), TZ)).toBeNull()
    expect(placeOf(item('skipped', { do_on: '2026-10-13', status: 'cancelled' }), TZ)).toBeNull()
    expect(placeOf(item('note', { type: 'note' }), TZ)).toBeNull()
    expect(placeOf(item('done', { do_on: '2026-10-13', status: 'done' }), TZ)?.first).toBe(
      '2026-10-13',
    )
  })

  it('PLN-004: hidden Types are left out', () => {
    const days = planDays(
      [item('t', { do_on: '2026-10-13' }), allDay('e', '2026-10-13', '2026-10-14')],
      '2026-10-13',
      '2026-10-13',
      TZ,
      ['task'],
    )
    expect(days.get('2026-10-13')!.map((p) => p.item.id)).toEqual(['e'])
  })

  it('an Event ending at midnight is not on the next day', () => {
    const p = placeOf(event('late', '2026-10-13T19:00:00Z', '2026-10-13T23:00:00Z'), TZ)!
    expect([p.first, p.last]).toEqual(['2026-10-13', '2026-10-13'])
  })
})

describe('what a card says', () => {
  const now = new Date('2026-10-14T10:00:00+01:00')
  it('an Event its time and place, and on a day its start and end', () => {
    const lunch = placeOf(
      event('lunch', '2026-10-17T12:00:00Z', '2026-10-17T14:00:00Z', { place: 'The Ivy' }),
      TZ,
    )!
    expect(cardLine(lunch, '2026-10-17', TZ)).toEqual({ time: '13:00', detail: 'The Ivy' })
    expect(cardLine(lunch, '2026-10-17', TZ, { long: true })).toEqual({
      time: '13:00–15:00',
      detail: 'The Ivy',
    })
  })
  it('an Event over several days says when it ends on its first', () => {
    const away = placeOf(allDay('away', '2026-10-18', '2026-10-21'), TZ)!
    expect(cardLine(away, '2026-10-18', TZ)).toEqual({ time: 'All day', detail: 'Until Tue' })
    expect(cardLine(away, '2026-10-19', TZ)).toEqual({ time: 'All day', detail: undefined })
  })
  it('one that runs to midnight is all day on its last day, not "Until 00:00"', () => {
    // Fri 20:00 to Sun 00:00 in London.
    const party = placeOf(event('party', '2026-10-16T19:00:00Z', '2026-10-17T23:00:00Z'), TZ)!
    expect(cardLine(party, '2026-10-17', TZ)).toEqual({ time: 'All day', detail: undefined })
    const late = placeOf(event('late', '2026-10-16T19:00:00Z', '2026-10-17T01:00:00Z'), TZ)!
    expect(cardLine(late, '2026-10-17', TZ)).toEqual({ time: 'Until 02:00', detail: undefined })
  })
  it('a Task its time and its due date', () => {
    const t = placeOf(
      item('t', { do_on: '2026-10-14', do_at: '18:00:00', due_on: '2026-10-16' }),
      TZ,
    )!
    expect(cardLine(t, '2026-10-14', TZ, { now })).toEqual({
      time: '18:00',
      detail: 'Due Fri 16 Oct',
    })
    const due = placeOf(item('d', { due_on: '2026-10-14' }), TZ)!
    expect(cardLine(due, '2026-10-14', TZ, { now })).toEqual({
      time: undefined,
      detail: 'Due today',
    })
  })
  it('PLN-001 6: ended fades; done (struck through) and an overdue Task do not', () => {
    expect(isPast(item('d', { status: 'done' }), now)).toBe(false)
    expect(isPast(item('o', { do_on: '2026-10-12' }), now)).toBe(false)
    expect(isPast(event('e', '2026-10-13T08:00:00Z', '2026-10-13T09:00:00Z'), now)).toBe(true)
  })
})

describe('dragging to another day (PLN-007)', () => {
  it('1: a Task gets the new do-on date, keeping its time and due date', () => {
    const t = item('t', { do_on: '2026-10-13', do_at: '18:00:00', due_on: '2026-10-20' })
    expect(moveTo(t, '2026-10-13', '2026-10-15', TZ)).toEqual({ do_on: '2026-10-15' })
  })
  it('2: an Event starts on the new day at the same time, keeping its length', () => {
    const e = event('e', '2026-10-23T18:00:00Z', '2026-10-23T20:00:00Z')
    // Across the clocks changing: still 19:00 London time.
    expect(moveTo(e, '2026-10-23', '2026-10-26', TZ)).toEqual({
      starts_at: '2026-10-26T19:00:00.000Z',
      ends_at: '2026-10-26T21:00:00.000Z',
      all_day: false,
    })
    const away = allDay('away', '2026-10-17', '2026-10-20')
    expect(moveTo(away, '2026-10-18', '2026-10-25', TZ)).toEqual({
      starts_at: '2026-10-24T00:00:00.000Z',
      ends_at: '2026-10-27T00:00:00.000Z',
      all_day: true,
    })
    expect(moveTo(e, '2026-10-23', '2026-10-23', TZ)).toBeNull()
  })
})

describe('PLN-008: Meals on Plan', () => {
  const meal = (id: string, slot: string, created = '2026-10-01T09:00:00Z') =>
    item(id, { type: 'meal', do_on: '2026-10-15', slot, created_at: created })

  it('shows Breakfast, Lunch and Dinner in that order among the untimed', () => {
    const days = planDays(
      [
        meal('dinner', 'dinner', '2026-10-01T08:00:00Z'),
        item('task', { do_on: '2026-10-15', created_at: '2026-10-01T10:00:00Z' }),
        meal('breakfast', 'breakfast', '2026-10-01T11:00:00Z'),
        meal('lunch', 'lunch'),
      ],
      '2026-10-15',
      '2026-10-15',
      TZ,
    )
    expect(days.get('2026-10-15')!.map((p) => p.item.id)).toEqual([
      'task',
      'breakfast',
      'lunch',
      'dinner',
    ])
  })

  it('says its slot where a time would be', () => {
    const p = placeOf(meal('m', 'dinner'), TZ)!
    expect(cardLine(p, '2026-10-15', TZ)).toEqual({ time: 'Dinner' })
  })

  it('PLN-008 5: moved to another day, it keeps its slot', () => {
    expect(moveTo(meal('m', 'lunch'), '2026-10-15', '2026-10-17', TZ)).toEqual({
      do_on: '2026-10-17',
    })
  })
})

describe('a Reminder on Plan (RMD-003, ADR-0065 2)', () => {
  const r = item('bins', { type: 'reminder', do_on: '2026-11-10' })
  const alert = (fields: Partial<Parameters<typeof alertTimes>[1][number]>) => ({
    anchor: 'do_on' as const,
    offset_days: 0,
    at_time: '15:00:00',
    fires_at: null,
    snoozed_until: null,
    alarm: false,
    ...fields,
  })
  const now = new Date('2026-11-10T12:00:00Z')
  const times = alertTimes(
    r,
    [
      alert({}),
      alert({ at_time: '15:40:00', alarm: true }),
      alert({ offset_days: 2, at_time: '09:00:00' }),
    ],
    TZ,
    now,
  )

  it('works out each Alert on its day, from the Reminder’s day, soonest first', () => {
    expect(times.map((t) => [t.day, t.time, t.alarm])).toEqual([
      ['2026-11-10', '15:00', false],
      ['2026-11-10', '15:40', true],
      ['2026-11-12', '09:00', false],
    ])
  })

  it('takes a snoozed Alert where the server says it fires', () => {
    const snoozed = alertTimes(
      r,
      [alert({ snoozed_until: '2026-11-10T16:00:00Z', fires_at: '2026-11-10T16:00:00Z' })],
      TZ,
      now,
    )
    expect(snoozed.map((t) => t.time)).toEqual(['16:00'])
  })

  it('is on each day it alerts, saying that day’s times', () => {
    const days = planDays([r], '2026-11-09', '2026-11-15', TZ, [], () => times)
    expect([...days].filter(([, l]) => l.length).map(([d]) => d)).toEqual([
      '2026-11-10',
      '2026-11-12',
    ])
    const tue = days.get('2026-11-10')![0]!
    expect(cardLine(tue, '2026-11-10', TZ).time).toBe('15:00, 15:40')
    expect(isPast(r, now, tue)).toBe(false)
    expect(isPast(r, new Date('2026-11-10T16:00:00Z'), tue)).toBe(true)
  })

  it('with no Alerts, is on its own day', () => {
    const days = planDays([r], '2026-11-09', '2026-11-15', TZ, [], () => [])
    expect(days.get('2026-11-10')!.map((p) => p.item.id)).toEqual(['bins'])
  })

  it('moves its day by as many days as it is dragged, its Alerts with it', () => {
    expect(moveTo(r, '2026-11-12', '2026-11-13', TZ)).toEqual({ do_on: '2026-11-11' })
  })

  it('is left out when Reminders are hidden', () => {
    const days = planDays([r], '2026-11-09', '2026-11-15', TZ, ['reminder'], () => times)
    expect([...days.values()].flat()).toEqual([])
  })
})
