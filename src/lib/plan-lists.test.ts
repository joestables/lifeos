import { describe, expect, it } from 'vitest'
import type { Item, Series } from '@/data'
import type { AlertTime } from './plan'
import { byDay, eventEntries, recurringEntries, reminderEntries } from './plan-lists'

const TZ = 'Europe/London'
// Monday 9 November, 14:20 in London.
const TODAY = '2026-11-09'
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
const event = (id: string, starts: string, ends: string, fields: Partial<Item> = {}) =>
  item(id, { type: 'event', starts_at: starts, ends_at: ends, all_day: false, ...fields })
const at = (day: string, time: string): AlertTime => ({
  day,
  time,
  alarm: false,
  at: Date.parse(`${day}T${time}:00Z`),
})
const series = (id: string, type: string): Series =>
  ({
    id,
    type,
    mode: 'schedule',
    rule: 'FREQ=WEEKLY',
    starts_on: '2026-11-01',
    ended_on: null,
  }) as unknown as Series

describe('byDay', () => {
  it('Today, Tomorrow, the rest of the week by name, Later; nothing before today', () => {
    const groups = byDay(
      ['2026-11-08', '2026-11-09', '2026-11-10', '2026-11-12', '2026-11-15', '2026-11-16'].map(
        (day) => ({ day, value: day }),
      ),
      TODAY,
    )
    expect(groups.map((g) => [g.label, g.entries])).toEqual([
      ['Today', ['2026-11-09']],
      ['Tomorrow', ['2026-11-10']],
      ['Thursday', ['2026-11-12']],
      ['Sunday', ['2026-11-15']],
      ['Later', ['2026-11-16']],
    ])
  })
})

describe('Events (PLA-003)', () => {
  it('from today on; one going on since an earlier day is today; one ended today fades', () => {
    const list = eventEntries(
      [
        event('yesterday', '2026-11-08T10:00:00Z', '2026-11-08T11:00:00Z'),
        event('dentist', '2026-11-09T13:30:00Z', '2026-11-09T14:00:00Z'),
        event('trip', '2026-11-08T10:00:00Z', '2026-11-10T10:00:00Z'),
        event('haircut', '2026-11-10T12:30:00Z', '2026-11-10T13:15:00Z'),
        event('w1', '2026-11-11T19:00:00Z', '2026-11-11T20:00:00Z', {
          series_id: 'w',
          occurrence_on: '2026-11-11',
        }),
        event('w2', '2026-11-18T19:00:00Z', '2026-11-18T20:00:00Z', {
          series_id: 'w',
          occurrence_on: '2026-11-18',
        }),
      ],
      TODAY,
      TZ,
      NOW,
    )
    expect(list.map((e) => [e.placed.item.id, e.day, e.past])).toEqual([
      ['trip', TODAY, false],
      ['dentist', TODAY, true],
      ['haircut', '2026-11-10', false],
      ['w1', '2026-11-11', false],
    ])
  })
})

describe('Reminders (PLA-004)', () => {
  const alerts: Record<string, AlertTime[]> = {
    vitamins: [at(TODAY, '08:00')],
    car: [at(TODAY, '15:00'), at(TODAY, '15:40')],
    parcel: [at('2026-11-12', '09:00'), at('2026-11-12', '12:00')],
    old: [at('2026-11-02', '09:00')],
    b1: [at(TODAY, '19:00')],
    b2: [at('2026-11-16', '19:00')],
  }
  const items = [
    item('vitamins', { type: 'reminder', do_on: TODAY }),
    item('car', { type: 'reminder', do_on: TODAY }),
    item('parcel', { type: 'reminder', do_on: '2026-11-12' }),
    item('old', { type: 'reminder', do_on: '2026-11-02' }),
    item('b1', { type: 'reminder', do_on: TODAY, series_id: 'b', occurrence_on: TODAY }),
    item('b2', { type: 'reminder', do_on: '2026-11-16', series_id: 'b' }),
  ]
  const of = (i: Item) => alerts[i.id] ?? []

  it('on the day of its next Alert; today’s gone off stay, faded; a repeating one’s next only', () => {
    expect(
      reminderEntries(items, TODAY, of, NOW).map((e) => [
        e.item.id,
        e.day,
        e.alerts.map((a) => a.time),
        e.past,
      ]),
    ).toEqual([
      ['vitamins', TODAY, ['08:00'], true],
      ['car', TODAY, ['15:00', '15:40'], false],
      ['b1', TODAY, ['19:00'], false],
      ['parcel', '2026-11-12', ['09:00', '12:00'], false],
    ])
  })

  it('PLA-005: Recurring lists each repeating one once, with its series', () => {
    const all = [
      ...items,
      event('w1', '2026-11-11T19:00:00Z', '2026-11-11T20:00:00Z', {
        series_id: 'w',
        occurrence_on: '2026-11-11',
      }),
      item('bath', { do_on: '2026-11-11', series_id: 't', occurrence_on: '2026-11-11' }),
    ]
    const s = new Map([
      ['b', series('b', 'reminder')],
      ['w', series('w', 'event')],
      ['t', series('t', 'task')],
    ])
    const r = recurringEntries(all, s, TODAY, TZ, of, NOW)
    expect([
      r.tasks.map((t) => t.task.id),
      r.events.map((e) => e.placed.item.id),
      r.reminders.map((e) => e.item.id),
    ]).toEqual([['bath'], ['w1'], ['b1']])
  })
})
