import { describe, expect, it } from 'vitest'
import type { Item } from '@/data'
import { completedTasks, recurringTasks, taskGroups, tasksByLabel } from './tasks'

const item = (id: string, fields: Partial<Item>): Item => ({
  id,
  type: 'task',
  title: id,
  body: null,
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

const shape = (groups: { label: string; tasks: Item[] }[]) =>
  groups.map((g) => [g.label, g.tasks.map((t) => t.id)])

// Monday 12 October 2026: Tuesday is tomorrow, Wednesday to Sunday have names.
const MON = new Date(2026, 9, 12, 9, 0)

describe('All tasks (views/tasks.md)', () => {
  it('TSK-004, TSK-007: by when, Someday last; due alone makes a Task overdue', () => {
    const items = [
      item('late', { due_on: '2026-10-08' }),
      item('since-fri', { do_on: '2026-10-09' }),
      item('today-1830', { do_on: '2026-10-12', do_at: '18:30:00' }),
      item('due-today', { due_on: '2026-10-12' }),
      item('tue', { do_on: '2026-10-13' }),
      item('thu', { do_on: '2026-10-15' }),
      item('due-sun', { due_on: '2026-10-18' }),
      item('next-month', { do_on: '2026-11-20' }),
      item('later-due', { due_on: '2026-10-30' }),
      item('undated', {}),
      item('someday', { status: 'idea' }),
      item('done', { do_on: '2026-10-12', status: 'done' }),
      item('note', { type: 'note' }),
    ]
    expect(shape(taskGroups(items, MON))).toEqual([
      ['Overdue', ['late']],
      ['Today', ['today-1830', 'since-fri', 'due-today']],
      ['Tomorrow', ['tue']],
      ['Thursday', ['thu']],
      ['Sunday', ['due-sun']],
      ['Later', ['later-due', 'next-month']],
      ['No date', ['undated']],
      ['Someday', ['someday']],
    ])
  })

  it('on a Sunday, no days of the week are left after tomorrow', () => {
    const groups = taskGroups(
      [item('mon', { do_on: '2026-10-12' }), item('tue', { do_on: '2026-10-13' })],
      new Date(2026, 9, 11),
    )
    expect(shape(groups)).toEqual([
      ['Tomorrow', ['mon']],
      ['Later', ['tue']],
    ])
  })

  it('TSK-008: a repeating Task shows its next open occurrence only', () => {
    const items = [
      item('bins-1', { do_on: '2026-10-12', series_id: 's', occurrence_on: '2026-10-12' }),
      item('bins-2', { do_on: '2026-10-19', series_id: 's', occurrence_on: '2026-10-19' }),
    ]
    expect(shape(taskGroups(items, MON))).toEqual([['Today', ['bins-1']]])
  })
})

describe('By label and Completed', () => {
  const items = [
    item('mot', { due_on: '2026-10-30' }),
    item('insurance', { do_on: '2026-10-12' }),
    item('bins', { do_on: '2026-10-13' }),
    item('passport', {}),
    item('done', { status: 'done', updated_at: '2026-10-11T09:00:00Z' }),
    item('done-later', { status: 'done', updated_at: '2026-10-12T09:00:00Z' }),
  ]
  const labels = [
    { id: 'home', name: 'Home' },
    { id: 'car', name: 'Car' },
    { id: 'work', name: 'Work' },
  ]
  const itemLabels = [
    { item_id: 'mot', label_id: 'car' },
    { item_id: 'insurance', label_id: 'car' },
    { item_id: 'insurance', label_id: 'home' },
    { item_id: 'bins', label_id: 'home' },
  ]

  it('TSK-004: each Label A–Z, a Task with two under both, then No label', () => {
    expect(
      tasksByLabel(items, labels, itemLabels, MON).map((g) => [g.name, g.tasks.map((t) => t.id)]),
    ).toEqual([
      ['Car', ['insurance', 'mot']],
      ['Home', ['insurance', 'bins']],
      ['No label', ['passport']],
    ])
  })

  it('TSK-003: done Tasks, most recently changed first', () => {
    expect(completedTasks(items).map((t) => t.id)).toEqual(['done-later', 'done'])
  })
})

describe('Recurring', () => {
  it('TSK-008, TSK-009: each repeating Task once, on a schedule first, soonest first', () => {
    const occ = (id: string, series: string, on: string, fields: Partial<Item> = {}) =>
      item(id, { series_id: series, occurrence_on: on, do_on: on, ...fields })
    const series = new Map(
      (
        [
          ['bins', 'schedule', null],
          ['gym', 'schedule', null],
          ['kettle', 'after_completion', null],
          ['stopped', 'schedule', '2026-10-12'],
        ] as const
      ).map(([id, mode, ended_on]) => [
        id,
        {
          id,
          mode,
          rule: 'FREQ=WEEKLY',
          starts_on: '2026-10-01',
          timezone: 'Europe/London',
          ended_on,
        },
      ]),
    )
    const items = [
      occ('bins-1', 'bins', '2026-10-19'),
      occ('bins-2', 'bins', '2026-10-26'),
      occ('gym-1', 'gym', '2026-10-14'),
      occ('kettle-1', 'kettle', '2027-01-10'),
      occ('stopped-1', 'stopped', '2026-10-12'),
      item('plain', { do_on: '2026-10-13' }),
    ]
    expect(
      recurringTasks(items, series, MON).map((g) => [g.label, g.tasks.map((t) => t.task.id)]),
    ).toEqual([
      ['On a schedule', ['gym-1', 'bins-1']],
      ["After it's done", ['kettle-1']],
    ])
  })
})
