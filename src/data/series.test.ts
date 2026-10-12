import { describe, expect, it } from 'vitest'
import { applyPendingItemLabels } from './labels'
import { applyPending } from './overlay'
import type { QueueEntry } from './queue/store'
import { applyPendingSeries, type RepeatArgs } from './series'
import type { ItemRow, WriteFn } from './types'

const row = (id: string, fields: Partial<ItemRow> = {}): ItemRow => ({
  id,
  type: 'task',
  title: 'Bins',
  body: null,
  space_id: 's',
  owner_id: 'o',
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
  created_at: '2026-10-09T00:00:00Z',
  updated_at: '2026-10-09T00:00:00Z',
  archived_at: null,
  ...fields,
})
const entry = (fn: WriteFn, args: object): QueueEntry => ({
  id: `e-${fn}`,
  fn,
  args: args as QueueEntry['args'],
  itemIds: [],
  createdAt: Date.parse('2026-10-12T12:00:00Z'),
  attempts: 0,
  state: 'pending',
})
const repeat = (fields: Partial<RepeatArgs> = {}): RepeatArgs => ({
  p_item: 'bins',
  p_series: 'weekly',
  p_mode: 'schedule',
  p_rule: 'FREQ=WEEKLY;BYDAY=MO',
  p_starts_on: '2026-10-12',
  p_timezone: 'Europe/London',
  p_template: { title: 'Bins', do_at: '18:30', due_offset_days: 1, label_ids: ['home'] },
  p_occurrences: [
    { id: 'bins', on: '2026-10-12' },
    { id: 'bins-2', on: '2026-10-19' },
  ],
  p_until: '2026-10-19',
  ...fields,
})

describe('a repeat shows at once, before it is sent (OFF-001)', () => {
  it('TSK-008: the Task becomes the first occurrence and the rest appear', () => {
    const items = applyPending(
      [row('bins', { do_on: '2026-10-12' })],
      [entry('set_repeat', repeat())],
    )
    expect(items.map((i) => [i.id, i.series_id, i.do_on, i.do_at, i.due_on])).toEqual([
      ['bins', 'weekly', '2026-10-12', '18:30', '2026-10-13'],
      ['bins-2', 'weekly', '2026-10-19', '18:30', '2026-10-20'],
    ])
    expect(applyPendingItemLabels([], [entry('set_repeat', repeat())])).toEqual([
      { item_id: 'bins-2', label_id: 'home' },
    ])
    expect(applyPendingSeries([], [entry('set_repeat', repeat())], [])).toMatchObject([
      { id: 'weekly', mode: 'schedule', ended_on: null },
    ])
  })

  it('TSK-011: a new repeat from an occurrence ends the old one there and takes its untouched later ones', () => {
    const old = { series_id: 'old' }
    const items = [
      row('mon-1', { ...old, occurrence_on: '2026-10-12', do_on: '2026-10-12', status: 'done' }),
      row('mon-2', { ...old, occurrence_on: '2026-10-19', do_on: '2026-10-19' }),
      row('mon-3', { ...old, occurrence_on: '2026-10-26', do_on: '2026-10-26' }),
      row('mon-4', { ...old, occurrence_on: '2026-11-02', touched_at: '2026-10-12T00:00:00Z' }),
    ]
    const change = entry(
      'set_repeat',
      repeat({
        p_item: 'mon-2',
        p_series: 'tuesdays',
        p_occurrences: [{ id: 'mon-2', on: '2026-10-20' }],
      }),
    )
    const after = applyPending(items, [change])
    expect(after.map((i) => [i.id, i.series_id, i.archived_at !== null])).toEqual([
      ['mon-1', 'old', false],
      ['mon-2', 'tuesdays', false],
      ['mon-3', 'old', true],
      ['mon-4', 'old', false],
    ])
    const series = applyPendingSeries(
      [
        {
          id: 'old',
          mode: 'schedule',
          rule: 'FREQ=WEEKLY',
          starts_on: '2026-10-12',
          timezone: 'Europe/London',
          ended_on: null,
        },
      ],
      [change],
      items,
    )
    expect(series.map((s) => [s.id, s.ended_on])).toEqual([
      ['old', '2026-10-18'],
      ['tuesdays', null],
    ])
  })

  it('TSK-011: stopping keeps the Task and takes away untouched ones after it', () => {
    const items = [
      row('a', { series_id: 'w', occurrence_on: '2026-10-12' }),
      row('b', { series_id: 'w', occurrence_on: '2026-10-19' }),
    ]
    const after = applyPending(items, [entry('stop_repeat', { p_item: 'a' })])
    expect(after.map((i) => i.archived_at !== null)).toEqual([false, true])
  })

  it('TSK-009: ticking one repeated after completion shows the next', () => {
    const kettle = row('k', {
      title: 'Descale',
      series_id: 'k3',
      occurrence_on: '2026-10-10',
      do_on: '2026-10-10',
    })
    const tick = entry('complete_occurrence', { p_id: 'k', p_next: 'k-2', p_next_on: '2027-01-10' })
    expect(applyPending([kettle], [tick]).map((i) => [i.id, i.status, i.do_on])).toEqual([
      ['k', 'done', '2026-10-10'],
      ['k-2', 'active', '2027-01-10'],
    ])
  })

  it('ADR-0022: my change to an occurrence touches it', () => {
    const item = row('a', { series_id: 'w', occurrence_on: '2026-10-12' })
    const [after] = applyPending(
      [item],
      [entry('update_item', { p_id: 'a', p_patch: { title: 'x' } })],
    )
    expect(after!.touched_at).not.toBeNull()
  })
})
