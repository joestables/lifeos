import { describe, expect, it } from 'vitest'
import { applyPendingItemLabels, applyPendingLabels, applyPendingMarks, type Label } from './labels'
import { applyPending } from './overlay'
import type { QueueEntry } from './queue/store'
import type { ItemRow, WriteArgs, WriteFn } from './types'
import { writes } from './writes'

let n = 0
const entry = <F extends WriteFn>(fn: F, args: WriteArgs<F>): QueueEntry => ({
  id: `e${++n}`,
  fn,
  args,
  itemIds: [],
  createdAt: Date.parse('2026-10-11T10:00:00Z'),
  attempts: 0,
  state: 'pending',
})

const label = (id: string, name: string): Label => ({
  id,
  name,
  space_id: 's',
  created_by: 'o',
  created_at: '2026-10-01T00:00:00Z',
})

describe('Labels before the server has them', () => {
  it('ITM-005: a new Label, a rename and a delete show at once, sorted by name', () => {
    const shown = applyPendingLabels(
      [label('a', 'Home'), label('b', 'Car')],
      [
        entry('create_label', { p_id: 'c', p_name: ' Travel ' }),
        entry('rename_label', { p_id: 'a', p_name: 'House' }),
        entry('delete_label', { p_id: 'b' }),
      ],
    )
    expect(shown.map((l) => l.name)).toEqual(['House', 'Travel'])
  })

  it('ITM-005: making "home" when "Home" exists makes no second Label', () => {
    const queued: QueueEntry[] = []
    const queue = { enqueue: (fn: WriteFn, args: never) => queued.push(entry(fn, args)) }
    const w = writes(queue as never, () => [label('a', 'Home')])
    expect(w.createLabel(' home ')).toBe('a')
    expect(queued).toHaveLength(0)
    expect(w.createLabel('Car')).not.toBe('a')
    expect(queued.map((e) => e.fn)).toEqual(['create_label'])
  })

  it('ITM-005: deleting a Label takes it off every Item', () => {
    const shown = applyPendingItemLabels(
      [
        { item_id: 'n1', label_id: 'a' },
        { item_id: 't1', label_id: 'a' },
        { item_id: 't1', label_id: 'b' },
      ],
      [entry('delete_label', { p_id: 'a' }), entry('add_label', { p_item: 'n1', p_label: 'b' })],
    )
    expect(shown).toEqual([
      { item_id: 't1', label_id: 'b' },
      { item_id: 'n1', label_id: 'b' },
    ])
  })
})

describe('marks and conversions before the server has them', () => {
  it('TSK-005, NTE-003: starring and unstarring show at once', () => {
    const shown = applyPendingMarks(
      [{ item_id: 'a' }],
      [
        entry('set_mark', { p_item: 'b', p_on: true }),
        entry('set_mark', { p_item: 'a', p_on: false }),
      ],
    )
    expect(shown).toEqual([{ item_id: 'b' }])
  })

  it('ITM-004: a conversion shows at once, marked as not yet sent', () => {
    const note = { id: 'n', type: 'note', title: 'Boiler' } as ItemRow
    const [shown] = applyPending([note], [entry('convert_item', { p_id: 'n', p_type: 'task' })])
    expect(shown).toMatchObject({ id: 'n', type: 'task', title: 'Boiler', sync: 'pending' })
  })
})
